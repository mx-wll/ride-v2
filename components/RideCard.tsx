'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, addMinutes, differenceInSeconds, isTomorrow } from 'date-fns'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// Define the expected shape of the ride prop
type ProfileMinimal = { id: string; avatar_url: string | null };
type Participant = { user_id: string; profiles: ProfileMinimal | null };

type Ride = {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string;
  preset: string | null;
  distance_km: number | null;
  bike_type: string | null;
  status: string;
  creator_id: string;
  profiles: { first_name: string | null; avatar_url: string | null } | null; // Creator profile
  ride_participants: Participant[]; // List of participants
};

interface RideCardProps {
  ride: Ride;
  userId: string; // ID of the currently logged-in user
}

export function RideCard({ ride, userId }: RideCardProps) {
  // Log the received ride prop in the browser console
  console.log('[RideCard] Received ride prop:', ride);

  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null); // State for countdown timer
  
  // Optimistic state for Join/Leave
  const initialHasJoined = ride.ride_participants?.some(p => p.user_id === userId) ?? false;
  const [optimisticHasJoined, setOptimisticHasJoined] = useState(initialHasJoined);
  
  // Sync optimistic state when the underlying prop changes
  useEffect(() => {
    setOptimisticHasJoined(ride.ride_participants?.some(p => p.user_id === userId) ?? false);
  }, [ride.ride_participants, userId]);

  // Countdown Timer Logic for "now" preset
  useEffect(() => {
    if (ride.preset !== 'now') {
      setTimeLeft(null); // Clear timer if not a 'now' ride
      return; 
    }

    let intervalId: NodeJS.Timeout | null = null;

    try {
      const startTime = new Date(ride.start_time);
      const expirationTime = addMinutes(startTime, 30); // Changed from 90 to 30 minutes

      const updateTimer = () => {
        const now = new Date();
        const secondsRemaining = differenceInSeconds(expirationTime, now);

        if (secondsRemaining > 0) {
          const minutes = Math.floor(secondsRemaining / 60);
          const seconds = secondsRemaining % 60;
          setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        } else {
          setTimeLeft("Expired");
          if (intervalId) clearInterval(intervalId);
          // Automatically remove if creator and expired
          if (ride.creator_id === userId && !isDeleting) { 
            console.log(`Ride ${ride.id} expired, attempting auto-removal.`);
            handleRemove(true); // Pass flag to skip confirm/toast if needed
          }
        }
      };

      updateTimer(); // Initial update
      intervalId = setInterval(updateTimer, 1000); // Update every second

    } catch (e) {
        console.error("Error setting up timer:", e);
        setTimeLeft("Error"); // Indicate timer error
    }

    // Cleanup interval on component unmount or ride change
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  // Rerun if ride ID changes or if user becomes/unbecomes creator (for auto-delete logic)
  }, [ride.id, ride.preset, ride.start_time, userId, isDeleting]); // Added dependencies

  // Determine display name and avatar
  const creatorProfile = ride.profiles;
  const displayName = creatorProfile?.first_name || 'Someone';
  const creatorAvatarUrl = creatorProfile?.avatar_url;

  const participants = ride.ride_participants || [];
  const isCreator = ride.creator_id === userId;

  // Function to get initials for fallback avatar
  const getInitials = (name: string | null | undefined) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  // Format time display (handles presets, timer, and tomorrow)
  const formatRideTime = () => {
    // Handle "now" preset timer first
    if (ride.preset === 'now' && timeLeft && timeLeft !== "Expired" && timeLeft !== "Error") {
        return `Now – ${timeLeft}`;
    }
    if (ride.preset === 'now' && timeLeft) {
        return timeLeft; // Show "Expired" or "Error"
    }

    // Handle other presets or custom times
    try {
      const startTime = new Date(ride.start_time);
      const prefix = isTomorrow(startTime) ? "Tomorrow " : "";

      if (ride.preset && ride.preset !== 'custom') {
        // Display preset text (capitalized) with potential prefix
        return prefix + ride.preset.charAt(0).toUpperCase() + ride.preset.slice(1);
      } else {
        // Fallback for custom times (show HH:mm) with potential prefix
        return prefix + format(startTime, 'HH:mm'); 
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid time";
    }
  };

  const handleRemove = async (isAutoDelete = false) => {
    if (!isCreator || isDeleting) return; 

    setIsDeleting(true);
    const toastId = isAutoDelete ? null : toast.loading("Removing ride...");

    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', ride.id);

    // Don't set isDeleting false here if auto-deleting, let component unmount
    if (!isAutoDelete) {
        setIsDeleting(false);
    }

    if (error) {
      console.error("Error removing ride:", error);
      if (toastId) toast.error(`Error: ${error.message}`, { id: toastId });
      // Maybe revert optimistic state if needed for manual deletes, although refresh handles it
    } else {
      if (toastId) toast.success("Ride removed successfully!", { id: toastId });
      // No need to refresh if auto-deleting, as component will likely unmount
      if (!isAutoDelete) {
          router.refresh(); 
      }
    }
  };

  const handleJoinLeave = async () => {
    if (isCreator || isJoining) return;

    const originalHasJoined = optimisticHasJoined; // Store original state for potential revert
    setIsJoining(true);
    setOptimisticHasJoined(!originalHasJoined); // Optimistically update UI *before* API call

    const toastId = toast.loading(originalHasJoined ? "Leaving ride..." : "Joining ride...");

    let error = null;
    if (originalHasJoined) {
      // Leave action
      ({ error } = await supabase
        .from('ride_participants')
        .delete()
        .match({ ride_id: ride.id, user_id: userId }));
    } else {
      // Join action
      ({ error } = await supabase
        .from('ride_participants')
        .insert({ ride_id: ride.id, user_id: userId }));
    }

    if (error) {
      console.error("Error joining/leaving ride:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
      setOptimisticHasJoined(originalHasJoined); // Revert optimistic state ONLY on error
    } else {
      toast.success(originalHasJoined ? "Left ride successfully!" : "Joined ride successfully!", { id: toastId });
      router.refresh(); // Refresh data in background
    }
    
    setIsJoining(false); // Loading finished
  };

  return (
    <Card key={ride.id}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>
            {displayName} wants to ride
            <Badge variant="outline" className="ml-2 font-normal">{formatRideTime()}</Badge>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-row gap-4 h-6 items-center">
        <span>{ride.distance_km || '?'} km</span>
        <Separator orientation="vertical" />
        <span>{ride.bike_type || 'Any bike'}</span>
      </CardContent>
      <CardFooter className="flex justify-between items-center gap-2">
        {/* Left side: Avatars */}
        <div className="flex -space-x-2 overflow-hidden">
          {/* Creator Avatar always first */}
          <Avatar className="h-8 w-8 border-2 border-background ring-0 ring-primary">
            <AvatarImage src={creatorAvatarUrl || undefined} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          {/* Participant Avatars (excluding creator if they also joined somehow) */}
          {participants
            .filter(p => p.user_id !== ride.creator_id && p.profiles) // Filter out creator & ensure profile exists
            .map(participant => (
              <Avatar key={participant.user_id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={participant.profiles!.avatar_url || undefined} alt="Participant" />
                <AvatarFallback>{/* Add fallback if needed */}</AvatarFallback>
              </Avatar>
          ))}
        </div>

        {/* Right side: Buttons */}
        <div>
          {isCreator ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(false)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </Button>
            </>
          ) : (
            <Button 
              variant={optimisticHasJoined ? "outline" : "default"}
              size="sm" 
              onClick={handleJoinLeave}
              disabled={isJoining}
            >
              {optimisticHasJoined ? 'Leave' : 'Join'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 
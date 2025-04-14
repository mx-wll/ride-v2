'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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
  time_preference: string | null;
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
  
  // Reintroduce optimistic state
  const initialHasJoined = ride.ride_participants?.some(p => p.user_id === userId) ?? false;
  const [optimisticHasJoined, setOptimisticHasJoined] = useState(initialHasJoined);

  // Sync optimistic state when the underlying prop changes
  useEffect(() => {
    setOptimisticHasJoined(ride.ride_participants?.some(p => p.user_id === userId) ?? false);
  }, [ride.ride_participants, userId]);

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

  const handleRemove = async () => {
    if (!isCreator) return; // Safety check

    setIsDeleting(true);
    const toastId = toast.loading("Removing ride...");

    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', ride.id);

    setIsDeleting(false);

    if (error) {
      console.error("Error removing ride:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } else {
      toast.success("Ride removed successfully!", { id: toastId });
      router.refresh(); // Refresh the page data
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
        <CardTitle>
          {displayName} wants to ride
          <Badge variant="outline" className="ml-2">{ride.time_preference || 'anytime'}</Badge>
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
                onClick={handleRemove}
                disabled={isDeleting}
                className="ml-2"
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
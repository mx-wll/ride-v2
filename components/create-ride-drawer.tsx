'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import { addMinutes, set, startOfDay, addDays, isPast } from 'date-fns' // Import addDays, isPast
import { LocateFixed, Loader2 } from 'lucide-react' // Import icons
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createClient } from '@/lib/supabase/client'
import { useCurrentUserProfile } from '@/hooks/use-current-user-profile' // Assuming this hook exists and provides userId

// Define preset types
type TimePreset = 'now' | 'lunch' | 'afternoon';

// Utility function to get time ranges
function getTimeRangeForPreset(preset: TimePreset): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = startOfDay(now);
  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case 'now':
      startDate = now;
      endDate = addMinutes(now, 30); // Use the updated 30 min duration
      break;
    case 'lunch':
      startDate = set(todayStart, { hours: 12 });
      endDate = set(todayStart, { hours: 14 });
      // Check if today's lunch start time is already past
      if (isPast(startDate)) {
        startDate = addDays(startDate, 1); // Move to tomorrow
        endDate = addDays(endDate, 1);   // Move to tomorrow
      }
      break;
    case 'afternoon':
      startDate = set(todayStart, { hours: 14 });
      endDate = set(todayStart, { hours: 18 });
       // Check if today's afternoon start time is already past
      if (isPast(startDate)) {
        startDate = addDays(startDate, 1); // Move to tomorrow
        endDate = addDays(endDate, 1);   // Move to tomorrow
      }
      break;
  }
  return { start: startDate, end: endDate };
}

export function CreateRideDrawer() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<TimePreset | string>('now') // Allow string for potential custom value later
  const [distanceKm, setDistanceKm] = useState<string>('50') // Default distance to '50'
  const [bikeType, setBikeType] = useState<string>('road') // Default bike type to 'road'
  const [startingPoint, setStartingPoint] = useState<string>('') // State for starting point
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false) // State for location fetching

  const supabase = createClient()
  const { userId } = useCurrentUserProfile() // Get userId from the hook

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setStartingPoint(locationString);
        toast.success('Current location fetched!');
        setIsFetchingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = 'Could not fetch location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable it in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out.';
        }
        toast.error(message);
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true, // Request more accurate position
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0 // Don't use cached position
      }
    );
  };

  const handleCreateRide = async () => {
    if (!userId) {
      toast.error("Error: User not logged in.")
      return;
    }
    if (!distanceKm || !bikeType || !startingPoint) {
       toast.error("Please fill out time, distance, bike type, and starting point.");
       return;
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Creating ride...")

    // Calculate start/end times based on preset
    const { start, end } = getTimeRangeForPreset(selectedPreset as TimePreset);

    const { error } = await supabase
      .from('rides')
      .insert({
        creator_id: userId,
        start_time: start.toISOString(), // Convert Date to ISO string for DB
        end_time: end.toISOString(),     // Convert Date to ISO string for DB
        preset: selectedPreset,
        distance_km: parseInt(distanceKm, 10),
        bike_type: bikeType,
        starting_point: startingPoint, // Add starting point to insert data
      })

    setIsSubmitting(false)

    if (error) {
      console.error("Error creating ride:", error)
      toast.error(`Error: ${error.message}`, { id: toastId })
    } else {
      toast.success("Ride created successfully!", { id: toastId })
      setIsOpen(false) // Close drawer on success
      // Reset form state, including starting point
      setSelectedPreset('now'); // Reset preset
      setDistanceKm('50'); // Reset distance to default
      setBikeType('road'); // Reset bike type to default
      setStartingPoint(''); // Reset starting point
      router.refresh() // Refresh server data for the current route
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {/* This button replaces the one in protected/page.tsx */}
        <div className="bg-white sticky bottom-0 p-6 pb-10">
          <Button className="w-full font-bold italic">Create ride</Button>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create a Ride Request</DrawerTitle>
          <DrawerDescription>
            Let others know when and how you want to ride.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 space-y-4">
          {/* Starting Point Input */} 
          <div className="space-y-2">
            <div className="relative">
                <Input
                    id="starting-point"
                    placeholder="Enter starting address or use current location"
                    value={startingPoint}
                    onChange={(e) => setStartingPoint(e.target.value)}
                    disabled={isSubmitting || isFetchingLocation}
                    className="pr-10" // Add padding for the button
                 />
                 <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                     onClick={handleGetCurrentLocation}
                     disabled={isSubmitting || isFetchingLocation}
                     aria-label="Get current location"
                 >
                     {isFetchingLocation ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                         <LocateFixed className="h-4 w-4" />
                     )}
                 </Button>
            </div>
           </div>

          {/* Time Preset Toggle Group */} 
          <div className="space-y-2">
            <ToggleGroup 
              id="time-preset"
              type="single" 
              value={selectedPreset} 
              onValueChange={(value) => {
                if (value) {
                  setSelectedPreset(value as TimePreset); // Cast to TimePreset
                }
              }}
              className="w-full grid grid-cols-3" // Use grid for equal width items, full width
              disabled={isSubmitting}
            >
              <ToggleGroupItem value="now" aria-label="Toggle Now">Now</ToggleGroupItem>
              <ToggleGroupItem value="lunch" aria-label="Toggle Lunch">Lunch</ToggleGroupItem>
              <ToggleGroupItem value="afternoon" aria-label="Toggle Afternoon">Afternoon</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Distance Toggle Group */} 
          <div className="space-y-2">
            <ToggleGroup 
              id="distance"
              type="single" 
              value={distanceKm} 
              onValueChange={(value) => {
                if (value) {
                  setDistanceKm(value);
                }
              }}
              className="w-full grid grid-cols-3" // Use grid for equal width items, full width
              disabled={isSubmitting}
            >
              <ToggleGroupItem value="30" aria-label="Toggle 30km">30 km</ToggleGroupItem>
              <ToggleGroupItem value="50" aria-label="Toggle 50km">50 km</ToggleGroupItem>
              <ToggleGroupItem value="100" aria-label="Toggle 100km">100 km</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Bike Type Toggle Group */} 
           <div className="space-y-2">
            <ToggleGroup 
              id="bike"
              type="single" 
              value={bikeType} 
              onValueChange={(value) => {
                if (value) {
                  setBikeType(value);
                }
              }}
              className="w-full grid grid-cols-2" // Use grid for equal width items, full width
              disabled={isSubmitting}
            >
              <ToggleGroupItem value="road" aria-label="Toggle Road bike">Road</ToggleGroupItem>
              <ToggleGroupItem value="mtb" aria-label="Toggle Mountain bike">MTB</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <DrawerFooter className="pt-4">
          <Button className="font-bold italic" onClick={handleCreateRide} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Let's Go"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
} 
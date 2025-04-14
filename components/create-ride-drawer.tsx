'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import { addMinutes, set, startOfDay, addDays, isPast } from 'date-fns' // Import addDays, isPast
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
import { Label } from "@/components/ui/label"
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
  const [selectedPreset, setSelectedPreset] = useState<TimePreset>('now')
  const [distanceKm, setDistanceKm] = useState<string>('50') // Default distance to '50'
  const [bikeType, setBikeType] = useState<string>('road') // Default bike type to 'road'
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()
  const { userId } = useCurrentUserProfile() // Get userId from the hook

  const handleCreateRide = async () => {
    if (!userId) {
      toast.error("Error: User not logged in.")
      return;
    }
    if (!distanceKm || !bikeType) {
       toast.error("Please fill out distance and bike type.");
       return;
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Creating ride...")

    // Calculate start/end times based on preset
    const { start, end } = getTimeRangeForPreset(selectedPreset);

    const { error } = await supabase
      .from('rides')
      .insert({
        creator_id: userId,
        start_time: start.toISOString(), // Convert Date to ISO string for DB
        end_time: end.toISOString(),     // Convert Date to ISO string for DB
        preset: selectedPreset,
        distance_km: parseInt(distanceKm, 10),
        bike_type: bikeType,
      })

    setIsSubmitting(false)

    if (error) {
      console.error("Error creating ride:", error)
      toast.error(`Error: ${error.message}`, { id: toastId })
    } else {
      toast.success("Ride created successfully!", { id: toastId })
      setIsOpen(false) // Close drawer on success
      // Reset form state
      setSelectedPreset('now'); // Reset preset
      setDistanceKm('50'); // Reset distance to default
      setBikeType('road'); // Reset bike type to default
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
          {/* Time Preset Buttons */}
          <div className="space-y-2">
            <Label>When?</Label>
            <div className="flex gap-2">
              {(['now', 'lunch', 'afternoon'] as TimePreset[]).map((preset) => (
                 <Button 
                    key={preset}
                    variant={selectedPreset === preset ? 'default' : 'outline'}
                    onClick={() => setSelectedPreset(preset)}
                    disabled={isSubmitting}
                    className="capitalize" // Capitalize button text
                  >
                    {preset}
                 </Button>
              ))}
              {/* TODO: Add "Other..." button later */}
            </div>
          </div>

          {/* Distance Toggle Group */}
          <div className="space-y-2"> {/* Adjusted spacing */} 
            <Label htmlFor="distance">Distance</Label>
            <ToggleGroup 
              type="single" 
              value={distanceKm} 
              onValueChange={(value) => {
                // Ensure a value is always selected, prevent deselection
                if (value) {
                  setDistanceKm(value);
                }
              }}
              className="justify-start" // Align toggles left
              disabled={isSubmitting}
            >
              <ToggleGroupItem value="30" aria-label="Toggle 30km">30 km</ToggleGroupItem>
              <ToggleGroupItem value="50" aria-label="Toggle 50km">50 km</ToggleGroupItem>
              <ToggleGroupItem value="100" aria-label="Toggle 100km">100 km</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Bike Type Toggle Group */}
           <div className="space-y-2">
            <Label htmlFor="bike">Bike</Label>
            <ToggleGroup 
              type="single" 
              value={bikeType} 
              onValueChange={(value) => {
                // Ensure a value is always selected, prevent deselection
                if (value) {
                  setBikeType(value);
                }
              }}
              className="justify-start"
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
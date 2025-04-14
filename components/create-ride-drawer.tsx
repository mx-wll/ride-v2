'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createClient } from '@/lib/supabase/client'
import { useCurrentUserProfile } from '@/hooks/use-current-user-profile' // Assuming this hook exists and provides userId

export function CreateRideDrawer() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [timePreference, setTimePreference] = useState<string>('')
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
    if (!timePreference || !distanceKm || !bikeType) {
       toast.error("Please fill out all fields.");
       return;
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Creating ride...")

    const { error } = await supabase
      .from('rides')
      .insert({
        creator_id: userId,
        time_preference: timePreference,
        distance_km: parseInt(distanceKm, 10), // Convert to number for DB
        bike_type: bikeType,
        // status defaults to 'pending' in the database
      })

    setIsSubmitting(false)

    if (error) {
      console.error("Error creating ride:", error)
      toast.error(`Error: ${error.message}`, { id: toastId })
    } else {
      toast.success("Ride created successfully!", { id: toastId })
      setIsOpen(false) // Close drawer on success
      // Reset form state if needed
      setTimePreference('');
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
          {/* Time Preference */}
          <div className="space-y-1">
            <Label htmlFor="time">Time</Label>
            <Select value={timePreference} onValueChange={setTimePreference} disabled={isSubmitting}>
              <SelectTrigger id="time">
                <SelectValue placeholder="Select when you want to ride" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Now</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
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
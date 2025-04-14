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
import { createClient } from '@/lib/supabase/client'
import { useCurrentUserProfile } from '@/hooks/use-current-user-profile' // Assuming this hook exists and provides userId

export function CreateRideDrawer() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [timePreference, setTimePreference] = useState<string>('')
  const [distanceKm, setDistanceKm] = useState<string>('') // Use string initially for Select value
  const [bikeType, setBikeType] = useState<string>('')
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
      setDistanceKm('');
      setBikeType('');
      router.refresh() // Refresh server data for the current route
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {/* This button replaces the one in protected/page.tsx */}
        <Button className="sticky bottom-0 m-10">Create ride</Button>
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

          {/* Distance */}
           <div className="space-y-1">
            <Label htmlFor="distance">Distance</Label>
            <Select value={distanceKm} onValueChange={setDistanceKm} disabled={isSubmitting}>
              <SelectTrigger id="distance">
                <SelectValue placeholder="Select ride distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
                <SelectItem value="100">100 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bike Type */}
           <div className="space-y-1">
            <Label htmlFor="bike">Bike</Label>
            <Select value={bikeType} onValueChange={setBikeType} disabled={isSubmitting}>
              <SelectTrigger id="bike">
                <SelectValue placeholder="Select bike type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="road">Road</SelectItem>
                <SelectItem value="mtb">MTB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter className="pt-4">
          <Button onClick={handleCreateRide} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Ride"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
} 
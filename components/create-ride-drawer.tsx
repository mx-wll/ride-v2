'use client'

import { useState, useEffect, useRef } from 'react'
// import { useRouter } from 'next/navigation' // Removed unused import
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
import { Ride } from './RideCard' // Import the Ride type

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

const LOCAL_STORAGE_KEY = 'lastRideDetails';

// State for Autocomplete
type Suggestion = { display_name: string; lat: string; lon: string };

// Define Props for the component
interface CreateRideDrawerProps {
  onRideCreated: (newRide: Ride) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CreateRideDrawer({ 
  onRideCreated, 
  isOpen,
  onOpenChange
}: CreateRideDrawerProps) {
  // const router = useRouter() // Removed unused router
  const [selectedPreset, setSelectedPreset] = useState<TimePreset | string>('now')
  const [distanceKm, setDistanceKm] = useState<string>('50')
  const [bikeType, setBikeType] = useState<string>('road')
  const [startingPoint, setStartingPoint] = useState<string>('')
  const [currentCoords, setCurrentCoords] = useState<string | null>(null); // State to hold coords when fetched
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  // State for Autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()
  // Destructure loading state from the hook, rename to avoid conflict
  const { userId, profile, loading: profileLoading } = useCurrentUserProfile() 

  // Effect to load saved details from localStorage on mount
  useEffect(() => {
    const savedDetails = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDetails) {
      try {
        const { preset, distance, bike, startPoint } = JSON.parse(savedDetails);
        // Only update if the value exists in the saved data
        if (preset) setSelectedPreset(preset);
        if (distance) setDistanceKm(distance);
        if (bike) setBikeType(bike);
        if (startPoint) setStartingPoint(startPoint);
      } catch (error) {
        console.error("Error parsing saved ride details:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect for cleaning up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingLocation(true);
    setStartingPoint('Fetching address...');
    setCurrentCoords(null); // Clear previous coords when fetching

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setCurrentCoords(coordsString); // Store fetched coords in state

      // Reverse Geocode using Nominatim
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.statusText}`);
        }
        const data = await response.json();

        const addressDetails = data.address;
        let conciseLocation = data.display_name; 
        if (addressDetails) {
            conciseLocation = addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.hamlet || data.display_name;
        }
        
        if (conciseLocation) {
          setStartingPoint(conciseLocation); // Update address input
          toast.success('Current location fetched!');
        } else {
          setStartingPoint(coordsString); // Fallback address to coords
          toast.warning('Could not find address name, using coordinates.');
        }
      } catch (geocodeError) {
        console.error("Reverse Geocoding error:", geocodeError);
        setStartingPoint(coordsString); // Fallback address to coords
        toast.error('Could not fetch address, using coordinates.');
      }

    } catch (geoError: unknown) {
      console.error("Geolocation error:", geoError);
      setStartingPoint('');
      setCurrentCoords(null); // Ensure coords are cleared on error too
      let message = 'Could not fetch location.';
      if (geoError instanceof GeolocationPositionError) {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable it in your browser settings.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'Location request timed out.';
        }
      } else if (geoError instanceof Error) {
        message = `An error occurred: ${geoError.message}`;
      }
      toast.error(message);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Function to fetch address suggestions from Nominatim
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) { // Don't search for very short queries
      setSuggestions([]);
      return;
    }
    console.log("Fetching suggestions for:", query);
    setIsFetchingSuggestions(true);
    setSuggestions([]); // Clear previous suggestions
    try {
      // Use Nominatim search endpoint
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) {
        throw new Error(`Nominatim search API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSuggestions(data.map(item => ({ display_name: item.display_name, lat: item.lat, lon: item.lon })));
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setSuggestions([]); // Clear suggestions on error
      // Optionally show a toast message here
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Handle selecting a suggestion
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setStartingPoint(suggestion.display_name);
    setCurrentCoords(`${suggestion.lat}, ${suggestion.lon}`);
    setSuggestions([]); // Hide suggestions after selection
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
    const { start, end } = getTimeRangeForPreset(selectedPreset as TimePreset);

    // Get current user profile data for the new ride object - Moved hook call to top level
    // const { profile } = useCurrentUserProfile(); // Removed from here

    const rideDataToInsert = {
        creator_id: userId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        preset: selectedPreset,
        distance_km: parseInt(distanceKm, 10) || null, // Handle potential NaN
        bike_type: bikeType,
        starting_point_address: startingPoint, 
        starting_point_coords: currentCoords 
    };

    // Insert the ride and select the newly created row
    const { data: newRideData, error } = await supabase
      .from('rides')
      .insert(rideDataToInsert)
      .select(`
        id,
        created_at,
        distance_km,
        bike_type,
        status,
        creator_id,
        start_time,
        end_time,
        preset,
        starting_point_address,
        starting_point_coords
        `
        // Note: We don't get profiles or participants directly from insert
        // We need to construct the full Ride object manually below
      )
      .single(); // Expecting a single row back

    setIsSubmitting(false)

    if (error) {
      console.error("Error creating ride:", error);
      toast.error(`Error: ${error.message}`, { id: toastId })
    } else if (newRideData) {
      
      // Construct the full Ride object matching the type expected by the parent
      const newlyCreatedRide: Ride = {
        ...newRideData,
        status: newRideData.status || 'open', // Assuming default status is 'open' if not returned
        profiles: profile ? { first_name: profile.firstName, avatar_url: profile.avatarUrl } : { first_name: 'You', avatar_url: null }, 
        ride_participants: [], // Start with empty participants
      };

      toast.success("Ride created successfully!", { id: toastId });
      onRideCreated(newlyCreatedRide); // Call the callback with the new ride data
      onOpenChange(false); // Request parent to close drawer

      // Save details to localStorage (existing logic)
      const rideDetailsToSave = {
        preset: selectedPreset,
        distance: distanceKm,
        bike: bikeType,
        startPoint: startingPoint,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rideDetailsToSave));

      // Clear the form or reset state as needed (optional)
      // setStartingPoint(''); 
      // setCurrentCoords(null);
      // setSuggestions([]);

      // No longer needed: router.refresh()
    } else {
         toast.error("Failed to create ride. No data returned.", { id: toastId });
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      // Reset relevant form state when closing the drawer
      if (!open) {
        setSuggestions([]);
        // Optionally reset other fields like starting point?
        // setStartingPoint('');
        // setCurrentCoords(null);
      }
      onOpenChange(open); // Call prop
    }}>
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
          
          {/* Starting Point Input - Moved to last */} 
          <div className="space-y-2">
            <div className="relative">
                {/* Input field */}
                <Input
                    id="starting-point"
                    placeholder="Enter starting address or use current location"
                    value={startingPoint}
                    onChange={(e) => {
                        const value = e.target.value;
                        setStartingPoint(value);
                        setCurrentCoords(null); // Clear coords if user edits manually
                        // Debounce fetching suggestions
                        if (debounceTimeoutRef.current) {
                            clearTimeout(debounceTimeoutRef.current);
                        }
                        debounceTimeoutRef.current = setTimeout(() => {
                            fetchAddressSuggestions(value.trim());
                        }, 500); // 500ms delay
                    }}
                    disabled={isSubmitting || isFetchingLocation}
                    className="pr-10"
                 />
                 {/* Get Location Button */}
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
            {/* Suggestions List */}
            {(isFetchingSuggestions || suggestions.length > 0) && (
                <div className="absolute z-10 w-[calc(100%-2rem)] mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isFetchingSuggestions ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">Searching...</div>
                    ) : (
                        suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="p-2 text-sm hover:bg-accent cursor-pointer truncate"
                                onClick={() => handleSuggestionClick(suggestion)}
                                title={suggestion.display_name} // Show full name on hover
                            >
                                {suggestion.display_name}
                            </div>
                        ))
                    )}
                </div>
            )}
          </div>

        </div>
        <DrawerFooter className="pt-4">
          {/* Disable button if submitting or profile is still loading */}
          <Button 
            className="font-bold italic" 
            onClick={handleCreateRide} 
            disabled={isSubmitting || profileLoading} 
          >
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
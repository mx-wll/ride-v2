'use client' // Need client component for state and dynamic import

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/supabase/client' // Use client for stateful page
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js' // Import User type
import NavUser from '@/features/profile/components/nav-user'
import { CreateRideDrawer } from '@/features/rides/components/create-ride-drawer'
import { RideCard, Ride } from '@/features/rides/components/RideCard' // Import Ride type
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useCurrentUserProfile } from '@/features/profile/hooks/use-current-user-profile' // Import hook

// Dynamically import MapView with SSR disabled
const MapView = dynamic(() => import('@/features/rides/components/map-view'), {
    ssr: false,
    loading: () => (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Loading Map...</p>
        </div>
    )
});

interface NavUserData {
    firstName: string;
}

// Define a more specific type for the data returned by the Supabase query
// This helps address the complex type inference issues.
type FetchedRideData = Omit<Ride, 'profiles' | 'ride_participants'> & {
    profiles: { first_name: string | null; avatar_url: string | null } | null; // Creator profile can be object or null
    ride_participants: { user_id: string; profiles: { id: string; avatar_url: string | null } | null }[];
};

// Define type for a single participant profile (used in the map function)
type ParticipantProfile = { id: string; avatar_url: string | null };

// Type guard to check if the fetched participant profile data is valid
function isValidParticipantProfile(profile: unknown): profile is ParticipantProfile {
    return (
        profile !== null &&
        typeof profile === 'object' &&
        'id' in profile &&
        typeof (profile as ParticipantProfile).id === 'string' &&
        ('avatar_url' in profile)
    );
}

// Type guard to check if the fetched creator profile data is valid
function isValidCreatorProfile(profile: unknown): profile is { first_name: string | null; avatar_url: string | null } {
    return (
        profile !== null &&
        typeof profile === 'object' &&
        ('first_name' in profile || 'avatar_url' in profile) // Allow either field to be present
    );
}

export default function ProtectedPageClient() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null); // Use Supabase User type
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // State for view mode
    const [navUserData, setNavUserData] = useState<NavUserData | null>(null);

    // Get profile data for participant updates
    const { userId: currentUserId, profile: currentUserProfile, loading: profileLoading } = useCurrentUserProfile();

    // State for controlling the Create Ride Drawer
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

    // Function to add a newly created ride to the state
    const addRideToList = (newRide: Ride) => {
        // Add the new ride to the top of the list for immediate visibility
        setRides(prevRides => [newRide, ...prevRides]);
    };

    // Function to remove a ride from the state by ID
    const removeRideFromList = (rideId: string) => {
        setRides(prevRides => prevRides.filter(ride => ride.id !== rideId));
    };

    // Function to update participants in a ride
    const updateRideParticipants = (rideId: string, action: 'join' | 'leave') => {
        setRides(prevRides => prevRides.map(ride => {
            if (ride.id === rideId && currentUserId && currentUserProfile) {
                let updatedParticipants = [...ride.ride_participants];
                if (action === 'join') {
                    // Add the current user if not already present
                    if (!updatedParticipants.some(p => p.user_id === currentUserId)) {
                        updatedParticipants.push({
                            user_id: currentUserId,
                            // Construct the minimal profile needed for the Ride type
                            profiles: { id: currentUserId, avatar_url: currentUserProfile.avatarUrl }
                        });
                    }
                } else { // action === 'leave'
                    // Remove the current user
                    updatedParticipants = updatedParticipants.filter(p => p.user_id !== currentUserId);
                }
                return { ...ride, ride_participants: updatedParticipants };
            }
            return ride;
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            // Fetch user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user) {
                console.error('Error fetching session or no user:', sessionError);
                router.push('/'); // Redirect if no session
                return;
            }
            const currentUser = session.user;
            setUser(currentUser);

            // Fetch profile and rides concurrently
            try {
                const [profileResult, ridesResult] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('first_name')
                        .eq('id', currentUser.id)
                        .maybeSingle(), // Use maybeSingle to handle potential null profile
                    supabase
                        .from('rides')
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
                            starting_point_coords,
                            profiles ( first_name, avatar_url ),
                            ride_participants ( user_id, profiles ( id, avatar_url ) )
                        `)
                        .order('created_at', { ascending: false })
                ]);

                // Process profile
                if (profileResult.error) {
                    console.error("Error fetching profile:", profileResult.error);
                    // Fallback to email if profile fetch fails
                    setNavUserData({ firstName: currentUser.email || 'User' });
                } else {
                    setNavUserData({ firstName: profileResult.data?.first_name || currentUser.email || 'User' });
                }

                // Process rides
                if (ridesResult.error) {
                    console.error("Error fetching rides:", ridesResult.error);
                    setError("Could not fetch rides.");
                    setRides([]);
                } else {
                     // Explicitly cast the fetched data to the correct type structure expected by RideCard
                     // Supabase client might return slightly different types (e.g., single profile object instead of array)
                     const fetchedRides = ridesResult.data as unknown as FetchedRideData[]; // Use the defined type alias
                     const formattedRides: Ride[] = fetchedRides.map(ride => {
                        // Safely handle the 'profiles' field which might be null or an object
                        const creatorProfile = isValidCreatorProfile(ride.profiles) ? ride.profiles : null;

                        return {
                            ...ride,
                            // Ensure profiles is always an object matching the Ride type expectation, or null
                            profiles: creatorProfile ? creatorProfile : {
                                first_name: 'Unknown', // Default value if profile is null
                                avatar_url: null
                            },
                            // Ensure ride_participants and nested profiles match Ride type
                            ride_participants: (ride.ride_participants || []).map(p => ({
                                user_id: p.user_id,
                                // Safely handle nested profile within participants
                                profiles: isValidParticipantProfile(p.profiles) ? p.profiles : {
                                    id: p.user_id, // Use user_id as fallback id
                                    avatar_url: null
                                }
                            }))
                        };
                     });
                    setRides(formattedRides);
                }
            } catch (err) {
                console.error("Unexpected error fetching data:", err);
                setError("An unexpected error occurred.");
                setRides([]);
                setNavUserData({ firstName: currentUser.email || 'User' }); // Provide fallback user data
            }

            setLoading(false);
        };

        fetchData();

        // Set up realtime subscription for rides and participants - Reverted to simple fetchData
        /*
        const changes = supabase
            .channel('protected-page-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rides' },
                (payload) => {
                    console.log('Realtime change received for rides:', payload);
                    fetchData(); // Refetch all data on change
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ride_participants' },
                (payload) => {
                    console.log('Realtime change received for participants:', payload);
                    fetchData(); // Refetch all data on change
                }
            )
            .subscribe();
        */

        // Cleanup channel on unmount
        return () => {
            // supabase.removeChannel(changes); // No channel to remove if commented out
        };

    }, [supabase, router]); // Dependencies: supabase client and router

    // Combine loading states
    const isPageLoading = loading || profileLoading;

    if (isPageLoading) { // Check combined loading state
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Ensure user is loaded before rendering main content
    if (!user) {
        return null; // Or a redirect/error message, handled by useEffect already
    }

    return (
        <div className="flex-1 w-full flex flex-col gap-6">
            <nav className="w-full h-16 border-b flex justify-between items-center p-4">
                <div className="flex-grow">
                    <div className="text-lg font-semibold">Upperland Racing</div>
                </div>
                {navUserData && <NavUser user={navUserData} />}
            </nav>
            <main 
                className="flex-1 flex flex-col gap-6 w-full p-6 pb-28"
                {...(isCreateDrawerOpen && { inert: true })} // Pass boolean true
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-4xl">Available Rides</h2>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="view-mode-toggle"
                            checked={viewMode === 'map'}
                            onCheckedChange={(checked: boolean) => setViewMode(checked ? 'map' : 'list')}
                        />
                        <Label htmlFor="view-mode-toggle">Map View</Label>
                    </div>
                </div>

                {error && <p className="text-destructive text-center">Error: {error}</p>}

                {viewMode === 'list' ? (
                    // List View
                    rides.length > 0 ? (
                        rides.map((ride) => (
                            <RideCard
                                key={ride.id}
                                ride={ride} // Type should be correct now
                                userId={user.id} // Pass Supabase user ID
                                onRideRemoved={removeRideFromList} // Pass remove function
                                onParticipantChange={updateRideParticipants} // Pass participant update function
                            />
                        ))
                    ) : (
                        !error && <p className="text-center text-muted-foreground">No rides available right now. Create one!</p>
                    )
                ) : (
                    // Map View - only render if rides exist and have coordinates
                    rides.some(ride => ride.starting_point_coords) ? (
                        <MapView rides={rides.filter(ride => ride.starting_point_coords)} />
                    ) : (
                        !error && <p className="text-center text-muted-foreground">No rides with location data to display on map.</p>
                    )
                )}
            </main>
            <CreateRideDrawer 
                onRideCreated={addRideToList} // Pass addRideToList directly
                isOpen={isCreateDrawerOpen} 
                onOpenChange={setIsCreateDrawerOpen} 
            /> 
        </div>
    )
}
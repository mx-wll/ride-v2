import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavUser from '@/components/nav-user'
import { CreateRideDrawer } from '@/components/create-ride-drawer'
import { RideCard } from '@/components/RideCard'

export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/')
  }

  // Fetch profile data for the user
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single(); // Use single() assuming a profile must exist for logged-in user

  // Handle potential profile fetch error (optional, could log or show generic name)
  if (profileError) {
    console.error("Error fetching profile for greeting:", profileError);
    // Decide on fallback behavior if needed
  }

  // Determine the name to display
  const displayName = profileData?.first_name || user.email;

  // Prepare user data for NavUser
  const navUserData = {
    firstName: displayName
  };

  // Fetch rides data, joining with profiles and participants
  const { data: rides, error: ridesError } = await supabase
    .from('rides')
    .select(`
      id,
      created_at,
      time_preference,
      distance_km,
      bike_type,
      status,
      creator_id,
      profiles ( first_name, avatar_url ),
      ride_participants ( user_id, profiles ( id, avatar_url ) )
    `)
    .order('created_at', { ascending: false });

  if (ridesError) {
    console.error("Error fetching rides:", ridesError);
    // Handle error appropriately - maybe show an error message
    // For now, we'll let it render with an empty rides array or potentially fail
  }

  // Log the fetched data to the server console
  console.log("Fetched rides data:", JSON.stringify(rides, null, 2)); 

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <nav className="w-full h-16 border-b flex justify-between items-center p-4">
        <div className="flex-grow">
        <div className="text-lg font-semibold">Oberland Riding</div>
        </div>
        <NavUser user={navUserData} />
      </nav>
        <main className="flex-1 flex flex-col gap-6 w-full p-6 pb-28">
          <h2 className="font-bold text-4xl mb-4">Available Rides</h2>
          {/* Map over fetched rides and render RideCard */}
          {rides && rides.length > 0 ? (
            rides.map((ride) => (
              // Pass ride data and logged-in user ID to RideCard
              // Use 'as any' to bypass persistent TS inference issue
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <RideCard key={ride.id} ride={ride as any} userId={user.id} />
            ))
          ) : (
            <p className="text-center text-muted-foreground">No rides available right now. Create one!</p>
          )}
        </main>
         <CreateRideDrawer />
    </div>
  )
}
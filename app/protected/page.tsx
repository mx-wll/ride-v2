import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavUser from '@/components/nav-user'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <nav className="w-full h-16 border-b flex justify-between items-center p-4">
        <div className="flex-grow">
        <div className="text-lg font-semibold">Oberland Riding</div>
        </div>
        <NavUser user={navUserData} />
      </nav>
        <main className="flex-1 flex flex-col gap-6 w-full p-6 pb-28">
          <h2 className="font-bold text-4xl mb-4">Rides</h2>
          <Card>
            <CardHeader>
              <CardTitle>Max wants to ride <Badge variant="outline">Now</Badge></CardTitle>
            </CardHeader>
            <CardContent className="flex flex-row gap-4 h-6">
              100km <Separator orientation="vertical" />
              100km <Separator orientation="vertical" />
              100km
            </CardContent>
            <CardFooter>
              <Button variant="outline">Join</Button>
            </CardFooter>
          </Card>
        </main>
         <Button className="sticky bottom-0 m-10">Create ride</Button>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/shared/supabase/client'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft, Link as LinkIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  social_media_url: string | null;
};

export default function TeamPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, social_media_url')
        .order('first_name');

      if (error) {
        console.error("Error fetching profiles:", error);
        setError(error.message);
        setProfiles([]);
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [supabase]);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return first || last ? `${first}${last}` : '?';
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 gap-6 px-4 w-full max-w-4xl mx-auto">

      <div className="w-full flex justify-start">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      </div>
      
      <h1 className="text-2xl font-semibold self-start mb-4">Your Team</h1>

      {loading && <p>Loading team members...</p>} 
      {error && <p className="text-destructive">Error loading team: {error}</p>}
      
      {!loading && !error && (
        <div className="w-full flex flex-col gap-4">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                  <AvatarFallback>{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {profile.first_name || ''} {profile.last_name || ''} 
                    {!profile.first_name && !profile.last_name && 'Unnamed User'}
                  </p>
                  {profile.social_media_url && (
                    <Link href={profile.social_media_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                       <LinkIcon size={14} /> Social Profile
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground">No team members found.</p>
          )}
        </div>
      )}
    </div>
  )
} 
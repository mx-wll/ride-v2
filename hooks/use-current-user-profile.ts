'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  socialMediaUrl: string | null;
  onboardingCompleted: boolean | null;
}

export const useCurrentUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (currentUserId: string) => {
    setLoading(true);
    setError(null);
    console.log(`Fetching profile for user: ${currentUserId}`);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('first_name, last_name, social_media_url, onboarding_completed')
      .eq('id', currentUserId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      setError(fetchError.message);
      setProfile(null);
    } else if (data) {
      console.log('Profile fetched:', data);
      setProfile({ 
        firstName: data.first_name, 
        lastName: data.last_name, 
        socialMediaUrl: data.social_media_url,
        onboardingCompleted: data.onboarding_completed
      });
    } else {
      console.log('No profile data found for user.');
      setProfile(null); // Or set default empty state
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user for profile hook:', userError);
        setError('Could not get user session.');
        setLoading(false);
        return;
      }

      const currentUserId = user.id;
      setUserId(currentUserId); // Store user ID
      await fetchProfile(currentUserId); // Perform initial fetch

      // Set up realtime listener
      console.log(`Setting up profile listener for user: ${currentUserId}`);
      channel = supabase
        .channel(`profile-data-changes-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUserId}` },
          (payload) => {
            console.log('Realtime profile change received:', payload);
            if (payload.new && typeof payload.new === 'object') {
              const newProfile: UserProfile = { 
                 firstName: profile?.firstName ?? null, 
                 lastName: profile?.lastName ?? null,
                 socialMediaUrl: profile?.socialMediaUrl ?? null,
                 onboardingCompleted: profile?.onboardingCompleted ?? null
              }; 
              let changed = false;
              if ('first_name' in payload.new && payload.new.first_name !== profile?.firstName) {
                newProfile.firstName = payload.new.first_name;
                changed = true;
              }
              if ('last_name' in payload.new && payload.new.last_name !== profile?.lastName) {
                newProfile.lastName = payload.new.last_name;
                changed = true;
              }
              if ('social_media_url' in payload.new && payload.new.social_media_url !== profile?.socialMediaUrl) {
                newProfile.socialMediaUrl = payload.new.social_media_url;
                changed = true;
              }
              if ('onboarding_completed' in payload.new && payload.new.onboarding_completed !== profile?.onboardingCompleted) {
                 newProfile.onboardingCompleted = payload.new.onboarding_completed;
                 changed = true;
              }

              if (changed) {
                console.log('Updating profile state from realtime:', newProfile);
                setProfile(newProfile);
              }
            }
          }
        )
        .subscribe();
    };

    setup().catch(err => {
      console.error("Error in profile hook setup:", err);
      setError("Setup failed");
      setLoading(false);
    });

    return () => {
      if (channel) {
        console.log(`Removing profile listener for user: ${userId}`);
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  // Add userId to the return object
  return { profile, userId, loading, error, fetchProfile };
}; 
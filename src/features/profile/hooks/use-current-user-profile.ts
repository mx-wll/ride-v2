'use client'

import { getCurrentUser } from '@/shared/api/auth'
import { getCurrentUserProfile } from '@/shared/api/profiles'
import { createClient } from '@/shared/supabase/client'
import { useEffect, useState, useCallback } from 'react'

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  socialMediaUrl: string | null;
  onboardingCompleted: boolean | null;
  avatarUrl: string | null;
}

export const useCurrentUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching current user profile');
    
    const response = await getCurrentUserProfile();
    
    if (!response.success) {
      console.error('Error fetching profile:', response.error);
      setError(response.error?.userMessage || 'Failed to fetch profile');
      setProfile(null);
    } else if (response.data) {
      console.log('Profile fetched:', response.data);
      setProfile({ 
        firstName: response.data.first_name, 
        lastName: response.data.last_name, 
        socialMediaUrl: response.data.social_media_url,
        onboardingCompleted: response.data.onboarding_completed,
        avatarUrl: response.data.avatar_url
      });
    } else {
      console.log('No profile data found for user.');
      setProfile(null); // Or set default empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const userResponse = await getCurrentUser();

      if (!userResponse.success || !userResponse.data) {
        console.error('Error fetching user for profile hook:', userResponse.error);
        setError('Could not get user session.');
        setLoading(false);
        return;
      }

      const currentUserId = userResponse.data.id;
      setUserId(currentUserId); // Store user ID
      await fetchProfile(); // Perform initial fetch

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
                 onboardingCompleted: profile?.onboardingCompleted ?? null,
                 avatarUrl: profile?.avatarUrl ?? null
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
              if ('avatar_url' in payload.new && payload.new.avatar_url !== profile?.avatarUrl) {
                newProfile.avatarUrl = payload.new.avatar_url;
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
  }, [fetchProfile]);

  // Add userId to the return object
  return { profile, userId, loading, error, fetchProfile };
}; 
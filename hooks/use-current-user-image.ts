import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)
  const supabase = createClient()
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      // Get current user ID first
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user for image hook:', userError);
        setImage(null);
        return;
      }

      const userId = user.id;
      userIdRef.current = userId;

      // Initial Fetch
      console.log(`Performing initial fetch for user ${userId}'s avatar_url.`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile image initially:', profileError);
      } else {
        const initialImageUrl = profileData?.avatar_url ?? null;
        console.log("Initial fetch completed. Setting image to:", initialImageUrl);
        setImage(initialImageUrl);
      }

      // Set up listener only if we have a userId
      console.log(`Setting up realtime listener for profile changes for user ${userId}.`);
      channel = supabase
        .channel(`profile-changes-${userId}`) // Unique channel name per user
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            console.log('Realtime profile change received!', payload);
            if (payload.new && typeof payload.new === 'object' && 'avatar_url' in payload.new) {
               const newImageUrl = payload.new.avatar_url as string | null;
               console.log("Realtime update detected. Setting image to:", newImageUrl);
               setImage(newImageUrl);
            } else {
               console.log("Realtime update received, but 'avatar_url' not found or payload structure unexpected.");
            }
          }
        )
        .subscribe((status, err) => {
           if (status === 'SUBSCRIBED') {
             console.log(`Realtime channel SUBSCRIBED for user ${userId}`);
           } else if (status === 'TIMED_OUT') {
             console.warn(`Realtime channel subscription timed out for user ${userId}`);
           } else if (status === 'CHANNEL_ERROR') {
             console.error(`Realtime channel error for user ${userId}:`, err);
           } else {
             console.log(`Realtime channel status for user ${userId}: ${status}`);
           }
        });
    };

    setup().catch(err => {
       console.error("Error in useCurrentUserImage setup:", err);
    });

    // Cleanup subscription on component unmount
    return () => {
      const cleanupUserId = userIdRef.current;
      if (channel) {
        console.log(`Removing realtime channel subscription for user ${cleanupUserId || 'unknown'}`);
        supabase.removeChannel(channel)
          .then(status => console.log("Realtime channel removed with status:", status))
          .catch(err => console.error("Error removing realtime channel:", err));
      }
    };
  }, [supabase]);

  return image
}

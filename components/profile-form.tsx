'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUserProfile } from '@/hooks/use-current-user-profile'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { FileUploadDemo } from '@/components/file-upload-demo'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { toast } from "sonner"

export const ProfileForm = () => {
  const router = useRouter()
  const { profile, userId, loading: profileLoading, error: profileError } = useCurrentUserProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const supabase = createClient();

  // Update local state when profile data is loaded or changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setSocialMediaUrl(profile.socialMediaUrl ?? '');
    }
  }, [profile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setSaveError("User ID not found. Cannot save profile.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const toastId = toast.loading("Saving profile...");

    console.log(`Saving profile for user: ${userId}`);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        social_media_url: socialMediaUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      toast.error(`Error: ${updateError.message}`, { id: toastId });
      setSaveError(updateError.message);
      setIsSaving(false);
    } else {
      console.log('Profile updated successfully.');
      toast.success("Profile saved successfully!", { id: toastId });
      router.push('/protected');
    }
  };

  if (profileLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading Profile...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (profileError) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground">{profileError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialMediaUrl">Social Media Link</Label>
            <Input
              id="socialMediaUrl"
              type="url"
              value={socialMediaUrl}
              onChange={(e) => setSocialMediaUrl(e.target.value)}
              placeholder="e.g., https://linkedin.com/in/yourprofile"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <CurrentUserAvatar className="h-16 w-16" />
            {userId ? (
              <FileUploadDemo userId={userId} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading uploader...</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div>
            {saveError && <p className="text-sm text-destructive">Error: {saveError}</p>}
          </div>
          <Button className="w-full mt-4 " type="submit" disabled={isSaving || profileLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}; 
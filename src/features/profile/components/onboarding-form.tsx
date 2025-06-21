'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/shared/api/profiles'
import { useCurrentUserProfile } from '@/features/profile/hooks/use-current-user-profile'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card'
import { Loader2 } from 'lucide-react'
import { FileUploadDemo } from '@/shared/components/file-upload-demo'
import { CurrentUserAvatar } from '@/features/profile/components/current-user-avatar'
import { toast } from "sonner"

export const OnboardingForm = () => {
  const router = useRouter()
  // Use the profile hook, but we primarily need the userId and the initial onboarding status
  const { profile, userId, loading: profileLoading, error: profileError } = useCurrentUserProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Note: Social media link is not part of this lightweight onboarding
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Single error state for simplicity

  // Pre-fill form if data already exists (e.g., user refreshes page)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      // Redirect if onboarding is already completed
      if (profile.onboardingCompleted) {
        console.log("Onboarding already completed, redirecting...");
        router.replace('/protected'); // Use replace to avoid adding onboarding to history
      }
    }
  }, [profile, router]);

  // Function to update onboarding status and optionally profile data
  const completeOnboarding = async (updateData: { first_name?: string; last_name?: string } = {}) => {
    if (!userId) {
      setFormError("User information not available. Please try again later.");
      return false;
    }

    setFormError(null);
    const updatePayload = {
      ...updateData,
      onboarding_completed: true,
    };

    console.log(`Completing onboarding for user: ${userId}`);
    const response = await updateProfile(userId, updatePayload);

    if (!response.success) {
      console.error('Error completing onboarding:', response.error);
      setFormError(response.error?.userMessage || 'Failed to complete onboarding');
      return false;
    } else {
      console.log('Onboarding completed successfully.');
      // No need to manually refetch profile, realtime should handle it or next page load
      router.push('/protected'); // Redirect to main app area
      return true;
    }
  };

  // Handle saving the profile details
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading("Saving your profile...");

    const success = await completeOnboarding({
      first_name: firstName,
      last_name: lastName,
    });

    if (success) {
      toast.success("Profile saved! Welcome!", { id: toastId });
    } else {
      toast.error(`Error saving profile: ${formError}`, { id: toastId });
    }
    setIsSaving(false);
  };

  // Handle skipping the form
  const handleSkip = async () => {
    setIsSkipping(true);
    const toastId = toast.loading("Setting things up...");

    const success = await completeOnboarding(); // Only update the flag

    if (success) {
      toast.success("Profile setup skipped for now. Welcome!", { id: toastId });
    } else {
      toast.error(`Error skipping setup: ${formError}`, { id: toastId });
    }
    setIsSkipping(false);
  };

  // Display loading state
  if (profileLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Display error state if profile fetch failed
  if (profileError) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground">Could not load user data: {profileError}</p>
          <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  // Render the main form
  return (
    <Card className="w-full max-w-lg"> {/* Increased max-width slightly */}
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Oberland Racing!</CardTitle>
          <CardDescription>
            Lets set up your profile quickly. This helps others recognize you in the app.
            You can always update this later in your settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6"> {/* Increased spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"> {/* Responsive grid + added margin top */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                disabled={isSaving || isSkipping}
                aria-required="true" // Indicate required for better accessibility, though not strictly enforced here
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                disabled={isSaving || isSkipping}
                aria-required="true"
              />
            </div>
          </div>
          
          <div className="space-y-3"> {/* Increased spacing */}
            <Label>Profile Picture (Optional)</Label>
            <div className="flex items-center gap-4">
              <CurrentUserAvatar className="h-16 w-16" />
              {userId ? (
                <FileUploadDemo userId={userId} />
              ) : (
                <p className="text-sm text-muted-foreground">Uploader unavailable</p>
              )}
            </div>
             <p className="text-xs text-muted-foreground">Upload a picture to make your profile stand out.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6"> {/* Adjusted footer layout */}
           {formError && <p className="text-sm text-destructive w-full text-center sm:text-left">Error: {formError}</p>}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
             <Button 
                variant="outline" 
                type="button" 
                onClick={handleSkip} 
                disabled={isSaving || isSkipping}
                className="w-full sm:w-auto order-last sm:order-first" // Adjust order on mobile
              >
               {isSkipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Skip for now
             </Button>
            <Button 
              type="submit" 
              disabled={isSaving || isSkipping || !firstName || !lastName} // Disable save if names are empty
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save and Continue'
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}; 
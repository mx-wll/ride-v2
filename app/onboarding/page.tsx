'use client'

import { OnboardingForm } from '@/features/profile/components/onboarding-form'

// This page will be protected by middleware, ensuring only authenticated users
// who haven't completed onboarding can access it.

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-background">
      {/* OnboardingForm handles its own data fetching and logic */}
      <OnboardingForm />
    </div>
  )
} 
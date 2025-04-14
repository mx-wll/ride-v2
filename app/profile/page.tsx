'use client'

import { ProfileForm } from '@/components/profile-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'


export default function ProfilePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 gap-6 px-4">

      <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      <h1 className="text-2xl font-semibold">Your Profile</h1>

      {/* ProfileForm fetches its own data via its hook */}
      <ProfileForm />

      {/* You might want to add other profile elements here */}
    </div>
  )
} 
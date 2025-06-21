'use client'

import { signOut } from '@/shared/api/auth'
import { Button } from '@/shared/components/ui/button'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Logout</Button>
}

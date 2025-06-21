'use client'

import { useCurrentUserImage } from '@/features/profile/hooks/use-current-user-image'
import { useCurrentUserName } from '@/features/profile/hooks/use-current-user-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { useEffect } from 'react'
import { cn } from '@/shared/utils'

interface CurrentUserAvatarProps {
  className?: string;
}

export const CurrentUserAvatar = ({ className }: CurrentUserAvatarProps) => {
  const profileImage = useCurrentUserImage()
  const name = useCurrentUserName()

  useEffect(() => {
    console.log("[CurrentUserAvatar] profileImage updated:", profileImage);
  }, [profileImage]);

  const initials = name
    ?.split(' ')
    ?.map((word) => word[0])
    ?.join('')
    ?.toUpperCase()

  return (
    <Avatar className={cn(className)}>
      {profileImage && <AvatarImage src={profileImage} alt={initials ?? 'User Avatar'} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}

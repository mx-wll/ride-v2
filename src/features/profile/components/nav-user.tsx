import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { CurrentUserAvatar } from '@/features/profile/components/current-user-avatar'
import { LogoutButton } from '@/features/auth/components/logout-button'
import { Button } from '@/shared/components/ui/button'

// Define props for the component
interface NavUserProps {
  user: {
    firstName: string | null | undefined; // Allow null/undefined for fallback
  };
}

// Use the props
export default function NavUser({ user }: NavUserProps) {
  return <div>
    <DropdownMenu>
      {/* Use the user's first name or a fallback */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-14"><CurrentUserAvatar className="h-10 w-10 mr-2"/> <span className="font-semibold">{user?.firstName || 'Account'}</span></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/profile">My Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/team">Team</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem><LogoutButton /></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

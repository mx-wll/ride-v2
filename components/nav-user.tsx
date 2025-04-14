import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'

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
      <DropdownMenuTrigger>
        <Button variant="ghost" className="h-14"><CurrentUserAvatar className="h-10 w-10 mr-2"/> <span className="font-semibold">{user?.firstName || 'Account'}</span></Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">My Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
        <DropdownMenuItem><LogoutButton /></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

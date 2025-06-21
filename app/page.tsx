import { Button } from "@/shared/components/ui/button";
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold mb-6">Welcome to Upperland Racing</h1>
        <Button variant="secondary" className="w-48" asChild>
            <Link href="/auth/login" passHref>
                Login
            </Link>
        </Button>
        <Button variant="default" className="w-48" asChild>
            <Link href="/auth/sign-up" passHref>
                Sign Up
            </Link>
        </Button>
    </div>
  );
}

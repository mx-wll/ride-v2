import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Paths exempt from auth/onboarding checks
  const publicPaths = ['/auth/login', '/auth/sign-up', '/auth/callback', '/auth/confirm']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) || pathname === '/' // Include root page
  const isOnboardingPath = pathname.startsWith('/onboarding')

  if (!user) {
    // If no user and not trying to access a public path, redirect to login
    if (!isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      console.log('Middleware: No user, redirecting to login', url.toString());
      return NextResponse.redirect(url)
    }
    // Allow access to public paths if no user
     console.log('Middleware: No user, allowing access to public path', pathname);
    return supabaseResponse // Proceed with the original response (contains cookie handling)
  }

  // --- User is authenticated, check onboarding status --- 

  console.log('Middleware: User authenticated, checking onboarding status for path:', pathname);
  
  // Fetch the onboarding status from the user's profile
  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle in case profile creation is delayed

  if (profileError) {
      console.error('Middleware: Error fetching profile for onboarding check:', profileError);
      // Allow access but log error. Might need a dedicated error page later.
      return supabaseResponse;
  }

  const onboardingCompleted = profile?.onboarding_completed;
  console.log(`Middleware: Onboarding status for user ${user.id}: ${onboardingCompleted}`);

  // Redirect to onboarding if not completed and not already there or on a public path
  if (onboardingCompleted === false && !isOnboardingPath && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      console.log('Middleware: Onboarding incomplete, redirecting to /onboarding', url.toString());
      const redirectResponse = NextResponse.redirect(url)
      // Copy cookies individually
      supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie); 
      });
      return redirectResponse;
  }

  // Redirect away from onboarding if already completed
  if (onboardingCompleted === true && isOnboardingPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/protected' // Or your main app route
      console.log('Middleware: Onboarding complete, redirecting away from /onboarding to /protected', url.toString());
      const redirectResponse = NextResponse.redirect(url)
      // Copy cookies individually
      supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
  }
  
  // --- Special case: User logged in but trying to access public auth pages --- 
  if (user && isPublicPath && pathname !== '/') { // Allow access to root page even if logged in
     const url = request.nextUrl.clone()
     url.pathname = '/protected' // Redirect logged-in users away from login/signup
     console.log('Middleware: User logged in, redirecting away from public auth path:', pathname, 'to', url.pathname);
     const redirectResponse = NextResponse.redirect(url)
     // Copy cookies individually
     supabaseResponse.cookies.getAll().forEach(cookie => {
         redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
     });
     return redirectResponse;
  }

  console.log('Middleware: Allowing request to proceed for path:', pathname);
  // Allow access to the requested path if none of the above conditions met
  // (e.g., onboarding complete and accessing /protected, or onboarding incomplete and accessing /onboarding)
  return supabaseResponse // Continue with the original response
}

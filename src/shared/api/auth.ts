/**
 * Authentication API layer
 * Centralizes all auth-related Supabase calls with consistent error handling
 */

import { createClient } from '../supabase/client'
import { 
  SignUpInput, 
  SignInInput, 
  AuthUser,
  ApiResponse,
  ApiErrorCode
} from '../types'
import { handleApiOperation, AppError } from '../utils/api-error'

const supabase = createClient()

/**
 * Sign up a new user with email and password
 * @param input - Sign up credentials and metadata
 * @returns Promise with user data or error
 */
export async function signUp(input: SignUpInput): Promise<ApiResponse<AuthUser>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: input.metadata || {}
      }
    })

    if (error) throw error
    if (!data.user) {
      throw new AppError(
        ApiErrorCode.SERVER_ERROR,
        'No user returned from signup',
        'Sign up failed. Please try again.'
      )
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      user_metadata: data.user.user_metadata
    }
  })
}

/**
 * Sign in user with email and password
 * @param input - Sign in credentials
 * @returns Promise with user data or error
 */
export async function signIn(input: SignInInput): Promise<ApiResponse<AuthUser>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password
    })

    if (error) throw error
    if (!data.user) {
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        'No user returned from signin',
        'Invalid email or password.'
      )
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      user_metadata: data.user.user_metadata
    }
  })
}

/**
 * Sign out the current user
 * @returns Promise with success status or error
 */
export async function signOut(): Promise<ApiResponse<null>> {
  return handleApiOperation(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return null
  })
}

/**
 * Send password reset email
 * @param email - User's email address
 * @returns Promise with success status or error
 */
export async function resetPassword(email: string): Promise<ApiResponse<null>> {
  return handleApiOperation(async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    })
    
    if (error) throw error
    return null
  })
}

/**
 * Update user password (must be called after reset password flow)
 * @param newPassword - New password
 * @returns Promise with success status or error
 */
export async function updatePassword(newPassword: string): Promise<ApiResponse<AuthUser>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
    if (!data.user) {
      throw new AppError(
        ApiErrorCode.SERVER_ERROR,
        'No user returned from password update',
        'Password update failed. Please try again.'
      )
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      user_metadata: data.user.user_metadata
    }
  })
}

/**
 * Get current authenticated user
 * @returns Promise with user data or null if not authenticated
 */
export async function getCurrentUser(): Promise<ApiResponse<AuthUser | null>> {
  return handleApiOperation(async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    if (!user) return null

    return {
      id: user.id,
      email: user.email!,
      user_metadata: user.user_metadata
    }
  })
}

/**
 * Get current session
 * @returns Promise with session data or null if not authenticated
 */
export async function getCurrentSession(): Promise<ApiResponse<unknown>> {
  return handleApiOperation(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error
    return session
  })
}

/**
 * Listen to auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}
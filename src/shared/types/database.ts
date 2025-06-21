/**
 * Database types inferred from Supabase schema
 */

/**
 * Base database row with common fields
 */
export interface DatabaseRow {
  id: string
  created_at: string
  updated_at?: string
}

/**
 * User profile from the profiles table
 */
export interface Profile extends DatabaseRow {
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  social_media_url: string | null
  onboarding_completed: boolean | null
}

/**
 * Ride from the rides table
 */
export interface Ride extends DatabaseRow {
  creator_id: string
  start_time: string
  end_time: string
  preset: 'now' | 'lunch' | 'afternoon' | 'custom' | null
  distance_km: number | null
  bike_type: 'road' | 'mtb' | 'hybrid' | 'gravel' | 'other' | null
  status: 'open' | 'closed' | 'cancelled'
  starting_point_address: string | null
  starting_point_coords: string | null
}

/**
 * Ride participant from the ride_participants table
 */
export interface RideParticipant {
  ride_id: string
  user_id: string
  created_at: string
}

/**
 * Enhanced ride with creator and participants populated
 */
export interface RideWithDetails extends Ride {
  creator: Profile
  participants: Array<{
    user_id: string
    profiles: Profile | null
  }>
  participant_count: number
  is_creator: boolean
  is_participant: boolean
}

/**
 * Profile with additional computed fields
 */
export interface ProfileWithStats extends Profile {
  rides_created: number
  rides_joined: number
  display_name: string
}

/**
 * Input types for creating/updating records
 */

export interface CreateRideInput {
  start_time: string
  end_time: string
  preset?: 'now' | 'lunch' | 'afternoon' | 'custom'
  distance_km?: number
  bike_type?: 'road' | 'mtb' | 'hybrid' | 'gravel' | 'other'
  starting_point_address?: string
  starting_point_coords?: string
}

export interface UpdateRideInput {
  start_time?: string
  end_time?: string
  preset?: 'now' | 'lunch' | 'afternoon' | 'custom'
  distance_km?: number
  bike_type?: 'road' | 'mtb' | 'hybrid' | 'gravel' | 'other'
  status?: 'open' | 'closed' | 'cancelled'
  starting_point_address?: string
  starting_point_coords?: string
}

export interface UpdateProfileInput {
  first_name?: string
  last_name?: string
  avatar_url?: string
  social_media_url?: string
  onboarding_completed?: boolean
}

/**
 * Auth types
 */
export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

export interface SignUpInput {
  email: string
  password: string
  metadata?: {
    full_name?: string
  }
}

export interface SignInInput {
  email: string
  password: string
}

/**
 * Upload types for file handling
 */
export interface UploadResult {
  path: string
  fullPath: string
  publicUrl: string
}

/**
 * Supabase response types
 */
export interface SupabaseResponse<T> {
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}

/**
 * Real-time subscription types
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimePayload<T = unknown> {
  eventType: RealtimeEvent
  new: T
  old: T
  schema: string
  table: string
}
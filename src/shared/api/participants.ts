/**
 * Ride Participants API layer
 * Centralizes all ride participation-related Supabase calls with consistent error handling
 */

import { createClient } from '../supabase/client'
import { 
  RideParticipant,
  Profile,
  ApiResponse,
  ApiErrorCode
} from '../types'
import { handleApiOperation, AppError } from '../utils/api-error'

const supabase = createClient()

/**
 * Join a ride as a participant
 * @param rideId - ID of the ride to join
 * @param userId - ID of the user joining (optional, defaults to current user)
 * @returns Promise with participation data or error
 */
export async function joinRide(rideId: string, userId?: string): Promise<ApiResponse<RideParticipant>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to join a ride.'
      )
    }

    const participantUserId = userId || user.id

    // Check if ride exists and is open
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, status, creator_id, start_time')
      .eq('id', rideId)
      .single()

    if (rideError) {
      if (rideError.code === 'PGRST116') {
        throw new AppError(
          ApiErrorCode.NOT_FOUND,
          'Ride not found',
          'The ride you are trying to join does not exist.'
        )
      }
      throw rideError
    }

    // Check if ride is still open
    if (ride.status !== 'open') {
      throw new AppError(
        ApiErrorCode.RIDE_EXPIRED,
        'Ride is not open',
        'This ride is no longer accepting participants.'
      )
    }

    // Check if ride has started
    const rideStartTime = new Date(ride.start_time)
    const now = new Date()
    if (rideStartTime <= now) {
      throw new AppError(
        ApiErrorCode.RIDE_EXPIRED,
        'Ride has started',
        'This ride has already started.'
      )
    }

    // Check if user is trying to join their own ride
    if (ride.creator_id === participantUserId) {
      throw new AppError(
        ApiErrorCode.ALREADY_PARTICIPANT,
        'User is ride creator',
        'You cannot join a ride you created.'
      )
    }

    // Check if user is already a participant
    const { data: existingParticipation, error: checkError } = await supabase
      .from('ride_participants')
      .select('*')
      .eq('ride_id', rideId)
      .eq('user_id', participantUserId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingParticipation) {
      throw new AppError(
        ApiErrorCode.ALREADY_PARTICIPANT,
        'User already participant',
        'You are already participating in this ride.'
      )
    }

    // Add participant
    const { data, error } = await supabase
      .from('ride_participants')
      .insert({
        ride_id: rideId,
        user_id: participantUserId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  })
}

/**
 * Leave a ride (remove participation)
 * @param rideId - ID of the ride to leave
 * @param userId - ID of the user leaving (optional, defaults to current user)
 * @returns Promise with success status or error
 */
export async function leaveRide(rideId: string, userId?: string): Promise<ApiResponse<null>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to leave a ride.'
      )
    }

    const participantUserId = userId || user.id

    // Check if ride exists
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, creator_id, start_time')
      .eq('id', rideId)
      .single()

    if (rideError) {
      if (rideError.code === 'PGRST116') {
        throw new AppError(
          ApiErrorCode.NOT_FOUND,
          'Ride not found',
          'The ride you are trying to leave does not exist.'
        )
      }
      throw rideError
    }

    // Check if user is trying to leave their own ride
    if (ride.creator_id === participantUserId) {
      throw new AppError(
        ApiErrorCode.CANNOT_LEAVE_OWN_RIDE,
        'User is ride creator',
        'You cannot leave a ride you created. Cancel the ride instead.'
      )
    }

    // Check if user is actually a participant
    const { error: checkError } = await supabase
      .from('ride_participants')
      .select('*')
      .eq('ride_id', rideId)
      .eq('user_id', participantUserId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new AppError(
          ApiErrorCode.NOT_PARTICIPANT,
          'User not participant',
          'You are not participating in this ride.'
        )
      }
      throw checkError
    }

    // Remove participation
    const { error } = await supabase
      .from('ride_participants')
      .delete()
      .eq('ride_id', rideId)
      .eq('user_id', participantUserId)

    if (error) throw error
    return null
  })
}

/**
 * Get all participants for a ride
 * @param rideId - ID of the ride to get participants for
 * @returns Promise with array of participants or error
 */
export async function getRideParticipants(rideId: string): Promise<ApiResponse<Array<{
  user_id: string
  profile: Profile
  joined_at: string
}>>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('ride_participants')
      .select(`
        user_id,
        created_at,
        profiles!ride_participants_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          social_media_url,
          onboarding_completed,
          created_at,
          updated_at
        )
      `)
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Transform data 
    const participants = (data || []).map((participant: unknown) => {
      const p = participant as {
        user_id: string;
        created_at: string;
        profiles: Profile;
      }
      return {
        user_id: p.user_id,
        profile: p.profiles,
        joined_at: p.created_at
      }
    })

    return participants
  })
}

/**
 * Get rides that a user is participating in
 * @param userId - ID of the user (optional, defaults to current user)
 * @returns Promise with array of ride IDs or error
 */
export async function getUserParticipations(userId?: string): Promise<ApiResponse<string[]>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user && !userId) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to view participations.'
      )
    }

    const targetUserId = userId || user!.id

    const { data, error } = await supabase
      .from('ride_participants')
      .select('ride_id')
      .eq('user_id', targetUserId)

    if (error) throw error

    return (data || []).map(participation => participation.ride_id)
  })
}

/**
 * Check if current user is participating in a specific ride
 * @param rideId - ID of the ride to check
 * @param userId - ID of the user (optional, defaults to current user)
 * @returns Promise with participation status or error
 */
export async function isUserParticipating(rideId: string, userId?: string): Promise<ApiResponse<boolean>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user && !userId) {
      return false
    }

    const targetUserId = userId || user!.id

    const { data, error } = await supabase
      .from('ride_participants')
      .select('user_id')
      .eq('ride_id', rideId)
      .eq('user_id', targetUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return false
      }
      throw error
    }

    return !!data
  })
}

/**
 * Get participant count for a ride
 * @param rideId - ID of the ride to count participants for
 * @returns Promise with participant count or error
 */
export async function getRideParticipantCount(rideId: string): Promise<ApiResponse<number>> {
  return handleApiOperation(async () => {
    const { count, error } = await supabase
      .from('ride_participants')
      .select('*', { count: 'exact', head: true })
      .eq('ride_id', rideId)

    if (error) throw error
    return count || 0
  })
}
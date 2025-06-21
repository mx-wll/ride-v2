/**
 * Rides API layer
 * Centralizes all ride-related Supabase calls with consistent error handling
 */

import { createClient } from '../supabase/client'
import { 
  Ride, 
  RideWithDetails,
  CreateRideInput, 
  UpdateRideInput,
  ApiResponse,
  QueryOptions,
  ApiErrorCode
} from '../types'
import { handleApiOperation, AppError } from '../utils/api-error'

const supabase = createClient()

/**
 * Get all rides with optional filtering and sorting
 * @param options - Query options for filtering, sorting, etc.
 * @returns Promise with array of rides or error
 */
export async function getAllRides(options?: QueryOptions): Promise<ApiResponse<RideWithDetails[]>> {
  return handleApiOperation(async () => {
    let query = supabase
      .from('rides')
      .select(`
        *,
        creator:profiles!rides_creator_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        participants:ride_participants(
          user_id,
          profiles!ride_participants_user_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)

    // Apply filters
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort.field, { 
        ascending: options.sort.direction === 'asc' 
      })
    } else {
      // Default sort by creation time, newest first
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) throw error

    // Get current user for is_creator and is_participant flags
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id

    // Transform data to include computed fields
    const ridesWithDetails: RideWithDetails[] = (data || []).map(ride => ({
      ...ride,
      creator: ride.creator,
      participants: ride.participants || [],
      participant_count: ride.participants?.length || 0,
      is_creator: currentUserId === ride.creator_id,
      is_participant: currentUserId ? 
        ride.participants?.some((p: { user_id: string }) => p.user_id === currentUserId) || false 
        : false
    }))

    return ridesWithDetails
  })
}

/**
 * Get a single ride by ID with full details
 * @param id - Ride ID to fetch
 * @returns Promise with ride data or error
 */
export async function getRideById(id: string): Promise<ApiResponse<RideWithDetails | null>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        creator:profiles!rides_creator_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        participants:ride_participants(
          user_id,
          profiles!ride_participants_user_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    // Get current user for flags
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id

    const rideWithDetails: RideWithDetails = {
      ...data,
      creator: data.creator,
      participants: data.participants || [],
      participant_count: data.participants?.length || 0,
      is_creator: currentUserId === data.creator_id,
      is_participant: currentUserId ? 
        data.participants?.some((p: { user_id: string }) => p.user_id === currentUserId) || false 
        : false
    }

    return rideWithDetails
  })
}

/**
 * Create a new ride
 * @param rideData - Ride data to create
 * @returns Promise with created ride data or error
 */
export async function createRide(rideData: CreateRideInput): Promise<ApiResponse<Ride>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to create a ride.'
      )
    }

    const { data, error } = await supabase
      .from('rides')
      .insert({
        ...rideData,
        creator_id: user.id,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  })
}

/**
 * Update an existing ride
 * @param id - Ride ID to update
 * @param updates - Updates to apply
 * @returns Promise with updated ride data or error
 */
export async function updateRide(id: string, updates: UpdateRideInput): Promise<ApiResponse<Ride>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to update a ride.'
      )
    }

    // First check if user is the creator
    const { data: existingRide, error: fetchError } = await supabase
      .from('rides')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new AppError(
          ApiErrorCode.NOT_FOUND,
          'Ride not found',
          'The ride you are trying to update does not exist.'
        )
      }
      throw fetchError
    }

    if (existingRide.creator_id !== user.id) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'User is not the ride creator',
        'You can only update rides that you created.'
      )
    }

    const { data, error } = await supabase
      .from('rides')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  })
}

/**
 * Delete a ride
 * @param id - Ride ID to delete
 * @returns Promise with success status or error
 */
export async function deleteRide(id: string): Promise<ApiResponse<null>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to delete a ride.'
      )
    }

    // First check if user is the creator
    const { data: existingRide, error: fetchError } = await supabase
      .from('rides')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new AppError(
          ApiErrorCode.NOT_FOUND,
          'Ride not found',
          'The ride you are trying to delete does not exist.'
        )
      }
      throw fetchError
    }

    if (existingRide.creator_id !== user.id) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'User is not the ride creator',
        'You can only delete rides that you created.'
      )
    }

    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', id)

    if (error) throw error
    return null
  })
}

/**
 * Get rides created by current user
 * @returns Promise with array of user's rides or error
 */
export async function getCurrentUserRides(): Promise<ApiResponse<RideWithDetails[]>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to view your rides.'
      )
    }

    return getAllRides({ 
      filter: { creator_id: user.id },
      sort: { field: 'created_at', direction: 'desc' }
    }).then(response => response.data || [])
  })
}

/**
 * Get rides where current user is a participant
 * @returns Promise with array of participated rides or error
 */
export async function getCurrentUserParticipatedRides(): Promise<ApiResponse<RideWithDetails[]>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to view your rides.'
      )
    }

    // Get ride IDs where user is a participant
    const { data: participations, error: participationError } = await supabase
      .from('ride_participants')
      .select('ride_id')
      .eq('user_id', user.id)

    if (participationError) throw participationError

    if (!participations || participations.length === 0) {
      return []
    }

    const rideIds = participations.map(p => p.ride_id)

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        creator:profiles!rides_creator_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        participants:ride_participants(
          user_id,
          profiles!ride_participants_user_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .in('id', rideIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform data
    const ridesWithDetails: RideWithDetails[] = (data || []).map(ride => ({
      ...ride,
      creator: ride.creator,
      participants: ride.participants || [],
      participant_count: ride.participants?.length || 0,
      is_creator: user.id === ride.creator_id,
      is_participant: true // We know user is participant since we filtered by it
    }))

    return ridesWithDetails
  })
}
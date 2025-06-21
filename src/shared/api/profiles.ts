/**
 * Profiles API layer
 * Centralizes all profile-related Supabase calls with consistent error handling
 */

import { createClient } from '../supabase/client'
import { 
  Profile, 
  UpdateProfileInput, 
  ProfileWithStats,
  ApiResponse,
  UploadResult,
  ApiErrorCode
} from '../types'
import { handleApiOperation, AppError } from '../utils/api-error'

const supabase = createClient()

/**
 * Get a user profile by ID
 * @param userId - User ID to fetch profile for
 * @returns Promise with profile data or error
 */
export async function getProfile(userId: string): Promise<ApiResponse<Profile | null>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // If profile doesn't exist, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  })
}

/**
 * Get current user's profile
 * @returns Promise with current user's profile or error
 */
export async function getCurrentUserProfile(): Promise<ApiResponse<Profile | null>> {
  return handleApiOperation(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'No authenticated user',
        'Please log in to access your profile.'
      )
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  })
}

/**
 * Update a user profile
 * @param userId - User ID to update profile for
 * @param updates - Profile updates to apply
 * @returns Promise with updated profile data or error
 */
export async function updateProfile(
  userId: string, 
  updates: UpdateProfileInput
): Promise<ApiResponse<Profile>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  })
}

/**
 * Create a new profile (usually called after user signup)
 * @param userId - User ID to create profile for
 * @param profileData - Initial profile data
 * @returns Promise with created profile data or error
 */
export async function createProfile(
  userId: string,
  profileData: Partial<UpdateProfileInput>
): Promise<ApiResponse<Profile>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...profileData,
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
 * Get all profiles (for team page, etc.)
 * @returns Promise with array of profiles or error
 */
export async function getAllProfiles(): Promise<ApiResponse<Profile[]>> {
  return handleApiOperation(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  })
}

/**
 * Get profile with statistics (rides created, joined, etc.)
 * @param userId - User ID to get stats for
 * @returns Promise with profile with stats or error
 */
export async function getProfileWithStats(userId: string): Promise<ApiResponse<ProfileWithStats | null>> {
  return handleApiOperation(async () => {
    // Get base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return null
      }
      throw profileError
    }

    // Get rides created count
    const { count: ridesCreated, error: createdError } = await supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)

    if (createdError) throw createdError

    // Get rides joined count  
    const { count: ridesJoined, error: joinedError } = await supabase
      .from('ride_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (joinedError) throw joinedError

    const displayName = profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}`
      : profile.first_name || profile.last_name || 'Anonymous'

    return {
      ...profile,
      rides_created: ridesCreated || 0,
      rides_joined: ridesJoined || 0,
      display_name: displayName
    }
  })
}

/**
 * Upload avatar image
 * @param file - Image file to upload
 * @param userId - User ID for the avatar
 * @returns Promise with upload result or error
 */
export async function uploadAvatar(file: File, userId: string): Promise<ApiResponse<UploadResult>> {
  return handleApiOperation(async () => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath)

    return {
      path: filePath,
      fullPath: `profile-pictures/${filePath}`,
      publicUrl
    }
  })
}

/**
 * Delete avatar image
 * @param userId - User ID whose avatar to delete
 * @returns Promise with success status or error
 */
export async function deleteAvatar(userId: string): Promise<ApiResponse<null>> {
  return handleApiOperation(async () => {
    // List all files for this user in avatars folder
    const { data: files, error: listError } = await supabase.storage
      .from('profile-pictures')
      .list(`avatars/${userId}`)

    if (listError) throw listError

    if (files && files.length > 0) {
      const filePaths = files.map(file => `avatars/${userId}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove(filePaths)

      if (deleteError) throw deleteError
    }

    return null
  })
}
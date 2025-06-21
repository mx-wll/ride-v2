/**
 * API layer exports
 * Centralized exports for all API functions
 */

// Auth API
export * as authApi from './auth'

// Profiles API  
export * as profilesApi from './profiles'

// Rides API
export * as ridesApi from './rides'

// Participants API
export * as participantsApi from './participants'

// Re-export individual functions for convenience
export {
  signUp,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange
} from './auth'

export {
  getProfile,
  getCurrentUserProfile,
  updateProfile,
  createProfile,
  getAllProfiles,
  getProfileWithStats,
  uploadAvatar,
  deleteAvatar
} from './profiles'

export {
  getAllRides,
  getRideById,
  createRide,
  updateRide,
  deleteRide,
  getCurrentUserRides,
  getCurrentUserParticipatedRides
} from './rides'

export {
  joinRide,
  leaveRide,
  getRideParticipants,
  getUserParticipations,
  isUserParticipating,
  getRideParticipantCount
} from './participants'
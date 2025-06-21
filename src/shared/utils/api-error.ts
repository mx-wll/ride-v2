/**
 * API error handling utilities
 */

import { ApiError, ApiErrorCode, ApiResponse } from '../types/api'

/**
 * Custom API Error class
 */
export class AppError extends Error {
  public code: string
  public userMessage: string
  public details?: unknown

  constructor(code: string, message: string, userMessage: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.userMessage = userMessage
    this.details = details
  }
}

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [ApiErrorCode.USER_NOT_FOUND]: 'User account not found.',
  [ApiErrorCode.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [ApiErrorCode.WEAK_PASSWORD]: 'Password is too weak. Please choose a stronger password.',
  [ApiErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [ApiErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ApiErrorCode.DUPLICATE_ENTRY]: 'This entry already exists.',
  [ApiErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ApiErrorCode.SERVER_ERROR]: 'Something went wrong. Please try again later.',
  [ApiErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [ApiErrorCode.RIDE_FULL]: 'This ride is already full.',
  [ApiErrorCode.RIDE_EXPIRED]: 'This ride has already started or expired.',
  [ApiErrorCode.ALREADY_PARTICIPANT]: 'You are already participating in this ride.',
  [ApiErrorCode.NOT_PARTICIPANT]: 'You are not participating in this ride.',
  [ApiErrorCode.CANNOT_LEAVE_OWN_RIDE]: 'You cannot leave a ride you created. Cancel the ride instead.'
}

/**
 * Create a standardized API error
 */
export function createApiError(
  code: ApiErrorCode,
  message?: string,
  userMessage?: string,
  details?: unknown
): ApiError {
  return {
    code,
    message: message || code,
    userMessage: userMessage || ERROR_MESSAGES[code] || 'An error occurred',
    details
  }
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
    success: true
  }
}

/**
 * Create an error response
 */
export function createErrorResponse<T = null>(error: ApiError): ApiResponse<T> {
  return {
    data: null,
    error,
    success: false
  }
}

/**
 * Map Supabase errors to our API error codes
 */
export function mapSupabaseError(supabaseError: unknown): ApiError {
  const error = supabaseError as { message?: string; code?: string }
  const message = error?.message || 'Unknown error'
  const code = error?.code
  
  // Map common Supabase error codes to our error codes
  if (message.includes('Invalid login credentials')) {
    return createApiError(ApiErrorCode.INVALID_CREDENTIALS)
  }
  
  if (message.includes('User not found')) {
    return createApiError(ApiErrorCode.USER_NOT_FOUND)
  }
  
  if (message.includes('Email already registered') || code === '23505') {
    return createApiError(ApiErrorCode.EMAIL_ALREADY_EXISTS)
  }
  
  if (message.includes('Password should be')) {
    return createApiError(ApiErrorCode.WEAK_PASSWORD)
  }
  
  if (message.includes('JWT') || message.includes('unauthorized')) {
    return createApiError(ApiErrorCode.UNAUTHORIZED)
  }
  
  if (code === '23503' || message.includes('foreign key')) {
    return createApiError(ApiErrorCode.NOT_FOUND, message, 'Referenced item not found')
  }
  
  if (code === '23505' || message.includes('duplicate')) {
    return createApiError(ApiErrorCode.DUPLICATE_ENTRY)
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return createApiError(ApiErrorCode.NETWORK_ERROR)
  }
  
  // Default to server error
  return createApiError(
    ApiErrorCode.SERVER_ERROR,
    message,
    'Something went wrong. Please try again later.',
    supabaseError
  )
}

/**
 * Handle async API operations with consistent error handling
 */
export async function handleApiOperation<T>(
  operation: () => Promise<T>
): Promise<ApiResponse<T>> {
  try {
    const data = await operation()
    return createSuccessResponse(data)
  } catch (error) {
    console.error('API operation failed:', error)
    
    if (error instanceof AppError) {
      return createErrorResponse({
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details
      })
    }
    
    const apiError = mapSupabaseError(error)
    return createErrorResponse(apiError)
  }
}
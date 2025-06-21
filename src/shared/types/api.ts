/**
 * Common API types and response wrappers
 */

/**
 * Standard API response wrapper for consistent error handling
 */
export interface ApiResponse<T = unknown> {
  data: T | null
  error: ApiError | null
  success: boolean
}

/**
 * API error structure with consistent error codes and user-friendly messages
 */
export interface ApiError {
  code: string
  message: string
  userMessage: string
  details?: unknown
}

/**
 * Common error codes used throughout the API layer
 */
export enum ApiErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Data errors
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // System errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Business logic errors
  RIDE_FULL = 'RIDE_FULL',
  RIDE_EXPIRED = 'RIDE_EXPIRED',
  ALREADY_PARTICIPANT = 'ALREADY_PARTICIPANT',
  NOT_PARTICIPANT = 'NOT_PARTICIPANT',
  CANNOT_LEAVE_OWN_RIDE = 'CANNOT_LEAVE_OWN_RIDE'
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Pagination response metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

/**
 * Common filter and sort options
 */
export interface QueryOptions {
  filter?: Record<string, unknown>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  include?: string[]
}
import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = { error: message }
  if (code) response.code = code
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details
  }

  // Log error server-side (but not to client)
  console.error(`[Error ${status}]`, message, code, details)

  return NextResponse.json(response, { status })
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: z.ZodError): NextResponse<ErrorResponse> {
  const firstError = error.errors[0]
  const message = firstError?.message || '유효하지 않은 입력입니다'

  console.error('Validation error:', error.errors)

  return errorResponse(
    message,
    400,
    'VALIDATION_ERROR',
    process.env.NODE_ENV === 'development' ? error.errors : undefined
  )
}

/**
 * Handle common API errors with proper status codes and messages
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return handleZodError(error)
  }

  // Custom error classes
  if (error instanceof UnauthorizedError) {
    return errorResponse(error.message, 401, 'UNAUTHORIZED')
  }
  if (error instanceof ForbiddenError) {
    return errorResponse(error.message, 403, 'FORBIDDEN')
  }
  if (error instanceof NotFoundError) {
    return errorResponse(error.message, 404, 'NOT_FOUND')
  }
  if (error instanceof BadRequestError) {
    return errorResponse(error.message, 400, 'BAD_REQUEST')
  }
  if (error instanceof ValidationError) {
    return errorResponse(error.message, 400, 'VALIDATION_ERROR')
  }

  // Standard Error objects
  if (error instanceof Error) {
    // Check for specific error types by message
    if (error.message.includes('인증')) {
      return errorResponse(error.message, 401, 'UNAUTHORIZED')
    }
    if (error.message.includes('권한')) {
      return errorResponse(error.message, 403, 'FORBIDDEN')
    }
    if (error.message.includes('찾을 수 없습니다')) {
      return errorResponse(error.message, 404, 'NOT_FOUND')
    }

    // Generic error
    return errorResponse(
      '요청 처리 중 오류가 발생했습니다',
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? error.message : undefined
    )
  }

  // Unknown error type
  console.error('Unknown error type:', error)
  return errorResponse('알 수 없는 오류가 발생했습니다', 500, 'UNKNOWN_ERROR')
}

/**
 * Async error wrapper for API routes
 * Automatically catches and handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }) as T
}

/**
 * Custom error classes for specific error types
 */
export class UnauthorizedError extends Error {
  constructor(message: string = '인증이 필요합니다') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = '권한이 없습니다') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string = '찾을 수 없습니다') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string = '유효하지 않은 입력입니다') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class BadRequestError extends Error {
  constructor(message: string = '잘못된 요청입니다') {
    super(message)
    this.name = 'BadRequestError'
  }
}

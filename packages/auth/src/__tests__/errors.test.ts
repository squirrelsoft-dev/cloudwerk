import { describe, it, expect } from 'vitest'
import {
  UnauthenticatedError,
  ForbiddenError,
  InvalidCredentialsError,
  SessionExpiredError,
} from '../errors.js'
import { AuthError } from '../types.js'

describe('Auth Error Classes', () => {
  describe('UnauthenticatedError', () => {
    it('should create error with default message', () => {
      const error = new UnauthenticatedError()

      expect(error.message).toBe('Authentication required')
      expect(error.code).toBe('SessionRequired')
      expect(error.status).toBe(401)
      expect(error.name).toBe('UnauthenticatedError')
    })

    it('should create error with custom message', () => {
      const error = new UnauthenticatedError('Please sign in to continue')

      expect(error.message).toBe('Please sign in to continue')
      expect(error.code).toBe('SessionRequired')
      expect(error.status).toBe(401)
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new UnauthenticatedError('Auth failed', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should extend AuthError', () => {
      const error = new UnauthenticatedError()

      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('ForbiddenError', () => {
    it('should create error with default message', () => {
      const error = new ForbiddenError()

      expect(error.message).toBe('Access denied')
      expect(error.code).toBe('AccessDenied')
      expect(error.status).toBe(403)
      expect(error.name).toBe('ForbiddenError')
    })

    it('should create error with custom message', () => {
      const error = new ForbiddenError('Admin access required')

      expect(error.message).toBe('Admin access required')
      expect(error.code).toBe('AccessDenied')
      expect(error.status).toBe(403)
    })

    it('should create error with requiredRole', () => {
      const error = new ForbiddenError('Need admin role', { requiredRole: 'admin' })

      expect(error.requiredRole).toBe('admin')
      expect(error.requiredPermission).toBeUndefined()
    })

    it('should create error with requiredPermission', () => {
      const error = new ForbiddenError('Cannot delete', { requiredPermission: 'posts:delete' })

      expect(error.requiredPermission).toBe('posts:delete')
      expect(error.requiredRole).toBeUndefined()
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new ForbiddenError('Forbidden', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should extend AuthError', () => {
      const error = new ForbiddenError()

      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidCredentialsError', () => {
    it('should create error with default message', () => {
      const error = new InvalidCredentialsError()

      expect(error.message).toBe('Invalid credentials')
      expect(error.code).toBe('CredentialsSignin')
      expect(error.status).toBe(401)
      expect(error.name).toBe('InvalidCredentialsError')
    })

    it('should create error with custom message', () => {
      const error = new InvalidCredentialsError('Wrong email or password')

      expect(error.message).toBe('Wrong email or password')
      expect(error.code).toBe('CredentialsSignin')
      expect(error.status).toBe(401)
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new InvalidCredentialsError('Auth failed', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should extend AuthError', () => {
      const error = new InvalidCredentialsError()

      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('SessionExpiredError', () => {
    it('should create error with default message', () => {
      const error = new SessionExpiredError()

      expect(error.message).toBe('Session expired')
      expect(error.code).toBe('SessionRequired')
      expect(error.status).toBe(401)
      expect(error.name).toBe('SessionExpiredError')
    })

    it('should create error with custom message', () => {
      const error = new SessionExpiredError('Your session has timed out')

      expect(error.message).toBe('Your session has timed out')
      expect(error.code).toBe('SessionRequired')
      expect(error.status).toBe(401)
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new SessionExpiredError('Session timeout', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should extend AuthError', () => {
      const error = new SessionExpiredError()

      expect(error).toBeInstanceOf(AuthError)
      expect(error).toBeInstanceOf(Error)
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { github } from '../providers/github.js'
import { google } from '../providers/google.js'
import { discord, getDiscordAvatarUrl } from '../providers/discord.js'
import type { TokenSet } from '../types.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('OAuth Providers', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('github()', () => {
    const config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    }

    it('should create provider with correct id and name', () => {
      const provider = github(config)

      expect(provider.id).toBe('github')
      expect(provider.name).toBe('GitHub')
      expect(provider.type).toBe('oauth')
    })

    it('should use default scope', () => {
      const provider = github(config)

      expect(provider.scope).toBe('read:user user:email')
    })

    it('should use custom scope', () => {
      const provider = github({ ...config, scope: 'read:user read:org' })

      expect(provider.scope).toBe('read:user read:org')
    })

    it('should generate authorization URL with state', () => {
      const provider = github(config)
      const url = provider.getAuthorizationUrl({
        redirectUri: 'https://example.com/callback',
        state: 'test-state',
      })

      const parsed = new URL(url)
      expect(parsed.origin).toBe('https://github.com')
      expect(parsed.pathname).toBe('/login/oauth/authorize')
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://example.com/callback'
      )
      expect(parsed.searchParams.get('state')).toBe('test-state')
      expect(parsed.searchParams.get('response_type')).toBe('code')
    })

    it('should fetch user profile from GitHub API', async () => {
      const provider = github(config)
      const mockProfile = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        html_url: 'https://github.com/testuser',
        bio: null,
        company: null,
        location: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })

      const tokens: TokenSet = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
      }

      const profile = await provider.getUserProfile(tokens)

      expect(profile).toEqual(mockProfile)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      )
    })

    it('should fetch email from emails API if not in profile', async () => {
      const provider = github(config)
      const mockProfile = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null, // No email in profile
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        html_url: 'https://github.com/testuser',
        bio: null,
        company: null,
        location: null,
      }
      const mockEmails = [
        { email: 'secondary@example.com', primary: false, verified: true, visibility: null },
        { email: 'primary@example.com', primary: true, verified: true, visibility: null },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmails),
        })

      const tokens: TokenSet = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
      }

      const profile = await provider.getUserProfile(tokens)

      expect(profile.email).toBe('primary@example.com')
    })

    it('should normalize profile to User format', async () => {
      const provider = github(config)
      const mockProfile = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        html_url: 'https://github.com/testuser',
        bio: null,
        company: null,
        location: null,
      }
      const mockEmails = [
        { email: 'test@example.com', primary: true, verified: true, visibility: 'public' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmails),
      })

      const tokens: TokenSet = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
      }

      const user = await provider.normalizeProfile(mockProfile, tokens)

      expect(user.id).toBe('12345')
      expect(user.email).toBe('test@example.com')
      expect(user.emailVerified).toBeInstanceOf(Date)
      expect(user.name).toBe('Test User')
      expect(user.image).toBe('https://avatars.githubusercontent.com/u/12345')
    })
  })

  describe('google()', () => {
    const config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    }

    it('should create provider with correct id and name', () => {
      const provider = google(config)

      expect(provider.id).toBe('google')
      expect(provider.name).toBe('Google')
      expect(provider.type).toBe('oidc')
    })

    it('should use default scope', () => {
      const provider = google(config)

      expect(provider.scope).toBe('openid email profile')
    })

    it('should have wellKnown URL', () => {
      const provider = google(config)

      expect(provider.wellKnown).toBe(
        'https://accounts.google.com/.well-known/openid-configuration'
      )
    })

    it('should support custom authorizationParams', () => {
      const provider = google({
        ...config,
        authorizationParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      })

      expect(provider.authorizationParams).toEqual({
        access_type: 'offline',
        prompt: 'consent',
      })
    })

    it('should normalize profile to User format', async () => {
      const provider = google(config)
      const mockProfile = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        email_verified: true,
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      }

      const tokens: TokenSet = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
      }

      const user = await provider.normalizeProfile(mockProfile, tokens)

      expect(user.id).toBe('google-user-123')
      expect(user.email).toBe('user@gmail.com')
      expect(user.emailVerified).toBeInstanceOf(Date)
      expect(user.name).toBe('Google User')
      expect(user.image).toBe('https://lh3.googleusercontent.com/photo.jpg')
    })

    it('should set emailVerified to null when not verified', async () => {
      const provider = google(config)
      const mockProfile = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        email_verified: false,
        name: 'Google User',
      }

      const user = await provider.normalizeProfile(mockProfile, {} as TokenSet)

      expect(user.emailVerified).toBeNull()
    })
  })

  describe('discord()', () => {
    const config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    }

    it('should create provider with correct id and name', () => {
      const provider = discord(config)

      expect(provider.id).toBe('discord')
      expect(provider.name).toBe('Discord')
      expect(provider.type).toBe('oauth')
    })

    it('should use default scope', () => {
      const provider = discord(config)

      expect(provider.scope).toBe('identify email')
    })

    it('should generate authorization URL', () => {
      const provider = discord(config)
      const url = provider.getAuthorizationUrl({
        redirectUri: 'https://example.com/callback',
        state: 'test-state',
      })

      const parsed = new URL(url)
      expect(parsed.origin).toBe('https://discord.com')
      expect(parsed.pathname).toBe('/api/oauth2/authorize')
    })

    it('should normalize profile with custom avatar', async () => {
      const provider = discord(config)
      const mockProfile = {
        id: '123456789',
        username: 'testuser',
        discriminator: '0',
        global_name: 'Test User',
        avatar: 'abc123',
        email: 'test@example.com',
        verified: true,
        flags: 0,
        premium_type: 0,
      }

      const user = await provider.normalizeProfile(mockProfile, {} as TokenSet)

      expect(user.id).toBe('123456789')
      expect(user.email).toBe('test@example.com')
      expect(user.emailVerified).toBeInstanceOf(Date)
      expect(user.name).toBe('Test User')
      expect(user.image).toBe(
        'https://cdn.discordapp.com/avatars/123456789/abc123.png'
      )
    })

    it('should use animated gif for animated avatar', async () => {
      const provider = discord(config)
      const mockProfile = {
        id: '123456789',
        username: 'testuser',
        discriminator: '0',
        global_name: 'Test User',
        avatar: 'a_animated123', // Animated avatars start with a_
        email: 'test@example.com',
        verified: true,
        flags: 0,
        premium_type: 0,
      }

      const user = await provider.normalizeProfile(mockProfile, {} as TokenSet)

      expect(user.image).toBe(
        'https://cdn.discordapp.com/avatars/123456789/a_animated123.gif'
      )
    })

    it('should use default avatar when no custom avatar', async () => {
      const provider = discord(config)
      const mockProfile = {
        id: '123456789',
        username: 'testuser',
        discriminator: '0',
        global_name: 'Test User',
        avatar: null,
        email: 'test@example.com',
        verified: true,
        flags: 0,
        premium_type: 0,
      }

      const user = await provider.normalizeProfile(mockProfile, {} as TokenSet)

      // Should be a default avatar URL
      expect(user.image).toMatch(
        /https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png/
      )
    })

    it('should fall back to username when no global_name', async () => {
      const provider = discord(config)
      const mockProfile = {
        id: '123456789',
        username: 'testuser',
        discriminator: '1234',
        global_name: null,
        avatar: null,
        email: 'test@example.com',
        verified: true,
        flags: 0,
        premium_type: 0,
      }

      const user = await provider.normalizeProfile(mockProfile, {} as TokenSet)

      expect(user.name).toBe('testuser')
    })
  })

  describe('getDiscordAvatarUrl', () => {
    it('should construct avatar URL with default size', () => {
      const url = getDiscordAvatarUrl('123', 'abc123')

      expect(url).toBe(
        'https://cdn.discordapp.com/avatars/123/abc123.png?size=128'
      )
    })

    it('should use custom size', () => {
      const url = getDiscordAvatarUrl('123', 'abc123', { size: 256 })

      expect(url).toBe(
        'https://cdn.discordapp.com/avatars/123/abc123.png?size=256'
      )
    })

    it('should detect animated avatar', () => {
      const url = getDiscordAvatarUrl('123', 'a_animated')

      expect(url).toContain('.gif')
    })

    it('should return default avatar when hash is null', () => {
      const url = getDiscordAvatarUrl('123', null)

      expect(url).toBe('https://cdn.discordapp.com/embed/avatars/0.png')
    })

    it('should allow format override', () => {
      const url = getDiscordAvatarUrl('123', 'abc123', { format: 'webp' })

      expect(url).toContain('.webp')
    })
  })
})

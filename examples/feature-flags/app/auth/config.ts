import { defineAuthConfig } from "@cloudwerk/auth/convention";

export default defineAuthConfig({
  basePath: '/auth',
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: '__Secure-session',
      options: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  csrf: {
    enabled: true,
    cookieName: 'cloudwerk.csrf-token',
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },
})

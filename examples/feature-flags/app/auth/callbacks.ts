import { defineAuthCallbacks } from "@cloudwerk/auth/convention"

export default defineAuthCallbacks({
  async signIn({ user, account, profile }) {
    // Called on user sign-in; return false to deny
    return true
  },

  async session({ session, user }) {
    // Customize session data

    return {
        ...session,
        data: {
        ...session.data,
        role: user.data?.role,
      },
    }
  },
})

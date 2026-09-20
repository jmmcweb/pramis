import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string | null
      accountType?: 'user' | 'staff' | null
      image?: string | null
    }
  }

  interface User {
    id: string
    role?: string
    accountType?: 'user' | 'staff'
    image?: string
  }

  interface JWT {
    id: string
    role?: string
    accountType?: 'user' | 'staff'
    image?: string
  }
}

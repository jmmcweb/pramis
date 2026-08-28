import { compare } from 'bcrypt'
import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'

// The `authOptions` object defines the configuration for NextAuth.js, including session management, authentication providers, and callback functions for handling JWT tokens and user sessions. It uses a credentials provider to authenticate users and staff based on their email and password, and it includes logic to fetch user data from the database and populate the session accordingly.
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 1 * 24 * 60 * 60, // 1 day
  },
  pages: {
    signIn: '/login', // Custom sign-in page URL
  },
  providers: [
    CredentialsProvider({
      name: 'Signin',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'hello@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials): Promise<any> { // Authorize user or staff based on email and password
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const user = await (prisma as any).user.findFirst({ // Find a user in the database by email
          where: {
            email: credentials.email,
          },
        })

        if (user) {
          const isPasswordValid = await compare( // Compare the provided password with the hashed password stored in the database
            credentials.password,
            user.password + '',
          )
          if (!isPasswordValid) return null

          return {
            id: user.id,
            name: null,
            email: user.email,
            role: user.role,
            accountType: 'user',
          }
        }

        const staff = await (prisma as any).staff.findUnique({
          where: { email: credentials.email },
        })
        if (!staff || !(await compare(credentials.password, staff.password))) {
          return null
        }

        return {
          id: staff.staffid,
          name: `${staff.firstName} ${staff.lastName}`,
          email: staff.email,
          role: staff.role,
          accountType: 'staff',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) { // Handle JWT token creation and updates based on user or staff authentication
      if (trigger === 'update' && token.id) {
        const dbUser = await (prisma as any).user.findFirst({
          where: { id: token.id as any } as any,
        })
        if (dbUser) {
          token.name = null
          token.email = dbUser.email
        }
      }

      if ((user as any)?.accountType === 'staff') { // If the authenticated user is a staff member, populate the token with staff details
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
        token.accountType = 'staff'
      } else if (user) { // If the authenticated user is a regular user, populate the token with user details
        const dbUser = await (prisma as any).user.findFirst({ 
          where: {
            id: user.id as any,
          } as any,
        })

        if (dbUser) { // If a user is found in the database, populate the token with user details
          token.id = dbUser.id
          token.name = null
          token.email = dbUser.email
          token.role = dbUser.role
          token.accountType = 'user'
        }
      }
      return token
    },
    async session({ session, token }) { // Populate the session object with user or staff details based on the JWT token
      session.user.id = token.id as string
      session.user.name = (token.name as string) || null
      session.user.email = token.email as string
      session.user.role = token.role as string

      return session // Return the updated session object with user or staff details
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

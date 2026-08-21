import { compare } from 'bcrypt'
import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 1 * 24 * 60 * 60, // 1 day
  },
  pages: {
    signIn: '/login',
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
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const user = await (prisma as any).user.findFirst({
          where: {
            email: credentials.email,
          },
        })

        if (user) {
          const isPasswordValid = await compare(
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
    async jwt({ token, user, trigger }) {
      if (trigger === 'update' && token.id) {
        const dbUser = await (prisma as any).user.findFirst({
          where: { id: token.id as any } as any,
        })
        if (dbUser) {
          token.name = null
          token.email = dbUser.email
        }
      }

      if ((user as any)?.accountType === 'staff') {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
        token.accountType = 'staff'
      } else if (user) {
        const dbUser = await (prisma as any).user.findFirst({
          where: {
            id: user.id as any,
          } as any,
        })

        if (dbUser) {
          token.id = dbUser.id
          token.name = null
          token.email = dbUser.email
          token.role = dbUser.role
          token.accountType = 'user'
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.name = (token.name as string) || null
      session.user.email = token.email as string
      session.user.role = token.role as string

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

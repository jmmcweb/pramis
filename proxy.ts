import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { JWT } from 'next-auth/jwt'

interface Token extends JWT {
  role?: string
}

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

export async function proxy(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as Token | null
  const { pathname } = req.nextUrl

  // Unauthenticated users cannot reach the dashboard.
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Defense in depth: only admins may reach user management (page also checks).
  if (pathname.startsWith('/dashboard/users')) {
    if (!token || !ADMIN_ROLES.includes(token.role ?? '')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}

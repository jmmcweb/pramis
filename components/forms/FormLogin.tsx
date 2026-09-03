'use client'

import { useState, useRef } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

function roleHome(role?: string): string {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return '/admin'
    case 'MEDSTAFF':
    case 'NURSE':
      return '/staff'
    case 'USER':
      return '/user'
    default:
      return '/login'
  }
}

export default function FormLogin({ className }: { className?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  const router = useRouter()
  const { push: redirect } = router

  const [state, setState] = useState({
    message: '',
    success: false,
    errors: {
      email: '',
      password: '',
    },
  })
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setPending(true)

    const formData = new FormData(formRef.current)
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString().trim()

    if (!email || !password) {
      setState({
        message: null,
        success: false,
        errors: {
          email: !email ? 'Enter your email address.' : '',
          password: !password ? 'Enter your password.' : '',
        },
      })
      setPending(false)
      return
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.ok === true) {
        setState({
          message: 'Logged in successfully',
          success: true,
          errors: {
            email: '',
            password: '',
          },
        })

        // Wait 1 second before redirecting to the role home page
        setTimeout(async () => {
          const session = await getSession()
          const role = session?.user?.role as string | undefined
          redirect(roleHome(role))
        }, 1000)

        //
      } else {
        setState({
          message: 'Email or password is incorrect. Try again.',
          success: false,
          errors: {
            email: '',
            password: '',
          },
        })
      }

      setPending(false)
    } catch (error) {
      console.log('error: ', error)

      setState({
        message: 'Something went wrong. Please try again.',
        success: false,
        errors: {
          email: '',
          password: '',
        },
      })
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className={`flex flex-col gap-6 ${className}`}
    >
      {state?.message && (
        <p
          className={`alert ${
            state.success ? `alert--success` : `alert--danger`
          }`}
        >
          {state?.message}
        </p>
      )}

      <div className="field">
        <label className="auth-label" htmlFor="login-email">
          Email address
        </label>
        <div className={`auth-box ${state?.errors?.email ? 'has-errors' : ''}`}>
          <Mail size={18} className="text-slate shrink-0" />
          <input
            id="login-email"
            required
            type="email"
            name="email"
            placeholder="you@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
        </div>
        {state?.errors?.email && (
          <p className="error">{state?.errors?.email}</p>
        )}
      </div>

      <div className="field">
        <label className="auth-label" htmlFor="login-password">
          Password
        </label>
        <div
          className={`auth-box ${state?.errors?.password ? 'has-errors' : ''}`}
        >
          <Lock size={18} className="text-slate shrink-0" />
          <input
            id="login-password"
            required
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="bg-transparent text-slate hover:text-brand transition-colors p-1"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="error">{state?.errors?.password}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 -mt-3">
        <label className="flex items-center gap-2 text-[13.5px] text-ink cursor-pointer select-none">
          <input
            type="checkbox"
            name="staySigned"
            className="w-4 h-4 accent-[#0F588B] cursor-pointer"
          />
          Stay signed in
        </label>
        <Link href="/forgot-password" className="auth-link text-[13px]">
          Forgot password?
        </Link>
      </div>

      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Please wait…' : 'Log in'}
        </button>
      </div>
    </form>
  )
}

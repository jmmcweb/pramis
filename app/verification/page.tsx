'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MailCheck,
  RotateCcw,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { useSignup } from '@/store/useSignup'

type FieldError = Record<string, string>

const CodeInput = ({
  length = 6,
  onChange,
  error,
}: {
  length?: number
  onChange: (code: string) => void
  error?: string
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const update = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const next = [...values]
    next[index] = cleaned
    setValues(next)

    const code = next.join('')
    if (cleaned && index < length - 1) refs.current[index + 1]?.focus()
    if (code.length === length) refs.current[index]?.blur()
    onChange(code)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < length - 1)
      refs.current[index + 1]?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center gap-2 sm:gap-3">
        {values.map((val, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={val}
            onChange={(e) => update(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={(e) => {
              e.preventDefault()
              const pasted = e.clipboardData
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, length)
              if (!pasted) return
              const next = Array(length).fill('')
              for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
              setValues(next)
              onChange(next.join(''))
              refs.current[Math.min(pasted.length, length - 1)]?.focus()
            }}
            aria-label={`Digit ${index + 1}`}
            className={`w-11 h-12 sm:w-13 sm:h-13 sm:w-[52px] sm:h-[52px] rounded-xl border bg-white text-center text-[20px] font-bold text-ink outline-none transition-all ${
              val
                ? 'border-brand shadow-[0_0_0_3px_rgba(15,88,139,0.12)]'
                : error
                  ? 'border-rose-400'
                  : 'border-line focus:border-brand focus:shadow-[0_0_0_3px_rgba(15,88,139,0.12)]'
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 justify-center text-[12px] text-rose-600 m-0">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}

const MaskedField = ({ label, value }: { label: string; value: string }) => {
  const [show, setShow] = useState(false)
  const display = !show && value ? value.replace(/.(?=.{2})/g, '•') : value
  return (
    <div className="flex-1 min-w-[160px]">
      <span className="auth-label">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-3">
        <span className="font-inter text-[14px] font-bold tracking-wide text-ink flex-1 truncate">
          {display || '—'}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide' : 'Show'}
            className="text-slate hover:text-brand transition-colors bg-transparent p-0.5 cursor-pointer"
          >
            {show ? <LockKeyhole size={14} /> : <CheckCircle2 size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

const SendCodeButton = ({
  target,
  onSend,
  sent,
  retryIn,
}: {
  target: string
  onSend: () => void
  sent: boolean
  retryIn: number
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <MailCheck className="w-5 h-5 shrink-0 text-slate" />
                  <span className="text-[13px] text-ink truncate min-w-0">{target}</span>
    </div>
    {!sent ? (
      <button
        type="button"
        onClick={onSend}
        className="text-[13px] font-semibold text-brand bg-transparent cursor-pointer hover:underline shrink-0"
      >
        Send code
      </button>
    ) : retryIn > 0 ? (
      <span className="text-[12px] text-slate shrink-0 tabular-nums">
        Resend in {retryIn}s
      </span>
    ) : (
      <button
        type="button"
        onClick={onSend}
        className="flex items-center gap-1 text-[13px] font-semibold text-brand bg-transparent cursor-pointer hover:underline shrink-0"
      >
        <RotateCcw size={12} />
        Resend
      </button>
    )}
  </div>
)

const VerificationPage = () => {
  const {
    firstName,
    lastName,
    birthday,
    gender,
    countryCode,
    mobile,
    email,
    password,
    street,
    purok,
    barangay,
    city,
    province,
    zip,
    country,
    idType,
    idPhoto,
  } = useSignup()
  const { push } = useRouter()

  const [emailCode, setEmailCode] = useState('')

  const [emailSent, setEmailSent] = useState(false)
  const [retryIn, setRetryIn] = useState(0)

  const [errors, setErrors] = useState<FieldError>({})
  const [mismatchError, setMismatchError] = useState('')

  const resendInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isVerifying, setIsVerifying] = useState(false)

  const beginResendCountdown = () => {
    setRetryIn(30)
    if (resendInterval.current) clearInterval(resendInterval.current)
    resendInterval.current = setInterval(() => {
      setRetryIn((prev) => {
        if (prev <= 1) {
          if (resendInterval.current) clearInterval(resendInterval.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!email) return
    setMismatchError('')
    try {
      const response = await fetch('/api/auth/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMismatchError(data.message || 'Unable to send verification code.')
        return
      }

      setEmailSent(true)
      setErrors((prev) => ({ ...prev, emailCode: '' }))
      beginResendCountdown()
    } catch {
      setMismatchError('Unable to send verification code.')
    }
  }

  useEffect(() => {
    return () => {
      if (resendInterval.current) clearInterval(resendInterval.current)
    }
  }, [])

  const validateCode = () => {
    if (emailCode.length !== 6) {
      setErrors((prev) => ({
        ...prev,
        emailCode: 'Enter the full 6-digit code.',
      }))
      return false
    }
    setErrors((prev) => ({ ...prev, emailCode: '' }))
    return true
  }

  const verifyAccount = async (payload: {
    email: string
    code: string
    mobile: string
    password: string
    firstName: string
    lastName: string
    birthday: string
    gender: string
    street: string
    purok: string
    barangay: string
    city: string
    province: string
    zip: string
    country: string
    idType: string
    idPhoto: string
  }) => {
    setIsVerifying(true)
    setMismatchError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMismatchError(
          data.message || 'Something went wrong. Please try again.',
        )
        return
      }
      const data = await res.json()

      if (data?.requiresVerification) {
        const s = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (!s?.ok) {
          setMismatchError(
            'Account created, but automatic log in failed. Please log in manually.',
          )
        }
        push('/user')
        return
      }

      if (data?.autoLogin && data.autoLogin?.id) {
        const s = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (s?.ok) {
          push('/user')
        } else {
          push('/login')
        }
        return
      }

      push('/login')
    } catch {
      setMismatchError('Something went wrong. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleVerify = () => {
    setMismatchError('')
    if (!emailSent) {
      setErrors((prev) => ({
        ...prev,
        email: 'Send a code to your email first.',
      }))
      return
    }
    if (!validateCode()) return

    void verifyAccount({
      email,
      code: emailCode,
      mobile: `${countryCode} ${mobile}`,
      password,
      firstName,
      lastName,
      birthday,
      gender,
      street,
      purok,
      barangay,
      city,
      province,
      zip,
      country,
      idType,
      idPhoto,
    })
  }

  return (
    <div className="lg:h-dvh lg:overflow-hidden">
      <AuthShell
        step={5}
        animate={false}
        title="Email Verification"
        cardClassName="lg:max-w-xl"
        subtitle="We need to verify your email address before creating your account."
        backHref="/identification"
        footer={
          <>
            Need help?{' '}
            <Link href="/support" className="auth-link">
              Contact support
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-[13px] text-slate leading-relaxed">
            We sent a 6-digit code to{' '}
            <span className="text-ink font-semibold">{email}</span>. Enter it
            below to verify your email.
          </p>

          <SendCodeButton
            target={email}
            sent={emailSent}
            retryIn={retryIn}
            onSend={handleSendCode}
          />

          <CodeInput
            length={6}
            onChange={setEmailCode}
            error={errors.emailCode}
          />

          {errors.email && (
            <p className="flex items-start gap-1.5 text-[12.5px] text-rose-600 m-0">
              <AlertTriangle size={15} className="shrink-0 mt-px" />
              {errors.email}
            </p>
          )}

          {mismatchError && (
            <p className="flex items-start gap-1.5 text-[12.5px] text-rose-600 m-0">
              <AlertTriangle size={15} className="shrink-0 mt-px" />
              {mismatchError}
            </p>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="btn btn--primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify & create account'
            )}
          </button>
        </div>
      </AuthShell>
    </div>
  )
}

export default VerificationPage

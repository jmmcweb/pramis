'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MailCheck,
  RotateCcw,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { useSignup } from '@/store/useSignup'

type FieldError = Record<string, string>

const MobilePreview = ({ ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="6.5" y="2" width="11" height="20" rx="2.5" />
    <path d="M9.5 4.5h5" />
    <path d="M10.5 19h3" />
  </svg>
)

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
  variant,
  target,
  onSend,
  sent,
  retryIn,
}: {
  variant: 'mobile' | 'email'
  target: string
  onSend: () => void
  sent: boolean
  retryIn: number
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      {variant === 'mobile' ? (
        <MobilePreview className="w-5 h-5 shrink-0 text-slate" />
      ) : (
        <MailCheck className="w-5 h-5 shrink-0 text-slate" />
      )}
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
    barangay,
    city,
    province,
    zip,
    country,
  } = useSignup()
  const { push } = useRouter()

  const [method, setMethod] = useState<'email' | 'mobile' | null>(null)

  const [emailCode, setEmailCode] = useState('')
  const [mobileCode, setMobileCode] = useState('')

  const [emailSent, setEmailSent] = useState(false)
  const [mobileSent, setMobileSent] = useState(false)
  const [retryIn, setRetryIn] = useState(0)

  const [errors, setErrors] = useState<FieldError>({})
  const [mismatchError, setMismatchError] = useState('')

  const resendInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isVerifying, setIsVerifying] = useState(false)

  const handleMethodSelect = (value: 'email' | 'mobile') => {
    setMethod(value)
    setErrors({})
    setMismatchError('')
  }

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

  const handleSendCode = async (target: 'email' | 'mobile') => {
    if (target === 'mobile') {
      setMismatchError(
        'SMS verification is not configured. Choose email verification.',
      )
      return
    }

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

  const validateCode = (target: 'email' | 'mobile') => {
    const value = target === 'email' ? emailCode : mobileCode
    if (value.length !== 6) {
      setErrors((prev) => ({
        ...prev,
        [`${target}Code`]: 'Enter the full 6-digit code.',
      }))
      return false
    }
    setErrors((prev) => ({ ...prev, [`${target}Code`]: '' }))
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
    barangay: string
    city: string
    province: string
    zip: string
    country: string
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
    if (!method) return

    let valid = true
    if (method === 'email') {
      if (!emailSent) {
        setErrors((prev) => ({
          ...prev,
          email: 'Send a code to your email first.',
        }))
        valid = false
      } else if (!validateCode('email')) valid = false
    } else {
      if (!mobileSent) {
        setErrors((prev) => ({
          ...prev,
          mobile: 'Send a code to your mobile first.',
        }))
        valid = false
      } else if (!validateCode('mobile')) valid = false
    }
    if (!valid) return

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
      barangay,
      city,
      province,
      zip,
      country,
    })
  }

  const tabLabel = (value: 'email' | 'mobile') => (
    <span className="flex items-center justify-center gap-2">
      {value === 'email' ? (
        <MailCheck size={15} />
      ) : (
        <MobilePreview className="w-4 h-4" />
      )}
      {value === 'email' ? 'Email' : 'Mobile number'}
    </span>
  )

  return (
    <div className="lg:h-dvh lg:overflow-hidden">
      <AuthShell
        step={5}
        animate={false}
        title="Verification"
        cardClassName="lg:max-w-xl"
        subtitle="Verify your account to continue."
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
        {!method ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13.5px] text-slate">
              Choose how you want to receive a 6-digit verification code.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleMethodSelect('email')}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-line bg-white cursor-pointer hover:border-brand transition-colors"
              >
                <MailCheck className="w-5 h-5 text-brand shrink-0" />
                <span className="flex-1 text-left">
                  <span className="block text-[13.5px] font-semibold text-ink">
                    Email
                  </span>
                  <span className="block text-[12px] text-slate truncate max-w-[220px] sm:max-w-none">
                    {email || 'you@email.com'}
                  </span>
                </span>
                <ArrowRight size={15} className="text-slate" />
              </button>
              <button
                type="button"
                onClick={() => handleMethodSelect('mobile')}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-line bg-white cursor-pointer hover:border-brand transition-colors"
              >
                <MobilePreview className="w-5 h-5 text-brand shrink-0" />
                <span className="flex-1 text-left">
                  <span className="block text-[13.5px] font-semibold text-ink">
                    Mobile number
                  </span>
                  <span className="block text-[12px] text-slate truncate max-w-[220px] sm:max-w-none">
                    {`${countryCode} ${mobile}` || '+63 917 123 4567'}
                  </span>
                </span>
                <ArrowRight size={15} className="text-slate" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-mist/60">
              {(['email', 'mobile'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleMethodSelect(value)}
                  className={`py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                    method === value
                      ? 'bg-white text-brand shadow-sm'
                      : 'text-slate hover:text-ink'
                  }`}
                >
                  {tabLabel(value)}
                </button>
              ))}
            </div>

            {method === 'email' && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] text-slate leading-relaxed">
                  We sent a 6-digit code to{' '}
                  <span className="text-ink font-semibold">{email}</span>. Enter
                  it below to verify your email.
                </p>
                <SendCodeButton
                  variant="email"
                  target={email}
                  sent={emailSent}
                  retryIn={retryIn}
                  onSend={() => handleSendCode('email')}
                />
                <CodeInput
                  length={6}
                  onChange={setEmailCode}
                  error={errors.emailCode}
                />
              </div>
            )}

            {method === 'mobile' && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] text-slate leading-relaxed">
                  We sent a 6-digit code to{' '}
                  <span className="text-ink font-semibold">{`${countryCode} ${mobile}`}</span>
                  . Enter it below to verify your mobile number.
                </p>
                <SendCodeButton
                  variant="mobile"
                  target={`${countryCode} ${mobile}`}
                  sent={mobileSent}
                  retryIn={retryIn}
                  onSend={() => handleSendCode('mobile')}
                />
                <CodeInput
                  length={6}
                  onChange={setMobileCode}
                  error={errors.mobileCode}
                />
              </div>
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
        )}
      </AuthShell>
    </div>
  )
}

export default VerificationPage

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import Field from '@/components/auth/Field'
import { useSignup } from '@/store/useSignup'

type Errors = Record<string, string>

// PH mobile numbers only: 10 digits starting with 9, displayed as 917 123 4567.
const formatMobile = (raw: string) => {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  digits = digits.slice(0, 10)
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter(Boolean)
    .join(' ')
}

const mobileDigits = (value: string) => value.replace(/\D/g, '')

const Signup = () => {
  const setPersonal = useSignup((state) => state.setPersonal)
  const { push } = useRouter()

  const formRef = useRef<HTMLFormElement>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [suffix, setSuffix] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState<Errors>({})

  const requirements = [
    { label: '12+ characters', met: password.length >= 12 },
    { label: 'A-Z', met: /[A-Z]/.test(password) },
    { label: 'a-z', met: /[a-z]/.test(password) },
    { label: '0-9', met: /[0-9]/.test(password) },
    { label: '@$!%*?&', met: /[@$!%*?&]/.test(password) },
  ]

  const metCount = requirements.filter((req) => req.met).length

  const strength =
    password.length === 0
      ? null
      : password.length < 8 || metCount <= 2
        ? { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600', width: '33%' }
        : metCount <= 4
          ? { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600', width: '66%' }
          : { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600', width: '100%' }

  const passwordFeedback = (
    <>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 pl-0.5">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 text-[12px] ${
              req.met ? 'text-ink' : 'text-slate/60'
            }`}
          >
            {req.met ? (
              <Check size={11} className="text-brand shrink-0" strokeWidth={3} />
            ) : (
              <span className="w-[11px] shrink-0 inline-block" />
            )}
            {req.label}
          </li>
        ))}
      </ul>

      {strength && (
        <div className="mt-1">
          <div className="h-1.5 w-full rounded-full bg-mist overflow-hidden">
            <div
              className={`h-full rounded-full ${strength.color} transition-all duration-300`}
              style={{ width: strength.width }}
            />
          </div>
          <p className={`mt-1 text-[12px] font-medium ${strength.text}`}>
            Password strength: {strength.label}
          </p>
        </div>
      )}
    </>
  )

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const nextErrors: Errors = {}
    if (!firstName.trim()) nextErrors.firstName = 'Enter your first name.'
    if (!lastName.trim()) nextErrors.lastName = 'Enter your last name.'
    if (!birthday) nextErrors.birthday = 'Select your birthday.'
    if (!gender) nextErrors.gender = 'Select a gender.'
    if (!mobile.trim()) nextErrors.mobile = 'Enter your mobile number.'
    else if (!/^9\d{9}$/.test(mobileDigits(mobile)))
      nextErrors.mobile = 'Enter a valid PH mobile number (e.g. 917 123 4567).'
    if (!email.trim()) nextErrors.email = 'Enter your email address.'
    else if (!/\S+@\S+\.\S+/.test(email))
      nextErrors.email = 'Enter a valid email address.'
    if (password.length < 12)
      nextErrors.password = 'Use at least 12 characters.'
    if (confirmPassword !== password)
      nextErrors.confirmPassword = 'Passwords don’t match.'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      const first = ['firstName', 'lastName', 'birthday', 'mobile', 'email', 'password', 'confirmPassword'].find(
        (name) => nextErrors[name],
      )
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    setPersonal({
      firstName,
      middleName,
      lastName,
      suffix,
      birthday,
      gender,
      countryCode: '+63',
      mobile: mobileDigits(mobile),
      email,
      password,
    })
    push('/residence-details')
  }

  return (
    <div className="lg:h-dvh lg:overflow-hidden">
      <AuthShell
        tab="signup"
        step={1}
        title="Sign Up"
        subtitle="Share your details to set up your appointments and health records."
        cardClassName="lg:max-w-2xl"
      >
      <form ref={formRef} onSubmit={handleNext} noValidate className="flex flex-col gap-3.5">
        {/* Row 1 — legal name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field
            label="First name"
            name="firstName"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            autoComplete="given-name"
            required
          />
          <Field
            label="Middle name"
            name="middleName"
            placeholder="Michael"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            error={errors.middleName}
            autoComplete="additional-name"
          />
          <Field
            label="Last name"
            name="lastName"
            placeholder="Thomas"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            autoComplete="family-name"
            required
          />
          <Field
            label="Suffix"
            name="suffix"
            placeholder="Jr."
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            error={errors.suffix}
            autoComplete="honorific-suffix"
          />
        </div>

        {/* Row 2 — birthday, gender, mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field
            label="Birthday"
            name="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            error={errors.birthday}
            required
          />
          <div className="field">
            <span className="auth-label">
              Gender<span className="text-brand"> *</span>
            </span>
            <div className="flex items-center gap-5 pt-1.5">
              {['Male', 'Female'].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 text-[14px] text-ink cursor-pointer"
                >
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === option}
                    onChange={() => setGender(option)}
                    className="w-4 h-4 accent-[#0F588B]"
                  />
                  {option}
                </label>
              ))}
            </div>
            {errors.gender && <p className="error">{errors.gender}</p>}
          </div>

          <div className="lg:col-span-2">
          <Field
            label="Mobile number"
            name="mobile"
            placeholder="917 123 4567"
            inputMode="tel"
            value={mobile}
            onChange={(e) => {
              setMobile(formatMobile(e.target.value))
              if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: '' }))
            }}
            error={errors.mobile}
            autoComplete="tel-national"
            maxLength={12}
            required
            leading={
              <span
                aria-label="Philippine country code"
                className="flex items-center gap-1.5 pt-1.5 select-none"
              >
                <img src="/ph.png" alt="" className="w-6 h-4 object-cover" />
                <span className="font-inter text-[15px] font-bold tracking-wide text-slate">
                  +63
                </span>
              </span>
            }
          />
          </div>
        </div>

        <Field
          label="Email address"
          name="email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          required
        />

        <Field
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
          }}
          error={errors.password}
          autoComplete="new-password"
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="bg-transparent text-slate hover:text-brand transition-colors p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {password !== '' && passwordFeedback}

        <Field
          label="Confirm password"
          name="confirmPassword"
          type={showConfirm ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: '' }))
          }}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="bg-transparent text-slate hover:text-brand transition-colors p-1"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {confirmPassword !== '' && (
          <p
            className={`flex items-center gap-1.5 text-[12.5px] ${
              confirmPassword === password ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {confirmPassword === password ? (
              <Check size={12} className="shrink-0" strokeWidth={3} />
            ) : (
              <X size={12} className="shrink-0" strokeWidth={3} />
            )}
            {confirmPassword === password
              ? 'Passwords match'
              : 'Passwords don’t match'}
          </p>
        )}

        <button type="submit" className="btn btn--primary">
          Next
        </button>
      </form>
      </AuthShell>
    </div>
  )
}

export default Signup

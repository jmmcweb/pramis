'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Eye, EyeOff, X } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import Field from '@/components/auth/Field'
import { useSignup } from '@/store/useSignup'

const countries = [
  { name: 'Philippines', code: '+63', flag: '/ph.png' },
  { name: 'United States', code: '+1', flag: '/us.png' },
  { name: 'Canada', code: '+1', flag: '/ca.png' },
  { name: 'United Kingdom', code: '+44', flag: '/gb.png' },
  { name: 'China', code: '+86', flag: '/cn.png' },
]

type Errors = Record<string, string>

const Signup = () => {
  const setPersonal = useSignup((state) => state.setPersonal)
  const { push } = useRouter()

  const formRef = useRef<HTMLFormElement>(null)

  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
      lastName,
      birthday,
      gender,
      countryCode: selectedCountry.code,
      mobile,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            label="Birthday"
            name="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            error={errors.birthday}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="field">
            <span className="auth-label">
              Gender<span className="text-brand"> *</span>
            </span>
            <div className="flex items-center gap-6 pt-1.5">
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

          <div className="relative lg:col-span-2">
          <Field
            label="Mobile number"
            name="mobile"
            placeholder="917 123 4567"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={errors.mobile}
            autoComplete="tel-national"
            required
            leading={
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Select country code"
                className="flex items-center gap-1.5 bg-transparent p-1 pt-1.5 text-ink cursor-pointer"
              >
                <img src={selectedCountry.flag} alt="" className="w-6 h-4 object-cover" />
                <span className="font-inter text-[15px] font-bold tracking-wide">
                  {selectedCountry.code}
                </span>
                <ChevronDown size={14} className="text-slate" />
              </button>
            }
          />

          {isOpen && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-line rounded-[3px] shadow-xl z-50 py-1">
              {countries.map((country) => (
                <button
                  key={country.name}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(country)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white hover:bg-mist transition-colors cursor-pointer"
                >
                  <img src={country.flag} alt="" className="w-6 h-4 object-cover" />
                  <span className="text-[14px] text-ink">{country.name}</span>
                  <span className="ml-auto font-inter text-[13px] font-bold text-slate">
                    {country.code}
                  </span>
                </button>
              ))}
            </div>
          )}
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

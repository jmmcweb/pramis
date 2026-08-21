'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
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

const ResidenceDetails = () => {
  const setResidence = useSignup((state) => state.setResidence)
  const { push } = useRouter()

  const formRef = useRef<HTMLFormElement>(null)

  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [isOpen, setIsOpen] = useState(false)

  const [street, setStreet] = useState('')
  const [barangay, setBarangay] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [zip, setZip] = useState('')

  const [errors, setErrors] = useState<Errors>({})

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const nextErrors: Errors = {}
    if (!street.trim()) nextErrors.street = 'Enter your street address.'
    if (!city.trim()) nextErrors.city = 'Enter your city or municipality.'
    if (!province.trim()) nextErrors.province = 'Enter your province.'
    if (!zip.trim()) nextErrors.zip = 'Enter your ZIP / postal code.'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      const first = ['street', 'city', 'province', 'zip'].find(
        (name) => nextErrors[name],
      )
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    setResidence({
      street,
      barangay,
      city,
      province,
      zip,
      country: selectedCountry.name,
    })
    push('/confirmation')
  }

  return (
    <AuthShell
      step={2}
      animate={false}
      title="Residence details"
      cardClassName="lg:max-w-2xl"
      subtitle="Where should we route your care and prescriptions?"
      backHref="/signup"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="auth-link">
            Log in
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleNext} noValidate className="flex flex-col gap-5">
        <Field
          label="Street address"
          name="street"
          placeholder="123 Mabini Street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          error={errors.street}
          autoComplete="street-address"
          required
        />

        <Field
          label="Barangay"
          name="barangay"
          placeholder="Barangay San Isidro"
          value={barangay}
          onChange={(e) => setBarangay(e.target.value)}
          error={errors.barangay}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="City / Municipality"
            name="city"
            placeholder="Quezon City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={errors.city}
            autoComplete="address-level2"
            required
          />
          <Field
            label="Province"
            name="province"
            placeholder="Metro Manila"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            error={errors.province}
            autoComplete="address-level1"
            required
          />
        </div>

        <Field
          label="ZIP / Postal code"
          name="zip"
          placeholder="1100"
          inputMode="numeric"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          error={errors.zip}
          autoComplete="postal-code"
          required
        />

        <div className="relative">
          <div className="field">
            <span className="auth-label">
              Country<span className="text-brand"> *</span>
            </span>
            <div className={`auth-box ${errors.country ? 'has-errors' : ''}`}>
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Select country"
                className="w-full flex items-center gap-2.5 bg-transparent text-ink cursor-pointer py-3"
              >
                <img src={selectedCountry.flag} alt="" className="w-6 h-4 object-cover" />
                <span className="text-[15px]">{selectedCountry.name}</span>
                <ChevronDown size={15} className="ml-auto text-slate" />
              </button>
            </div>
          </div>

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
                  <span className="ml-auto font-asap text-[13px] font-semibold text-slate">
                    {country.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn--primary mt-1">
          Next
        </button>
      </form>
    </AuthShell>
  )
}

export default ResidenceDetails

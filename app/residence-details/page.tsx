'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import Field from '@/components/auth/Field'
import { useSignup } from '@/store/useSignup'
import { FIXED_ADDRESS } from '@/src/data/patientInfo'
import type { AddressOptions } from '@/src/data/patientInfo'

type Errors = Record<string, string>

const ResidenceDetails = () => {
  const setResidence = useSignup((state) => state.setResidence)
  const { push } = useRouter()

  const formRef = useRef<HTMLFormElement>(null)

  const [street, setStreet] = useState('')
  const [purok, setPurok] = useState('')

  const [addressOptions, setAddressOptions] = useState<AddressOptions | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/address')
      .then((res) => res.json())
      .then((data: AddressOptions) => {
        if (!cancelled && data?.success) setAddressOptions(data)
      })
      .catch((error) => console.error('[ResidenceDetails | address fetch]:', error))
    return () => {
      cancelled = true
    }
  }, [])

  const lockedBarangay = addressOptions?.barangay ?? FIXED_ADDRESS.barangay
  const lockedCity = addressOptions?.municipality ?? FIXED_ADDRESS.municipality
  const lockedProvince = addressOptions?.province ?? FIXED_ADDRESS.province
  const lockedZip = addressOptions?.zipCode ?? FIXED_ADDRESS.zipCode
  const lockedCountry = addressOptions?.country ?? FIXED_ADDRESS.country
  const purokOptions = addressOptions?.puroks ?? []

  const [errors, setErrors] = useState<Errors>({})

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const nextErrors: Errors = {}
    if (!street.trim()) nextErrors.street = 'Enter your street address.'
    if (!purok.trim()) nextErrors.purok = 'Select your purok.'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      const first = ['street', 'purok', 'city', 'province', 'zip'].find(
        (name) => nextErrors[name],
      )
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    setResidence({
      street,
      purok,
      barangay: lockedBarangay,
      city: lockedCity,
      province: lockedProvince,
      zip: lockedZip,
      country: lockedCountry,
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

        <div className="field">
          <label className="auth-label" htmlFor="purok">
            Purok<span className="text-brand"> *</span>
          </label>
          <div className={`auth-box ${errors.purok ? 'has-errors' : ''}`}>
            <select
              id="purok"
              name="purok"
              value={purok}
              onChange={(e) => {
                setPurok(e.target.value)
                if (errors.purok) setErrors((prev) => ({ ...prev, purok: '' }))
              }}
              required
              className="auth-input cursor-pointer appearance-none pr-6"
            >
              {purokOptions.length === 0 ? (
                <option value="" disabled>
                  Loading puroks…
                </option>
              ) : (
                <option value="" disabled>
                  Select purok
                </option>
              )}
              {purokOptions.map((option) => (
                <option key={option} value={option} className="text-ink">
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="text-slate pointer-events-none shrink-0"
            />
          </div>
          {errors.purok && <p className="error">{errors.purok}</p>}
        </div>

        {/* Locked address fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Barangay"
            name="barangay"
            value={lockedBarangay}
            readOnly
            className="opacity-70"
          />
          <Field
            label="City / Municipality"
            name="city"
            value={lockedCity}
            readOnly
            className="opacity-70"
          />
          <Field
            label="Province"
            name="province"
            value={lockedProvince}
            readOnly
            className="opacity-70"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="ZIP / Postal code"
            name="zip"
            inputMode="numeric"
            value={lockedZip}
            readOnly
            className="opacity-70"
          />
          <Field
            label="Country"
            name="country"
            value={lockedCountry}
            readOnly
            className="opacity-70"
          />
        </div>

        <button type="submit" className="btn btn--primary mt-1">
          Next
        </button>
      </form>
    </AuthShell>
  )
}

export default ResidenceDetails

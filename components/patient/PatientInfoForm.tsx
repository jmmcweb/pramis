'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { updateMyProfile } from '@/lib/actions/me'
import FamilyMembersSection from '@/components/patient/FamilyMembersSection'
import {
  emptyPatientInfo,
  patientInfoFromProfile,
  FIXED_ADDRESS,
} from '@/src/data/patientInfo'
import type { AddressOptions, MyProfileView } from '@/src/data/patientInfo'

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-body shadow-[inset_0_1px_2px_rgb(15_88_139/0.06)] outline-none transition-all placeholder:font-normal placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15 dark:bg-white/[0.04]'

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
  children,
}: {
  title: string
  subtitle?: string
  icon: typeof UserRound
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-line/70 bg-card shadow-card ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line/60 bg-surface/60 px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-white shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-extrabold tracking-tight text-body">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-xs font-medium text-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-500">
          {error}
        </span>
      )}
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  error,
}: {
  label: string
  name: string
  defaultValue: string
  options: string[]
  error?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>

      <div className="relative mt-1.5">
        <select
          name={name}
          defaultValue={defaultValue}
          className={`${inputClass} appearance-none pr-9 cursor-pointer`}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          aria-hidden="true"
        />
      </div>

      {error && (
        <span className="mt-1 block text-xs font-medium text-red-500">
          {error}
        </span>
      )}
    </label>
  )
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface/70 px-3.5 py-2.5 dark:bg-white/[0.03]">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-body">
        {value || '—'}
      </p>
    </div>
  )
}

export default function PatientInfoForm({
  profile,
}: {
  profile?: MyProfileView | null
}) {
  const router = useRouter()

  const [formKey, setFormKey] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  const initialForm = profile
    ? patientInfoFromProfile(profile)
    : emptyPatientInfo

  const [addressOptions, setAddressOptions] =
    useState<AddressOptions | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/address')
      .then((res) => res.json())
      .then((data: AddressOptions) => {
        if (!cancelled && data?.success) {
          setAddressOptions(data)
        }
      })
      .catch((error) =>
        console.error('[PatientInfoForm | address fetch]:', error),
      )

    return () => {
      cancelled = true
    }
  }, [])

  const lockedBarangay =
    addressOptions?.barangay ?? FIXED_ADDRESS.barangay

  const lockedMunicipality =
    addressOptions?.municipality ?? FIXED_ADDRESS.municipality

  const lockedProvince =
    addressOptions?.province ?? FIXED_ADDRESS.province

  const lockedZipCode =
    addressOptions?.zipCode ?? FIXED_ADDRESS.zipCode

  const purokOptions = Array.from(
    new Set([
      ...(addressOptions?.puroks ?? []),
      ...(initialForm.purok ? [initialForm.purok] : []),
    ]),
  )

  const [state, formAction, isPending] =
    useActionState(updateMyProfile, null)

  useEffect(() => {
    if (!state) return

    if (state.success) {
      toast.success(
        state.message ?? 'Profile updated successfully!',
      )
      setIsEditing(false)
      router.refresh()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, router])

  const errors =
    state && !state.success ? state.errors : undefined

  const handleCancel = () => {
    setFormKey((k) => k + 1)
    setIsEditing(false)
    toast('Changes discarded')
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      <form
        key={formKey}
        action={formAction}
        className="contents"
      >
      {!isEditing ? (
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-[24px] border border-line/70 bg-card p-4 shadow-card sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-deep px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] sm:ml-auto"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Information
            </button>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 rounded-[24px] border border-amber-200/70 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-400/20 dark:bg-amber-400/10">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Edit mode is on — update the fields below, then save.
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-card px-4 py-2 text-sm font-semibold text-body transition-colors hover:bg-surface disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Discard
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand to-brand-deep px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <fieldset
        disabled={!isEditing}
        className="contents"
      >
        <SectionCard
          title="Personal Information"
          subtitle=""
          icon={UserRound}
          className="lg:order-1"
          action={
            !isEditing ? (
              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:inline-block dark:bg-emerald-400/10 dark:text-emerald-300">
                Saved
              </span>
            ) : undefined
          }
        >
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-2.5">
              <ReadonlyRow label="First Name" value={initialForm.firstName} />
              <ReadonlyRow label="Middle Name" value={initialForm.middleName} />
              <ReadonlyRow label="Last Name" value={initialForm.lastName} />
              <ReadonlyRow label="Suffix" value={initialForm.suffix} />
              <ReadonlyRow label="Date of Birth" value={initialForm.dateOfBirth} />
              <ReadonlyRow label="Sex" value={initialForm.sex} />
              <ReadonlyRow label="Blood Type" value={initialForm.bloodType} />
              <ReadonlyRow label="Religion" value={initialForm.religion} />
              <div className="col-span-2 grid grid-cols-2 gap-2.5">
                <ReadonlyRow label="Father's Name" value={initialForm.fathersName} />
                <ReadonlyRow label="Mother's Name" value={initialForm.mothersName} />
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First Name"
                error={errors?.firstName}
              >
                <input
                  name="firstName"
                  defaultValue={initialForm.firstName}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Middle Name"
                error={errors?.middleName}
              >
                <input
                  name="middleName"
                  defaultValue={initialForm.middleName}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Last Name"
                error={errors?.lastName}
              >
                <input
                  name="lastName"
                  defaultValue={initialForm.lastName}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Suffix"
                error={errors?.suffix}
              >
                <input
                  name="suffix"
                  defaultValue={initialForm.suffix}
                  placeholder="Jr., Sr., III"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Date of Birth"
                error={errors?.birthdate}
              >
                <input
                  type="date"
                  name="birthdate"
                  defaultValue={initialForm.dateOfBirth}
                  className={inputClass}
                />
              </Field>

              <Field label="Sex">
                <select
                  name="sex"
                  defaultValue={initialForm.sex}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Blood Type">
                <input
                  name="bloodType"
                  defaultValue={initialForm.bloodType}
                  className={inputClass}
                />
              </Field>

              <Field label="Religion">
                <input
                  name="religion"
                  defaultValue={initialForm.religion}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Father's Name">
                <input
                  name="fathersName"
                  defaultValue={initialForm.fathersName}
                  className={inputClass}
                />
              </Field>

              <Field label="Mother's Name">
                <input
                  name="mothersName"
                  defaultValue={initialForm.mothersName}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
          )}
        </SectionCard>

        <SectionCard
          title="Contact Information"
          subtitle=""
          icon={Phone}
          className="lg:order-2"
        >
          {!isEditing ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ReadonlyRow label="Mobile Number" value={initialForm.mobile} />
              <ReadonlyRow label="Email Address" value={initialForm.email} />
            </div>
          ) : (
          <div className="space-y-4">
            <Field
              label="Mobile Number"
              error={errors?.phoneNumber}
            >
              <input
                name="phoneNumber"
                defaultValue={initialForm.mobile}
                className={inputClass}
              />
            </Field>

            <Field
              label="Email Address"
              error={errors?.email}
            >
              <input
                type="email"
                name="email"
                defaultValue={initialForm.email}
                className={inputClass}
              />
            </Field>
          </div>
          )}
        </SectionCard>

        <SectionCard
          title="Address"
          subtitle=""
          icon={MapPin}
          className="lg:order-3"
        >
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <ReadonlyRow
                  label="House No. / Street"
                  value={initialForm.houseStreet}
                />
              </div>
              <ReadonlyRow label="Purok" value={initialForm.purok} />
              <ReadonlyRow label="Barangay" value={lockedBarangay} />
              <ReadonlyRow label="Municipality / City" value={lockedMunicipality} />
              <ReadonlyRow label="Province" value={lockedProvince} />
              <ReadonlyRow label="ZIP Code" value={lockedZipCode} />
            </div>
          ) : (
          <div className="space-y-4">
            <Field
              label="House No. / Street"
              error={errors?.houseNumber}
            >
              <input
                name="houseNumber"
                defaultValue={initialForm.houseStreet}
                className={inputClass}
              />
            </Field>

            <Field
              label="Purok"
              error={errors?.purok}
            >
              <div className="relative">
                <select
                  name="purok"
                  defaultValue={initialForm.purok}
                  className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                >
                  <option value="" disabled>
                    Select Purok
                  </option>

                  {purokOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                  aria-hidden="true"
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Barangay">
                <input
                  name="barangay"
                  value={lockedBarangay}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                />
              </Field>

              <Field label="Municipality / City">
                <input
                  name="city"
                  value={lockedMunicipality}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Province">
                <input
                  name="province"
                  value={lockedProvince}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                />
              </Field>

              <Field label="ZIP Code">
                <input
                  name="zipCode"
                  value={lockedZipCode}
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                />
              </Field>
            </div>
          </div>
          )}
        </SectionCard>

        <SectionCard
          title="PhilHealth Information"
          subtitle=""
          icon={ShieldCheck}
          className="lg:order-4"
        >
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <ReadonlyRow
                  label="PhilHealth No."
                  value={initialForm.philHealthNo}
                />
              </div>
              <ReadonlyRow
                label="Membership Type"
                value={initialForm.membershipType}
              />
              <ReadonlyRow
                label="Status"
                value={initialForm.philHealthStatus}
              />
            </div>
          ) : (
          <div className="space-y-4">
            <Field
              label="PhilHealth No."
              error={errors?.philHealthNo}
            >
              <input
                name="philHealthNo"
                defaultValue={initialForm.philHealthNo}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Membership Type"
                name="membershipType"
                defaultValue={initialForm.membershipType}
                options={[
                  'Employed',
                  'Self-Employed',
                  'Indigent',
                  'OFW',
                  'Senior Citizen',
                ]}
                error={errors?.membershipType}
              />

              <SelectField
                label="Status"
                name="philHealthStatus"
                defaultValue={initialForm.philHealthStatus}
                options={[
                  'Active',
                  'Pending',
                  'Inactive',
                ]}
                error={errors?.philHealthStatus}
              />
            </div>
          </div>
          )}
        </SectionCard>
      </fieldset>

      {isEditing && (
        <div className="lg:order-6 lg:col-span-2">
          <div className="sticky bottom-24 flex gap-2.5 rounded-[24px] border border-line/70 bg-card/95 p-3 shadow-card backdrop-blur lg:static lg:justify-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 rounded-2xl border border-line bg-card px-6 py-3 text-sm font-semibold text-body transition-colors hover:bg-surface disabled:opacity-50 lg:flex-none lg:min-w-44 lg:px-10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand to-brand-deep px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none lg:min-w-44 lg:px-10"
            >
              {isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
      </form>

      <div className="lg:order-5 lg:col-span-2">
        <FamilyMembersSection profile={profile} />
      </div>
    </div>
  )
}

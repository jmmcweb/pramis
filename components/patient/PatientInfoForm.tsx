'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { updateMyProfile } from '@/lib/actions/me'
import {
  emptyPatientInfo,
  patientInfoFromProfile,
  FIXED_ADDRESS,
  splitHouseAndPurok,
} from '@/src/data/patientInfo'
import type {
  AddressOptions,
  FamilyMemberRow,
  MyProfileView,
} from '@/src/data/patientInfo'

const inputClass =
  'mt-1.5 w-full bg-surface rounded-xl px-3 py-2.5 text-sm font-semibold text-body border border-transparent outline-none transition-colors focus:bg-card focus:border-brand focus:ring-2 focus:ring-brand-tint'

const rowInputClass =
  'w-full bg-card rounded-lg px-3 py-2 text-sm font-semibold text-body border border-transparent outline-none transition-colors focus:border-brand'

function SectionCard({
  title,
  icon: Icon,
  className = '',
  children,
}: {
  title: string
  icon: typeof UserRound
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`bg-card rounded-3xl shadow-card p-5 ${className}`}>
      <h2 className="text-2xl font-bold text-brand mb-4 inline-flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {children}
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
      <span className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {error && (
        <span className="block text-xs font-medium text-red-500 mt-1">
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
      <span className="text-xs font-bold uppercase tracking-wide text-muted">
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
        <span className="block text-xs font-medium text-red-500 mt-1">
          {error}
        </span>
      )}
    </label>
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

  const initialFamily: FamilyMemberRow[] = (profile?.familyMembers ?? []).map(
    (member) => {
      const address = splitHouseAndPurok(member.houseNumber, member.purok)

      return {
        ...member,
        houseNumber: address.houseNumber,
        purok: address.purok,
      }
    },
  )

  const [family, setFamily] =
    useState<FamilyMemberRow[]>(initialFamily)

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
    setFamily(initialFamily)
    setIsEditing(false)
    toast('Changes discarded')
  }

  const addMember = () => {
    setFamily((prev) => [
      ...prev,
      {
        id: `fam-${Date.now()}`,
        name: '',
        relation: '',
        phone: '',
        birthdate: '',
        sex: '',
        houseNumber: '',
        barangay: '',
        city: '',
        province: '',
        zipCode: '',
        purok: '',
        philHealthNo: '',
        bloodType: '',
        religion: '',
        fathersName: '',
        mothersName: '',
      },
    ])
  }

  const removeMember = (id: string) => {
    setFamily((prev) =>
      prev.filter((member) => member.id !== id),
    )
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
    >
      {!isEditing && (
        <div className="lg:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-brand hover:bg-brand-dark text-white py-2.5 px-5 rounded-xl font-semibold text-sm transition-colors"
          >
            Edit Information
          </button>
        </div>
      )}

      <fieldset
        disabled={!isEditing}
        className="contents"
      >
        <SectionCard
          title="Personal Information"
          icon={UserRound}
          className="lg:order-1"
        >
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
                  placeholder="Jr., Sr., III…"
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
        </SectionCard>

        <SectionCard
          title="Contact Information"
          icon={Phone}
          className="lg:order-2"
        >
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
        </SectionCard>

        <SectionCard
          title="Address"
          icon={MapPin}
          className="lg:order-3"
        >
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
        </SectionCard>

        <SectionCard
          title="PhilHealth Information"
          icon={ShieldCheck}
          className="lg:order-4"
        >
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
        </SectionCard>
      </fieldset>

      <SectionCard
        title="Family Information"
        icon={Users}
        className="lg:order-5 lg:col-span-2"
      >
        <div className="space-y-3">
          {errors?.familyMembers && (
            <p className="text-xs font-medium text-red-500">
              {errors.familyMembers}
            </p>
          )}

          {family.length === 0 && (
            <div className="rounded-2xl bg-surface py-8 px-5 text-center">
              <Users className="w-8 h-8 text-muted mx-auto mb-2" />

              <p className="text-sm font-semibold text-body">
                No family members added
              </p>

              <p className="text-xs text-muted mt-1">
                Add a family member to keep their information
                available for patient records.
              </p>
            </div>
          )}

          {family.map((member) => (
            <div
              key={member.id}
              className="relative bg-surface rounded-2xl p-3"
            >
              <input
                type="hidden"
                name="familyMemberId"
                value={member.id}
              />

              <button
                type="button"
                aria-label={`Remove ${
                  member.name || 'family member'
                }`}
                onClick={() => removeMember(member.id)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              </button>

              <input
                name="familyName"
                placeholder="Full Name"
                defaultValue={member.name}
                className={`${rowInputClass} pr-9`}
              />

              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  name="familyRelation"
                  placeholder="Relation"
                  defaultValue={member.relation}
                  className={rowInputClass}
                />

                <input
                  name="familyPhone"
                  placeholder="Phone Number"
                  defaultValue={member.phone}
                  className={rowInputClass}
                />
              </div>

              <p className="mt-3 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                Patient Info (auto-fills the ITR)
              </p>

              <div className="grid grid-cols-2 gap-2">
                <input
                  name="familyBirthdate"
                  type="date"
                  aria-label="Birthdate"
                  defaultValue={member.birthdate}
                  className={rowInputClass}
                />

                <select
                  name="familySex"
                  aria-label="Sex"
                  defaultValue={member.sex}
                  className={`${rowInputClass} cursor-pointer`}
                >
                  <option value="">Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  name="familyHouseNumber"
                  placeholder="House No. / Street"
                  defaultValue={member.houseNumber}
                  className={rowInputClass}
                />

                <input
                  name="familyBarangay"
                  placeholder="Barangay / Purok"
                  defaultValue={member.barangay}
                  className={rowInputClass}
                />

                <input
                  name="familyCity"
                  placeholder="Municipality / City"
                  defaultValue={member.city}
                  className={rowInputClass}
                />

                <input
                  name="familyProvince"
                  placeholder="Province"
                  defaultValue={member.province}
                  className={rowInputClass}
                />

                <input
                  name="familyZipCode"
                  placeholder="ZIP Code"
                  defaultValue={member.zipCode}
                  className={rowInputClass}
                />

                <input
                  name="familyPurok"
                  placeholder="Purok"
                  defaultValue={member.purok}
                  className={rowInputClass}
                />

                <input
                  name="familyPhilHealthNo"
                  placeholder="PhilHealth No."
                  defaultValue={member.philHealthNo}
                  className={rowInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  name="familyBloodType"
                  placeholder="Blood Type"
                  defaultValue={member.bloodType}
                  className={rowInputClass}
                />

                <input
                  name="familyReligion"
                  placeholder="Religion"
                  defaultValue={member.religion}
                  className={rowInputClass}
                />

                <input
                  name="familyFathersName"
                  placeholder="Father's Name"
                  defaultValue={member.fathersName}
                  className={rowInputClass}
                />

                <input
                  name="familyMothersName"
                  placeholder="Mother's Name"
                  defaultValue={member.mothersName}
                  className={rowInputClass}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addMember}
            className="w-full border-2 border-dashed border-line rounded-xl py-2.5 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Plus
              className="w-4 h-4"
              aria-hidden="true"
            />
            Add Family Member
          </button>
        </div>
      </SectionCard>

      {isEditing && (
        <div className="bg-card rounded-3xl shadow-card p-5 lg:order-6 lg:col-span-2 lg:bg-transparent lg:shadow-none lg:rounded-none lg:border-t lg:border-line lg:px-0 lg:pb-0 lg:pt-6">
          <div className="flex gap-2.5 lg:justify-center">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 bg-card border border-line text-brand hover:bg-brand-tint py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 lg:flex-none lg:min-w-44 lg:px-10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed lg:flex-none lg:min-w-44 lg:px-10"
            >
              {isPending ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving…
                </>
              ) : (
                <>
                  <Check
                    className="w-4 h-4"
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
  )
}
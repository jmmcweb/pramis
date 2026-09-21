'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { deleteFamilyMember, saveFamilyMember } from '@/lib/actions/me'
import { splitHouseAndPurok } from '@/src/data/patientInfo'
import type { FamilyMemberRow, MyProfileView } from '@/src/data/patientInfo'

const rowInputClass =
  'w-full bg-card rounded-lg px-3 py-2 text-sm font-semibold text-body border border-transparent outline-none transition-colors focus:border-brand'

// Prefix used for client-only member ids that have not been saved to the
// database yet. Once saved, the real `FAM...` reference id replaces it.
const TEMP_ID_PREFIX = 'fam-'

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

const emptyMember = (): FamilyMemberRow => ({
  id: `${TEMP_ID_PREFIX}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
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
  isPwd: null,
})

function MemberCard({
  member,
  onSaved,
  onRemoved,
}: {
  member: FamilyMemberRow
  onSaved: (tempId: string, saved: FamilyMemberRow) => void
  onRemoved: (id: string) => void
}) {
  // Each member card is its own form with its own server action state, so
  // members can be saved one at a time and independently of the main profile
  // "Edit Information" flow.
  const [state, formAction, isPending] = useActionState(saveFamilyMember, null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const isNew = member.id.startsWith(TEMP_ID_PREFIX)
  const errors = state && !state.success ? state.errors : undefined

  useEffect(() => {
    if (!state) return

    if (state.success && state.member) {
      toast.success(state.message ?? 'Family member saved successfully!')
      // Reset the card so its fields match the saved values.
      setFormKey((k) => k + 1)
      onSaved(member.id, state.member)
    } else if (state.message) {
      toast.error(state.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const handleDelete = async () => {
    if (isNew) {
      onRemoved(member.id)
      toast('Family member removed')
      return
    }

    if (
      !window.confirm(
        `Remove ${member.name || 'this family member'}? This cannot be undone.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    const result = await deleteFamilyMember(member.id)
    setIsDeleting(false)

    if (result.success) {
      onRemoved(member.id)
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="relative bg-surface rounded-2xl p-3"
    >
      {!isNew && (
        <input type="hidden" name="familyMemberId" value={member.id} />
      )}

      <button
        type="button"
        aria-label={`Remove ${member.name || 'family member'}`}
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      <input
        name="name"
        placeholder="Full Name"
        defaultValue={member.name}
        className={`${rowInputClass} pr-9`}
      />
      {errors?.name && (
        <p className="text-xs font-medium text-red-500 mt-1">{errors.name}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <input
            name="relation"
            placeholder="Relation"
            defaultValue={member.relation}
            className={rowInputClass}
          />
          {errors?.relation && (
            <p className="text-xs font-medium text-red-500 mt-1">
              {errors.relation}
            </p>
          )}
        </div>

        <input
          name="phone"
          placeholder="Phone Number"
          defaultValue={member.phone}
          className={rowInputClass}
        />
      </div>

      <p className="mt-3 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Patient Info (auto-fills the ITR)
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            name="birthdate"
            type="date"
            aria-label="Birthdate"
            defaultValue={member.birthdate}
            className={rowInputClass}
          />
          {errors?.birthdate && (
            <p className="text-xs font-medium text-red-500 mt-1">
              {errors.birthdate}
            </p>
          )}
        </div>

        <select
          name="sex"
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
          name="houseNumber"
          placeholder="House No. / Street"
          defaultValue={member.houseNumber}
          className={rowInputClass}
        />

        <input
          name="barangay"
          placeholder="Barangay / Purok"
          defaultValue={member.barangay}
          className={rowInputClass}
        />

        <input
          name="city"
          placeholder="Municipality / City"
          defaultValue={member.city}
          className={rowInputClass}
        />

        <input
          name="province"
          placeholder="Province"
          defaultValue={member.province}
          className={rowInputClass}
        />

        <input
          name="zipCode"
          placeholder="ZIP Code"
          defaultValue={member.zipCode}
          className={rowInputClass}
        />

        <input
          name="purok"
          placeholder="Purok"
          defaultValue={member.purok}
          className={rowInputClass}
        />

        <input
          name="philHealthNo"
          placeholder="PhilHealth No."
          defaultValue={member.philHealthNo}
          className={rowInputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <select
          name="isPwd"
          aria-label="PWD status"
          defaultValue={
            member.isPwd === true
              ? 'Yes'
              : member.isPwd === false
                ? 'No'
                : ''
          }
          className={`${rowInputClass} cursor-pointer`}
        >
          <option value="">PWD?</option>
          <option value="Yes">Yes — PWD</option>
          <option value="No">No</option>
        </select>

        <input
          name="bloodType"
          placeholder="Blood Type"
          defaultValue={member.bloodType}
          className={rowInputClass}
        />

        <input
          name="religion"
          placeholder="Religion"
          defaultValue={member.religion}
          className={rowInputClass}
        />

        <input
          name="fathersName"
          placeholder="Father's Name"
          defaultValue={member.fathersName}
          className={rowInputClass}
        />

        <input
          name="mothersName"
          placeholder="Mother's Name"
          defaultValue={member.mothersName}
          className={rowInputClass}
        />
      </div>


      <button
        type="submit"
        disabled={isPending}
        className="mt-3 w-full bg-brand hover:bg-brand-dark text-white py-2 rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="w-4 h-4" aria-hidden="true" />
        )}
        {isNew ? 'Save Member' : 'Save Changes'}
      </button>
    </form>
  )
}

export default function FamilyMembersSection({
  profile,
}: {
  profile?: MyProfileView | null
}) {
  const [members, setMembers] = useState<FamilyMemberRow[]>(() =>
    (profile?.familyMembers ?? []).map((member) => {
      const address = splitHouseAndPurok(member.houseNumber, member.purok)

      return {
        ...member,
        houseNumber: address.houseNumber,
        purok: address.purok,
      }
    }),
  )

  const handleSaved = (tempId: string, saved: FamilyMemberRow) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === tempId ? saved : member)),
    )
  }

  const handleRemoved = (id: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== id))
  }

  return (
    <SectionCard title="Family Information" icon={Users}>
      <div className="space-y-3">
        {members.length === 0 && (
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

        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onSaved={handleSaved}
            onRemoved={handleRemoved}
          />
        ))}

        <button
          type="button"
          onClick={() => setMembers((prev) => [...prev, emptyMember()])}
          className="w-full border-2 border-dashed border-line rounded-xl py-2.5 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Family Member
        </button>
      </div>
    </SectionCard>
  )
}


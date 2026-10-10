'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck,
  Cake,
  Check,
  ChevronDown,
  HeartHandshake,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
  VenusAndMars,
  X,
} from 'lucide-react'
import { deleteFamilyMember, saveFamilyMember } from '@/lib/actions/me'
import {
  BLOOD_TYPES,
  FIXED_ADDRESS,
  PUROKS,
  splitHouseAndPurok,
} from '@/src/data/patientInfo'
import type { FamilyMemberRow, MyProfileView } from '@/src/data/patientInfo'
import { FAMILY_MEMBER_OPTIONS } from '@/src/data/itrAdult'

const RELATIONS = FAMILY_MEMBER_OPTIONS.map((option) => option.value)

const rowInputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-body shadow-[inset_0_1px_2px_rgb(15_88_139/0.06)] outline-none transition-all placeholder:font-normal placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15 dark:bg-white/[0.04]'

function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
    >
      {children}
      {optional && (
        <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-muted dark:bg-white/[0.06]">
          optional
        </span>
      )}
    </label>
  )
}

// Prefix used for client-only member ids that have not been saved to the
// database yet. Once saved, the real `FAM...` reference id replaces it.
const TEMP_ID_PREFIX = 'fam-'

function SectionCard({
  title,
  subtitle,
  count,
  icon: Icon,
  className = '',
  children,
}: {
  title: string
  subtitle?: string
  count?: number
  icon: typeof UserRound
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
            <p className="truncate text-xs font-medium text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {typeof count === 'number' && (
          <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white">
            {count}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
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
  // Prefix for the `for`/`id` pair of every labelled control, scoped per card so
  // multiple member cards on the same page never share ids.
  const uid = `fm-${member.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  // New (unsaved) cards start in edit mode so the Save button is visible.
  // Existing (saved) cards start read-only; the button shows as Edit.
  const [isEditing, setIsEditing] = useState(isNew)

  const errors = state && !state.success ? state.errors : undefined

  useEffect(() => {
    if (!state) return

    if (state.success && state.member) {
      toast.success(state.message ?? 'Family member saved successfully!')
      // Reset the card so its fields match the saved values.
      setFormKey((k) => k + 1)
      setIsEditing(false)
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

  const handleCancel = () => {
    if (isNew) {
      // Discard the unsaved card entirely.
      onRemoved(member.id)
      toast('Family member removed')
      return
    }
    // Revert any typed edits back to the saved values.
    setFormKey((k) => k + 1)
    setIsEditing(false)
  }

  // Saved members stay read-only until "Edit" is pressed, so the Save
  // button only ever appears while adding a new member or editing one.
  if (!isNew && !isEditing) {
    const details = [
      member.relation ? { icon: HeartHandshake, text: member.relation } : null,
      member.phone ? { icon: Phone, text: member.phone } : null,
      member.birthdate ? { icon: Cake, text: member.birthdate } : null,
      member.sex ? { icon: VenusAndMars, text: member.sex } : null,
      member.houseNumber || member.purok
        ? {
            icon: MapPin,
            text: [member.houseNumber, member.purok].filter(Boolean).join(', '),
          }
        : null,
    ].filter(Boolean) as { icon: typeof Phone; text: string }[]

    return (
      <div className="group relative overflow-hidden rounded-2xl border border-line/70 bg-white p-4 transition-all hover:border-brand/40 hover:shadow-md dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-sm font-extrabold text-white">
            {(member.name || 'F').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-body">
              {member.name || 'Unnamed member'}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted">
              <BadgeCheck
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
              {member.relation || 'Family member'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              aria-label={`Remove ${member.name || 'family member'}`}
              onClick={handleDelete}
              disabled={isDeleting}
              className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {details.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {details.map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-body dark:bg-white/[0.05]"
              >
                <Icon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {text}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-b from-brand/[0.06] to-white p-4 dark:from-brand/15 dark:to-white/[0.02]"
    >
      {!isNew && (
        <input type="hidden" name="familyMemberId" value={member.id} />
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-[13px] font-extrabold text-body">
          {isNew ? 'New family member' : `Editing ${member.name || 'member'}`}
        </p>
        {isNew && (
          <button
            type="button"
            aria-label="Remove unsaved family member"
            onClick={handleDelete}
            className="ml-auto grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div>
        <FieldLabel htmlFor={`${uid}-name`}>Full Name</FieldLabel>
        <input
          id={`${uid}-name`}
          name="name"
          placeholder="e.g. Juan Dela Cruz"
          defaultValue={member.name}
          className={rowInputClass}
        />
        {errors?.name && (
          <p className="text-xs font-medium text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <FieldLabel htmlFor={`${uid}-relation`}>Relation</FieldLabel>
          <select
            id={`${uid}-relation`}
            name="relation"
            defaultValue={member.relation}
            className={`${rowInputClass} cursor-pointer`}
          >
            <option value="">Select relation</option>
            {Array.from(
              new Set([
                ...RELATIONS,
                ...(member.relation ? [member.relation] : []),
              ]),
            ).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors?.relation && (
            <p className="text-xs font-medium text-red-500 mt-1">
              {errors.relation}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={`${uid}-phone`} optional>
            Phone Number
          </FieldLabel>
          <input
            id={`${uid}-phone`}
            name="phone"
            inputMode="tel"
            placeholder="09XX XXX XXXX"
            defaultValue={member.phone}
            className={rowInputClass}
          />
        </div>
      </div>

      <p className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        Patient Info
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel htmlFor={`${uid}-birthdate`}>Birthdate</FieldLabel>
          <input
            id={`${uid}-birthdate`}
            name="birthdate"
            type="date"
            defaultValue={member.birthdate}
            className={rowInputClass}
          />
          {errors?.birthdate && (
            <p className="text-xs font-medium text-red-500 mt-1">
              {errors.birthdate}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={`${uid}-sex`}>Sex</FieldLabel>
          <select
            id={`${uid}-sex`}
            name="sex"
            defaultValue={member.sex}
            className={`${rowInputClass} cursor-pointer`}
          >
            <option value="">---</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <p className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        Address
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <FieldLabel htmlFor={`${uid}-houseNumber`}>Street</FieldLabel>
          <input
            id={`${uid}-houseNumber`}
            name="houseNumber"
            placeholder="e.g. Mabini Street"
            defaultValue={member.houseNumber}
            className={rowInputClass}
          />
        </div>

        <div className="col-span-2">
          <FieldLabel htmlFor={`${uid}-purok`}>Purok</FieldLabel>
          <div className="relative">
            <select
              id={`${uid}-purok`}
              name="purok"
              defaultValue={member.purok}
              className={`${rowInputClass} cursor-pointer appearance-none pr-9`}
            >
              <option value="">Select Purok</option>
              {Array.from(
                new Set([...PUROKS, ...(member.purok ? [member.purok] : [])]),
              ).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-surface/70 px-3 py-2 dark:bg-white/[0.03]">
        <MapPin
          className="h-3.5 w-3.5 shrink-0 text-brand"
          aria-hidden="true"
        />
        <span className="text-[11px] font-semibold text-body">
          {FIXED_ADDRESS.barangay}, {FIXED_ADDRESS.municipality},{' '}
          {FIXED_ADDRESS.province} {FIXED_ADDRESS.zipCode}
        </span>
      </div>
      <input type="hidden" name="barangay" value={FIXED_ADDRESS.barangay} />
      <input type="hidden" name="city" value={FIXED_ADDRESS.municipality} />
      <input type="hidden" name="province" value={FIXED_ADDRESS.province} />
      <input type="hidden" name="zipCode" value={FIXED_ADDRESS.zipCode} />

      <div className="mt-4">
        <FieldLabel htmlFor={`${uid}-philHealthNo`} optional>
          PhilHealth No.
        </FieldLabel>
        <input
          id={`${uid}-philHealthNo`}
          name="philHealthNo"
          placeholder="PhilHealth No."
          defaultValue={member.philHealthNo}
          className={rowInputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <FieldLabel htmlFor={`${uid}-isPwd`}>
            Is the family member a PWD?
          </FieldLabel>
          <select
            id={`${uid}-isPwd`}
            name="isPwd"
            defaultValue={
              member.isPwd === true ? 'Yes' : member.isPwd === false ? 'No' : ''
            }
            className={`${rowInputClass} cursor-pointer`}
          >
            <option value="">---</option>
            <option value="Yes">Yes — PWD</option>
            <option value="No">No</option>
          </select>
        </div>

        <div>
          <FieldLabel htmlFor={`${uid}-bloodType`} optional>
            Blood Type
          </FieldLabel>
          <select
            id={`${uid}-bloodType`}
            name="bloodType"
            defaultValue={member.bloodType}
            className={`${rowInputClass} cursor-pointer`}
          >
            <option value="">---</option>
            {Array.from(
              new Set([
                ...BLOOD_TYPES,
                ...(member.bloodType ? [member.bloodType] : []),
              ]),
            ).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <FieldLabel htmlFor={`${uid}-religion`} optional>
            Religion
          </FieldLabel>
          <input
            id={`${uid}-religion`}
            name="religion"
            placeholder="Religion"
            defaultValue={member.religion}
            className={rowInputClass}
          />
        </div>

        <div>
          <FieldLabel htmlFor={`${uid}-fathersName`} optional>
            Father&apos;s Name
          </FieldLabel>
          <input
            id={`${uid}-fathersName`}
            name="fathersName"
            placeholder="Father's Name"
            defaultValue={member.fathersName}
            className={rowInputClass}
          />
        </div>

        <div className="col-span-2">
          <FieldLabel htmlFor={`${uid}-mothersName`} optional>
            Mother&apos;s Name
          </FieldLabel>
          <input
            id={`${uid}-mothersName`}
            name="mothersName"
            placeholder="Mother's Name"
            defaultValue={member.mothersName}
            className={rowInputClass}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:bg-surface disabled:opacity-50 dark:bg-white/[0.04]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {isNew ? 'Discard' : 'Cancel'}
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-deep px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : isNew ? (
            <Plus className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Check className="w-4 h-4" aria-hidden="true" />
          )}
          {isNew ? 'Save Member' : 'Save Changes'}
        </button>
      </div>
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
    <SectionCard
      title="Family Information"
      subtitle=""
      count={members.length}
      icon={Users}
    >
      <div className="space-y-3">
        {members.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-8 text-center dark:bg-white/[0.02]">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Users className="h-6 w-6" aria-hidden="true" />
            </span>

            <p className="mt-3 text-sm font-extrabold text-body">
              No family members added
            </p>

            <p className="mx-auto mt-1 max-w-[26ch] text-xs leading-relaxed text-muted">
              Add a family member to keep their information available for
              patient records.
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/30 bg-brand/[0.04] py-3 text-sm font-bold text-brand transition-all hover:border-brand/60 hover:bg-brand/[0.08] active:scale-[0.99] dark:bg-brand/10"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Family Member
        </button>
      </div>
    </SectionCard>
  )
}

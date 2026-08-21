'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  ChevronDown,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { initialFamily, initialPatient } from '@/src/data/patientInfo'
import type { FamilyMember, PatientInfo } from '@/src/data/patientInfo'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </label>
  )
}

export default function PatientInfoForm() {
  const [form, setForm] = useState<PatientInfo>(initialPatient)
  const [family, setFamily] = useState<FamilyMember[]>(initialFamily)

  const set = (key: keyof PatientInfo) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const updateMember = (id: string, key: keyof FamilyMember, value: string) =>
    setFamily((prev) =>
      prev.map((member) => (member.id === id ? { ...member, [key]: value } : member))
    )

  const addMember = () =>
    setFamily((prev) => [
      ...prev,
      { id: `fam-${Date.now()}`, name: '', relation: '', phone: '' },
    ])

  const removeMember = (id: string) =>
    setFamily((prev) => prev.filter((member) => member.id !== id))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Patient information saved successfully')
  }

  const handleCancel = () => {
    setForm(initialPatient)
    setFamily(initialFamily)
    toast('Changes discarded')
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <SectionCard title="Personal Information" icon={UserRound} className="lg:order-1">
        <div className="space-y-4">
          <Field label="Full Name">
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(e) => set('fullName')(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth">
              <input
                type="date"
                className={inputClass}
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth')(e.target.value)}
              />
            </Field>
            <SelectField
              label="Sex"
              value={form.sex}
              options={['Female', 'Male']}
              onChange={set('sex')}
            />
          </div>
          <SelectField
            label="Civil Status"
            value={form.civilStatus}
            options={['Single', 'Married', 'Widowed', 'Separated', 'Divorced']}
            onChange={set('civilStatus')}
          />
        </div>
      </SectionCard>

      <SectionCard title="Contact Information" icon={Phone} className="lg:order-5">
        <div className="space-y-4">
          <Field label="Mobile Number">
            <input
              className={inputClass}
              value={form.mobile}
              onChange={(e) => set('mobile')(e.target.value)}
            />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Address" icon={MapPin} className="lg:order-2">
        <div className="space-y-4">
          <Field label="House No. / Street">
            <input
              className={inputClass}
              value={form.houseStreet}
              onChange={(e) => set('houseStreet')(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barangay">
              <input
                className={inputClass}
                value={form.barangay}
                onChange={(e) => set('barangay')(e.target.value)}
              />
            </Field>
            <Field label="Municipality / City">
              <input
                className={inputClass}
                value={form.municipality}
                onChange={(e) => set('municipality')(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Province">
            <input
              className={inputClass}
              value={form.province}
              onChange={(e) => set('province')(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="PhilHealth Information" icon={ShieldCheck} className="lg:order-4">
        <div className="space-y-4">
          <Field label="PhilHealth No.">
            <input
              className={inputClass}
              value={form.philHealthNo}
              onChange={(e) => set('philHealthNo')(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Membership Type"
              value={form.membershipType}
              options={['Employed', 'Self-Employed', 'Indigent', 'OFW', 'Senior Citizen']}
              onChange={set('membershipType')}
            />
            <SelectField
              label="Status"
              value={form.philHealthStatus}
              options={['Active', 'Pending', 'Inactive']}
              onChange={set('philHealthStatus')}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Family Information" icon={Users} className="lg:order-3">
        <div className="space-y-3">
          {family.map((member) => (
            <div key={member.id} className="relative bg-surface rounded-2xl p-3">
              <button
                type="button"
                aria-label={`Remove ${member.name || 'family member'}`}
                onClick={() => removeMember(member.id)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                placeholder="Full Name"
                className={`${rowInputClass} pr-9`}
                value={member.name}
                onChange={(e) => updateMember(member.id, 'name', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  placeholder="Relation"
                  className={rowInputClass}
                  value={member.relation}
                  onChange={(e) => updateMember(member.id, 'relation', e.target.value)}
                />
                <input
                  placeholder="Phone Number"
                  className={rowInputClass}
                  value={member.phone}
                  onChange={(e) => updateMember(member.id, 'phone', e.target.value)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="w-full border-2 border-dashed border-line rounded-xl py-2.5 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Family Member
          </button>
        </div>
      </SectionCard>

      <div className="bg-card rounded-3xl shadow-card p-5 lg:order-6 lg:col-span-2 lg:bg-transparent lg:shadow-none lg:rounded-none lg:border-t lg:border-line lg:px-0 lg:pb-0 lg:pt-6">
        <div className="flex gap-2.5 lg:justify-center">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-card border border-line text-brand hover:bg-brand-tint py-3 rounded-xl font-medium text-sm transition-colors lg:flex-none lg:min-w-44 lg:px-10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-1.5 lg:flex-none lg:min-w-44 lg:px-10"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Save Changes
          </button>
        </div>
      </div>
    </form>
  )
}

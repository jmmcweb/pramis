'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  Plus,
} from 'lucide-react'
import { familyMembers, patient } from '@/src/data/records'
import type { PatientMember } from '@/src/data/records'
import { serviceIcons } from '@/src/data/appointment'

const relationships = [
  'Son',
  'Daughter',
  'Mother',
  'Father',
  'Grandparent',
  'Spouse',
  'Other',
]

const inputClass =
  'mt-1.5 w-full bg-surface rounded-xl px-3 py-2.5 text-sm font-semibold text-body border border-transparent outline-none transition-colors focus:bg-card focus:border-brand focus:ring-2 focus:ring-brand-tint'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

export default function MedicalRecordsTimeline() {
  const [members, setMembers] = useState<PatientMember[]>(() => [patient, ...familyMembers])
  const [activeId, setActiveId] = useState('me')
  const [isAdding, setIsAdding] = useState(false)
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    relation: 'Son',
  })

  const member = members.find((m) => m.id === activeId) ?? patient

  const canSubmit =
    newMember.firstName.trim() !== '' && newMember.lastName.trim() !== ''

  const addMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const name = `${newMember.firstName.trim()} ${newMember.lastName.trim()}`
    const initials = `${newMember.firstName.trim()[0] ?? ''}${newMember.lastName.trim()[0] ?? ''}`.toUpperCase()
    const created: PatientMember = {
      id: `member-${Date.now()}`,
      name,
      relation: newMember.relation,
      initials,
      birthdate: newMember.birthdate,
      records: [],
    }
    setMembers((prev) => [...prev, created])
    setActiveId(created.id)
    setIsAdding(false)
    setNewMember({ firstName: '', lastName: '', birthdate: '', relation: 'Son' })
    toast.success(`${name} added to your family`)
  }

  return (
    <div className="flex flex-col gap-5 md:grid md:grid-cols-[260px_1fr]">
      <div className="bg-card rounded-3xl shadow-card p-5 md:flex md:flex-col md:sticky md:top-16 md:self-start md:min-h-[25.9375rem]">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
          Viewing Records For
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:space-y-2 md:overflow-visible md:pb-0">
          {members.map((m) => {
            const isActive = m.id === activeId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveId(m.id)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors md:w-full md:whitespace-normal ${
                  isActive
                    ? 'bg-brand text-white shadow-md'
                    : 'bg-surface text-muted hover:bg-brand-tint'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-brand-tint text-brand'
                  }`}
                >
                  {m.initials}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  {m.id === 'me' ? (
                    <span className="text-sm font-semibold">Me</span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold md:hidden">
                        {m.name.split(' ')[0]}
                      </span>
                      <span className="hidden md:inline text-sm font-semibold">
                        {m.name}
                      </span>
                    </>
                  )}
                  <span
                    className={`text-[10px] ${
                      isActive ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {m.relation}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {isAdding ? (
          <form onSubmit={addMember} className="bg-surface rounded-2xl p-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name">
                <input
                  className={inputClass}
                  value={newMember.firstName}
                  onChange={(e) =>
                    setNewMember((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Last Name">
                <input
                  className={inputClass}
                  value={newMember.lastName}
                  onChange={(e) =>
                    setNewMember((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Birthdate">
                <input
                  type="date"
                  className={inputClass}
                  value={newMember.birthdate}
                  onChange={(e) =>
                    setNewMember((prev) => ({ ...prev, birthdate: e.target.value }))
                  }
                />
              </Field>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Relationship
                </span>
                <div className="relative mt-1.5">
                  <select
                    value={newMember.relation}
                    onChange={(e) =>
                      setNewMember((prev) => ({ ...prev, relation: e.target.value }))
                    }
                    className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                  >
                    {relationships.map((relation) => (
                      <option key={relation} value={relation}>
                        {relation}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                    aria-hidden="true"
                  />
                </div>
              </label>
            </div>
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-card border border-line text-brand hover:bg-brand-tint py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Add Member
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full border-2 border-dashed border-line rounded-xl py-2.5 mt-4 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5 md:py-5 md:mt-6"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Family Member
          </button>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-brand">Health Timeline</h2>
          <span className="text-xs font-semibold text-muted">
            {member.name} · {member.relation}
          </span>
        </div>

        {member.records.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <ClipboardList className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-bold text-body">No medical records yet</p>
            <p className="text-xs text-muted">
              Records created by health staff will appear here.
            </p>
          </div>
        ) : (
          <div className="relative pl-6">
            <span
              className="absolute left-[5px] top-5 bottom-5 w-0.5 bg-track"
              aria-hidden="true"
            />
            <div className="space-y-4">
              {member.records.map((record) => {
                const Icon = serviceIcons[record.icon]
                return (
                  <div key={record.id} className="relative bg-surface rounded-2xl p-4">
                    <span
                      className="absolute -left-6 top-5 w-3 h-3 rounded-full bg-brand ring-4 ring-brand-tint"
                      aria-hidden="true"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-brand uppercase tracking-wide">
                        {record.date}
                      </p>
                      <div className="w-9 h-9 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-body mt-1">
                      {record.type}
                    </h3>
                    <p className="text-sm text-muted">
                      {record.staffName} · {record.role}
                    </p>
                    <div className="mt-3 space-y-1.5 text-sm text-body">
                      <p>
                        <span className="font-semibold text-body">Diagnosis:</span>{' '}
                        {record.diagnosis}
                      </p>
                      <p>
                        <span className="font-semibold text-body">Prescription:</span>{' '}
                        {record.prescription}
                      </p>
                    </div>
                    <div className="flex gap-2.5 mt-4">
                      <button
                        type="button"
                        className="flex-1 bg-card border border-line text-brand hover:bg-brand-tint py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        View
                      </button>
                      <button
                        type="button"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Download
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

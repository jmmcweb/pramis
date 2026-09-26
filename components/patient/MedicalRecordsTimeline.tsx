//
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Eye, FileText, Plus, UserRoundPlus } from 'lucide-react'
import type { MedicalRecord, PatientMember } from '@/src/data/records'
import { serviceIcons } from '@/src/data/appointment'
import RecordDetailModal from '@/components/patient/RecordDetailModal'
import ItrViewerModal from '@/components/ui/ItrViewerModal'

//
export default function MedicalRecordsTimeline({
  members,
}: {
  members: PatientMember[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null)
  const [itrRecord, setItrRecord] = useState<MedicalRecord | null>(null)
  const activeMember =
    members.find((m) => m.id === activeId) ?? members[0] ?? null

  return (
    <div className="flex flex-col gap-5 md:grid md:grid-cols-[260px_1fr]">
      <div className="bg-card rounded-3xl shadow-card p-5 md:flex md:flex-col md:sticky md:top-24 md:self-start md:min-h-[25.9375rem]">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
          Viewing Records For
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:space-y-2 md:overflow-visible md:pb-0">
          {members.map((m) => {
            const isActive = m.id === activeMember?.id
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
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-brand-tint text-brand'
                  }`}
                >
                  {m.initials}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold truncate max-w-[11rem]">
                    {m.name}
                  </span>
                  <span
                    className={`text-[10px] ${isActive ? 'text-white/75' : 'text-muted'}`}
                  >
                    {m.id}
                  </span>
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

        {/* Family members are managed on the profile page. */}
        <Link
          href="/user/profile"
          className="w-full border-2 border-dashed border-line rounded-xl py-2.5 mt-4 text-sm font-medium text-brand hover:bg-brand-tint transition-colors inline-flex items-center justify-center gap-1.5 no-underline md:py-5 md:mt-6"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Manage Family Members
        </Link>
      </div>

      <div className="bg-card rounded-3xl shadow-card p-5">
        {activeMember ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold text-brand">Health Timeline</h2>
              <span className="text-xs font-semibold text-muted">
                {activeMember.name} · {activeMember.id} ·{' '}
                {activeMember.relation}
              </span>
            </div>

            {activeMember.records.length === 0 ? (
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
                  {activeMember.records.map((record) => {
                    const Icon = serviceIcons[record.icon]
                    const vitals = [
                      record.bloodPressure
                        ? {
                            label: 'Blood Pressure',
                            value: `${record.bloodPressure} mmHg`,
                          }
                        : null,
                      record.heartRate
                        ? {
                            label: 'Heart Rate',
                            value: `${record.heartRate} bpm`,
                          }
                        : null,
                      record.respiratoryRate
                        ? {
                            label: 'Respiratory Rate',
                            value: `${record.respiratoryRate} /min`,
                          }
                        : null,
                      record.temperature
                        ? {
                            label: 'Temperature',
                            value: `${record.temperature}°C`,
                          }
                        : null,
                      record.oxygenLevel
                        ? {
                            label: 'Oxygen Level',
                            value: `${record.oxygenLevel}%`,
                          }
                        : null,
                      record.height
                        ? { label: 'Height', value: `${record.height} cm` }
                        : null,
                      record.weight
                        ? { label: 'Weight', value: `${record.weight} kg` }
                        : null,
                    ].filter(Boolean) as Array<{ label: string; value: string }>
                    // Check if record has child-specific data
                    const hasChildData =
                      record.birthLength ||
                      record.birthWeight ||
                      record.placeDelivered ||
                      record.typeOfDelivery ||
                      record.attendantAtBirth
                    const hasImmunizations =
                      record.immBcg ||
                      record.immHepab24 ||
                      record.immPenta1 ||
                      record.immOpv1 ||
                      record.immMcv1 ||
                      record.immInfluenza ||
                      record.immPneumonia ||
                      record.immOthers
                    return (
                      <div
                        key={record.id}
                        className="relative bg-surface rounded-2xl p-4"
                      >
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
                        {record.condition && (
                          <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-brand-tint text-brand text-[11px] font-bold">
                            {record.condition}
                          </span>
                        )}
                        {/* Basic health info captured during the visit. */}
                        {vitals.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {vitals.map((v) => (
                              <div
                                key={v.label}
                                className="bg-card border border-line rounded-xl px-3 py-2"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted m-0">
                                  {v.label}
                                </p>
                                <p className="text-sm font-semibold text-body m-0 mt-0.5">
                                  {v.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {record.chiefComplaints && (
                          <div className="mt-3 text-sm text-body">
                            <p>
                              <span className="font-semibold text-body">
                                Chief Complaints:
                              </span>{' '}
                              {record.chiefComplaints}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 space-y-1.5 text-sm text-body">
                          <p>
                            <span className="font-semibold text-body">
                              Diagnosis:
                            </span>{' '}
                            {record.diagnosis}
                          </p>
                          {record.medications && (
                            <p>
                              <span className="font-semibold text-body">
                                Medications:
                              </span>{' '}
                              {record.medications}
                            </p>
                          )}
                          {record.prescription && (
                            <p>
                              <span className="font-semibold text-body">
                                Recommendation:
                              </span>{' '}
                              {record.prescription}
                            </p>
                          )}
                        </div>
                        {/* Child-specific: Birth details */}
                        {hasChildData && (
                          <div className="mt-3 p-3 bg-surface-dark rounded-xl">
                            <p className="text-xs font-bold text-brand uppercase tracking-wide mb-2">
                              Birth Details
                            </p>
                            <div className="space-y-1.5 text-sm text-body">
                              {record.placeDelivered && (
                                <p>
                                  <span className="font-semibold">
                                    Place Delivered:
                                  </span>{' '}
                                  {record.placeDelivered}
                                </p>
                              )}
                              {record.typeOfDelivery && (
                                <p>
                                  <span className="font-semibold">
                                    Type of Delivery:
                                  </span>{' '}
                                  {record.typeOfDelivery}
                                </p>
                              )}
                              {record.birthLength && (
                                <p>
                                  <span className="font-semibold">
                                    Birth Length:
                                  </span>{' '}
                                  {record.birthLength} cm
                                </p>
                              )}
                              {record.birthWeight && (
                                <p>
                                  <span className="font-semibold">
                                    Birth Weight:
                                  </span>{' '}
                                  {record.birthWeight} kg
                                </p>
                              )}
                              {record.attendantAtBirth && (
                                <p>
                                  <span className="font-semibold">
                                    Attendant:
                                  </span>{' '}
                                  {record.attendantAtBirth}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Child-specific: Immunization records */}
                        {hasImmunizations && (
                          <div className="mt-3 p-3 bg-surface-dark rounded-xl">
                            <p className="text-xs font-bold text-brand uppercase tracking-wide mb-2">
                              Immunization Records
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-body">
                              {record.immBcg && (
                                <p>
                                  <span className="font-semibold">BCG:</span>{' '}
                                  {record.immBcg}
                                </p>
                              )}
                              {record.immHepab24 && (
                                <p>
                                  <span className="font-semibold">
                                    Hepa B (24h):
                                  </span>{' '}
                                  {record.immHepab24}
                                </p>
                              )}
                              {record.immPenta1 && (
                                <p>
                                  <span className="font-semibold">
                                    Pentavalent 1:
                                  </span>{' '}
                                  {record.immPenta1}
                                </p>
                              )}
                              {record.immOpv1 && (
                                <p>
                                  <span className="font-semibold">OPV 1:</span>{' '}
                                  {record.immOpv1}
                                </p>
                              )}
                              {record.immMcv1 && (
                                <p>
                                  <span className="font-semibold">MCV 1:</span>{' '}
                                  {record.immMcv1}
                                </p>
                              )}
                              {record.immInfluenza && (
                                <p>
                                  <span className="font-semibold">
                                    Influenza:
                                  </span>{' '}
                                  {record.immInfluenza}
                                </p>
                              )}
                              {record.immPneumonia && (
                                <p>
                                  <span className="font-semibold">
                                    Pneumonia:
                                  </span>{' '}
                                  {record.immPneumonia}
                                </p>
                              )}
                              {record.immOthers && (
                                <p>
                                  <span className="font-semibold">Others:</span>{' '}
                                  {record.immOthers}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2.5 mt-4">
                          <button
                            type="button"
                            onClick={() => setViewingRecord(record)}
                            className="flex-1 bg-card border border-line text-brand hover:bg-brand-tint py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setItrRecord(record)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors inline-flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" aria-hidden="true" />
                            View ITR
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface rounded-2xl p-6 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <UserRoundPlus className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-bold text-body">No records yet</p>
            <p className="text-xs text-muted">
              Complete an appointment to start your medical history.
            </p>
          </div>
        )}
      </div>
      {/* View Record Modal */}
      {viewingRecord && activeMember && (
        <RecordDetailModal
          record={viewingRecord}
          memberName={activeMember.name}
          onClose={() => setViewingRecord(null)}
        />
      )}

      {/* ITR viewer — the printed template layout, printable from the sheet. */}
      {itrRecord && (
        <ItrViewerModal
          record={itrRecord}
          onClose={() => setItrRecord(null)}
        />
      )}
    </div>
  )
}

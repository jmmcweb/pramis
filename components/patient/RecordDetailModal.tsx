'use client'

import { X, Printer } from 'lucide-react'
import type { MedicalRecord } from '@/src/data/records'
import { serviceIcons } from '@/src/data/appointment'

//
export default function RecordDetailModal({
  record,
  memberName,
  onClose,
}: {
  record: MedicalRecord
  memberName: string
  onClose: () => void
}) {
  const Icon = serviceIcons[record.icon]
  const fmt = (d: string) => {
    const x = new Date(d)
    return isNaN(x.getTime())
      ? d
      : x.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
  }
  const vitals = [
    record.bloodPressure && { label: 'BP', value: `${record.bloodPressure}` },
    record.heartRate && { label: 'HR', value: `${record.heartRate}` },
    record.temperature && { label: 'Temp', value: `${record.temperature}°C` },
    record.height && { label: 'HT', value: `${record.height}cm` },
    record.weight && { label: 'WT', value: `${record.weight}kg` },
  ].filter(Boolean) as { label: string; value: string }[]
  const imms = [
    record.immBcg && { label: 'BCG', value: record.immBcg },
    record.immPenta1 && { label: 'Penta1', value: record.immPenta1 },
    record.immOpv1 && { label: 'OPV1', value: record.immOpv1 },
  ].filter(Boolean) as { label: string; value: string }[]
  const hasBirth = !!(
    record.birthLength ||
    record.birthWeight ||
    record.placeDelivered ||
    record.typeOfDelivery
  )
  const patientDetails = [
    record.firstName && { label: 'First Name', value: record.firstName },
    record.middleName && { label: 'Middle Name', value: record.middleName },
    record.lastName && { label: 'Last Name', value: record.lastName },
    record.suffix && { label: 'Suffix', value: record.suffix },
    record.birthday && { label: 'Birthday', value: record.birthday },
    record.age && { label: 'Age', value: record.age },
    record.sex && { label: 'Sex', value: record.sex },
    record.bloodType && { label: 'Blood Type', value: record.bloodType },
    record.civilStatus && { label: 'Civil Status', value: record.civilStatus },
    record.religion && { label: 'Religion', value: record.religion },
    record.contactNumber && {
      label: 'Contact Number',
      value: record.contactNumber,
    },
    record.address && { label: 'Address', value: record.address },
    record.fathersName && { label: "Father's Name", value: record.fathersName },
    record.mothersName && { label: "Mother's Name", value: record.mothersName },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl my-8 rounded-2xl border border-line bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-body">{record.type}</h2>
              <p className="text-sm text-muted">{record.date}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-surface text-muted hover:bg-surface-dark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase text-muted m-0">
                Patient
              </p>
              <p className="text-sm font-semibold text-body m-0 mt-0.5">
                {memberName}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase text-muted m-0">
                Attending
              </p>
              <p className="text-sm font-semibold text-body m-0 mt-0.5">
                {record.staffName}
              </p>
            </div>
          </div>
          {patientDetails.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand uppercase mb-2">
                Patient Information
              </p>
              <div className="grid grid-cols-2 gap-2">
                {patientDetails.map((detail) => (
                  <div
                    key={detail.label}
                    className="bg-surface rounded-xl px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase text-muted m-0">
                      {detail.label}
                    </p>
                    <p className="text-sm font-semibold text-body m-0 mt-0.5 break-words">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {vitals.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand uppercase mb-2">
                Vital Signs
              </p>
              <div className="grid grid-cols-3 gap-2">
                {vitals.map((v) => (
                  <div
                    key={v.label}
                    className="bg-surface rounded-xl px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase text-muted m-0">
                      {v.label}
                    </p>
                    <p className="text-sm font-semibold text-body m-0 mt-0.5">
                      {v.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-brand uppercase mb-2">
              Clinical
            </p>
            <div className="space-y-2">
              {record.chiefComplaints && (
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase text-muted m-0">
                    Complaints
                  </p>
                  <p className="text-sm text-body m-0 mt-1">
                    {record.chiefComplaints}
                  </p>
                </div>
              )}
              <div className="bg-surface rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-muted m-0">
                  Diagnosis
                </p>
                <p className="text-sm text-body m-0 mt-1">{record.diagnosis}</p>
              </div>
              {record.medications && (
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase text-muted m-0">
                    Medications
                  </p>
                  <p className="text-sm text-body m-0 mt-1">
                    {record.medications}
                  </p>
                </div>
              )}
            </div>
          </div>
          {hasBirth && (
            <div>
              <p className="text-xs font-bold text-brand uppercase mb-2">
                Birth
              </p>
              <div className="bg-surface rounded-xl p-3 grid grid-cols-2 gap-2">
                {record.placeDelivered && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted m-0">
                      Place
                    </p>
                    <p className="text-sm font-semibold text-body m-0 mt-0.5">
                      {record.placeDelivered}
                    </p>
                  </div>
                )}
                {record.birthWeight && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted m-0">
                      Weight
                    </p>
                    <p className="text-sm font-semibold text-body m-0 mt-0.5">
                      {record.birthWeight}kg
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {imms.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand uppercase mb-2">
                Immunizations
              </p>
              <div className="grid grid-cols-2 gap-2">
                {imms.map((imm) => (
                  <div
                    key={imm.label}
                    className="bg-surface rounded-xl px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase text-muted m-0">
                      {imm.label}
                    </p>
                    <p className="text-sm font-semibold text-body m-0 mt-0.5">
                      {fmt(imm.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

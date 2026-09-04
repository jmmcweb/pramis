'use client'

// Child Individual Treatment Record (ITR) — post-consultation form.

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { saveMedicalRecord } from '@/lib/actions/medical'
import {
  normalizeSex,
  type ScheduleAppointmentView,
} from '@/config/appointment'
import {
  computeAge,
  FIELD,
  FIELD_READONLY,
  ItrConsultationSection,
  ItrFooter,
  ItrHeader,
  ItrStepper,
  ItrTextarea,
  LBL,
  PANEL,
  RadioField,
  ReadOnlyField,
  SECTION_TITLE,
  SubmittedValuesContext,
  TextField,
} from '@/components/ui/ItrFields'

// Expanded Program on Immunization entries from the CHU VII Child ITR,
// in paper-table order (vaccine name + date given).
// Each entry: [form field name, database column name, display label]
const IMMUNIZATIONS: [string, string, string][] = [
  ['imm_bcg', 'immBcg', 'BCG'],
  ['imm_hepab24', 'immHepab24', 'Hepa B w/in 24 Hours'],
  ['imm_hepab24plus', 'immHepab24plus', 'Hepa B ≥ 24 Hours'],
  ['imm_penta1', 'immPenta1', 'Pentavalent 1'],
  ['imm_penta2', 'immPenta2', 'Pentavalent 2'],
  ['imm_penta3', 'immPenta3', 'Pentavalent 3'],
  ['imm_opv1', 'immOpv1', 'OPV 1'],
  ['imm_opv2', 'immOpv2', 'OPV 2'],
  ['imm_opv3', 'immOpv3', 'OPV 3'],
  ['imm_rota1', 'immRota1', 'Rota 1'],
  ['imm_rota2', 'immRota2', 'Rota 2'],
  ['imm_pcv1', 'immPcv1', 'PCV 1'],
  ['imm_pcv2', 'immPcv2', 'PCV 2'],
  ['imm_pcv3', 'immPcv3', 'PCV 3'],
  ['imm_mcv1', 'immMcv1', 'MCV 1 (AMV)'],
  ['imm_mcv2', 'immMcv2', 'MCV 2 (MMR)'],
  ['imm_hepab2', 'immHepab2', 'Hepa B2'],
  ['imm_hepab3', 'immHepab3', 'Hepa B3'],
  ['imm_hepaa', 'immHepaa', 'Hepa A'],
  ['imm_pneumonia', 'immPneumonia', 'Pneumonia'],
  ['imm_influenza', 'immInfluenza', 'Influenza'],
  ['imm_others', 'immOthers', 'Others'],
]

export default function ChildItrForm({
  appointment,
  darkMode,
  onClose,
  onSaved,
}: {
  appointment: ScheduleAppointmentView
  darkMode: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    saveMedicalRecord as (prev: any, formData: FormData) => Promise<any>,
    null,
  )

  // Bumped after a failed submission so the <form> re-mounts pre-filled
  // with the values the user typed (React resets uncontrolled inputs after
  // a form action, so retention is done via the server-echoed values).
  const [errorKey, setErrorKey] = useState(0)
  const submitted =
    state && !state.success
      ? ((state.values as Record<string, string> | undefined) ?? null)
      : null

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success(state.message)
      router.refresh()
      onSaved?.()
      onClose()
    } else if (state.message) {
      toast.error(state.message)
      setErrorKey((k) => k + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const record = appointment.medicalRecord
  const itr = record?.itrData ?? {}
  const info = appointment.patientInfo ?? {
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    birthdate: null,
    sex: '',
    contactNumber: '',
    address: '',
    philHealthNo: '',
    bloodType: '',
    religion: '',
    fathersName: '',
    mothersName: '',
  }

  const [page, setPage] = useState(0)
  const [birthday, setBirthday] = useState(itr.birthday || info.birthdate || '')
  const [age, setAge] = useState(
    itr.age || (info.birthdate ? computeAge(info.birthdate) : ''),
  )

  const recordDate =
    appointment.dateISO || new Date().toISOString().slice(0, 10)

  const steps = [
    'Child Information',
    'PhilHealth & Membership',
    'Immunization Record',
    'Consent & Signature',
    'Consultation Record',
  ]

  return (
    <form key={errorKey} action={formAction} className="px-4 sm:px-6 py-5">
      <SubmittedValuesContext.Provider value={submitted}>
        <input type="hidden" name="appointmentId" value={appointment.id} />
        <input
          type="hidden"
          name="recordStatus"
          value={record?.status || 'Stable'}
        />
        {/* Preserve fields not captured by the ITR pages when editing */}
        <input
          type="hidden"
          name="oxygenLevel"
          value={record?.oxygenLevel ?? ''}
        />
        <input
          type="hidden"
          name="recommendation"
          value={record?.recommendation ?? ''}
        />

        {/* Document header */}
        <ItrHeader title="City Health Unit VII — Child Individual Treatment Record (ITR)" />

        {/* Stepper (pagination) */}
        <ItrStepper
          steps={steps}
          page={page}
          setPage={setPage}
          isPending={isPending}
        />

        {/* Page 1: Child Information */}
        <div className={`${PANEL} ${page !== 0 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Child Information</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Personal information is auto-populated from the patient's saved
            profile. For family members, update their patient information in the
            account profile.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-[1fr_100px] gap-4">
              <ReadOnlyField
                name="lastName"
                label="Last Name"
                defaultValue={itr.lastName || info.lastName}
              />
              <ReadOnlyField
                name="suffix"
                label="Suffix"
                defaultValue={itr.suffix || info.suffix}
              />
            </div>
            <ReadOnlyField
              name="firstName"
              label="First Name"
              defaultValue={itr.firstName || info.firstName}
            />
            <ReadOnlyField
              name="middleName"
              label="Middle Name"
              defaultValue={itr.middleName || info.middleName}
            />
            <div>
              <label htmlFor="itr-birthday" className={LBL}>
                Birthday
              </label>
              <input
                id="itr-birthday"
                name="birthday"
                type="date"
                value={birthday}
                disabled
                className={FIELD_READONLY}
                tabIndex={-1}
              />
              <input type="hidden" name="birthday" value={birthday} />
            </div>
            <div>
              <label htmlFor="itr-age" className={LBL}>
                Age
              </label>
              <input
                id="itr-age"
                name="age"
                value={age}
                disabled
                className={FIELD_READONLY}
                tabIndex={-1}
              />
              <input type="hidden" name="age" value={age} />
            </div>
            <div>
              <label htmlFor="itr-sex" className={LBL}>
                Sex
              </label>
              <select
                id="itr-sex"
                name="sex"
                defaultValue={normalizeSex(itr.sex || info.sex)}
                disabled
                className={`${FIELD_READONLY} cursor-not-allowed`}
                tabIndex={-1}
              >
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                type="hidden"
                name="sex"
                value={normalizeSex(itr.sex || info.sex)}
              />
            </div>
            <TextField
              name="birthplace"
              label="Birthplace"
              defaultValue={itr.birthplace}
            />
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
              <RadioField
                name="placeDelivered"
                label="Place Delivered"
                defaultValue={
                  record?.placeDelivered || itr.placeDelivered || ''
                }
                options={[
                  { value: 'LYING-IN', text: 'Lying-in' },
                  { value: 'OTHERS', text: 'Others' },
                ]}
              />
              <TextField
                name="placeDeliveredOthers"
                label="Specify (if Others)"
                defaultValue={
                  record?.placeDeliveredOthers || itr.placeDeliveredOthers || ''
                }
              />
            </div>
            <RadioField
              name="typeOfDelivery"
              label="Type of Delivery"
              defaultValue={record?.typeOfDelivery || itr.typeOfDelivery || ''}
              options={[
                { value: 'NSD', text: 'NSD' },
                { value: 'CS', text: 'CS' },
              ]}
            />
            <TextField
              name="attendantAtBirth"
              label="Attendant at Birth"
              defaultValue={
                record?.attendantAtBirth || itr.attendantAtBirth || ''
              }
              placeholder="Doctor / Nurse / Midwife…"
            />
            <TextField
              name="birthLength"
              label="Birth Length (cm)"
              defaultValue={record?.birthLength || itr.birthLength || ''}
              placeholder="50"
            />
            <TextField
              name="birthWeight"
              label="Birth Weight (kg)"
              defaultValue={record?.birthWeight || itr.birthWeight || ''}
              placeholder="3.2"
            />
            <TextField
              name="fathersName"
              label="Father's Name"
              defaultValue={itr.fathersName || info.fathersName}
            />
            <TextField
              name="mothersName"
              label="Mother's Name"
              defaultValue={itr.mothersName || info.mothersName}
            />
            <ReadOnlyField
              name="contactNumber"
              label="Contact Number"
              defaultValue={itr.contactNumber || info.contactNumber}
            />
            <TextField
              name="religion"
              label="Religion"
              defaultValue={itr.religion || info.religion}
            />
            <div className="sm:col-span-2">
              <ItrTextarea
                name="address"
                label="Complete Residential Address"
                rows={2}
                defaultValue={itr.address || info.address}
              />
            </div>
          </div>
        </div>

        {/* ===== Page 2: PhilHealth & Membership ===== */}
        <div className={`${PANEL} ${page !== 1 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>PhilHealth &amp; Membership</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              name="philHealthNo"
              label="PhilHealth No."
              defaultValue={itr.philHealthNo || info.philHealthNo}
            />
            <TextField
              name="memberName"
              label="Member's Name"
              defaultValue={itr.memberName}
              placeholder="Last Name, First Name Middle Name"
            />
            <TextField
              name="memberBirthday"
              label="Member's Birthday"
              type="date"
              defaultValue={itr.memberBirthday}
            />
            <RadioField
              name="memberDependent"
              label="Member or Dependent (Y/N)"
              defaultValue={itr.memberDependent}
              options={[
                { value: 'Y', text: 'Y' },
                { value: 'N', text: 'N' },
              ]}
            />
          </div>
        </div>

        {/* Page 3: Immunization Record  */}
        <div className={`${PANEL} ${page !== 2 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Immunization Record</h3>
          <p className="m-0 -mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
            Enter the date each vaccine was given. Leave blank if not yet
            administered.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMMUNIZATIONS.map(([key, dbKey, label]) => (
              <TextField
                key={key}
                name={key}
                label={label}
                type="date"
                defaultValue={record?.[dbKey] || itr[key] || ''}
              />
            ))}
          </div>
        </div>

        {/*  Page 4: Consent & Signature  */}
        <div className={`${PANEL} ${page !== 3 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Consent &amp; Signature</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
              <p className="m-0 font-bold underline mb-1">IN ENGLISH</p>
              <p className="m-0">
                I have read and understood the{' '}
                <em>Patient&apos;s Information</em> after I have been made aware
                of its contents. During an informational conversation I was
                informed in a very comprehensible way about the essence and
                importance of the Integrated Clinic Information System
                (iClinicSys) by the CHU/RHU representative. All my questions
                during the conversation were answered sufficiently and I had
                been given enough time to decide on this. Furthermore, I permit
                the CHU/RHU to encode the information concerning my person and
                the collected data regarding disease symptoms and consultations
                for said information system. I wish to be informed about the
                medical results concerning me personally or my direct
                descendants. Also, I can cancel my consent at the CHU/RHU any
                time without giving reasons and without concerning any
                disadvantage for my medical treatment.
              </p>
            </div>
            <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
              <p className="m-0 font-bold underline mb-1">SA FILIPINO</p>
              <p className="m-0 italic">
                Aking nabasa at naintindihan ang Impormasyon ng Pasyente matapos
                ako&apos;y bigyang-kaalaman ng mga nilalaman nito. Sa isang
                pag-uusap kasama ang kinatawan ng CHU/RHU, ako ay
                binigyang-paunawa nang mahusay tungkol sa kakanyahan at
                kahalagahan ng Integrated Clinic Information System
                (iClinicSys). Lahat ng aking mga katanungan sa panahon ng
                pag-uusap ay nasagot nang sapat at ako ay binigyan ng sapat na
                oras upang magpasya nito. Higit pa rito, pinapayagan ko ang
                CHU/RHU upang i-encode ang mga impormasyon tungkol sa akin at
                ang mga nakolektang impormasyon tungkol sa mga sintomas ng aking
                sakit at konsultasyon kaugnay dito para sa nasabing information
                system. Nais kong malaman at maipaalam sa aking direktagang
                kapamilya ang aking mga medikal na resulta. Gayundin, maaari
                kong kanselahin ang aking pahintulot sa CHU/RHU anumang oras na
                walang ibinibigay na dahilan at walang kinalaman sa anumang
                kawalan para sa aking medikal na paggamot.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            <TextField
              name="consentPatientName"
              label="Signature over Printed Name (Patient/Guardian)"
              defaultValue={
                itr.consentPatientName ||
                `${info.firstName} ${info.lastName}`.trim()
              }
            />
            <TextField
              name="consentDate"
              label="Date"
              type="date"
              defaultValue={itr.consentDate || recordDate}
            />
            <TextField
              name="consentRepresentative"
              label="Name of CHU/RHU Representative"
              defaultValue={itr.consentRepresentative}
            />
          </div>
        </div>

        {/*  Page 5: Consultation Record  */}
        <div className={`${PANEL} ${page !== 4 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Consultation Record</h3>
          <ItrConsultationSection record={record} recordDate={recordDate} />
        </div>

        {/*  Pagination footer  */}
        <ItrFooter
          steps={steps}
          page={page}
          setPage={setPage}
          isPending={isPending}
          darkMode={darkMode}
          submitLabel={record ? 'Update ITR' : 'Save ITR & Complete'}
        />
      </SubmittedValuesContext.Provider>
    </form>
  )
}

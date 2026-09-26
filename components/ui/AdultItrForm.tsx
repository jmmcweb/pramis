'use client'



import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { saveMedicalRecord } from '@/lib/actions/medical'
import {
  normalizeSex,
  type ScheduleAppointmentView,
} from '@/config/appointment'
import {
  CheckboxField,
  CheckboxGroupField,
  CheckboxSpecifyField,
  computeAge,
  computeAgeParts,
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
  SelectField,
  SUBTITLE,
  SubmittedValuesContext,
  TextField,
} from '@/components/ui/ItrFields'
import {
  CIVIL_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  DISABILITY_TYPES,
  EMPLOYMENT_STATUS_OPTIONS,
  FAMILY_MEMBER_OPTIONS,
  HISTORY_CONDITIONS,
  NCD_QUESTIONS,
  NATURE_OF_VISIT_OPTIONS,
  PHILHEALTH_CATEGORIES,
  PHILHEALTH_STATUS_OPTIONS,
  PREFIX_OPTIONS,
  RELATIONSHIP_TO_MEMBER_OPTIONS,
  SEX_OPTIONS,
  SOCIAL_HISTORY_OPTIONS,
  YES_NO_OPTIONS,
  historyField,
  historySpecifyField,
} from '@/src/data/itrAdult'

// Wizard pages of the printed ITR template.
const STEPS = [
  'Personal Information',
  'Address & Contact',
  'Other Info & PhilHealth',
  'Consultation Details & History',
  'Immunization & Female Health',
  'NCD & Social History',
  'Consent & Signature',
  'Consultation Record',
]

// Adult / elderly immunization boxes printed under the ITR's
// ">> IMMUNIZATION <<" section.
const ADULT_IMMUNIZATION: { name: string; label: string }[] = [
  { name: 'immAdultHpv', label: 'HPV' },
  { name: 'immAdultMmr', label: 'MMR' },
  { name: 'immAdultNone', label: 'None' },
]

const ELDERLY_IMMUNIZATION: { name: string; label: string }[] = [
  { name: 'immElderlyPneumococcal', label: 'Pneumococcal Vaccine' },
  { name: 'immElderlyFlu', label: 'Flu Vaccine' },
  { name: 'immElderlyOthers', label: 'Others' },
]

const LEGACY_FAMILY_ROLE: Record<string, string> = {
  HEAD: 'Head of Family',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  OTHERS: 'Others',
}

function normalizeFamilyRole(value: string, patientSex: string): string {
  if (!value) return ''
  if (LEGACY_FAMILY_ROLE[value]) {
    if (value === 'SPOUSE')
      return patientSex === 'Female' ? 'Wife' : 'Husband'
    if (value === 'CHILD') return patientSex === 'Female' ? 'Daughter' : 'Son'
    return LEGACY_FAMILY_ROLE[value]
  }
  return value
}

function normalizeCivilStatus(value: string): string {
  const v = (value || '').trim().toLowerCase()
  if (!v) return ''
  if (v.includes('widow')) return 'Widow/er'
  if (v.includes('annul')) return 'Separated'
  if (v.includes('separat')) return 'Separated'
  if (v.includes('co-') || v.includes('cohabit') || v.includes('live'))
    return 'Co-Habitation'
  if (v.startsWith('single')) return 'Single'
  if (v.startsWith('married')) return 'Married'
  return value
}

export default function AdultItrForm({
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
    purok: '',
    houseNumber: '',
    barangay: '',
    city: '',
    email: '',
    philHealthNo: '',
    bloodType: '',
    religion: '',
    fathersName: '',
    mothersName: '',
  }

  const [page, setPage] = useState(0)
  const sex = normalizeSex(itr.sex || info.sex)
  const birthday = itr.birthday || info.birthdate || ''
  const age = itr.age || (info.birthdate ? computeAge(info.birthdate) : '')
  const ageParts = computeAgeParts(birthday)
  const isFemale = sex === 'Female'

  const recordDate =
    appointment.dateISO || new Date().toISOString().slice(0, 10)

  // Tick marks are stored as "<field>: 'Yes'" → checked state for checklists.
  const ticked = (name: string) => Boolean(itr[name])

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
        {/* Legacy single-line contact kept for older ITR snapshots */}
        <input
          type="hidden"
          name="contactNumber"
          value={itr.contactNumber ?? ''}
        />
        <input
          type="hidden"
          name="memberDependent"
          value={itr.memberDependent ?? ''}
        />
        <input
          type="hidden"
          name="mothersName"
          value={itr.mothersName ?? ''}
        />

        {/*  Document header  */}
        <ItrHeader title="City Health Unit VII — Adult Individual Treatment Record (ITR)" />

        {/*  Stepper (pagination)  */}
        <ItrStepper
          steps={STEPS}
          page={page}
          setPage={setPage}
          isPending={isPending}
        />

        {/*  Page 1: Personal Information  */}
        <div className={`${PANEL} ${page !== 0 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Personal Information</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Name, birth date and sex are auto-populated from the patient&apos;s
            saved profile. For family members, update their patient information
            in the account profile.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <RadioField
                name="prefix"
                label="Prefix"
                options={PREFIX_OPTIONS}
                defaultValue={itr.prefix}
              />
            </div>
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
                Birth Date (mm/dd/yyyy)
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
            <div className="sm:col-span-2">
              <span className={LBL}>Sex</span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {SEX_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-[#F9FAFB]"
                  >
                    <input
                      type="radio"
                      name="sexDisplay"
                      value={o.value}
                      defaultChecked={sex === o.value}
                      disabled
                      tabIndex={-1}
                      className="accent-[#4E69D3] w-4 h-4"
                    />
                    {o.text}
                  </label>
                ))}
              </div>
              <input type="hidden" name="sex" value={sex} />
            </div>

            <h4 className={`${SUBTITLE} sm:col-span-2 mt-2`}>
              &gt;&gt; Other Personal Information &lt;&lt;
            </h4>
            <TextField
              name="birthplace"
              label="Birth Place"
              defaultValue={itr.birthplace}
            />
            <TextField
              name="religion"
              label="Religion"
              defaultValue={itr.religion || info.religion}
            />
            <div className="sm:col-span-2">
              <RadioField
                name="civilStatus"
                label="Civil Status"
                options={CIVIL_STATUS_OPTIONS}
                defaultValue={normalizeCivilStatus(itr.civilStatus)}
              />
            </div>
            <div className="sm:col-span-2">
              <RadioField
                name="employmentStatus"
                label="Employment Status"
                options={EMPLOYMENT_STATUS_OPTIONS}
                defaultValue={itr.employmentStatus}
              />
            </div>
            <TextField
              name="educationalAttainment"
              label="Educational Attainment"
              defaultValue={itr.educationalAttainment}
              placeholder="e.g. High School Graduate"
            />
            <TextField
              name="bloodType"
              label="Blood Type"
              defaultValue={itr.bloodType || info.bloodType}
              placeholder="A+ / B / O- …"
            />
            <RadioField
              name="indigenous"
              label="Indigenous"
              options={YES_NO_OPTIONS}
              defaultValue={itr.indigenous}
            />
            <TextField
              name="fathersName"
              label="Father's Name"
              defaultValue={itr.fathersName || info.fathersName}
            />
            <TextField
              name="mothersFirstName"
              label="Mother's First Name"
              defaultValue={itr.mothersFirstName}
            />
            <TextField
              name="mothersLastName"
              label="Mother's Last Name"
              defaultValue={itr.mothersLastName}
            />
            <TextField
              name="mothersMiddleName"
              label="Mother's Middle Name"
              defaultValue={itr.mothersMiddleName}
            />
            <TextField
              name="mothersBirthdate"
              label="Mother's Birthdate"
              type="date"
              defaultValue={itr.mothersBirthdate}
            />
            <TextField
              name="spouseName"
              label="Name of Spouse"
              defaultValue={itr.spouseName}
            />
            <TextField
              name="maidenName"
              label="Maiden Name"
              defaultValue={itr.maidenName}
              placeholder="For married women"
            />
          </div>
        </div>

        {/*  Page 2: Address & Contact Information  */}
        <div className={`${PANEL} ${page !== 1 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Address &amp; Contact Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              name="cityMun"
              label="City / Municipality"
              defaultValue={itr.cityMun || info.city}
              placeholder="City of Malolos"
            />
            <TextField
              name="barangay"
              label="Barangay"
              defaultValue={itr.barangay || info.barangay}
            />
            <TextField
              name="streetNumber"
              label="Number / Street"
              defaultValue={itr.streetNumber || info.houseNumber}
            />
            <TextField
              name="purok"
              label="Name / Purok"
              defaultValue={itr.purok || info.purok}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              defaultValue={itr.email || info.email}
            />
            <TextField
              name="mobileNumber"
              label="Mobile Number"
              defaultValue={itr.mobileNumber || info.contactNumber}
              placeholder="09XX XXX XXXX"
            />
            <TextField
              name="landlineNumber"
              label="Landline Number"
              defaultValue={itr.landlineNumber}
            />
            <div className="sm:col-span-2">
              <ItrTextarea
                name="address"
                label="Complete Residential Address (summary)"
                rows={2}
                defaultValue={itr.address || info.address || ''}
                placeholder="Combined address printed on the ITR — prefilled from the fields above and the patient profile"
              />
            </div>
          </div>
        </div>

        {/*  Page 3: Other Info & PhilHealth  */}
        <div className={`${PANEL} ${page !== 2 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Other Info &amp; PhilHealth</h3>

          <h4 className={SUBTITLE}>&gt;&gt; Other Info &lt;&lt;</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <RadioField
                name="familyMemberRole"
                label="Family Member"
                options={FAMILY_MEMBER_OPTIONS}
                defaultValue={normalizeFamilyRole(
                  itr.familyMemberRole || '',
                  sex,
                )}
              />
            </div>
            <RadioField
              name="dswd4psMember"
              label="DSWD 4Ps Member"
              options={YES_NO_OPTIONS}
              defaultValue={itr.dswd4psMember}
            />
            <RadioField
              name="pwdMember"
              label="Person with Disability?"
              options={YES_NO_OPTIONS}
              defaultValue={itr.pwdMember}
            />
            <div className="sm:col-span-2">
              <CheckboxGroupField
                name="disabilityTypes"
                label="If yes? (choose)"
                options={DISABILITY_TYPES}
                defaultValue={itr.disabilityTypes}
              />
            </div>
            <TextField
              name="psaNationalId"
              label="PSA National ID #"
              defaultValue={itr.psaNationalId}
            />
          </div>

          <h4 className={`${SUBTITLE} mt-5`}>&gt;&gt; PhilHealth Info &lt;&lt;</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <RadioField
              name="philHealthMember"
              label="PhilHealth Member"
              options={YES_NO_OPTIONS}
              defaultValue={itr.philHealthMember}
            />
            <TextField
              name="philHealthNo"
              label="PhilHealth Number"
              defaultValue={itr.philHealthNo || info.philHealthNo}
            />
            <div className="sm:col-span-2">
              <RadioField
                name="philHealthStatusType"
                label="PhilHealth Status Type"
                options={PHILHEALTH_STATUS_OPTIONS}
                defaultValue={
                  itr.philHealthStatusType ||
                  (itr.memberDependent === 'Y'
                    ? 'Dependent'
                    : itr.memberDependent === 'N'
                      ? 'Member'
                      : '')
                }
              />
            </div>
            <div className="sm:col-span-2">
              <RadioField
                name="relationshipToMember"
                label="Relationship to Member"
                options={RELATIONSHIP_TO_MEMBER_OPTIONS}
                defaultValue={itr.relationshipToMember}
              />
            </div>
            <SelectField
              name="philHealthCategory"
              label="PhilHealth Category"
              options={PHILHEALTH_CATEGORIES}
              defaultValue={itr.philHealthCategory}
              className="sm:col-span-2"
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
            <div className="sm:col-span-2">
              <RadioField
                name="yakapRegistered"
                label="Yakap Registered?"
                options={YES_NO_OPTIONS}
                defaultValue={itr.yakapRegistered}
              />
            </div>
          </div>
        </div>

        {/*  Page 4: Consultation Details & Medical History  */}
        <div className={`${PANEL} ${page !== 3 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>
            Consultation Details &amp; Medical History
          </h3>

          <h4 className={SUBTITLE}>&gt;&gt; Consultation Details &lt;&lt;</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <RadioField
                name="natureOfVisit"
                label="Nature of Visit"
                options={NATURE_OF_VISIT_OPTIONS}
                defaultValue={itr.natureOfVisit}
              />
            </div>
            <div className="sm:col-span-2">
              <span className={LBL}>Patient Age</span>
              <div className="grid sm:grid-cols-3 gap-4">
                <TextField
                  name="patientAgeYears"
                  label="In years"
                  type="number"
                  defaultValue={itr.patientAgeYears || ageParts.years}
                />
                <TextField
                  name="patientAgeMonths"
                  label="In months"
                  type="number"
                  defaultValue={itr.patientAgeMonths || ageParts.months}
                />
                <TextField
                  name="patientAgeDays"
                  label="In days"
                  type="number"
                  defaultValue={itr.patientAgeDays || ageParts.days}
                />
              </div>
            </div>
          </div>

          <h4 className={`${SUBTITLE} mt-5`}>
            &gt;&gt; Past Medical History &lt;&lt;
          </h4>
          <HistoryChecklist prefix="pastMed" itr={itr} />
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <TextField
              name="pastSurgicalHistory"
              label="Past Surgical History Done"
              defaultValue={itr.pastSurgicalHistory}
            />
            <TextField
              name="pastSurgicalDate"
              label="Date Done"
              type="date"
              defaultValue={itr.pastSurgicalDate}
            />
          </div>

          <h4 className={`${SUBTITLE} mt-5`}>&gt;&gt; Family History &lt;&lt;</h4>
          <HistoryChecklist prefix="famHist" itr={itr} />
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <TextField
              name="famHistSurgical"
              label="Past Surgical History Done"
              defaultValue={itr.famHistSurgical}
            />
            <TextField
              name="famHistSurgicalDate"
              label="Date Done"
              type="date"
              defaultValue={itr.famHistSurgicalDate}
            />
          </div>
        </div>

        {/*  Page 5: Immunization, Family Planning & Female Health  */}
        <div className={`${PANEL} ${page !== 4 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>
            Immunization, Family Planning &amp; Female Health
          </h3>

          <h4 className={SUBTITLE}>&gt;&gt; Immunization &lt;&lt;</h4>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 m-0 mb-2">
            *For Adult:
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
            {ADULT_IMMUNIZATION.map((o) => (
              <CheckboxField
                key={o.name}
                name={o.name}
                label={o.label}
                defaultChecked={ticked(o.name)}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 m-0 mb-2">
            *For Elderly:
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
            {ELDERLY_IMMUNIZATION.map((o) => (
              <CheckboxField
                key={o.name}
                name={o.name}
                label={o.label}
                defaultChecked={ticked(o.name)}
              />
            ))}
          </div>

          <h4 className={`${SUBTITLE} mt-5`}>&gt;&gt; Family Planning &lt;&lt;</h4>
          <RadioField
            name="familyPlanningCounseling"
            label="With access to family planning counselling?"
            options={YES_NO_OPTIONS}
            defaultValue={itr.familyPlanningCounseling}
          />

          {isFemale && (
            <>
              <h4 className={`${SUBTITLE} mt-5`}>&gt;&gt; Menstrual History &lt;&lt;</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <TextField
                  name="ageOfMenarche"
                  label="Menarche (years old)"
                  type="number"
                  defaultValue={itr.ageOfMenarche}
                />
                <TextField
                  name="onsetSexualIntercourse"
                  label="Onset of Sexual Intercourse (years old)"
                  type="number"
                  defaultValue={itr.onsetSexualIntercourse}
                />
                <TextField
                  name="lmp"
                  label="Last Menstrual Period"
                  type="date"
                  defaultValue={itr.lmp}
                />
                <TextField
                  name="periodDuration"
                  label="Period Duration (days)"
                  type="number"
                  defaultValue={itr.periodDuration}
                />
                <TextField
                  name="padsPerDay"
                  label="No. of pads per day"
                  type="number"
                  defaultValue={itr.padsPerDay}
                />
                <TextField
                  name="intervalCycle"
                  label="Interval Cycle (days)"
                  type="number"
                  defaultValue={itr.intervalCycle}
                />
                <TextField
                  name="birthControlMethod"
                  label="Birth Control Method Used"
                  defaultValue={itr.birthControlMethod}
                />
                <RadioField
                  name="menopause"
                  label="Menopause"
                  options={YES_NO_OPTIONS}
                  defaultValue={itr.menopause}
                />
                <TextField
                  name="ageMenopause"
                  label="Age of menopausal (years old)"
                  type="number"
                  defaultValue={itr.ageMenopause}
                />
              </div>

              <h4 className={`${SUBTITLE} mt-5`}>&gt;&gt; Pregnancy History &lt;&lt;</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TextField
                    name="gravidity"
                    label="G"
                    type="number"
                    defaultValue={itr.gravidity}
                  />
                  <TextField
                    name="parityFullTerm"
                    label="T (Full Term)"
                    type="number"
                    defaultValue={itr.parityFullTerm}
                  />
                  <TextField
                    name="parityPreterm"
                    label="P (Preterm)"
                    type="number"
                    defaultValue={itr.parityPreterm}
                  />
                  <TextField
                    name="parityAbortion"
                    label="A (Abortion)"
                    type="number"
                    defaultValue={itr.parityAbortion}
                  />
                </div>
                <TextField
                  name="parityLivebirth"
                  label="L (Living Birth)"
                  type="number"
                  defaultValue={itr.parityLivebirth}
                />
                <RadioField
                  name="pregnancyTypeOfDelivery"
                  label="Type of Delivery"
                  options={DELIVERY_TYPE_OPTIONS}
                  defaultValue={itr.pregnancyTypeOfDelivery || itr.typeOfDelivery}
                />
                <RadioField
                  name="pregnancyInducedHypertension"
                  label="Pregnancy Induced Hypertension"
                  options={YES_NO_OPTIONS}
                  defaultValue={itr.pregnancyInducedHypertension}
                />
                <TextField
                  name="edc"
                  label="EDC (if pregnant)"
                  type="date"
                  defaultValue={itr.edc}
                />
              </div>
            </>
          )}
        </div>

        {/*  Page 6: NCD Questionnaire & Personal / Social History  */}
        <div className={`${PANEL} ${page !== 5 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>
            NCD Questionnaire &amp; Personal / Social History
          </h3>

          <h4 className={SUBTITLE}>
            &gt;&gt; Patient Answer to NCD Questionnaires — For Patient Aged 25
            Years Old and Above &lt;&lt;
          </h4>
          <div className="grid gap-0 mb-5">
            {NCD_QUESTIONS.map((q) => (
              <div
                key={q.name}
                className="py-2 border-b border-gray-100 dark:border-white/5"
              >
                <RadioField
                  name={q.name}
                  label={q.label}
                  options={YES_NO_OPTIONS}
                  defaultValue={itr[q.name]}
                />
              </div>
            ))}
          </div>

          <h4 className={SUBTITLE}>&gt;&gt; Personal / Social History &lt;&lt;</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <RadioField
              name="smoking"
              label="Smoking"
              options={SOCIAL_HISTORY_OPTIONS}
              defaultValue={itr.smoking}
            />
            <TextField
              name="smokingPacksPerDay"
              label="No. of packs a day"
              type="number"
              defaultValue={itr.smokingPacksPerDay}
            />
            <RadioField
              name="alcohol"
              label="Alcohol"
              options={SOCIAL_HISTORY_OPTIONS}
              defaultValue={itr.alcohol}
            />
            <TextField
              name="alcoholBottlesPerDay"
              label="No. of bottles a day"
              type="number"
              defaultValue={itr.alcoholBottlesPerDay}
            />
            <RadioField
              name="illicitDrugs"
              label="Illicit Drugs"
              options={SOCIAL_HISTORY_OPTIONS}
              defaultValue={itr.illicitDrugs}
            />
            <RadioField
              name="sexuallyActive"
              label="Sexually Active"
              options={YES_NO_OPTIONS}
              defaultValue={itr.sexuallyActive}
            />
            <TextField
              name="sexualPartners"
              label="No. of partners"
              type="number"
              defaultValue={itr.sexualPartners}
            />
          </div>
        </div>

        {/*  Page 7: Consent & Signature  */}
        <div className={`${PANEL} ${page !== 6 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Consent &amp; Signature</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
              <p className="m-0 font-bold underline mb-1">ENGLISH</p>
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
            <div className="text-xs italic leading-relaxed text-gray-700 dark:text-gray-300">
              <p className="m-0 font-bold underline mb-1">SA FILIPINO</p>
              <p className="m-0 italic">
                Aking nabasa at naintindihan ang Impormasyon ng Pasyente matapos
                ako&apos;y bigyang-kaalaman ng mga nilalaman nito. Sa isang
                pag-uusap kaugnay ng kinatawan ng CHU/RHU, ako ay
                binigyang-paunawa nang mahusay tungkol sa kahalagahan ng
                Integrated Clinic Information System (iClinicSys). Lahat ng mga
                katanungan sa panahon ng pag-uusap ay nasagot nang sapat at ako
                ay binigyan ng sapat na oras upang magpasya nito. Higit pa rito,
                pinapayagan ko ang CHU/RHU upang i-encode ang mga impormasyon
                tungkol sa akin at ang mga nakolektang impormasyon tungkol sa
                mga sintomas ng aking sakit at konsultasyon kaugnay dito para sa
                nasabing information system. Nais kong malaman at maipaalam sa
                aking direktagang kapamilya ang aking medikal na resulta.
                Gayundin, maaari kong kanselahin ang aking pahintulot sa CHU/RHU
                anumang oras na walang ibinibigay na dahilan at walang anumang
                kawalan para sa aking medikal na paggamot.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            <TextField
              name="consentPatientName"
              label="Signature over Printed Name (Patient)"
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

        {/*  Page 8: Consultation Record (vitals / complaints / diagnosis)  */}
        <div className={`${PANEL} ${page !== 7 ? 'hidden' : ''}`}>
          <h3 className={SECTION_TITLE}>Consultation Record</h3>
          <ItrConsultationSection record={record} recordDate={recordDate} />
        </div>

        {/*  Pagination footer  */}
        <ItrFooter
          steps={STEPS}
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

// Checklist block shared by the PAST MEDICAL HISTORY and FAMILY HISTORY
// sections of the printed ITR.
function HistoryChecklist({
  prefix,
  itr,
}: {
  prefix: string
  itr: Record<string, string>
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
      {HISTORY_CONDITIONS.map((c) =>
        c.specify ? (
          <CheckboxSpecifyField
            key={c.key}
            name={historyField(prefix, c)}
            specifyName={historySpecifyField(prefix, c)}
            label={c.label}
            defaultChecked={Boolean(itr[historyField(prefix, c)])}
            defaultSpecify={itr[historySpecifyField(prefix, c)]}
          />
        ) : (
          <CheckboxField
            key={c.key}
            name={historyField(prefix, c)}
            label={c.label}
            defaultChecked={Boolean(itr[historyField(prefix, c)])}
          />
        ),
      )}
    </div>
  )
}

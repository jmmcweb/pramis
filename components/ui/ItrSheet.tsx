'use client'



import type { ReactNode } from 'react'
import type { MedicalRecord } from '@/src/data/records'
import { CHILD_IMMUNIZATIONS, isChildRecord } from '@/src/data/itrChild'
import {
  CIVIL_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  DISABILITY_TYPES,
  EMPLOYMENT_STATUS_OPTIONS,
  FAMILY_MEMBER_OPTIONS,
  HISTORY_CONDITIONS,
  IMMUNIZATION_ADULT_OPTIONS,
  IMMUNIZATION_ELDERLY_OPTIONS,
  NATURE_OF_VISIT_OPTIONS,
  NCD_QUESTIONS,
  PHILHEALTH_CATEGORIES,
  PHILHEALTH_STATUS_OPTIONS,
  PREFIX_OPTIONS,
  RELATIONSHIP_TO_MEMBER_OPTIONS,
  SEX_OPTIONS,
  SOCIAL_HISTORY_OPTIONS,
  YES_NO_OPTIONS,
  historyField,
  historySpecifyField,
  splitMultiValue,
  type ItrOption,
} from '@/src/data/itrAdult'

const T = 'text-[10px] leading-[1.3]'
const PAGE =
  'itr-sheet-page w-[210mm] min-h-[297mm] box-border bg-white p-[9mm] text-black'

// itrData field backing each printed immunization box of the adult sheet.
const IMM_FIELD: Record<string, string> = {
  HPV: 'immAdultHpv',
  MMR: 'immAdultMmr',
  None: 'immAdultNone',
  'Pneumococcal Vaccine': 'immElderlyPneumococcal',
  'Flu Vaccine': 'immElderlyFlu',
  Others: 'immElderlyOthers',
}

// mm/dd/yyyy for the printed date cells.
const asDate = (v?: string): string => {
  if (!v) return ''
  const d = new Date(v.includes('T') ? v : `${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${m}/${day}/${d.getFullYear()}`
}

// Sex is stored in several shapes across the app (M/F, Male/Female).
function normalizeSexValue(value?: string): string {
  const raw = (value ?? '').trim()
  const s = raw.toLowerCase()
  if (!s) return ''
  if (s === 'm' || s === 'male') return 'Male'
  if (s === 'f' || s === 'female') return 'Female'
  return raw
}

function SectionBar({ children }: { children: ReactNode }) {
  return (
    <div className="border-x border-t border-black bg-[#e3e3e3] px-1.5 py-[3px] font-bold text-[10.5px] leading-[1.2] tracking-tight">
      {children}
    </div>
  )
}

// Bordered group of label / value cells.
function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="border-x border-b border-black">{children}</div>
}

function Field({
  label,
  children,
  width = '40%',
}: {
  label: ReactNode
  children?: ReactNode
  width?: string
}) {
  return (
    <div
      className="grid border-b border-black last:border-b-0"
      style={{ gridTemplateColumns: `${width} 1fr` }}
    >
      <div className={`border-r border-black px-1.5 py-[3px] ${T}`}>{label}</div>
      <div className={`px-1.5 py-[3px] ${T} min-h-[19px] break-words`}>
        {children ?? <span>&nbsp;</span>}
      </div>
    </div>
  )
}

// "____ Mr.  ____ Mrs." — the option matching `value` is emphasised.
function Choices({
  options,
  value,
  lineWidth = '12mm',
}: {
  options: ItrOption[]
  value?: string
  lineWidth?: string
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-[3px]">
      {options.map((o) => (
        <span key={o.value} className="inline-flex items-baseline gap-[3px]">
          <span
            className="inline-block border-b border-black"
            style={{ width: lineWidth }}
          />
          <span className={value === o.value ? 'font-bold' : undefined}>
            {o.text}
          </span>
        </span>
      ))}
    </span>
  )
}

// A blank + label line, optionally followed by a "Specify" write-on line.
function CheckLine({
  label,
  checked,
  specify,
}: {
  label: string
  checked?: boolean
  specify?: string
}) {
  return (
    <div className={`flex items-baseline gap-1 ${T}`}>
      <span className="inline-block w-[6mm] border-b border-black" />
      <span className={checked ? 'font-bold' : undefined}>{label}</span>
      {specify !== undefined && (
        <span className="ml-1 inline-block flex-1 border-b border-black px-1">
          {specify}
        </span>
      )}
    </div>
  )
}

// Blank write-on line used for free-text answers on the paper form.
function WriteLine({ value }: { value?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="inline-block flex-1 border-b border-black" />
      {value ? <span className={T}>{value}</span> : null}
    </span>
  )
}

function Seal({ lines }: { lines: string[] }) {
  return (
    <div className="flex h-[18mm] w-[18mm] shrink-0 flex-col items-center justify-center rounded-full border border-black/60 text-center text-[5px] font-bold uppercase leading-[1.15] tracking-tight">
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  )
}

export default function ItrSheet({
  record,
  isChild: isChildProp,
}: {
  record: MedicalRecord
  isChild?: boolean
}) {
  const isChild = isChildProp ?? isChildRecord(record)

  const pick = (k: string, ...fallback: (string | undefined)[]) =>
    V(record, k) || fallback.find(Boolean) || ''
  const is = (k: string, v: string) => V(record, k) === v
  const isYes = (k: string) => V(record, k) === 'Yes'
  const disability = splitMultiValue(V(record, 'disabilityTypes'))

  const freeAddress = V(record, 'address').trim()
  const extraAddress =
    freeAddress &&
    freeAddress.toLowerCase() !== (record.address ?? '').trim().toLowerCase()
      ? freeAddress
      : ''

  // Checklist rows shared by PAST MEDICAL HISTORY and FAMILY HISTORY.
  const historyRows = (prefix: 'pastMed' | 'famHist') =>
    HISTORY_CONDITIONS.map((c) => (
      <CheckLine
        key={`${prefix}-${c.key}`}
        label={c.specify ? `${c.label} (Specify)` : c.label}
        checked={isYes(historyField(prefix, c))}
        specify={c.specify ? V(record, historySpecifyField(prefix, c)) : undefined}
      />
    ))

  const gravidaParity = (
    <span className={`flex flex-wrap items-baseline gap-x-3 ${T}`}>
      <span className="inline-flex items-baseline gap-1">
        <span className="w-[8mm] border-b border-black" />G {pick('gravidity')}
      </span>
      <span className="inline-flex items-baseline gap-1">
        <span className="w-[8mm] border-b border-black" />P {pick('parityLivebirth')}
      </span>
      <span className="inline-flex items-baseline gap-1">
        (T <span className="w-[8mm] border-b border-black" />
        {pick('parityFullTerm')}
      </span>
      <span className="inline-flex items-baseline gap-1">
        P <span className="w-[8mm] border-b border-black" />
        {pick('parityPreterm')}
      </span>
      <span className="inline-flex items-baseline gap-1">
        A <span className="w-[8mm] border-b border-black" />
        {pick('parityAbortion')}
      </span>
      <span className="inline-flex items-baseline gap-1">
        L <span className="w-[8mm] border-b border-black" />
      </span>
      )
    </span>
  )

  return (
    <div className="flex flex-col items-center gap-[6mm]">
      {/* -------------------------------- PAGE 1 -------------------------------- */}
      <div className={PAGE}>
        <div className="flex items-start justify-between gap-3">
          <Seal lines={['City Health Office', 'City of Malolos']} />
          <div className="flex-1 text-center">
            <p className={`${T} leading-[1.3]`}>Republic of the Philippines</p>
            <p className={`${T} leading-[1.3]`}>Province of Bulacan</p>
            <p className={`${T} leading-[1.3]`}>City of Malolos</p>
            <p className="mt-[2mm] text-[15px] font-bold uppercase leading-tight tracking-[0.5px]">
              City Health Unit VII
            </p>
            <p className={`${T} leading-[1.3]`}>Brgy. Mojon, City of Malolos</p>
          </div>
          <Seal lines={['Rural Health Unit', 'City of Malolos']} />
        </div>

        <h1 className="mt-[4mm] border-b-[1.5px] border-black pb-[1.5mm] text-center text-[14px] font-bold uppercase tracking-[0.5px]">
          {isChild
            ? 'Individual Child Treatment Record (ITR)'
            : 'Individual Adult Treatment Record for iClinicSys & Yakap'}
        </h1>

        <div className="mt-[4mm] grid grid-cols-2 items-start gap-x-[4mm]">
          {/* ------------------------- LEFT COLUMN ------------------------- */}
          <div className="flex flex-col">
            <SectionBar>&gt;&gt; PERSONAL INFORMATION &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Prefix :">
                <Choices options={PREFIX_OPTIONS} value={V(record, 'prefix')} />
              </Field>
              <Field label="Last Name :">
                {pick('lastName', record.lastName)}
              </Field>
              <Field label="First Name:">
                {pick('firstName', record.firstName)}
              </Field>
              <Field label="Middle Name:">
                {pick('middleName', record.middleName)}
              </Field>
              <Field label="Suffix:">{pick('suffix', record.suffix)}</Field>
              <Field label="Sex:">
                <Choices
                  options={SEX_OPTIONS}
                  value={normalizeSexValue(pick('sex', record.sex))}
                />
              </Field>
              <Field label="Birth Date: (mm/dd/yyyy)">
                {asDate(pick('birthday', record.birthday))}
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>
              &gt;&gt; OTHER PERSONAL INFORMATION &lt;&lt;
            </SectionBar>
            <FieldGroup>
              <Field label="Birth Place :">
                {pick('birthplace', record.birthplace)}
              </Field>
              <Field label="Civil Status :">
                <Choices
                  options={CIVIL_STATUS_OPTIONS}
                  value={pick('civilStatus', record.civilStatus)}
                />
              </Field>
              <Field label="Educational Attainment :">
                {pick('educationalAttainment', record.educationalAttainment)}
              </Field>
              <Field label="Employment Status :">
                <Choices
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  value={V(record, 'employmentStatus')}
                />
              </Field>
              <Field label="Religion :">{pick('religion', record.religion)}</Field>
              <Field label="Indigenous :">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'indigenous')}
                />
              </Field>
              <Field label="Blood Type :">
                {pick('bloodType', record.bloodType)}
              </Field>
              {isChild && (
                <>
                  <Field label="Birth Length :">
                    {record.birthLength ? `${record.birthLength} cm` : ''}
                  </Field>
                  <Field label="Birth Weight :">
                    {record.birthWeight ? `${record.birthWeight} kg` : ''}
                  </Field>
                  <Field label="Place Delivered :">
                    {record.placeDelivered}
                  </Field>
                  <Field label="Type of Delivery :">
                    {record.typeOfDelivery}
                  </Field>
                  <Field label="Attendant at Birth :">
                    {record.attendantAtBirth}
                  </Field>
                </>
              )}
              <Field label="Mother's First Name :">
                {pick('mothersFirstName')}
              </Field>
              <Field label="Mother's Last Name :">
                {pick('mothersLastName')}
              </Field>
              <Field label="Mother's Middle Name :">
                {pick('mothersMiddleName')}
              </Field>
              <Field label="Mother's Birthdate:">
                {asDate(pick('mothersBirthdate'))}
              </Field>
            </FieldGroup>
            
            <div className="h-[3mm]" />

            <SectionBar>
              &gt;&gt; ADDRESS AND CONTACT INFO &lt;&lt;
            </SectionBar>
            <FieldGroup>
              <Field label="City/Mun. :">{pick('cityMun')}</Field>
              <Field label="Barangay :">{pick('barangay')}</Field>
              <Field label="Number / Street :">{pick('streetNumber')}</Field>
              <Field label="Purok :">{pick('purok')}</Field>
              {/* The ITR wizard also stores a free-text "complete address"
                  summary — print it when it says more than the fields above. */}
              {extraAddress && <Field label="Complete Address :">{extraAddress}</Field>}
              <Field label="Email :">{pick('email')}</Field>
              <Field label="Mobile Number :">
                {pick('mobileNumber', 'contactNumber', record.contactNumber)}
              </Field>
              <Field label="Landline Number">{pick('landlineNumber')}</Field>
            </FieldGroup>
          </div>
          {/* ------------------------- RIGHT COLUMN ------------------------- */}
          <div className="flex flex-col">
            <SectionBar>&gt;&gt; OTHER INFO &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Family Member :">
                <Choices
                  options={FAMILY_MEMBER_OPTIONS}
                  value={V(record, 'familyMemberRole')}
                  lineWidth="8mm"
                />
              </Field>
              <Field label="DSWD 4Ps Member">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'dswd4psMember')}
                />
              </Field>
              <Field label="Person with Disability?">
                <div className={T}>
                  <Choices
                    options={YES_NO_OPTIONS}
                    value={V(record, 'pwdMember')}
                  />
                  <div className="mt-[3px]">If yes? (choose)</div>
                  <div className="ml-[6mm]">
                    {DISABILITY_TYPES.map((d) => (
                      <CheckLine
                        key={d.value}
                        label={d.text}
                        checked={disability.includes(d.value)}
                      />
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="PSA National ID #:">
                {pick('psaNationalId')}
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; PHILHEALTH INFO &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Philhealth Member :">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'philHealthMember')}
                />
              </Field>
              <Field label="Philhealth Number :">
                {pick('philHealthNo', record.philHealthNo)}
              </Field>
              <Field label="Philhealth Status Type :">
                <Choices
                  options={PHILHEALTH_STATUS_OPTIONS}
                  value={V(record, 'philHealthStatusType')}
                />
              </Field>
              <Field label="Relationship to Member:">
                <Choices
                  options={RELATIONSHIP_TO_MEMBER_OPTIONS}
                  value={V(record, 'relationshipToMember')}
                />
              </Field>
              <Field label="Philhealth Category :">
                <div className={T}>
                  {PHILHEALTH_CATEGORIES.map((c) => (
                    <div key={c} className="flex items-baseline gap-1">
                      <span className="inline-block w-[5mm] border-b border-black" />
                      <span
                        className={
                          V(record, 'philHealthCategory') === c
                            ? 'font-bold'
                            : undefined
                        }
                      >
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Yakap Registered?:">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'yakapRegistered')}
                />
              </Field>
            </FieldGroup>
          </div>
        </div>
      </div>
      {/* -------------------------------- PAGE 2 -------------------------------- */}
      <div className={PAGE}>
        <div className="grid grid-cols-2 items-start gap-x-[4mm]">
          <div className="flex flex-col">
            <SectionBar>&gt;&gt; Consultation Details &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Nature of Visit" width="45%">
                <Choices
                  options={NATURE_OF_VISIT_OPTIONS}
                  value={V(record, 'natureOfVisit')}
                  lineWidth="9mm"
                />
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; PATIENT DETAILS &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Patient Age" width="45%">
                <span className={`flex flex-wrap items-baseline gap-x-3 ${T}`}>
                  <span className="inline-flex items-baseline gap-1">
                    <span className="w-[9mm] border-b border-black" />
                    {pick('patientAgeYears')} in years
                  </span>
                  <span className="inline-flex items-baseline gap-1">
                    <span className="w-[9mm] border-b border-black" />
                    {pick('patientAgeMonths')} in months
                  </span>
                  <span className="inline-flex items-baseline gap-1">
                    <span className="w-[9mm] border-b border-black" />
                    {pick('patientAgeDays')} in days
                  </span>
                </span>
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt;PAST MEDICAL HISTORY &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="" width="0%">
                <div className="flex flex-col gap-[2px]">{historyRows('pastMed')}</div>
              </Field>
              <Field label="Others:" width="22%">
                {V(record, 'pastMedOthersSpecify')}
              </Field>
              <Field label="Past Surgical History Done:" width="45%">
                {V(record, 'pastSurgicalHistory')}
              </Field>
              <Field label="Date Done" width="45%">
                {asDate(V(record, 'pastSurgicalDate'))}
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; FAMILY HISTORY &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="" width="0%">
                <div className="flex flex-col gap-[2px]">{historyRows('famHist')}</div>
              </Field>
              <Field label="Others:" width="22%">
                {V(record, 'famHistOthersSpecify')}
              </Field>
              <Field label="Past Surgical History Done:" width="45%">
                {V(record, 'famHistSurgical')}
              </Field>
              <Field label="Date Done" width="45%">
                {asDate(V(record, 'famHistSurgicalDate'))}
              </Field>
            </FieldGroup>
          </div>
          {/* ---------------- RIGHT COLUMN ---------------- */}
          <div className="flex flex-col">
            <SectionBar>&gt;&gt; IMMUNIZATION &lt;&lt;</SectionBar>
            <FieldGroup>
              {isChild ? (
                <Field label="" width="0%">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-[2px]">
                    {CHILD_IMMUNIZATIONS.map((imm) => (
                      <div
                        key={String(imm.key)}
                        className="flex items-baseline gap-1"
                      >
                        <span className={`flex-1 ${T}`}>{imm.label}</span>
                        <span className="w-[16mm] border-b border-black text-right">
                          <span className={T}>
                            {asDate(record[imm.key] as string | undefined)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Field>
              ) : (
                <Field label="*For Adult:" width="26%">
                  <div className={T}>
                    {IMMUNIZATION_ADULT_OPTIONS.map((o) => (
                      <div key={o.value} className="flex items-baseline gap-1">
                        <span className="w-[8mm] border-b border-black" />
                        <span
                          className={
                            isYes(IMM_FIELD[o.value]) ? 'font-bold' : undefined
                          }
                        >
                          {o.text}
                        </span>
                      </div>
                    ))}
                    <div className="mt-[2px] font-bold">*For Elderly:</div>
                    {IMMUNIZATION_ELDERLY_OPTIONS.map((o) => (
                      <div key={o.value} className="flex items-baseline gap-1">
                        <span className="w-[8mm] border-b border-black" />
                        <span
                          className={
                            isYes(IMM_FIELD[o.value]) ? 'font-bold' : undefined
                          }
                        >
                          {o.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </Field>
              )}
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; FAMILY PLANNING &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="With access to family planning counselling?" width="52%">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'familyPlanningCounseling')}
                />
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; MENSTRUAL HISTORY &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Menarche" width="58%">
                {pick('ageOfMenarche')} years old
              </Field>
              <Field label="Onset of Sexual Intercourse" width="58%">
                {pick('onsetSexualIntercourse')} years old
              </Field>
              <Field label="Last Menstrual Period" width="58%">
                {asDate(pick('lmp'))}
              </Field>
              <Field label="Period Duration" width="58%">
                {pick('periodDuration')} days
              </Field>
              <Field label="No. of pads per day" width="58%">
                {pick('padsPerDay')} pads
              </Field>
              <Field label="Interval Cycle" width="58%">
                {pick('intervalCycle')} days
              </Field>
              <Field label="Birth Control Method Used" width="58%">
                {pick('birthControlMethod')}
              </Field>
              <Field label="Menopause" width="58%">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'menopause')}
                />
              </Field>
              <Field label="Age of menopausal?" width="58%">
                {pick('ageMenopause')} years old
              </Field>
            </FieldGroup>
            
            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; PREGNANCY HISTORY &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="G   P   (T   P   A   L )" width="34%">
                {gravidaParity}
              </Field>
              <Field label="Type of Delivery" width="45%">
                <Choices
                  options={DELIVERY_TYPE_OPTIONS}
                  value={
                    V(record, 'pregnancyTypeOfDelivery') ||
                    V(record, 'typeOfDelivery')
                  }
                />
              </Field>
              <Field label="Pregnancy Induced Hypertension" width="45%">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'pregnancyInducedHypertension')}
                />
              </Field>
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>
              &gt;&gt; PATIENT ANSWER TO NCD QUESTIONNAIRES &ndash; FOR PATIENT
              AGED 25 YEARS OLD AND ABOVE &lt;&lt;
            </SectionBar>
            <FieldGroup>
              {NCD_QUESTIONS.map((q) => (
                <div
                  key={q.name}
                  className="grid grid-cols-[1fr_16mm] border-b border-black last:border-b-0"
                >
                  <div className={`border-r border-black px-1.5 py-[2px] ${T}`}>
                    {q.label}
                  </div>
                  <div className="px-1 py-[2px] text-center">
                    <span className={T}>
                      <span
                        className={is(q.name, 'Yes') ? 'font-bold' : undefined}
                      >
                        Yes
                      </span>
                      {' / '}
                      <span
                        className={is(q.name, 'No') ? 'font-bold' : undefined}
                      >
                        No
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </FieldGroup>

            <div className="h-[3mm]" />

            <SectionBar>&gt;&gt; PERSONAL/SOCIAL HISTORY &lt;&lt;</SectionBar>
            <FieldGroup>
              <Field label="Smoking" width="42%">
                <span className={`flex flex-wrap items-baseline gap-x-2 ${T}`}>
                  <Choices
                    options={SOCIAL_HISTORY_OPTIONS}
                    value={V(record, 'smoking')}
                    lineWidth="6mm"
                  />
                  <span className="w-[10mm] border-b border-black" />
                  {pick('smokingPacksPerDay')} No of packs a day
                </span>
              </Field>
              <Field label="Alcohol" width="42%">
                <span className={`flex flex-wrap items-baseline gap-x-2 ${T}`}>
                  <Choices
                    options={SOCIAL_HISTORY_OPTIONS}
                    value={V(record, 'alcohol')}
                    lineWidth="6mm"
                  />
                  <span className="w-[10mm] border-b border-black" />
                  {pick('alcoholBottlesPerDay')} No of bottles a day
                </span>
              </Field>
              <Field label="Illicit Drugs" width="42%">
                <Choices
                  options={SOCIAL_HISTORY_OPTIONS}
                  value={V(record, 'illicitDrugs')}
                  lineWidth="6mm"
                />
              </Field>
              <Field label="Sexually Active" width="42%">
                <Choices
                  options={YES_NO_OPTIONS}
                  value={V(record, 'sexuallyActive')}
                />
              </Field>
            </FieldGroup>
          </div>
        </div>
        {/* CONSULTATION RECORD (spans both columns) */}
        <div className="mt-[4mm]">
          <div className="grid grid-cols-[16mm_20mm_1fr_1fr_1fr] border border-black text-center">
            <div className={`border-r border-black px-1 py-[3px] font-bold ${T}`}>
              DATE
            </div>
            <div className={`border-r border-black px-1 py-[3px] font-bold ${T}`}>
              VITAL SIGNS
            </div>
            <div
              className={`border-r border-black px-1 py-[3px] font-bold ${T}`}
            >
              CHIEF COMPLAINT / HISTORY
            </div>
            <div className={`border-r border-black px-1 py-[3px] font-bold ${T}`}>
              DIAGNOSIS
            </div>
            <div className={`px-1 py-[3px] font-bold ${T}`}>
              MEDICATIONS / TREATMENT
            </div>
          </div>
          <div className="grid grid-cols-[16mm_20mm_1fr_1fr_1fr] border-x border-b border-black">
            <div className={`border-r border-black px-1 py-[3px] ${T}`}>
              {asDate(record.date)}
            </div>
            <div className="border-r border-black">
              {(
                [
                  ['BP', record.bloodPressure],
                  ['HR', record.heartRate],
                  ['RR', record.respiratoryRate],
                  ['WT', record.weight],
                  ['HT', record.height],
                  ['TEMP', record.temperature],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[10mm_1fr] border-b border-black px-1 py-[2px] last:border-b-0"
                >
                  <span className="font-semibold">{label}</span>
                  <span>{value ?? ''}</span>
                </div>
              ))}
            </div>
            <div
              className={`border-r border-black px-1 py-[3px] text-left align-top ${T}`}
            >
              {record.chiefComplaints}
            </div>
            <div
              className={`border-r border-black px-1 py-[3px] text-left align-top ${T}`}
            >
              {record.diagnosis}
            </div>
            <div className={`px-1 py-[3px] text-left align-top ${T}`}>
              {[record.medications, record.prescription]
                .filter(Boolean)
                .join(' / ')}
            </div>
          </div>
        </div>

        {/* CONSENT & SIGNATURE */}
        <div className="mt-[4mm]">
          <SectionBar>&gt;&gt; CONSENT &lt;&lt;</SectionBar>
          <FieldGroup>
            <Field label="Name (Patient / Representative)" width="42%">
              {record.consentPatientName}
            </Field>
            <Field label="Date" width="20%">
              {asDate(record.consentDate)}
            </Field>
            <Field label="Relationship / Signature" width="38%">
              <span className="flex items-baseline gap-1">
                {record.consentRepresentative}
                <WriteLine />
              </span>
            </Field>
          </FieldGroup>
        </div>

        <div className="mt-[4mm] flex items-baseline justify-between gap-4">
          <span className={`font-bold ${T}`}>
            NAME &amp; SIGNATURE OF HEALTH CARE PROVIDER:
          </span>
          <span className="flex-1 border-b border-black" />
          <span className={`${T}`}>
            {[record.staffName, record.role].filter(Boolean).join(' — ')}
          </span>
        </div>
      </div>
    </div>
  )
}

function V(record: MedicalRecord, key: string): string {
  return record.itr?.[key] ?? ''
}

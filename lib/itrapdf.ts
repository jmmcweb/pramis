// Generates a PDF of the Individual Treatment Record (ITR) for a given medical record. The PDF includes patient information, vital signs, consultation records, and immunization records (for child patients). It is formatted to fit on A4 paper and includes headers, tables, and footers with relevant details. The generated PDF can be saved with a filename based on the record date.

import { jsPDF } from 'jspdf'
import type { MedicalRecord } from '@/src/data/records'
import {
  HISTORY_CONDITIONS,
  NCD_QUESTIONS,
  historyField,
  historySpecifyField,
  splitMultiValue,
} from '@/src/data/itrAdult'

const PAGE_W = 210 // A4 portrait
const PAGE_H = 297
const M = 12 // margin
const INNER = PAGE_W - M * 2 // usable width

// Formats a date string for display. If the date is invalid or not provided, it returns an empty string. Otherwise, it returns the date in a long format (e.g., "January 1, 2023").
const F = (d?: string) => {
  if (!d) return ''
  const x = d.includes('T') ? new Date(d) : new Date(`${d}T00:00:00`)
  if (Number.isNaN(x.getTime())) return d
  return x.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Generates a PDF of the Individual Treatment Record (ITR) for a given medical record. The PDF includes patient information, vital signs, consultation records, and immunization records (for child patients). It is formatted to fit on A4 paper and includes headers, tables, and footers with relevant details. The generated PDF can be saved with a filename based on the record date.
export const generateItrPdf = (record: MedicalRecord) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const lh = (pt: number) => pt * 0.3528 * 1.15

  let y = M

  const ensure = (h: number) => {
    if (y + h > PAGE_H - 16) {
      doc.addPage()
      y = M
    }
  }

  // function to add text to the PDF with specified options such as font style, size, color, and alignment. It sets the font, size, and color, and then adds the text at the specified coordinates (x, yy) on the PDF. The alignment can be left, center, or right.
  const text = (
    t: string,
    x: number,
    yy: number,
    opts: { style?: 'normal' | 'bold' | 'italic'; size?: number; color?: [number, number, number]; align?: 'left' | 'center' | 'right' } = {}
  ) => {
    const { style = 'normal', size = 9, color = [30, 30, 30], align = 'left' } = opts
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    if (align === 'center') doc.text(t, x, yy, { align: 'center' })
    else if (align === 'right') doc.text(t, x, yy, { align: 'right' })
    else doc.text(t, x, yy)
  }


  //  Adult ITR template snapshot helpers (MedicalRecord.itr holds the values
  //  keyed by the on-screen ITR form field names).
  const V = (k: string) => record.itr?.[k] ?? ''
  const T = (k: string) => Boolean(V(k))
  // Ticked conditions of a PAST MEDICAL HISTORY / FAMILY HISTORY checklist.
  const historyList = (prefix: string) =>
    HISTORY_CONDITIONS.filter((c) => T(historyField(prefix, c)))
      .map((c) =>
        c.specify && V(historySpecifyField(prefix, c))
          ? `${c.label} (${V(historySpecifyField(prefix, c))})`
          : c.label,
      )
      .join(' · ')
  // Child ITR records carry birth details / immunization dates.
  const isChild = Boolean(
    record.placeDelivered ||
      record.typeOfDelivery ||
      record.attendantAtBirth ||
      record.birthLength ||
      record.birthWeight ||
      record.immBcg ||
      record.immPenta1
  )

  //  OFFICIAL DOH / CHU HEADER
  text('REPUBLIC OF THE PHILIPPINES', M, y + 2, { style: 'bold', size: 9 })
  text('DEPARTMENT OF HEALTH', M + INNER, y + 2, { style: 'bold', size: 9, align: 'right' })
  text('PROVINCE OF BULACAN', M, y + 8, { size: 9 })
  text('CITY OF MALOLOS', M + INNER, y + 8, { size: 9, align: 'right' })
  text('CITY HEALTH UNIT VII', PAGE_W / 2, y + 16, { style: 'bold', size: 11, align: 'center' })
  text(
    isChild
      ? 'INDIVIDUAL CHILD TREATMENT RECORD (ITR)'
      : 'INDIVIDUAL ADULT TREATMENT RECORD FOR iCLINICSYS & YAKAP',
    PAGE_W / 2,
    y + 24,
    { style: 'bold', size: isChild ? 15 : 12.5, align: 'center' }
  )
  text(`Record No. ${record.id.slice(0, 6).toUpperCase()}`, M + INNER, y + 24, { size: 8, align: 'right' })
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.line(M, y + 29, M + INNER, y + 29)

  y += 35

  //  PATIENT INFORMATION (bordered grid)
  const boxTop = y
  doc.setFillColor(225, 230, 244)
  doc.setDrawColor(50, 50, 50)
  doc.setLineWidth(0.25)
  doc.rect(M, boxTop, INNER, 7, 'FD')
  text('PATIENT INFORMATION', M + 2, boxTop + 4.4, { style: 'bold', size: 7.5 })
  text(`DATE FILLED: ${F(record.date) || ''}`, M + INNER - 2, boxTop + 4.4, { size: 7, align: 'right' })

  // function to draw a row of information cells in the PDF. Each cell has a label and a value, and the function calculates the height of the row based on the number of lines needed for the values. It draws rectangles for each cell, adds the labels and values, and returns the new y-coordinate after the row is drawn.
  type InfoCell = { label: string; value: string; w: number }
  const drawInfoRow = (cells: InfoCell[], cy: number): number => {
    let lines = 1
    cells.forEach((c) => {
      const ln = doc.splitTextToSize(c.value || '', c.w - 4)
      lines = Math.max(lines, ln.length)
    })
    const h = Math.max(12, 4 + lines * lh(9) + 3.5)
    if (cy + h > PAGE_H - 16) {
      doc.addPage()
      cy = M
      boxPageBroke = true
    }
    let cx = M
    cells.forEach((c) => {
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(50, 50, 50)
      doc.setLineWidth(0.25)
      doc.rect(cx, cy, c.w, h, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(95, 95, 95)
      const lbl = doc.splitTextToSize(c.label, c.w - 4)
      doc.text(lbl[0], cx + 2, cy + 3)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(15, 15, 15)
      const v = doc.splitTextToSize(c.value || '', c.w - 4)
      doc.text(v, cx + 2, cy + 6.6)
      cx += c.w
    })
    return cy + h
  }


  let boxPageBroke = false

  let rowY = boxTop + 7
// Row 1 — Name
  rowY = drawInfoRow(
    [
      { label: 'SURNAME', value: record.lastName || '', w: 64 },
      { label: 'FIRST NAME', value: record.firstName || '', w: 52 },
      { label: 'MIDDLE NAME', value: record.middleName || '', w: 38 },
      { label: 'SUFFIX', value: record.suffix || '', w: 32 },
    ],
    rowY
  )

  // Row 2 — Birth / Age / Sex / Civil status
  rowY = drawInfoRow(
    [
      { label: 'DATE OF BIRTH', value: F(record.birthday), w: 58 },
      { label: 'AGE', value: record.age || '', w: 18 },
      { label: 'SEX', value: record.sex || '', w: 30 },
      { label: 'CIVIL STATUS', value: record.civilStatus || '', w: 80 },
    ],
    rowY
  )

  // Row 3 — Birthplace / Blood / Religion / Contact
  rowY = drawInfoRow(
    [
      { label: 'BIRTHPLACE', value: record.birthplace || '', w: 54 },
      { label: 'BLOOD TYPE', value: record.bloodType || '', w: 34 },
      { label: 'RELIGION', value: record.religion || '', w: 40 },
      { label: 'CONTACT NO.', value: record.contactNumber || '', w: 58 },
    ],
    rowY
  )

  // Row 4 — Address
  rowY = drawInfoRow(
    [{ label: 'COMPLETE RESIDENTIAL ADDRESS', value: record.address || '', w: INNER }],
    rowY
  )

  // Row 5 — PhilHealth & membership
  rowY = drawInfoRow(
    [
      { label: 'PHILHEALTH NO.', value: record.philHealthNo || '', w: 40 },
      { label: "MEMBER'S NAME", value: record.memberName || '', w: 50 },
      { label: "MEMBER'S BIRTHDAY", value: F(record.memberBirthday), w: 26 },
      { label: 'MEMBER/DEP (Y/N)', value: record.memberDependent || '', w: 22 },
      { label: 'FAMILY MEMBER', value: record.familyMemberRole || '', w: 48 },
    ],
    rowY
  )

  // Row 6 — Parents / Spouse / Education
  rowY = drawInfoRow(
    [
      { label: "FATHER'S NAME", value: record.fathersName || '', w: 44 },
      { label: "MOTHER'S NAME", value: record.mothersName || '', w: 44 },
      { label: 'NAME OF SPOUSE', value: record.spouseName || '', w: 36 },
      { label: 'MAIDEN NAME', value: record.maidenName || '', w: 30 },
      { label: 'EDUC. ATTAINMENT', value: record.educationalAttainment || '', w: 32 },
    ],
    rowY
  )

  // Row 7 — Female patient health (females only)
  if (record.sex === 'Female' || record.ageOfMenarche || record.lmp) {
    rowY = drawInfoRow(
      [
        { label: 'AGE OF MENARCHE', value: record.ageOfMenarche || '', w: 36 },
        { label: 'LMP (LAST MENSTRUAL PERIOD)', value: F(record.lmp), w: 56 },
        { label: 'GRAVIDITY', value: record.gravidity || '', w: 32 },
        { label: 'EDC (IF PREGNANT)', value: F(record.edc), w: 62 },
      ],
      rowY
    )
    rowY = drawInfoRow(
      [
        { label: 'PARITY — FULL TERM', value: record.parityFullTerm || '', w: 47 },
        { label: 'PRETERM', value: record.parityPreterm || '', w: 35 },
        { label: 'ABORTION', value: record.parityAbortion || '', w: 34 },
        { label: 'LIVEBIRTH', value: record.parityLivebirth || '', w: 70 },
      ],
      rowY
    )
  }

  // Row 7b — Adult ITR template extras (Other Info / PhilHealth / Address)
  if (record.itr) {
    rowY = drawInfoRow(
      [
        { label: 'PREFIX', value: V('prefix'), w: 24 },
        { label: 'EMPLOYMENT STATUS', value: V('employmentStatus'), w: 44 },
        { label: 'INDIGENOUS', value: V('indigenous'), w: 34 },
        { label: "MOTHER'S BIRTHDATE", value: F(V('mothersBirthdate')), w: 40 },
        { label: 'PSA NATIONAL ID #', value: V('psaNationalId'), w: 44 },
      ],
      rowY
    )
    if (V('mothersFirstName') || V('mothersLastName') || V('mothersMiddleName')) {
      rowY = drawInfoRow(
        [
          { label: "MOTHER'S FIRST NAME", value: V('mothersFirstName'), w: 62 },
          { label: "MOTHER'S LAST NAME", value: V('mothersLastName'), w: 62 },
          { label: "MOTHER'S MIDDLE NAME", value: V('mothersMiddleName'), w: 62 },
        ],
        rowY
      )
    }
    if (V('email') || V('mobileNumber') || V('landlineNumber')) {
      rowY = drawInfoRow(
        [
          { label: 'EMAIL', value: V('email'), w: 66 },
          { label: 'MOBILE NUMBER', value: V('mobileNumber'), w: 60 },
          { label: 'LANDLINE NUMBER', value: V('landlineNumber'), w: 60 },
        ],
        rowY
      )
    }
    if (
      V('dswd4psMember') ||
      V('pwdMember') ||
      V('disabilityTypes') ||
      V('yakapRegistered')
    ) {
      rowY = drawInfoRow(
        [
          { label: 'DSWD 4Ps MEMBER', value: V('dswd4psMember'), w: 46 },
          { label: 'PERSON WITH DISABILITY?', value: V('pwdMember'), w: 44 },
          {
            label: 'DISABILITY TYPE (IF YES)',
            value: splitMultiValue(V('disabilityTypes')).join(', '),
            w: 52,
          },
          { label: 'YAKAP REGISTERED?', value: V('yakapRegistered'), w: 44 },
        ],
        rowY
      )
    }
    if (
      V('philHealthMember') ||
      V('philHealthStatusType') ||
      V('relationshipToMember') ||
      V('philHealthCategory')
    ) {
      rowY = drawInfoRow(
        [
          { label: 'PHILHEALTH MEMBER (Y/N)', value: V('philHealthMember'), w: 40 },
          { label: 'STATUS TYPE', value: V('philHealthStatusType'), w: 34 },
          {
            label: 'RELATIONSHIP TO MEMBER',
            value: V('relationshipToMember'),
            w: 40,
          },
          { label: 'PHILHEALTH CATEGORY', value: V('philHealthCategory'), w: 72 },
        ],
        rowY
      )
    }
    if (V('natureOfVisit') || V('patientAgeYears') || V('familyPlanningCounseling')) {
      const ageYMD = [
        `${V('patientAgeYears') || '—'} yrs`,
        `${V('patientAgeMonths') || '—'} mos`,
        `${V('patientAgeDays') || '—'} days`,
      ].join(' ')
      rowY = drawInfoRow(
        [
          { label: 'NATURE OF VISIT', value: V('natureOfVisit'), w: 56 },
          { label: 'PATIENT AGE (Y/M/D)', value: ageYMD, w: 50 },
          {
            label: 'ACCESS TO FAMILY PLANNING COUNSELLING',
            value: V('familyPlanningCounseling'),
            w: 80,
          },
        ],
        rowY
      )
    }
  }

  // Row 8 — Child birth details (child ITR only)
  if (isChild) {
    rowY = drawInfoRow(
      [
        {
          label: 'PLACE DELIVERED',
          value: [record.placeDelivered, record.placeDeliveredOthers].filter(Boolean).join(' - '),
          w: 50,
        },
        { label: 'TYPE OF DELIVERY (NSD/CS)', value: record.typeOfDelivery || '', w: 36 },
        { label: 'ATTENDANT AT BIRTH', value: record.attendantAtBirth || '', w: 38 },
        { label: 'BIRTH LENGTH (cm)', value: record.birthLength || '', w: 30 },
        { label: 'BIRTH WEIGHT (kg)', value: record.birthWeight || '', w: 32 },
      ],
      rowY
    )
  }

  if (!boxPageBroke) {
    doc.setDrawColor(50, 50, 50)
    doc.setLineWidth(0.25)
    doc.rect(M, boxTop, INNER, rowY - boxTop, 'S')
  }
  y = rowY + 7


  //  CONSULTATION / VITAL SIGNS TABLES

  const drawTable = (
    headers: string[],
    rows: string[][],
    widths: number[],
    opts: { headerSize?: number; cellSize?: number; pad?: number } = {}
  ): number => {
    const { headerSize = 7, cellSize = 8.5, pad = 1.5 } = opts
    const headerH = 8
    let yy = y

    const drawRow = (values: string[], cy: number, rowH: number, size: number, header = false) => {
      let cx = M
      values.forEach((v, i) => {
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(50, 50, 50)
        doc.setLineWidth(0.25)
        doc.rect(cx, cy, widths[i], rowH, 'S')
        if (header) {
          doc.setFillColor(225, 230, 244)
          doc.rect(cx, cy, widths[i], rowH, 'F')
        }
        doc.setFont('helvetica', header ? 'bold' : 'normal')
        doc.setFontSize(size)
        doc.setTextColor(30, 30, 30)
        const lines = doc.splitTextToSize(v || '', widths[i] - pad * 2)
        if (lines.length) doc.text(lines, cx + pad, cy + pad + lh(size) + 0.6)
        cx += widths[i]
      })
    }

    // header
    ensure(headerH + 4)
    drawRow(headers, yy, headerH, headerSize, true)
    yy += headerH
    // body
    rows.forEach((r) => {
      let lines = 1
      r.forEach((v, i) => {
        const ln = doc.splitTextToSize(v || '', widths[i] - pad * 2)
        lines = Math.max(lines, ln.length)
      })
      const h = Math.max(9, lines * lh(cellSize) + pad * 2 + 1.5)
      ensure(h + 2)
      if (yy + h > PAGE_H - 16) {
        doc.addPage()
        yy = M
      }
      drawRow(r, yy, h, cellSize)
      yy += h
    })
    return yy
  }

  //  ADULT ITR TEMPLATE — PAST MEDICAL HISTORY / FAMILY HISTORY
  const pastMed = historyList('pastMed')
  const famHist = historyList('famHist')
  const pastSurg = [V('pastSurgicalHistory'), F(V('pastSurgicalDate'))]
    .filter(Boolean)
    .join(' — ')
  const famSurg = [V('famHistSurgical'), F(V('famHistSurgicalDate'))]
    .filter(Boolean)
    .join(' — ')
  if (pastMed || famHist || pastSurg || famSurg) {
    text('PAST MEDICAL HISTORY / FAMILY HISTORY', M, y, {
      style: 'bold',
      size: 9.5,
    })
    y += 4.5
    const histEnd = drawTable(
      ['PAST MEDICAL HISTORY', 'FAMILY HISTORY'],
      [
        [pastMed, famHist],
        [
          pastSurg ? `Past Surgical History Done: ${pastSurg}` : '',
          famSurg ? `Past Surgical History Done: ${famSurg}` : '',
        ],
      ],
      [93, 93],
      { cellSize: 7.5 }
    )
    y = histEnd + 6
  }

  //  ADULT ITR TEMPLATE — IMMUNIZATION & FAMILY PLANNING
  const adultImms = (
    [
      ['HPV', 'immAdultHpv'],
      ['MMR', 'immAdultMmr'],
      ['None', 'immAdultNone'],
    ] as [string, string][]
  )
    .filter(([, k]) => T(k))
    .map(([l]) => l)
  const elderlyImms = (
    [
      ['Pneumococcal Vaccine', 'immElderlyPneumococcal'],
      ['Flu Vaccine', 'immElderlyFlu'],
      ['Others', 'immElderlyOthers'],
    ] as [string, string][]
  )
    .filter(([, k]) => T(k))
    .map(([l]) => l)
  if (adultImms.length || elderlyImms.length || V('familyPlanningCounseling')) {
    text('IMMUNIZATION', M, y, { style: 'bold', size: 9.5 })
    y += 4.5
    const immEnd = drawTable(
      ['FOR ADULT', 'FOR ELDERLY', 'ACCESS TO FAMILY PLANNING COUNSELLING'],
      [
        [
          adultImms.join(', ') || 'None',
          elderlyImms.join(', '),
          V('familyPlanningCounseling'),
        ],
      ],
      [56, 56, 74]
    )
    y = immEnd + 6
  }

  //  ADULT ITR TEMPLATE — MENSTRUAL & PREGNANCY HISTORY (female patients)
  const femalePatient =
    record.sex === 'Female' ||
    Boolean(
      V('ageOfMenarche') ||
        V('lmp') ||
        V('gravidity') ||
        V('onsetSexualIntercourse')
    )
  if (femalePatient) {
    text('MENSTRUAL HISTORY', M, y, { style: 'bold', size: 9.5 })
    y += 4.5
    const mEnd = drawTable(
      [
        'MENARCHE (YRS)',
        'ONSET OF SEXUAL INTERCOURSE (YRS)',
        'LAST MENSTRUAL PERIOD',
        'PERIOD DURATION (DAYS)',
      ],
      [
        [
          V('ageOfMenarche'),
          V('onsetSexualIntercourse'),
          F(V('lmp')),
          V('periodDuration'),
        ],
      ],
      [40, 56, 46, 44]
    )
    y = mEnd
    const mEnd2 = drawTable(
      [
        'NO. OF PADS PER DAY',
        'INTERVAL CYCLE (DAYS)',
        'BIRTH CONTROL METHOD USED',
        'MENOPAUSE',
        'AGE OF MENOPAUSE (YRS)',
      ],
      [
        [
          V('padsPerDay'),
          V('intervalCycle'),
          V('birthControlMethod'),
          V('menopause'),
          V('ageMenopause'),
        ],
      ],
      [34, 34, 54, 28, 36]
    )
    y = Math.max(mEnd, mEnd2) + 6

    text('PREGNANCY HISTORY', M, y, { style: 'bold', size: 9.5 })
    y += 4.5
    const pEnd = drawTable(
      ['G', 'T', 'P', 'A', 'L', 'TYPE OF DELIVERY', 'PREGNANCY INDUCED HTN', 'EDC'],
      [
        [
          V('gravidity'),
          V('parityFullTerm'),
          V('parityPreterm'),
          V('parityAbortion'),
          V('parityLivebirth'),
          V('pregnancyTypeOfDelivery') || V('typeOfDelivery'),
          V('pregnancyInducedHypertension'),
          F(V('edc')),
        ],
      ],
      [16, 16, 16, 16, 16, 40, 36, 30]
    )
    y = pEnd + 6
  }

  //  ADULT ITR TEMPLATE — NCD QUESTIONNAIRE (25 years old and above)
  const ncdRows = NCD_QUESTIONS.map((q) => [q.label, V(q.name)]).filter(
    ([, answer]) => answer
  )
  if (ncdRows.length) {
    text(
      'PATIENT ANSWER TO NCD QUESTIONNAIRES — 25 YEARS OLD AND ABOVE',
      M,
      y,
      { style: 'bold', size: 9.5 }
    )
    y += 4.5
    const ncdEnd = drawTable(['QUESTION', 'ANSWER'], ncdRows, [150, 36], {
      cellSize: 7.5,
    })
    y = ncdEnd + 6
  }

  //  ADULT ITR TEMPLATE — PERSONAL / SOCIAL HISTORY
  if (V('smoking') || V('alcohol') || V('illicitDrugs') || V('sexuallyActive')) {
    text('PERSONAL / SOCIAL HISTORY', M, y, { style: 'bold', size: 9.5 })
    y += 4.5
    const socialEnd = drawTable(
      ['SMOKING', 'ALCOHOL', 'ILLICIT DRUGS', 'SEXUALLY ACTIVE'],
      [
        [
          [V('smoking'), V('smokingPacksPerDay') && `${V('smokingPacksPerDay')} pack(s) / day`]
            .filter(Boolean)
            .join(' — '),
          [
            V('alcohol'),
            V('alcoholBottlesPerDay') &&
              `${V('alcoholBottlesPerDay')} bottle(s) / day`,
          ]
            .filter(Boolean)
            .join(' — '),
          V('illicitDrugs'),
          [
            V('sexuallyActive'),
            V('sexualPartners') && `${V('sexualPartners')} partner(s)`,
          ]
            .filter(Boolean)
            .join(' — '),
        ],
      ],
      [50, 50, 43, 43]
    )
    y = socialEnd + 6
  }

  //  ADULT ITR TEMPLATE — CONSENT
  if (
    record.consentPatientName ||
    record.consentDate ||
    record.consentRepresentative
  ) {
    text('CONSENT', M, y, { style: 'bold', size: 9.5 })
    y += 4.5
    const consentEnd = drawTable(
      ['SIGNATURE OVER PRINTED NAME (PATIENT)', 'DATE', 'CHU/RHU REPRESENTATIVE'],
      [
        [
          record.consentPatientName || '',
          F(record.consentDate),
          record.consentRepresentative || '',
        ],
      ],
      [70, 40, 76]
    )
    y = consentEnd + 6
  }
//  Vital signs table 
  text('VITAL SIGNS', M, y, { style: 'bold', size: 9.5 })
  y += 4.5
  const vitalsEnd = drawTable(
    ['DATE', 'B.P.', 'P.R.', 'R.R.', 'TEMP.', 'W.T.', 'H.T.', 'O2%'],
    [
      [
        F(record.date),
        record.bloodPressure || '',
        record.heartRate || '',
        record.respiratoryRate || '',
        record.temperature ? (record.temperature.includes('°') ? record.temperature : `${record.temperature}°C`) : '',
        record.weight ? `${record.weight} kg` : '',
        record.height ? `${record.height} cm` : '',
        record.oxygenLevel ? `${record.oxygenLevel}%` : '',
      ],
    ],
    [36, 26, 26, 26, 24, 22, 14, 12]
  )
  y = vitalsEnd + 6

  //  Consultation record table 
  text('CONSULTATION RECORD', M, y, { style: 'bold', size: 9.5 })
  y += 4.5
  const consultEnd = drawTable(
    ['DATE', 'CHIEF COMPLAINT', 'DIAGNOSIS', 'MEDICATIONS / TREATMENT', 'RECOMMENDATION / REMARKS'],
    [
      [
        F(record.date),
        record.chiefComplaints || '',
        record.diagnosis || '',
        record.medications || '',
        record.prescription || '',
      ],
    ],
    [24, 44, 40, 40, 38]
  )
  y = consultEnd + 6

  //  Provider signature strip 
  ensure(16)
  doc.setDrawColor(50, 50, 50)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + INNER, y)
  y += 5
  text('NAME & SIGNATURE OF HEALTH CARE PROVIDER:', M, y, { style: 'bold', size: 8 })
  const provider = [record.staffName, record.role].filter(Boolean).join(' — ')
  if (provider) text(provider, M + INNER, y, { size: 8.5, align: 'right' })
  doc.line(M + 95, y + 3.5, M + INNER, y + 3.5) // signature line
  text('Signature over printed name', M + 105, y + 8, { size: 6.5, color: [120, 120, 120] })
  y += 14

  
  //  IMMUNIZATION RECORD (child only)
  
  if (isChild) {
    const imms: [string, string][] = [
      ['BCG', record.immBcg],
      ['Hepa B w/in 24 Hours', record.immHepab24],
      ['Hepa B ≥ 24 Hours', record.immHepab24plus],
      ['Pentavalent 1', record.immPenta1],
      ['Pentavalent 2', record.immPenta2],
      ['Pentavalent 3', record.immPenta3],
      ['OPV 1', record.immOpv1],
      ['OPV 2', record.immOpv2],
      ['OPV 3', record.immOpv3],
      ['Rota 1', record.immRota1],
      ['Rota 2', record.immRota2],
      ['PCV 1', record.immPcv1],
      ['PCV 2', record.immPcv2],
      ['PCV 3', record.immPcv3],
      ['MCV 1 (AMV)', record.immMcv1],
      ['MCV 2 (MMR)', record.immMcv2],
      ['Hepa B2', record.immHepab2],
      ['Hepa B3', record.immHepab3],
      ['Hepa A', record.immHepaa],
      ['Pneumonia', record.immPneumonia],
      ['Influenza', record.immInfluenza],
      ['Others', record.immOthers],
    ].filter(([, v]) => v) as [string, string][]

    if (imms.length) {
      text('IMMUNIZATION RECORD', M, y, { style: 'bold', size: 9.5 })
      y += 4.5
      const immEnd = drawTable(
        ['TYPE OF IMMUNIZATION', 'DATE GIVEN'],
        imms.map(([label, date]) => [label, F(date)]),
        [120, 66]
      )
      y = immEnd + 6
    }
  }

  //  FOOTER

  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.line(M, PAGE_H - 12, M + INNER, PAGE_H - 12)
    text(`Generated ${new Date().toLocaleDateString()} via Meditrack`, M, PAGE_H - 8, { size: 7, color: [140, 140, 140] })
    text(`Record ID: ${record.id} · Page ${p}`, M + INNER, PAGE_H - 8, { size: 7, color: [140, 140, 140], align: 'right' })
  }

  // Save the PDF with a filename based on the record date, replacing any non-alphanumeric characters with hyphens. If the record date is not available, it defaults to "record".
  doc.save(`itr-record-${(record.date || 'record').replace(/[^a-z0-9]/gi, '-')}.pdf`)
}
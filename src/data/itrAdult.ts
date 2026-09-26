

export type ItrOption = { value: string; text: string }


export const MULTI_VALUE_SEPARATOR = '; '

export function splitMultiValue(value?: string | null): string[] {
  if (!value) return []
  return value
    .split(/;\s*/)
    .map((v) => v.trim())
    .filter(Boolean)
}

export function joinMultiValue(values: string[]): string {
  return Array.from(new Set(values.filter(Boolean))).join(MULTI_VALUE_SEPARATOR)
}

export const MULTI_VALUE_FIELDS: string[] = ['disabilityTypes']

export const YES_NO_OPTIONS: ItrOption[] = [
  { value: 'Yes', text: 'Yes' },
  { value: 'No', text: 'No' },
]

export const PREFIX_OPTIONS: ItrOption[] = [
  { value: 'Mr.', text: 'Mr.' },
  { value: 'Mrs.', text: 'Mrs.' },
  { value: 'Ms.', text: 'Ms.' },
  { value: 'Master', text: 'Master' },
]

export const SEX_OPTIONS: ItrOption[] = [
  { value: 'Male', text: 'M' },
  { value: 'Female', text: 'F' },
  { value: 'LGBTQ+', text: 'LGBTQ+' },
]

export const CIVIL_STATUS_OPTIONS: ItrOption[] = [
  { value: 'Single', text: 'Single' },
  { value: 'Married', text: 'Married' },
  { value: 'Separated', text: 'Separated' },
  { value: 'Widow/er', text: 'Widow/er' },
  { value: 'Co-Habitation', text: 'Co-Habitation' },
]

export const EMPLOYMENT_STATUS_OPTIONS: ItrOption[] = [
  { value: 'Employed', text: 'Employed' },
  { value: 'Unemployed', text: 'Unemployed' },
  { value: 'Retired', text: 'Retired' },
  { value: 'Student', text: 'Student' },
  { value: 'Unknown', text: 'Unknown' },
]

export const FAMILY_MEMBER_OPTIONS: ItrOption[] = [
  { value: 'Head of Family', text: 'Head of Family' },
  { value: 'Husband', text: 'Husband' },
  { value: 'Father', text: 'Father' },
  { value: 'Daughter', text: 'Daughter' },
  { value: 'Others', text: 'Others' },
  { value: 'Wife', text: 'Wife' },
  { value: 'Mother', text: 'Mother' },
  { value: 'Son', text: 'Son' },
]

export const DISABILITY_TYPES: ItrOption[] = [
  { value: 'Cancer', text: 'Cancer' },
  { value: 'Deaf or Hard of Hearing', text: 'Deaf or Hard of Hearing' },
  { value: 'Intellectual Disability', text: 'Intellectual Disability' },
  { value: 'Learning Disability', text: 'Learning Disability' },
  { value: 'Mental Disability', text: 'Mental Disability' },
  {
    value: 'Physical Disability-Orthopedic',
    text: 'Physical Disability-Orthopedic',
  },
  { value: 'Psychosocial Disability', text: 'Psychosocial Disability' },
  { value: 'Rare Disease', text: 'Rare Disease' },
  {
    value: 'Speech & Language Impairment',
    text: 'Speech & Language Impairment',
  },
  { value: 'Visual Disability', text: 'Visual Disability' },
]

export const PHILHEALTH_STATUS_OPTIONS: ItrOption[] = [
  { value: 'Member', text: 'Member' },
  { value: 'Dependent', text: 'Dependent' },
]

export const RELATIONSHIP_TO_MEMBER_OPTIONS: ItrOption[] = [
  { value: 'Parent', text: 'Parent' },
  { value: 'Spouse', text: 'Spouse' },
  { value: 'Child', text: 'Child' },
]

// PhilHealth category list printed on the ITR (long list → select field).
export const PHILHEALTH_CATEGORIES: string[] = [
  'Direct Contributor Professional Practitioner',
  'Direct Contributor Self Earning Individual — Sole Proprietor',
  'Enterprise Owner',
  'Family Driver',
  'Kasambahay',
  "Gov't Permanent Regular",
  "Gov't Casual",
  "Gov't Cont/Project Base",
  'Private Permanent Regular',
  'Private Casual',
  'Private Cont/Project Base',
  'Informal Sector',
  'Self Earning Individual',
  'Indigent - NHTS-PR',
  'Indirect Contributor Solo Parent',
  'Indigent Contributor PWD',
  'Indigent Solo Parent',
  'Lifetime Member',
  'Retiree/Pensioner',
  'Senior Citizen',
]

export const NATURE_OF_VISIT_OPTIONS: ItrOption[] = [
  { value: 'New Consultation', text: 'New Consultation' },
  { value: 'Follow-up', text: 'Follow - up' },
  { value: 'Referral', text: 'Referral' },
]

export const IMMUNIZATION_ADULT_OPTIONS: ItrOption[] = [
  { value: 'HPV', text: 'HPV' },
  { value: 'MMR', text: 'MMR' },
  { value: 'None', text: 'None' },
]

export const IMMUNIZATION_ELDERLY_OPTIONS: ItrOption[] = [
  { value: 'Pneumococcal Vaccine', text: 'Pneumococcal Vaccine' },
  { value: 'Flu Vaccine', text: 'Flu Vaccine' },
  { value: 'Others', text: 'Others' },
]

export const DELIVERY_TYPE_OPTIONS: ItrOption[] = [
  { value: 'NSD', text: 'NSD' },
  { value: 'CS', text: 'CS' },
]

export const SOCIAL_HISTORY_OPTIONS: ItrOption[] = [
  { value: 'Yes', text: 'Yes' },
  { value: 'No', text: 'No' },
  { value: 'Quit', text: 'Quit' },
]

// Conditions ticked on the PAST MEDICAL HISTORY and FAMILY HISTORY
// checklists. `specify` marks the items that carry a "Specify" line on the
// printed form.
export type ItrHistoryCondition = {
  key: string
  label: string
  specify?: boolean
}

export const HISTORY_CONDITIONS: ItrHistoryCondition[] = [
  { key: 'Allergy', label: 'Allergy', specify: true },
  { key: 'Asthma', label: 'Asthma' },
  { key: 'Cancer', label: 'Cancer', specify: true },
  { key: 'Cerebrovascular', label: 'Cerebrovascular Disease' },
  { key: 'Coronary', label: 'Coronary Artery Disease' },
  { key: 'Diabetes', label: 'Diabetes Mellitus' },
  { key: 'Emphysema', label: 'Emphysema' },
  { key: 'Epilepsy', label: 'Epilepsy/Seizure Disorder' },
  { key: 'Hepatitis', label: 'Hepatitis', specify: true },
  { key: 'Hyperlipidemia', label: 'Hyperlipidemia' },
  { key: 'Hypertension', label: 'Hypertension' },
  { key: 'PepticUlcer', label: 'Peptic Ulcer' },
  { key: 'Pneumonia', label: 'Pneumonia' },
  { key: 'Thyroid', label: 'Thyroid Disease' },
  { key: 'Ptb', label: 'PTB', specify: true },
  { key: 'Uti', label: 'Urinary Tract Infection' },
  { key: 'MentalIllness', label: 'Mental Illness' },
  { key: 'Others', label: 'Others', specify: true },
]

// Builds the itrData field names for a history checklist, e.g.
// historyField('pastMed', condition) -> 'pastMedAllergy'.
export const historyField = (
  prefix: string,
  condition: ItrHistoryCondition,
): string => `${prefix}${condition.key}`

export const historySpecifyField = (
  prefix: string,
  condition: ItrHistoryCondition,
): string => `${prefix}${condition.key}Specify`

// "PATIENT ANSWER TO NCD QUESTIONNAIRES — FOR PATIENT AGED 25 YEARS OLD AND
// ABOVE". Every item is answered Yes/No.
export const NCD_QUESTIONS: { name: string; label: string }[] = [
  {
    name: 'ncdProcessedFoods',
    label:
      'Eats processed or fast foods (eg. instant noodles, hamburgers, fries, fried chicken skin etc) and ihaw-ihaw (eg. isaw, adidas, etc) weekly?',
  },
  { name: 'ncdVegetables', label: '3 servings of vegetables daily?' },
  { name: 'ncdFruits', label: '2-3 servings of fruits daily?' },
  {
    name: 'ncdPhysicalActivity',
    label:
      'Does at least 2.5 hours a week of moderate-intensity physical activity?',
  },
  {
    name: 'ncdDiabetesDiagnosed',
    label: 'Was patient diagnosed as having diabetes?',
  },
  { name: 'ncdPolyphagia', label: 'Does patient have symptoms of Polyphagia?' },
  { name: 'ncdPolydipsia', label: 'Does patient have symptoms of Polydipsia?' },
  { name: 'ncdPolyuria', label: 'Does patient have symptoms of Polyuria?' },
  {
    name: 'ncdChestDiscomfort',
    label:
      'Have you had any pain or discomfort or any pressure or heaviness in your chest?',
  },
  {
    name: 'ncdChestPainCenterLeftArm',
    label: 'Do you get the pain in the center of the chest or left arm?',
  },
  {
    name: 'ncdPainWalkingUphill',
    label: 'Do you get it when you walk uphill or hurry?',
  },
  {
    name: 'ncdSlowDownWalking',
    label: 'Do you slow down if you get the pain while walking?',
  },
  {
    name: 'ncdPainReliefRestTablet',
    label:
      'Does the pain go away if you stand still or if you take a tablet under the tongue?',
  },
  {
    name: 'ncdPainLessThan10Min',
    label: 'Does the pain go away in less than 10 minutes?',
  },
  {
    name: 'ncdSevereChestPain30Min',
    label:
      'Have you ever had a severe chest pain across the front of your chest lasting for half an hour or more?',
  },
  {
    name: 'ncdWeaknessNumbness',
    label:
      'Have you ever had any of the following difficulty in taking, weakness of arm and/or leg on one side of the body or numbness on one side of the body?',
  },
]

// Grouped field names snapshotted from the adult ITR into
// MedicalHistory.itrData by the server action (lib/actions/medical.ts).
export const PERSONAL_INFO_FIELDS = [
  'prefix',
  'lastName',
  'firstName',
  'middleName',
  'suffix',
  'sex',
  'birthday',
  'birthplace',
  'civilStatus',
  'educationalAttainment',
  'employmentStatus',
  'religion',
  'indigenous',
  'bloodType',
  'fathersName',
  'mothersFirstName',
  'mothersLastName',
  'mothersMiddleName',
  'mothersBirthdate',
  'mothersName',
  'spouseName',
  'maidenName',
]

export const ADDRESS_FIELDS = [
  'address',
  'cityMun',
  'barangay',
  'streetNumber',
  'purok',
  'email',
  'mobileNumber',
  'landlineNumber',
  'contactNumber',
]

export const OTHER_INFO_FIELDS = [
  'familyMemberRole',
  'dswd4psMember',
  'pwdMember',
  'disabilityTypes',
  'psaNationalId',
]

export const PHILHEALTH_FIELDS = [
  'philHealthMember',
  'philHealthNo',
  'philHealthStatusType',
  'relationshipToMember',
  'philHealthCategory',
  'memberName',
  'memberBirthday',
  'memberDependent',
  'yakapRegistered',
]

export const CONSULTATION_DETAIL_FIELDS = [
  'natureOfVisit',
  'patientAgeYears',
  'patientAgeMonths',
  'patientAgeDays',
  'age',
]

export const HISTORY_FIELDS: string[] = [
  ...HISTORY_CONDITIONS.flatMap((c) =>
    c.specify
      ? [historyField('pastMed', c), historySpecifyField('pastMed', c)]
      : [historyField('pastMed', c)],
  ),
  'pastSurgicalHistory',
  'pastSurgicalDate',
  ...HISTORY_CONDITIONS.flatMap((c) =>
    c.specify
      ? [historyField('famHist', c), historySpecifyField('famHist', c)]
      : [historyField('famHist', c)],
  ),
  'famHistSurgical',
  'famHistSurgicalDate',
]

export const IMMUNIZATION_FIELDS = [
  'immAdultHpv',
  'immAdultMmr',
  'immAdultNone',
  'immElderlyPneumococcal',
  'immElderlyFlu',
  'immElderlyOthers',
  'familyPlanningCounseling',
]

export const MATERNAL_HISTORY_FIELDS = [
  'ageOfMenarche',
  'onsetSexualIntercourse',
  'lmp',
  'periodDuration',
  'padsPerDay',
  'intervalCycle',
  'birthControlMethod',
  'menopause',
  'ageMenopause',
  'typeOfDelivery',
  'pregnancyTypeOfDelivery',
  'pregnancyInducedHypertension',
]

export const PREGNANCY_FIELDS = [
  'gravidity',
  'parityFullTerm',
  'parityPreterm',
  'parityAbortion',
  'parityLivebirth',
  'edc',
]

export const NCD_FIELDS: string[] = NCD_QUESTIONS.map((q) => q.name)

export const SOCIAL_HISTORY_FIELDS = [
  'smoking',
  'smokingPacksPerDay',
  'alcohol',
  'alcoholBottlesPerDay',
  'illicitDrugs',
  'sexuallyActive',
  'sexualPartners',
]

export const CONSENT_FIELDS = [
  'consentPatientName',
  'consentDate',
  'consentRepresentative',
]

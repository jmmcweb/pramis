// This file contains logic for classifying medical cases based on diagnosis text and blood pressure readings.

// The classification rules are defined in the DISEASE_RULES array, which maps disease labels to keywords that may appear in the diagnosis text. If no keywords match, an elevated blood pressure reading (>= 140/90) is treated as hypertension. If there is a diagnosis text but no matching keywords or elevated BP, it is classified as "Other Cases". If there is no diagnosis and normal/missing BP, it returns null.
function parseBp(
  bp?: string | null,
): { systolic: number; diastolic: number } | null {
  if (!bp) return null
  const m = String(bp).match(/(\d+)\s*\/\s*(\d+)/)
  if (!m) return null
  const systolic = parseInt(m[1], 10)
  const diastolic = parseInt(m[2], 10)
  if (Number.isNaN(systolic) || Number.isNaN(diastolic)) return null
  return { systolic, diastolic }
}

// Normalizes a diagnosis string by trimming whitespace and converting to lowercase. This can be used for consistent keyword matching.
const DISEASE_RULES: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'Hypertension / High Blood',
    keywords: [
      'hypertens',
      'high blood',
      'hta',
      'hbp',
      'elevated bp',
      'elevated blood',
    ],
  },
  {
    label: 'Diabetes',
    keywords: ['diabet', 'blood sugar', 'hyperglyc', 'hdm', 'dm type'],
  },
  {
    label: 'Respiratory / TB',
    keywords: [
      'cough',
      'colds',
      'asthma',
      'pneumonia',
      'bronch',
      'tubercul',
      'tb ',
      'respiratory',
      'influenza',
      'flu',
      'shortness of breath',
    ],
  },
  {
    label: 'Infectious / Fever',
    keywords: [
      'fever',
      'dengue',
      'chickenpox',
      'measles',
      'infection',
      'abscess',
      'boil',
      'wound',
      'covid',
    ],
  },
  {
    label: 'Gastrointestinal',
    keywords: [
      'diarrhea',
      'abdominal pain',
      'gastro',
      'vomit',
      'ulcer',
      'constipation',
      'stomach ache',
      'stomachache',
      'dyspepsia',
    ],
  },
  {
    label: 'Urinary / Kidney',
    keywords: ['urinary', 'uti', 'kidney', 'renal'],
  },
  {
    label: 'Skin / Allergy',
    keywords: ['allergy', 'rash', 'skin', 'itching', 'eczema', 'hives'],
  },
]

// Normalizes a diagnosis string by trimming whitespace and converting to lowercase. This can be used for consistent keyword matching.
export function classifyMedicalCase(
  diagnosis?: string | null,
  bp?: string | null,
  serviceName?: string | null,
): string | null {
  const text = String(diagnosis ?? '').toLowerCase()
  const service = String(serviceName ?? '').toLowerCase()
  if (service.includes('vaccin') || service.includes('immuniz')) {
    return 'Immunization / Vaccination'
  }
  for (const rule of DISEASE_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.label
  }
  const reading = parseBp(bp)
  if (reading && (reading.systolic >= 140 || reading.diastolic >= 90)) {
    return 'Hypertension / High Blood'
  }
  if (text.trim()) return 'Other Cases'
  return null
}

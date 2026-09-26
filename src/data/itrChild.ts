

import type { MedicalRecord } from './records'



export const CHILD_IMMUNIZATIONS: { key: keyof MedicalRecord; label: string }[] =
  [
    { key: 'immBcg', label: 'BCG' },
    { key: 'immHepab24', label: 'Hepa B w/in 24 Hours' },
    { key: 'immHepab24plus', label: 'Hepa B ≥ 24 Hours' },
    { key: 'immPenta1', label: 'Pentavalent 1' },
    { key: 'immPenta2', label: 'Pentavalent 2' },
    { key: 'immPenta3', label: 'Pentavalent 3' },
    { key: 'immOpv1', label: 'OPV 1' },
    { key: 'immOpv2', label: 'OPV 2' },
    { key: 'immOpv3', label: 'OPV 3' },
    { key: 'immRota1', label: 'Rota 1' },
    { key: 'immRota2', label: 'Rota 2' },
    { key: 'immPcv1', label: 'PCV 1' },
    { key: 'immPcv2', label: 'PCV 2' },
    { key: 'immPcv3', label: 'PCV 3' },
    { key: 'immMcv1', label: 'MCV 1 (AMV)' },
    { key: 'immMcv2', label: 'MCV 2 (MMR)' },
    { key: 'immHepab2', label: 'Hepa B2' },
    { key: 'immHepab3', label: 'Hepa B3' },
    { key: 'immHepaa', label: 'Hepa A' },
    { key: 'immPneumonia', label: 'Pneumococcal Vaccine' },
    { key: 'immInfluenza', label: 'Influenza Vaccine' },
    { key: 'immOthers', label: 'Others' },
  ]

export function isChildRecord(record: MedicalRecord): boolean {
  return Boolean(
    record.placeDelivered ||
      record.typeOfDelivery ||
      record.attendantAtBirth ||
      record.birthLength ||
      record.birthWeight ||
      record.immBcg ||
      record.immPenta1,
  )
}

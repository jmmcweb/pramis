import {
  Baby,
  FlaskConical,
  HeartPulse,
  Smile,
  Stethoscope,
  Syringe,
} from 'lucide-react'

export const serviceIcons = {
  stethoscope: Stethoscope,
  syringe: Syringe,
  'heart-pulse': HeartPulse,
  smile: Smile,
  baby: Baby,
  'flask-conical': FlaskConical,
} as const

export type ServiceIconKey = keyof typeof serviceIcons


'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ClipboardCheck, HeartPulse, Home, IdCard, ShieldCheck } from 'lucide-react'

type HeartbeatProgressProps = {
  step: number
}

const STEPS = [
  { label: 'Personal', x: 30, icon: HeartPulse },
  { label: 'Residence', x: 90, icon: Home },
  { label: 'Confirm', x: 150, icon: ClipboardCheck },
  { label: 'Identification', x: 210, icon: IdCard },
  { label: 'Verify', x: 270, icon: ShieldCheck },
]

const BEAT = (cx: number) =>
  `L${cx - 14} 17 L${cx - 9} 19 L${cx - 5} 23 L${cx} 5 L${cx + 4} 25 L${cx + 7} 20 L${cx + 13} 17 L${cx + 19} 20`

const buildProgressPath = (count: number, tipX: number) => {
  const parts = ['M0 20']
  for (let i = 0; i < count; i++) {
    const cx = STEPS[i].x
    parts.push(`L${cx - 20} 20`, BEAT(cx))
  }
  parts.push(`L${tipX} 20`)
  return parts.join(' ')
}

const TRACK_PATH = [
  'M0 20',
  'L10 20 L16 17 L21 19 L25 23 L30 5 L34 25 L37 20 L43 17 L49 20',
  'L70 20 L76 17 L81 19 L85 23 L90 5 L94 25 L97 20 L103 17 L109 20',
  'L130 20 L136 17 L141 19 L145 23 L150 5 L154 25 L157 20 L163 17 L169 20',
  'L190 20 L196 17 L201 19 L205 23 L210 5 L214 25 L217 20 L223 17 L229 20',
  'L250 20 L256 17 L261 19 L265 23 L270 5 L274 25 L277 20 L283 17 L289 20',
  'L300 20',
].join(' ')

const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x
      if (Math.abs(err) < 1e-6) break
      const d = sampleDX(t)
      if (Math.abs(d) < 1e-6) break
      t -= err / d
    }
    t = Math.min(Math.max(t, 0), 1)
    return sampleY(t)
  }
}

const easeDraw = cubicBezier(0.33, 1, 0.68, 1)

const HeartbeatProgress = ({ step }: HeartbeatProgressProps) => {
  const currentIndex = Math.min(Math.max(step - 1, 0), STEPS.length - 1)
  const tipX = ((currentIndex + 1) / STEPS.length) * 300
  const pathRef = useRef<SVGPathElement>(null)
  const [tip, setTip] = useState({ x: 0, y: 20 })

  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path) return
    const len = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${len} ${len}`
    path.style.strokeDashoffset = `${len}`

    const DURATION = 3000
    let raf = 0
    let start: number | null = null

    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min((now - start) / DURATION, 1)
      const p = easeDraw(t)
      const drawn = len * p
      path.style.strokeDashoffset = `${len - drawn}`
      const pt = path.getPointAtLength(drawn)
      setTip({ x: pt.x, y: pt.y })
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step, tipX])

  return (
    <div
      className="mb-3 shrink-0 overflow-hidden select-none"
      aria-label={`Sign up progress: step ${currentIndex + 1} of ${STEPS.length}`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="grid grid-cols-5">
          {STEPS.map((s, i) => {
            const done = i < currentIndex
            const current = i === currentIndex
            const reached = done || current
            const Icon = s.icon

            return (
              <div key={s.label} className="flex justify-center">
                <span
                  className="rounded-full flex items-center justify-center transition-colors duration-300"
                  style={{
                    width: 16,
                    height: 16,
                    background: reached
                      ? 'linear-gradient(90deg, var(--color-brand-deep), #3aa6e0)'
                      : '#eef4f9',
                    color: reached ? '#ffffff' : '#8ba2b5',
                  }}
                >
                  <Icon size={9} strokeWidth={2.5} style={{ display: 'block' }} />
                </span>
              </div>
            )
          })}
        </div>

        <div className="relative">
          <svg viewBox="0 0 300 28" className="block w-full h-auto" fill="none">
            <defs>
              <linearGradient
                id="hb-gradient"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="300"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--color-brand-deep)" />
                <stop offset="100%" stopColor="#3aa6e0" />
              </linearGradient>
            </defs>

            <path
              d={TRACK_PATH}
              stroke="#dce7f0"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            <path
              ref={pathRef}
              d={buildProgressPath(currentIndex + 1, tipX)}
              stroke="url(#hb-gradient)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          <div
            className="absolute pointer-events-none"
            style={{
              left: `${(tip.x / 300) * 100}%`,
              top: `${(tip.y / 28) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="absolute"
              style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  background:
                    'radial-gradient(circle, rgba(58,166,224,0.35) 0%, rgba(58,166,224,0.12) 45%, rgba(58,166,224,0) 70%)',
                  animation: 'heartbeat-beat 1.3s ease-in-out infinite',
                }}
              />
            </div>
            <div
              className="absolute"
              style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: '#3aa6e0',
                  opacity: 0.2,
                  animation: 'heartbeat-beat 1.3s ease-in-out infinite',
                }}
              />
            </div>
            <div
              className="absolute"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  background: '#3aa6e0',
                  opacity: 0.15,
                  animation: 'heartbeat-beat 1.3s ease-in-out 0.15s infinite',
                }}
              />
            </div>
            <div
              className="absolute rounded-full"
              style={{
                width: 5.5,
                height: 5.5,
                background: '#ffffff',
                border: '1.75px solid #3aa6e0',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5">
          {STEPS.map((s, i) => {
            const done = i < currentIndex
            const current = i === currentIndex

            return (
              <span
                key={s.label}
                className={`text-center font-inter text-[9px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                  done || current ? 'text-brand' : 'text-slate/40'
                }`}
              >
                {s.label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default HeartbeatProgress

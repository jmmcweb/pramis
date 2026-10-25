import Link from 'next/link'
import type { ReactNode } from 'react'
import LeftPanel from './LeftPanel'
import HeartbeatProgress from './HeartbeatProgress'

type AuthShellProps = {
  title: string
  subtitle?: string
  tab?: 'login' | 'signup'
  step?: number
  backHref?: string
  animate?: boolean
  children: ReactNode
  footer?: ReactNode
  cardClassName?: string
}

const TABS = [
  { key: 'login', href: '/login', label: 'Log In' },
  { key: 'signup', href: '/signup', label: 'Sign Up' },
] as const

export default function AuthShell({
  title,
  subtitle,
  tab,
  step,
  backHref,
  animate = true,
  children,
  footer,
  cardClassName,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:flex-row">
      <LeftPanel />

      <div className="relative z-10 flex-1 bg-slate-50 lg:h-dvh lg:overflow-y-auto no-scrollbar">
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 sm:px-6 lg:py-8">
          <div
            className={`w-full flex flex-col ${cardClassName ?? 'max-w-md'}`}
            style={
              animate ? { animation: 'auth-rise 350ms ease-out' } : undefined
            }
          >
            {(backHref || tab) && (
              <div className="z-20 flex flex-col rounded-xl bg-slate-50 pb-3 lg:sticky lg:top-0">
                {backHref && (
                  <Link href={backHref} className="auth-back mb-3 self-start">
                    ← Back
                  </Link>
                )}

                {tab && (
                  <nav
                    aria-label="Account"
                    className="flex rounded-xl border border-line bg-mist p-1"
                  >
                    {TABS.map(({ key, href, label }) => (
                      <Link
                        key={key}
                        href={href}
                        aria-current={tab === key ? 'page' : undefined}
                        className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-center font-inter text-sm tracking-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          tab === key
                            ? 'bg-white font-semibold text-brand shadow-sm'
                            : 'font-medium text-slate hover:bg-white/70 hover:text-brand'
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {step !== undefined && <HeartbeatProgress step={step} />}

            <div className="flex w-full flex-col rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 md:p-8">
              <h1 className="font-roboto text-2xl font-bold leading-tight tracking-tight text-ink sm:text-[26px] md:text-[28px]">
                {title}
              </h1>
              <span className="mt-3 block h-[3px] w-12 rounded-full bg-brand" />

              {subtitle && (
                <p className="mt-4 max-w-full font-inter text-sm leading-relaxed tracking-normal text-slate">
                  {subtitle}
                </p>
              )}

              <div className="mt-5 flex flex-col">
                {children}
              </div>

              {footer && (
                <div className="mt-5 shrink-0 border-t border-line pt-4 text-center text-sm text-slate">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

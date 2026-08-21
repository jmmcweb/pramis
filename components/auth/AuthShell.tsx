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
    <div className="min-h-dvh flex flex-col lg:flex-row">
      <LeftPanel />

      <div className="flex-1 relative z-10 bg-white lg:h-dvh lg:overflow-y-auto no-scrollbar shadow-[-18px_0_36px_0_rgba(107,114,128,0.4),18px_0_36px_0_rgba(107,114,128,0.4)]">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-6 lg:py-5">
          <div
            className={`w-full flex flex-col ${cardClassName ?? 'max-w-md'}`}
            style={
              animate ? { animation: 'auth-rise 350ms ease-out' } : undefined
            }
          >
            {(backHref || tab) && (
              <div className="lg:sticky lg:top-0 z-20 flex flex-col bg-white rounded-lg pb-3">
                {backHref && (
                  <Link href={backHref} className="auth-back mb-3 self-start">
                    ← Back
                  </Link>
                )}

                {tab && (
                  <nav
                    aria-label="Account"
                    className="flex bg-mist rounded-xl p-1 border border-line shadow-[-12px_0_30px_-10px_rgba(107,114,128,0.25),12px_0_30px_-10px_rgba(107,114,128,0.25)]"
                  >
                    {TABS.map(({ key, href, label }) => (
                      <Link
                        key={key}
                        href={href}
                        aria-current={tab === key ? 'page' : undefined}
                        className={`flex-1 py-2.5 rounded-lg text-center transition-all duration-200 font-inter text-[14px] tracking-normal ${
                          tab === key
                            ? 'bg-white text-brand shadow-sm font-bold'
                            : 'text-slate font-normal opacity-40 hover:text-brand hover:opacity-100'
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

            <div className="font-inter bg-white border border-line rounded-2xl shadow-[-12px_0_30px_-10px_rgba(107,114,128,0.25),12px_0_30px_-10px_rgba(107,114,128,0.25)] p-6 md:p-8 w-full flex flex-col">
              <h1 className="font-roboto text-[26px] md:text-[28px] font-bold tracking-tight leading-tight text-ink">
                {title}
              </h1>
              <span className="mt-3 block h-[3px] w-12 rounded-full bg-brand" />

              {subtitle && (
                <p className="font-inter text-[12px] leading-normal tracking-normal text-slate mt-4 whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
                  {subtitle}
                </p>
              )}

              <div className="mt-5 flex flex-col">
                {children}
              </div>

              {footer && (
                <div className="mt-5 pt-3 border-t border-line text-center text-[13.5px] text-slate shrink-0">
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

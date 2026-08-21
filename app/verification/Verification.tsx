import type { ReactNode } from 'react'

type VerificationProps = {
  title: string
  children: ReactNode
}

const Verification = ({ title, children }: VerificationProps) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-[16px] font-bold text-ink m-0">{title}</h3>
    {children}
  </div>
)

export default Verification

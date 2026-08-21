import type { ReactNode } from 'react'

type DoneProps = {
  title: string
  children: ReactNode
}

const Done = ({ title, children }: DoneProps) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-[16px] font-bold text-ink m-0">{title}</h3>
    {children}
  </div>
)

export default Done

import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type FieldProps = {
  label: string
  id?: string
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
  required?: boolean
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

export default function Field({
  label,
  id,
  error,
  leading,
  trailing,
  required,
  className,
  ...inputProps
}: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={`field ${className ?? ''}`}>
      <label className="auth-label" htmlFor={inputId}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <div className={`auth-box ${error ? 'has-errors' : ''}`}>
        {leading}
        <input
          id={inputId}
          className="auth-input"
          required={required}
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        {trailing}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type FieldProps = {
  label: string
  id?: string
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
  required?: boolean
  /** Maximum number of characters a user may enter. */
  maxLength?: number
  /** HTML5 input pattern (e.g. for phone numbers). */
  pattern?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

export default function Field({
  label,
  id,
  error,
  leading,
  trailing,
  required,
  maxLength,
  pattern,
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
          maxLength={maxLength}
          pattern={pattern}
          {...inputProps}
        />
        {trailing}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

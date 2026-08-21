import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import FormResetPassword from '@/components/forms/FormResetPassword'

export default function ResetPassword() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <Link href="/login" className="auth-link">
          Back to log in
        </Link>
      }
    >
      <FormResetPassword className="" />
    </AuthShell>
  )
}

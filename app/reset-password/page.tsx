import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import FormResetPassword from '@/components/forms/FormResetPassword'

export default function ResetPassword() {
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Choose a new password for your account."
      footer={
        <Link href="/login" className="auth-link">
          Back to Log In
        </Link>
      }
    >
      <FormResetPassword className="" />
    </AuthShell>
  )
}

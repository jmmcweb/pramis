import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import FormForgotPassword from '@/components/forms/FormForgotPassword'

const ForgotPassword = () => {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a password reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="auth-link">
            Back to log in
          </Link>
        </>
      }
    >
      <FormForgotPassword className="" />
    </AuthShell>
  )
}

export default ForgotPassword

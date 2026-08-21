import AuthShell from '@/components/auth/AuthShell'
import FormLogin from '@/components/forms/FormLogin'

const Login = () => {
  return (
    <AuthShell
      tab="login"
      title="Log In"
      subtitle="Sign in to access your appointments and health records."
      cardClassName="max-w-xl"
    >
      <FormLogin />
    </AuthShell>
  )
}

export default Login

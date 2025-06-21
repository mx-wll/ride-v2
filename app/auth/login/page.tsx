import { LoginForm } from '@/features/auth/components/login-form'

export default function Page() {
  return (
    <div 
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?q=80&w=3731&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-[370px] flex flex-col items-center">
        <h1 className="text-4xl font-bold text-white mb-8">Upperland Racing</h1>
        <LoginForm />
      </div>
    </div>
  )
}

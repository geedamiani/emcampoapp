import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Conta criada!</h1>
        <p className="mt-2 text-muted-foreground">
          Verifique seu e-mail para confirmar sua conta e começar a usar o Meu Time.
        </p>
        <Button asChild className="mt-6 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/auth/login">Ir para login</Link>
        </Button>
      </div>
    </div>
  )
}

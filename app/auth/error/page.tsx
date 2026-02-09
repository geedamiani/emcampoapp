import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-destructive">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-muted-foreground">
          {params?.error
            ? `Erro: ${params.error}`
            : 'Ocorreu um erro inesperado na autenticacao.'}
        </p>
        <Button asChild className="mt-6 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/auth/login">Voltar para login</Link>
        </Button>
      </div>
    </div>
  )
}

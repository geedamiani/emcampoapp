'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateTeamSlugAction } from '@/app/dashboard/configuracoes/actions'
import { normalizeTeamSlug, slugEditError } from '@/lib/slug'

interface TeamSlugFormProps {
  ownerId: string
  initialSlug: string | null
  host: string
  migrationNeeded?: boolean
}

export function TeamSlugForm({ ownerId, initialSlug, host, migrationNeeded }: TeamSlugFormProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialSlug ?? '')
  const [saved, setSaved] = useState(initialSlug ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const preview = normalizeTeamSlug(value)
  const previewError = value.trim() ? slugEditError(preview, false) : null
  const unchanged = saved !== '' && preview === saved

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (previewError || unchanged) return
    setIsLoading(true)
    try {
      const result = await updateTeamSlugAction(ownerId, value)
      if (!result.success || !result.slug) {
        toast.error(result.error || 'Erro ao salvar o endereço.')
        return
      }
      setSaved(result.slug)
      setValue(result.slug)
      toast.success('Endereço atualizado.')
      router.refresh()
    } catch {
      toast.error('Erro ao salvar o endereço.')
    } finally {
      setIsLoading(false)
    }
  }

  if (migrationNeeded) {
    return (
      <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Para publicar o endereço do time, execute o script <code className="rounded bg-amber-500/20 px-1 py-0.5 text-xs">scripts/010_team_share_slug.sql</code> no Supabase (SQL Editor).
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Endereço público</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Só o dono altera. O slug nasce do nome do time.
      </p>
      <Label htmlFor="team-slug" className="mt-4 block text-xs text-muted-foreground">
        {host}/
      </Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          id="team-slug"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 bg-secondary border-border"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading || Boolean(previewError) || unchanged}
        >
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Endereço: {host}/{preview}
      </p>
      {previewError ? (
        <p className="mt-1 text-xs text-destructive">{previewError}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Salvar normaliza acentos, espaços e pontuação. O endereço anterior deixa de abrir. O link /t/ passa a redirecionar para o slug novo.
        </p>
      )}
    </form>
  )
}

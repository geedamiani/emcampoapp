'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const positions = [
  'Goleiro',
  'Zagueiro',
  'Lateral Direito',
  'Lateral Esquerdo',
  'Volante',
  'Meia',
  'Atacante',
]

interface PlayerFormProps {
  player?: {
    id: string
    name: string
    position: string | null
    whatsapp: string | null
  }
  onClose: () => void
  onRefresh?: () => void
}

export function PlayerForm({ player, onClose, onRefresh }: PlayerFormProps) {
  const [name, setName] = useState(player?.name || '')
  const [position, setPosition] = useState(player?.position || '')
  const [whatsapp, setWhatsapp] = useState(player?.whatsapp || '')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!player

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      name,
      position: position || null,
      whatsapp: whatsapp || null,
      user_id: user!.id,
    }

    if (isEditing) {
      const { error } = await supabase.from('players').update(payload).eq('id', player.id)
      if (error) {
        toast.error('Erro ao atualizar jogador')
      } else {
        toast.success('Jogador atualizado')
      }
    } else {
      const { error } = await supabase.from('players').insert(payload)
      if (error) {
        toast.error('Erro ao cadastrar jogador')
      } else {
        toast.success('Jogador cadastrado')
      }
    }

    setIsLoading(false)
    if (onRefresh) onRefresh()
    else router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-muted-foreground">Nome ou apelido</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 bg-secondary border-border"
          placeholder="Ex: Carlao"
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-muted-foreground">Posicao</Label>
        <Select value={position} onValueChange={setPosition} required>
          <SelectTrigger className="h-11 bg-secondary border-border">
            <SelectValue placeholder="Selecione a posicao" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {positions.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="whatsapp" className="text-muted-foreground">
          WhatsApp <span className="text-xs text-muted-foreground/60">(opcional)</span>
        </Label>
        <Input
          id="whatsapp"
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="h-11 bg-secondary border-border"
          placeholder="(11) 99999-9999"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 border-border text-muted-foreground bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Cadastrar')}
        </Button>
      </div>
    </form>
  )
}

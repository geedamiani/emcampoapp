/**
 * CONFIGURAÇÕES PAGE
 *
 * Settings page for team owners. Only accessible to the account owner (not admins).
 * Shows current admins, pending invites, and lets the owner invite new admins.
 *
 * Auto-cleans stale invites: if an invited email already has admin access, the
 * pending invite row is deleted so it doesn't show as "pending" forever.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { InviteAdmins } from '@/components/invite-admins'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const ownerId = await getEffectiveOwnerId(supabase, user.id)
  if (user.id !== ownerId) redirect('/dashboard')

  let admins: { admin_id: string; created_at: string }[] = []
  let pending: { id: string; email: string; token: string; created_at: string; expires_at: string }[] = []
  let adminEmails: Record<string, string> = {}
  let migrationNeeded = false

  const { data: adminsData, error: adminsError } = await supabase
    .from('team_admins')
    .select('admin_id, created_at')
    .eq('owner_id', ownerId)
  if (!adminsError) admins = adminsData || []

  const { data: pendingData, error: pendingError } = await supabase
    .from('pending_invites')
    .select('id, email, token, team_name, created_at, expires_at')
    .eq('owner_id', ownerId)
    .gt('expires_at', new Date().toISOString())
  if (!pendingError) pending = pendingData || []
  if (adminsError || pendingError) migrationNeeded = true

  const ownerEmail = user?.email?.toLowerCase() ?? ''
  const adminEmailSet = new Set<string>(ownerEmail ? [ownerEmail] : [])

  // Fetch admin emails (need admin client since auth.users isn't directly queryable)
  if (admins.length > 0 && !migrationNeeded) {
    try {
      const admin = createAdminClient()
      for (const adminRow of admins) {
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(adminRow.admin_id)
        if (!userError && userData?.user?.email) {
          adminEmails[adminRow.admin_id] = userData.user.email
          adminEmailSet.add(userData.user.email.toLowerCase())
        }
      }
    } catch {
      // Silently fail — admin emails just won't be displayed
    }
  }

  // Auto-clean: if a pending invite's email already belongs to an admin, remove the invite
  const adminIdsSet = new Set(admins.map(a => a.admin_id))
  if (pending.length > 0 && adminIdsSet.size > 0 && !migrationNeeded) {
    try {
      const admin = createAdminClient()
      let page = 1
      const perPage = 500
      const pendingEmailsLower = new Set(pending.map(inv => inv.email.toLowerCase()))
      const emailsToRemove = new Set<string>()

      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error || !data?.users?.length) break
        for (const u of data.users) {
          const e = u.email?.toLowerCase()
          if (e && pendingEmailsLower.has(e) && adminIdsSet.has(u.id)) {
            emailsToRemove.add(e)
            if (!adminEmails[u.id]) adminEmails[u.id] = u.email!
            adminEmailSet.add(e)
          }
        }
        if (data.users.length < perPage) break
        page++
      }

      if (emailsToRemove.size > 0) {
        for (const inv of pending.filter(inv => emailsToRemove.has(inv.email.toLowerCase()))) {
          await admin.from('pending_invites').delete().eq('id', inv.id).eq('owner_id', ownerId)
        }
        pending = pending.filter(inv => !emailsToRemove.has(inv.email.toLowerCase()))
      }
    } catch {
      // Silently fail
    }
  }

  // Second pass: remove invites for emails that already have access (owner or admin)
  if (adminEmailSet.size > 0 && pending.length > 0) {
    try {
      const admin = createAdminClient()
      const toDelete = pending.filter(inv => adminEmailSet.has(inv.email.toLowerCase()))
      for (const inv of toDelete) {
        await admin.from('pending_invites').delete().eq('id', inv.id).eq('owner_id', ownerId)
      }
      if (toDelete.length > 0) {
        pending = pending.filter(inv => !adminEmailSet.has(inv.email.toLowerCase()))
      }
    } catch {
      // Silently fail
    }
  }

  const filteredPending = pending.filter(inv => !adminEmailSet.has(inv.email.toLowerCase()))

  type UserWithAccess = { id: string; email: string; role: 'owner' | 'admin'; created_at: string }
  const usersWithAccess: UserWithAccess[] = []
  if (user?.email) {
    usersWithAccess.push({
      id: ownerId,
      email: user.email,
      role: 'owner',
      created_at: user.created_at ?? new Date().toISOString(),
    })
  }
  admins.forEach(a => {
    usersWithAccess.push({
      id: a.admin_id,
      email: adminEmails[a.admin_id] || '',
      role: 'admin',
      created_at: a.created_at,
    })
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários do seu time</p>
      </div>

      <InviteAdmins
        ownerId={ownerId}
        teamName={user?.user_metadata?.team_name || 'Meu Time'}
        usersWithAccess={usersWithAccess}
        pendingInvites={filteredPending}
        migrationNeeded={migrationNeeded}
      />
    </div>
  )
}

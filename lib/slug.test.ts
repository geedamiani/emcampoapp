import assert from 'node:assert/strict'
import {
  allocateTeamSlug,
  normalizeTeamSlug,
  primaryTeamSlug,
  slugCandidate,
  slugEditError,
  slugifyTeamName,
} from './slug'

const taken = new Set<string>()

function take(name: string): string {
  const slug = allocateTeamSlug(name, (candidate) => taken.has(candidate))
  taken.add(slug)
  return slug
}

assert.equal(take('São José F.C.'), 'sao-jose-fc')
assert.equal(take('Sao Jose FC'), 'sao-jose-fc-2')
assert.equal(take('São José FC!'), 'sao-jose-fc-3')
assert.equal(take('Grêmio FBPA'), 'gremio-fbpa')
assert.equal(take('Atlético-MG'), 'atletico-mg')
assert.equal(take("D'Ávila"), 'davila')
assert.equal(take('Ação & Reação'), 'acao-e-reacao')
assert.equal(take('FC Pelada!!'), 'fc-pelada')
assert.equal(take('Sub-20'), 'sub-20')
assert.equal(take('Sub-20'), 'sub-20-2')
assert.equal(take('Meu Time'), 'meu-time')
assert.equal(take('!!!'), 'time')
assert.equal(take('!!!'), 'time-2')
assert.equal(take('Dashboard'), 'dashboard-time')
assert.equal(take('Auth'), 'auth-time')
assert.equal(take('T'), 't-time')
assert.equal(take('  São   Paulo   FC  '), 'sao-paulo-fc')
assert.equal(take('Real Madri C.F.'), 'real-madri-cf')
assert.equal(
  take('Associação Atlética Acadêmica de São José dos Campos Futebol Clube'),
  'associacao-atletica-academica-de-sao-jose-dos',
)
assert.equal(take('11 de Setembro'), '11-de-setembro')
assert.equal(take('São José / Sub-17'), 'sao-jose-sub-17')

assert.equal(slugifyTeamName('São José F.C.'), 'sao-jose-fc')
assert.equal(slugifyTeamName('!!!'), '')
assert.equal(normalizeTeamSlug('!!!'), 'time')
assert.equal(normalizeTeamSlug('Dashboard'), 'dashboard')
assert.equal(primaryTeamSlug('Dashboard'), 'dashboard-time')
assert.equal(slugCandidate('São José F.C.', 0), 'sao-jose-fc')
assert.equal(slugCandidate('São José F.C.', 1), 'sao-jose-fc-2')
assert.equal(slugCandidate('Dashboard', 1), 'dashboard-time-2')

assert.equal(slugEditError('dashboard', false), 'Este endereço é reservado.')
assert.equal(slugEditError('sao-jose-fc', true), 'Este endereço já está em uso.')
assert.equal(slugEditError('sao-jose-fc', false), null)
assert.equal(slugEditError('time', false), null)

console.log('slug tests passed')

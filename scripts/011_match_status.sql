-- Partidas futuras.
-- Paste this whole script in the Supabase SQL Editor. Do not run it by file path.
--
-- Additive only. Existing rows become played through the column default.
-- Does not UPDATE or DELETE any row. Does not read or write match_events,
-- match_players, goals, or assists.
--
-- RLS stays as it is. Owners and team admins keep the policies already on
-- public.matches. Do not grant anon access: the public page (/<slug>) resolves
-- the share slug with the service role and then reads that one owner's matches,
-- including rows with status = 'scheduled'. The new column is covered by the
-- existing table privileges, so no extra policy is required.

alter table public.matches add column if not exists status text not null default 'played' check (status in ('scheduled','played'));

create index if not exists matches_user_status_date_idx on public.matches(user_id, status, match_date);

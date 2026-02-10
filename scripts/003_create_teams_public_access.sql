-- ============================================
-- Migration: Create teams table + public read access
-- ============================================

-- Teams table (maps each user to a team with a unique public slug)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Anyone can read teams (needed for public pages to resolve slugs)
CREATE POLICY "teams_read_all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_own" ON public.teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teams_update_own" ON public.teams FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Add public read (SELECT) policies for anon role
-- This allows unauthenticated users to view team data
-- via the public /t/[slug] routes.
-- Write policies remain restricted to the owner.
-- ============================================

CREATE POLICY "public_read_players" ON public.players FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_opponent_teams" ON public.opponent_teams FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_matches" ON public.matches FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_match_events" ON public.match_events FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_match_players" ON public.match_players FOR SELECT TO anon USING (true);

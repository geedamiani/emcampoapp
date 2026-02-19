-- Team admins: users who can manage another user's team data
CREATE TABLE IF NOT EXISTS public.team_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, admin_id)
);

ALTER TABLE public.team_admins ENABLE ROW LEVEL SECURITY;

-- Only owner can manage their admins
CREATE POLICY "team_admins_select_owner" ON public.team_admins FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = admin_id);
CREATE POLICY "team_admins_insert_owner" ON public.team_admins FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "team_admins_delete_owner" ON public.team_admins FOR DELETE USING (auth.uid() = owner_id);

-- Pending invites (before admin has signed up)
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(owner_id, email)
);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_invites_select_owner" ON public.pending_invites FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "pending_invites_insert_owner" ON public.pending_invites FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pending_invites_delete_owner" ON public.pending_invites FOR DELETE USING (auth.uid() = owner_id);

-- RLS: Allow admins to access owner's data (add to existing tables)
-- Players
CREATE POLICY "players_select_admin" ON public.players FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "players_insert_admin" ON public.players FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "players_update_admin" ON public.players FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "players_delete_admin" ON public.players FOR DELETE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));

-- Opponent teams
CREATE POLICY "opponent_teams_select_admin" ON public.opponent_teams FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "opponent_teams_insert_admin" ON public.opponent_teams FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "opponent_teams_update_admin" ON public.opponent_teams FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "opponent_teams_delete_admin" ON public.opponent_teams FOR DELETE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));

-- Matches
CREATE POLICY "matches_select_admin" ON public.matches FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "matches_insert_admin" ON public.matches FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "matches_update_admin" ON public.matches FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "matches_delete_admin" ON public.matches FOR DELETE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));

-- Match events
CREATE POLICY "match_events_select_admin" ON public.match_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_events_insert_admin" ON public.match_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_events_update_admin" ON public.match_events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_events_delete_admin" ON public.match_events FOR DELETE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));

-- Match players
CREATE POLICY "match_players_select_admin" ON public.match_players FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_players_insert_admin" ON public.match_players FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_players_update_admin" ON public.match_players FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));
CREATE POLICY "match_players_delete_admin" ON public.match_players FOR DELETE USING (EXISTS (SELECT 1 FROM public.team_admins WHERE owner_id = user_id AND admin_id = auth.uid()));

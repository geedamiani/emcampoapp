-- Players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT,
  position TEXT,
  shirt_number INT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_own" ON public.players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "players_insert_own" ON public.players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "players_update_own" ON public.players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "players_delete_own" ON public.players FOR DELETE USING (auth.uid() = user_id);

-- Opponent teams table
CREATE TABLE IF NOT EXISTS public.opponent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.opponent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opponent_teams_select_own" ON public.opponent_teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "opponent_teams_insert_own" ON public.opponent_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "opponent_teams_update_own" ON public.opponent_teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "opponent_teams_delete_own" ON public.opponent_teams FOR DELETE USING (auth.uid() = user_id);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opponent_team_id UUID NOT NULL REFERENCES public.opponent_teams(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  goals_for INT DEFAULT 0,
  goals_against INT DEFAULT 0,
  location TEXT,
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_own" ON public.matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "matches_insert_own" ON public.matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matches_update_own" ON public.matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "matches_delete_own" ON public.matches FOR DELETE USING (auth.uid() = user_id);

-- Match events table (goals, assists, cards)
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('goal', 'assist', 'yellow_card', 'red_card')),
  minute INT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_events_select_own" ON public.match_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "match_events_insert_own" ON public.match_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "match_events_update_own" ON public.match_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "match_events_delete_own" ON public.match_events FOR DELETE USING (auth.uid() = user_id);

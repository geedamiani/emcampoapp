-- Remove nickname and shirt_number columns, add whatsapp
ALTER TABLE public.players DROP COLUMN IF EXISTS nickname;
ALTER TABLE public.players DROP COLUMN IF EXISTS shirt_number;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Match players junction table (tracks who played and who started)
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  was_starter BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_id)
);

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_players_select_own" ON public.match_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "match_players_insert_own" ON public.match_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "match_players_update_own" ON public.match_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "match_players_delete_own" ON public.match_players FOR DELETE USING (auth.uid() = user_id);

-- Public view-only share: one token per team (owner)
CREATE TABLE IF NOT EXISTS public.team_share (
  owner_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_share ENABLE ROW LEVEL SECURITY;

-- Only owner can read/update their share row (no select for anon; we use admin client for public view)
CREATE POLICY "team_share_select_owner" ON public.team_share FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "team_share_insert_owner" ON public.team_share FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "team_share_update_owner" ON public.team_share FOR UPDATE USING (auth.uid() = owner_id);

-- Public view page will resolve token -> owner_id via admin client (no RLS policy for anon).

-- Link assists to goals: each goal can have an optional assistant.
-- Assists are no longer separate events; they are stored as assistant_id on the goal row.
-- Run this in Supabase SQL Editor (paste the SQL, do not run by file path).

ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_events.assistant_id IS 'When event_type = goal, optional player who assisted. Assists are derived from this; no separate assist events needed.';

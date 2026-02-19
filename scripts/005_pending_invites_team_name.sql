-- Add team_name to pending_invites for invite flow
ALTER TABLE public.pending_invites ADD COLUMN IF NOT EXISTS team_name TEXT;

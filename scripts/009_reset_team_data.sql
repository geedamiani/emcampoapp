-- Reset all team data for one account (e.g. Boleiros demo account).
-- Use this to fix inconsistent state: players with stats but empty matches, etc.
--
-- INSTRUCTIONS:
-- 1. In Supabase, find the user id (UUID) for the Boleiros account:
--    Auth -> Users -> click the user -> copy "User UID".
-- 2. Replace the placeholder below with that UUID.
-- 3. Run this script in the SQL Editor (paste the full script, do not run by file path).
--
-- Order matters: delete children before parents to respect FKs.

DO $$
DECLARE
  target_user_id UUID := '00000000-0000-0000-0000-000000000000';  -- REPLACE with Boleiros user UUID
BEGIN
  DELETE FROM public.match_events   WHERE user_id = target_user_id;
  DELETE FROM public.match_players  WHERE user_id = target_user_id;
  DELETE FROM public.matches        WHERE user_id = target_user_id;
  DELETE FROM public.opponent_teams WHERE user_id = target_user_id;
  DELETE FROM public.players        WHERE user_id = target_user_id;
  DELETE FROM public.team_share     WHERE owner_id = target_user_id;
  RAISE NOTICE 'Reset complete for user %', target_user_id;
END $$;

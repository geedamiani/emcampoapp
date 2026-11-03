-- Friendly public slug for each team share row.
-- Paste this whole script in the Supabase SQL Editor. Do not run it by file path.
--
-- Additive: new nullable column, format check, backfill, unique index.
-- Writes only public.team_share.slug. Reads auth.users only to copy team_name.
-- Does not read or write match_events, matches, match_players, players,
-- opponent_teams, team_admins, or pending_invites.
--
-- Leave the SET NOT NULL at the bottom commented until the app that writes
-- slug on every insert is deployed and this query returns 0:
--   select count(*) from public.team_share where slug is null;

ALTER TABLE public.team_share
  ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE public.team_share
  DROP CONSTRAINT IF EXISTS team_share_slug_format;

ALTER TABLE public.team_share
  ADD CONSTRAINT team_share_slug_format
  CHECK (
    slug IS NULL
    OR (
      char_length(slug) BETWEEN 1 AND 48
      AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    )
  );

CREATE OR REPLACE FUNCTION public.team_share_fit_suffix(stem text, suffix text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  next_stem text := stem;
  room int;
BEGIN
  IF char_length(next_stem) + char_length(suffix) > 48 THEN
    room := 48 - char_length(suffix);
    IF room < 1 THEN
      next_stem := '';
    ELSE
      next_stem := regexp_replace(substring(next_stem from 1 for room), '-+$', '');
    END IF;
  END IF;
  RETURN next_stem || suffix;
END;
$fn$;

-- Keep the letter map and the steps aligned with lib/slug.ts.
CREATE OR REPLACE FUNCTION public.team_share_primary_slug(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  s text;
  reserved text[] := ARRAY[
    'auth', 'dashboard', 't', 'api', 'admin', 'public', 'static', 'assets',
    'login', 'signup', 'sign-up', 'share', 'convite'
  ];
BEGIN
  s := coalesce(raw, '');
  s := translate(
    s,
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝýŸÿ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyYy'
  );
  s := replace(s, '&', ' e ');
  s := translate(s, '.' || chr(39) || chr(8217) || chr(180), '');
  s := lower(s);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF char_length(s) > 48 THEN
    s := substring(s from 1 for 48);
    IF strpos(s, '-') > 0 THEN
      s := regexp_replace(s, '-[^-]*$', '');
    END IF;
    s := regexp_replace(s, '-+$', '');
  END IF;
  IF s IS NULL OR s = '' THEN
    s := 'time';
  END IF;
  IF s = ANY (reserved) THEN
    s := public.team_share_fit_suffix(s, '-time');
  END IF;
  RETURN s;
END;
$fn$;

DO $check$
BEGIN
  IF public.team_share_primary_slug($n$São José F.C.$n$) IS DISTINCT FROM 'sao-jose-fc' THEN
    RAISE EXCEPTION 'slug divergiu: São José F.C.';
  END IF;
  IF public.team_share_primary_slug($n$Sao Jose FC$n$) IS DISTINCT FROM 'sao-jose-fc' THEN
    RAISE EXCEPTION 'slug divergiu: Sao Jose FC';
  END IF;
  IF public.team_share_primary_slug($n$Grêmio FBPA$n$) IS DISTINCT FROM 'gremio-fbpa' THEN
    RAISE EXCEPTION 'slug divergiu: Grêmio FBPA';
  END IF;
  IF public.team_share_primary_slug($n$Atlético-MG$n$) IS DISTINCT FROM 'atletico-mg' THEN
    RAISE EXCEPTION 'slug divergiu: Atlético-MG';
  END IF;
  IF public.team_share_primary_slug($n$D'Ávila$n$) IS DISTINCT FROM 'davila' THEN
    RAISE EXCEPTION 'slug divergiu: D''Ávila';
  END IF;
  IF public.team_share_primary_slug($n$Ação & Reação$n$) IS DISTINCT FROM 'acao-e-reacao' THEN
    RAISE EXCEPTION 'slug divergiu: Ação & Reação';
  END IF;
  IF public.team_share_primary_slug($n$FC Pelada!!$n$) IS DISTINCT FROM 'fc-pelada' THEN
    RAISE EXCEPTION 'slug divergiu: FC Pelada';
  END IF;
  IF public.team_share_primary_slug($n$Sub-20$n$) IS DISTINCT FROM 'sub-20' THEN
    RAISE EXCEPTION 'slug divergiu: Sub-20';
  END IF;
  IF public.team_share_primary_slug($n$Meu Time$n$) IS DISTINCT FROM 'meu-time' THEN
    RAISE EXCEPTION 'slug divergiu: Meu Time';
  END IF;
  IF public.team_share_primary_slug($n$!!!$n$) IS DISTINCT FROM 'time' THEN
    RAISE EXCEPTION 'slug divergiu: vazio';
  END IF;
  IF public.team_share_primary_slug($n$Dashboard$n$) IS DISTINCT FROM 'dashboard-time' THEN
    RAISE EXCEPTION 'slug divergiu: Dashboard';
  END IF;
  IF public.team_share_primary_slug($n$Auth$n$) IS DISTINCT FROM 'auth-time' THEN
    RAISE EXCEPTION 'slug divergiu: Auth';
  END IF;
  IF public.team_share_primary_slug($n$T$n$) IS DISTINCT FROM 't-time' THEN
    RAISE EXCEPTION 'slug divergiu: T';
  END IF;
  IF public.team_share_primary_slug($n$  São   Paulo   FC  $n$) IS DISTINCT FROM 'sao-paulo-fc' THEN
    RAISE EXCEPTION 'slug divergiu: São Paulo FC';
  END IF;
  IF public.team_share_primary_slug($n$Real Madri C.F.$n$) IS DISTINCT FROM 'real-madri-cf' THEN
    RAISE EXCEPTION 'slug divergiu: Real Madri C.F.';
  END IF;
  IF public.team_share_primary_slug($n$Associação Atlética Acadêmica de São José dos Campos Futebol Clube$n$) IS DISTINCT FROM 'associacao-atletica-academica-de-sao-jose-dos' THEN
    RAISE EXCEPTION 'slug divergiu: nome longo';
  END IF;
  IF public.team_share_primary_slug($n$11 de Setembro$n$) IS DISTINCT FROM '11-de-setembro' THEN
    RAISE EXCEPTION 'slug divergiu: 11 de Setembro';
  END IF;
  IF public.team_share_primary_slug($n$São José / Sub-17$n$) IS DISTINCT FROM 'sao-jose-sub-17' THEN
    RAISE EXCEPTION 'slug divergiu: São José / Sub-17';
  END IF;
  IF public.team_share_fit_suffix('sao-jose-fc', '-2') IS DISTINCT FROM 'sao-jose-fc-2' THEN
    RAISE EXCEPTION 'sufixo de colisão divergiu';
  END IF;
  IF public.team_share_fit_suffix('sub-20', '-2') IS DISTINCT FROM 'sub-20-2' THEN
    RAISE EXCEPTION 'sufixo numérico divergiu';
  END IF;
END;
$check$;

DO $backfill$
DECLARE
  rec record;
  team_name text;
  primary_slug text;
  candidate text;
  suffix text;
  stem text;
  n int;
BEGIN
  FOR rec IN
    SELECT
      ts.owner_id,
      coalesce(nullif(btrim(u.raw_user_meta_data->>'team_name'), ''), 'Meu Time') AS source_name
    FROM public.team_share ts
    LEFT JOIN auth.users u ON u.id = ts.owner_id
    WHERE ts.slug IS NULL
    ORDER BY ts.created_at ASC NULLS LAST, ts.owner_id ASC
  LOOP
    team_name := rec.source_name;
    primary_slug := public.team_share_primary_slug(team_name);
    candidate := primary_slug;
    n := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.team_share WHERE slug = candidate
    ) LOOP
      suffix := '-' || n::text;
      stem := primary_slug;
      IF char_length(stem) + char_length(suffix) > 48 THEN
        stem := regexp_replace(substring(stem from 1 for 48 - char_length(suffix)), '-+$', '');
      END IF;
      candidate := stem || suffix;
      n := n + 1;
      IF n > 10000 THEN
        RAISE EXCEPTION 'muitas colisões de slug para %', rec.owner_id;
      END IF;
    END LOOP;

    UPDATE public.team_share
    SET slug = candidate
    WHERE owner_id = rec.owner_id
      AND slug IS NULL;
  END LOOP;
END;
$backfill$;

CREATE UNIQUE INDEX IF NOT EXISTS team_share_slug_key
  ON public.team_share (slug);

DROP FUNCTION IF EXISTS public.team_share_primary_slug(text);
DROP FUNCTION IF EXISTS public.team_share_fit_suffix(text, text);

-- Depois do deploy que grava slug em todo insert, confira:
--   select count(*) from public.team_share where slug is null;
-- Quando o resultado for 0, rode em um passo separado:
-- ALTER TABLE public.team_share ALTER COLUMN slug SET NOT NULL;

-- Explicit onboarding enrollment keeps all pre-existing accounts ineligible.
BEGIN;
SELECT pg_advisory_xact_lock(548911, 1);

CREATE TABLE IF NOT EXISTS public.typetiles_schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.typetiles_schema_migrations
    WHERE version = '20261124000100'
  ) THEN
    RAISE NOTICE 'Type Tiles onboarding migration is already applied; no changes made.';
    RETURN;
  END IF;

  IF to_regclass('public.user_onboarding') IS NOT NULL THEN
    RAISE EXCEPTION 'public.user_onboarding already exists without the onboarding migration marker. Stop and review the existing schema.';
  END IF;

  CREATE TABLE public.user_onboarding (
    user_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'eligible'
      CHECK (status IN ('eligible', 'completed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.user_onboarding FROM PUBLIC, anon, authenticated;

  INSERT INTO public.typetiles_schema_migrations(version)
  VALUES ('20261124000100');
END
$migration$;

COMMIT;

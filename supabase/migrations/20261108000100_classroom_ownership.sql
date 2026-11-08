-- Additive security migration. Historical ownership stays NULL: participation
-- is not proof of hosting. No accounts or historical results are rewritten.
BEGIN;
SELECT pg_advisory_xact_lock(548911, 1);
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES public.users(id);
INSERT INTO public.typetiles_schema_migrations(version)
VALUES ('20261108000100') ON CONFLICT(version) DO NOTHING;
COMMIT;

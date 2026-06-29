-- =============================================================================
-- CCSHAU_ naming convention — registry and shared functions
-- All application tables MUST use prefix: ccshau_ (documented as CCSHAU_)
-- =============================================================================

-- Registry table (documents naming standard in the database)
CREATE TABLE IF NOT EXISTS ccshau_schema_meta (
  id integer PRIMARY KEY DEFAULT 1,
  naming_prefix text NOT NULL DEFAULT 'CCSHAU_',
  pg_prefix text NOT NULL DEFAULT 'ccshau_',
  schema_version text NOT NULL DEFAULT '0.1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_schema_meta_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_schema_meta IS 'CCSHAU_ schema metadata — naming prefix registry';
COMMENT ON COLUMN ccshau_schema_meta.naming_prefix IS 'Documented prefix for all application objects (CCSHAU_)';
COMMENT ON COLUMN ccshau_schema_meta.pg_prefix IS 'PostgreSQL identifier prefix (ccshau_, lowercase)';

INSERT INTO ccshau_schema_meta (id, naming_prefix, pg_prefix, schema_version)
VALUES (1, 'CCSHAU_', 'ccshau_', '0.1.0')
ON CONFLICT (id) DO NOTHING;

-- Shared function: auto-update updated_at column
CREATE OR REPLACE FUNCTION ccshau_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ccshau_set_updated_at() IS 'CCSHAU_ trigger function — sets updated_at on row update';

-- Enable RLS on registry table
ALTER TABLE ccshau_schema_meta ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users; writes via service role only
CREATE POLICY ccshau_pol_schema_meta_select_authenticated
  ON ccshau_schema_meta
  FOR SELECT
  TO authenticated
  USING (true);

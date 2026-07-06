-- Server-only helper to read named secrets from Supabase Vault.
-- Used by Next.js admin translation (service role RPC).

CREATE OR REPLACE FUNCTION ccshau_get_vault_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret::text
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION ccshau_get_vault_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ccshau_get_vault_secret(text) TO service_role;

COMMENT ON FUNCTION ccshau_get_vault_secret(text) IS
  'Returns a decrypted Vault secret by name. Callable only with service role.';

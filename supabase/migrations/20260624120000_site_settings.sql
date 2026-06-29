-- =============================================================================
-- CCSHAU_ site settings — feature flags for CAPTCHA and email (Power Automate)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ccshau_site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  captcha_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT ccshau_site_settings_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_site_settings IS 'CCSHAU_ singleton — runtime feature flags (CAPTCHA, Power Automate email)';
COMMENT ON COLUMN ccshau_site_settings.captcha_enabled IS 'When true, verify reCAPTCHA on login and public feedback';
COMMENT ON COLUMN ccshau_site_settings.email_enabled IS 'When true, dispatch emails via Power Automate webhooks';

INSERT INTO ccshau_site_settings (id, captcha_enabled, email_enabled)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER ccshau_trg_site_settings_updated_at
  BEFORE UPDATE ON ccshau_site_settings
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_site_settings_select_authenticated
  ON ccshau_site_settings FOR SELECT TO authenticated
  USING (ccshau_is_super_admin(auth.uid()));

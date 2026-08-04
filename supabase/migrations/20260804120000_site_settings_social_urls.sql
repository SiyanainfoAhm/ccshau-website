-- =============================================================================
-- CCSHAU_ site settings — social media URLs for public footer icons
-- =============================================================================

ALTER TABLE ccshau_site_settings
  ADD COLUMN IF NOT EXISTS social_twitter_url text,
  ADD COLUMN IF NOT EXISTS social_facebook_url text,
  ADD COLUMN IF NOT EXISTS social_youtube_url text,
  ADD COLUMN IF NOT EXISTS social_blogger_url text,
  ADD COLUMN IF NOT EXISTS social_instagram_url text;

COMMENT ON COLUMN ccshau_site_settings.social_twitter_url IS 'Public Twitter/X profile URL (footer icon)';
COMMENT ON COLUMN ccshau_site_settings.social_facebook_url IS 'Public Facebook page URL (footer icon)';
COMMENT ON COLUMN ccshau_site_settings.social_youtube_url IS 'Public YouTube channel URL (footer icon)';
COMMENT ON COLUMN ccshau_site_settings.social_blogger_url IS 'Public Blogger URL (footer icon)';
COMMENT ON COLUMN ccshau_site_settings.social_instagram_url IS 'Public Instagram profile URL (footer icon)';

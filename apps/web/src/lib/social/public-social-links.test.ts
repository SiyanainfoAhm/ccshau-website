/**
 * Tests for `@/lib/social/public-social-links`.
 * Covers building public social link lists from site settings.
 */

import { describe, expect, it } from "vitest";

import type { SiteSettings } from "@/lib/database/types";
import { socialLinksFromSettings } from "@/lib/social/public-social-links";

function settings(
  overrides: Partial<SiteSettings> = {},
): SiteSettings {
  return {
    id: 1,
    captcha_enabled: false,
    email_enabled: false,
    social_twitter_url: null,
    social_facebook_url: null,
    social_youtube_url: null,
    social_blogger_url: null,
    social_instagram_url: null,
    faculty_people_public_college_ids: [],
    updated_at: "2026-01-01T00:00:00.000Z",
    updated_by: null,
    ...overrides,
  };
}

// Suite: socialLinksFromSettings.
describe("socialLinksFromSettings", () => {
  // Empty platforms omitted; configured URLs trimmed and included.
  it("omits empty platforms and returns configured links", () => {
    expect(socialLinksFromSettings(settings())).toEqual([]);

    const links = socialLinksFromSettings(
      settings({
        social_twitter_url: " https://x.com/hau ",
        social_youtube_url: "https://youtube.com/@hau",
        social_facebook_url: "",
      }),
    );

    expect(links).toHaveLength(2);
    expect(links.map((l) => l.platform)).toEqual(["twitter", "youtube"]);
    expect(links[0].href).toBe("https://x.com/hau");
  });
});

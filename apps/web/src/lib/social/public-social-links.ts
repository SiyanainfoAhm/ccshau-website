import type { SiteSettings } from "@/lib/database/types";
import type { PublicSocialLink } from "@/lib/data/public-types";

const SOCIAL_PLATFORMS: {
  platform: PublicSocialLink["platform"];
  labelEn: string;
  labelHi: string;
  key:
    | "social_twitter_url"
    | "social_facebook_url"
    | "social_youtube_url"
    | "social_blogger_url"
    | "social_instagram_url";
}[] = [
  {
    platform: "twitter",
    labelEn: "Twitter / X",
    labelHi: "ट्विटर",
    key: "social_twitter_url",
  },
  {
    platform: "facebook",
    labelEn: "Facebook",
    labelHi: "फेसबुक",
    key: "social_facebook_url",
  },
  {
    platform: "youtube",
    labelEn: "YouTube",
    labelHi: "यूट्यूब",
    key: "social_youtube_url",
  },
  {
    platform: "blogger",
    labelEn: "Blogger",
    labelHi: "ब्लॉगर",
    key: "social_blogger_url",
  },
  {
    platform: "instagram",
    labelEn: "Instagram",
    labelHi: "इंस्टाग्राम",
    key: "social_instagram_url",
  },
];

export function socialLinksFromSettings(settings: SiteSettings): PublicSocialLink[] {
  return SOCIAL_PLATFORMS.flatMap(({ platform, labelEn, labelHi, key }) => {
    const href = settings[key]?.trim() ?? "";
    if (!href) return [];
    return [{ platform, labelEn, labelHi, href }];
  });
}

/**
 * Vitest coverage for mediaAlbumFormSchema and mediaItemFormSchema:
 * album title/slug/type, and video URL http(s) rules.
 */
import { describe, expect, it } from "vitest";

import {
  mediaAlbumFormSchema,
  mediaItemFormSchema,
} from "@/lib/validations/media";

// Suite: media album and media item form validation.
describe("media schemas", () => {
  // Accepts kebab slug album; rejects spaced/invalid slug.
  it("validates album form fields", () => {
    expect(
      mediaAlbumFormSchema.safeParse({
        titleEn: "Convocation",
        slug: "convocation-2026",
        albumType: "photo",
        status: "draft",
      }).success,
    ).toBe(true);
    expect(
      mediaAlbumFormSchema.safeParse({
        titleEn: "Bad",
        slug: "Bad Slug",
        albumType: "photo",
        status: "draft",
      }).success,
    ).toBe(false);
  });

  // Video URLs must be http(s); image items ok without videoUrl.
  it("requires http(s) video URLs when provided", () => {
    expect(
      mediaItemFormSchema.safeParse({
        mediaType: "video",
        videoUrl: "https://youtu.be/abc",
      }).success,
    ).toBe(true);
    expect(
      mediaItemFormSchema.safeParse({
        mediaType: "video",
        videoUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      mediaItemFormSchema.safeParse({
        mediaType: "image",
      }).success,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { getVideoPlayback, isHttpUrl } from "@/lib/media/video-playback";

describe("getVideoPlayback", () => {
  it("embeds YouTube watch, short, and youtu.be URLs", () => {
    expect(
      getVideoPlayback("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toEqual({
      kind: "embed",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(getVideoPlayback("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "embed",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(
      getVideoPlayback("https://www.youtube.com/shorts/abc123XYZ00"),
    ).toEqual({
      kind: "embed",
      embedUrl: "https://www.youtube.com/embed/abc123XYZ00",
    });
  });

  it("embeds Vimeo URLs", () => {
    expect(getVideoPlayback("https://vimeo.com/123456789")).toEqual({
      kind: "embed",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
    expect(
      getVideoPlayback("https://player.vimeo.com/video/987654321"),
    ).toEqual({
      kind: "embed",
      embedUrl: "https://player.vimeo.com/video/987654321",
    });
  });

  it("treats other http(s) URLs as file playback", () => {
    expect(
      getVideoPlayback("https://cdn.example.com/clip.mp4"),
    ).toEqual({
      kind: "file",
      src: "https://cdn.example.com/clip.mp4",
    });
  });

  it("rejects empty and non-http URLs", () => {
    expect(getVideoPlayback("")).toBeNull();
    expect(getVideoPlayback("not a url")).toBeNull();
    expect(getVideoPlayback("ftp://example.com/a.mp4")).toBeNull();
  });
});

describe("isHttpUrl", () => {
  it("validates http(s) only", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("nope")).toBe(false);
  });
});

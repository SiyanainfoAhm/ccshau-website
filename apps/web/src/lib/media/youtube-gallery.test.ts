import { describe, expect, it } from "vitest";
import { getYouTubeVideo } from "./video-playback";

describe("YouTube gallery URLs", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
    "https://youtu.be/dQw4w9WgXcQ?si=example",
    "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/live/dQw4w9WgXcQ",
  ])("normalizes %s and retains visible controls", (url) => {
    expect(getYouTubeVideo(url)).toEqual({
      id: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?controls=1&playsinline=1",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });
  });

  it.each([
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/embed/dQw4w9WgXcQ",
    "https://youtube.com/watch?v=invalid",
    "https://youtube.com/watch?v=dQw4w9WgXcQ%22",
    "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com:444/watch?v=dQw4w9WgXcQ",
    '<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    "/images/photo.jpg",
    "",
  ])("rejects invalid or untrusted input %s", (url) => {
    expect(getYouTubeVideo(url)).toBeNull();
  });
});

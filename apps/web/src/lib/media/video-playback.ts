/** Resolve album / CMS video URLs to either an iframe embed or a direct file player. */

export type VideoPlayback =
  | { kind: "embed"; embedUrl: string }
  | { kind: "file"; src: string };

function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      return parts[1] || null;
    }
  }
  return null;
}

function vimeoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? id : null;
  }
  if (host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && parts[1] && /^\d+$/.test(parts[1])) return parts[1];
  }
  return null;
}

export function getVideoPlayback(rawUrl: string): VideoPlayback | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId) {
    return {
      kind: "embed",
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`,
    };
  }

  const vimeoId = vimeoIdFromUrl(url);
  if (vimeoId) {
    return {
      kind: "embed",
      embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`,
    };
  }

  return { kind: "file", src: trimmed };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

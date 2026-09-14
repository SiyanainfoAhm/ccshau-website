/**
 * Tests for `@/lib/storage/urls`.
 * Covers Azure blob URL building and resolving stored/public media paths.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAzureBlobUrl,
  getStoredFileUrl,
  resolvePublicMediaUrl,
} from "@/lib/storage/urls";

// Suite: storage URL helpers.
describe("storage urls", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Builds blob URLs from account/container and encodes path spaces.
  it("builds blob URLs from account and container", () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT", "ccshau");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "");

    expect(buildAzureBlobUrl("ccshau-public", "news/a/b.pdf")).toBe(
      "https://ccshau.blob.core.windows.net/ccshau-public/news/a/b.pdf",
    );
    expect(buildAzureBlobUrl("ccshau-public", "news/file name.pdf")).toBe(
      "https://ccshau.blob.core.windows.net/ccshau-public/news/file%20name.pdf",
    );
  });

  // Legacy bucket names remap onto the single configured container.
  it("maps legacy buckets onto a single configured container", () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "https://ccshau.blob.core.windows.net");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "ccshaucontainer");

    expect(buildAzureBlobUrl("ccshau-public", "banners/x.png")).toBe(
      "https://ccshau.blob.core.windows.net/ccshaucontainer/banners/x.png",
    );
  });

  // Absolute URLs pass through; stored paths resolve; invalid paths return null.
  it("resolves stored paths and absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT", "ccshau");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("AZURE_STORAGE_CONTAINER", "");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "");

    expect(getStoredFileUrl("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
    expect(getStoredFileUrl("no-slash")).toBeNull();
    expect(getStoredFileUrl("ccshau-public/news/a.pdf")).toBe(
      "https://ccshau.blob.core.windows.net/ccshau-public/news/a.pdf",
    );

    // Phase-4 placeholders are not Azure blobs — no HAU/legacy public URL.
    expect(getStoredFileUrl("legacy-pending/tenders/5595/1784791334.pdf")).toBeNull();
    expect(getStoredFileUrl("legacy-pending/cms/1174/1550820777.pdf")).toBeNull();

    expect(resolvePublicMediaUrl(null)).toBeNull();
    expect(resolvePublicMediaUrl("ccshau-public/news/a.pdf")).toContain(
      "news/a.pdf",
    );
  });
});

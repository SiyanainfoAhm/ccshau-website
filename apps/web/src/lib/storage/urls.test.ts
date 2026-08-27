import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAzureBlobUrl,
  getStoredFileUrl,
  resolvePublicMediaUrl,
} from "@/lib/storage/urls";

describe("storage urls", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("maps legacy buckets onto a single configured container", () => {
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_BASE_URL", "https://ccshau.blob.core.windows.net");
    vi.stubEnv("NEXT_PUBLIC_AZURE_STORAGE_CONTAINER", "ccshaucontainer");

    expect(buildAzureBlobUrl("ccshau-public", "banners/x.png")).toBe(
      "https://ccshau.blob.core.windows.net/ccshaucontainer/banners/x.png",
    );
  });

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

    expect(resolvePublicMediaUrl(null)).toBeNull();
    expect(resolvePublicMediaUrl("ccshau-public/news/a.pdf")).toContain(
      "news/a.pdf",
    );
  });
});

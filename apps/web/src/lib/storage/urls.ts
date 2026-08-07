/**
 * Client-safe Azure Blob URL helpers (no Azure SDK — safe in browser bundles).
 */

export function getAzureBlobBaseUrl(): string | null {
  const custom = process.env.NEXT_PUBLIC_AZURE_STORAGE_BASE_URL?.replace(/\/$/, "");
  if (custom) return custom;

  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
    process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  if (!account) return null;
  return `https://${account}.blob.core.windows.net`;
}

function encodeBlobPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** When one Azure container is configured, map legacy bucket names onto it. */
function resolveContainer(container: string): string {
  const single =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
    process.env.AZURE_STORAGE_CONTAINER?.trim();
  if (!single) return container;
  if (container === single) return container;
  if (
    container === "ccshau-public" ||
    container === "ccshau-private" ||
    container === "ccshau-media"
  ) {
    return single;
  }
  return container;
}

export function buildAzureBlobUrl(container: string, blobPath: string): string | null {
  const base = getAzureBlobBaseUrl();
  if (!base) return null;
  return `${base}/${resolveContainer(container)}/${encodeBlobPath(blobPath)}`;
}

export function getPublicFileUrl(container: string, path: string): string | null {
  return buildAzureBlobUrl(container, path);
}

export function getStoredFileUrl(storedPath: string): string | null {
  if (storedPath.startsWith("https://") || storedPath.startsWith("http://")) {
    return storedPath;
  }
  const slash = storedPath.indexOf("/");
  if (slash === -1) return null;
  return getPublicFileUrl(storedPath.slice(0, slash), storedPath.slice(slash + 1));
}

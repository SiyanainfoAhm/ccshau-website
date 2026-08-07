import "server-only";

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential,
    );
  }

  throw new Error(
    "Azure Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING, or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.",
  );
}

export async function uploadAzureBlob(
  container: string,
  blobPath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const client = getBlobServiceClient();
  const blockBlob = client.getContainerClient(container).getBlockBlobClient(blobPath);
  await blockBlob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

export async function deleteAzureBlobs(container: string, blobPaths: string[]): Promise<void> {
  if (blobPaths.length === 0) return;
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(container);

  await Promise.all(
    blobPaths.map(async (path) => {
      try {
        await containerClient.deleteBlob(path);
      } catch {
        // Ignore missing blobs (already deleted or never uploaded).
      }
    }),
  );
}

export function isAzureStorageConfigured(): boolean {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()) return true;
  return Boolean(
    process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() &&
      process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim(),
  );
}

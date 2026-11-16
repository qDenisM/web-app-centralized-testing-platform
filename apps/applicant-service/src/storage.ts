import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const s3 = new S3Client({
  endpoint: config.minio.endpoint,
  region: config.minio.region,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: config.minio.forcePathStyle,
});

export async function ensureDocumentsBucket(): Promise<void> {
  const bucket = config.minio.documentsBucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export function buildAttestatStorageKey(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `attestats/${userId}/${randomUUID()}-${safeName}`;
}

export async function createPresignedUpload(options: {
  storageKey: string;
  contentType: string;
}): Promise<{ uploadUrl: string; storageKey: string; expiresIn: number }> {
  const command = new PutObjectCommand({
    Bucket: config.minio.documentsBucket,
    Key: options.storageKey,
    ContentType: options.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: config.uploadUrlTtlSec,
  });

  return {
    uploadUrl,
    storageKey: options.storageKey,
    expiresIn: config.uploadUrlTtlSec,
  };
}

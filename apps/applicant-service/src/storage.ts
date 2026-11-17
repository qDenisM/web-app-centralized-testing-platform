import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
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

async function ensureBucketCors(bucket: string): Promise<void> {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Location"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}

export async function ensureDocumentsBucket(): Promise<void> {
  const bucket = config.minio.documentsBucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await ensureBucketCors(bucket);
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

export async function createAttestatDownloadUrl(
  storageKey: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const command = new GetObjectCommand({
    Bucket: config.minio.documentsBucket,
    Key: storageKey,
  });
  const downloadUrl = await getSignedUrl(s3, command, {
    expiresIn: config.downloadUrlTtlSec,
  });
  return { downloadUrl, expiresIn: config.downloadUrlTtlSec };
}

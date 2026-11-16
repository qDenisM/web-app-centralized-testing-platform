import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export async function ensurePassesBucket(): Promise<void> {
  const bucket = config.minio.passesBucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await ensureBucketCors(bucket);
}

export function buildPassStorageKey(userId: string, passNumber: string): string {
  const safe = passNumber
    .replace(/^СТ-/u, "CT-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `passes/${userId}/${safe}.pdf`;
}

export async function uploadPassPdf(options: {
  storageKey: string;
  body: Buffer;
}): Promise<void> {
  await ensurePassesBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.minio.passesBucket,
      Key: options.storageKey,
      Body: options.body,
      ContentType: "application/pdf",
    }),
  );
}

export async function createPassDownloadUrl(
  storageKey: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const command = new GetObjectCommand({
    Bucket: config.minio.passesBucket,
    Key: storageKey,
  });
  const downloadUrl = await getSignedUrl(s3, command, {
    expiresIn: config.downloadUrlTtlSec,
  });
  return { downloadUrl, expiresIn: config.downloadUrlTtlSec };
}

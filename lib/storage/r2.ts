import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { env } from "@/lib/env";

// R2 is S3-compatible: fixed "auto" region, account-scoped endpoint.
export const r2 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Fetch an object as a Node stream plus useful headers, for streaming to the client. */
export async function getObjectStream(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  const res = await r2.send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  );
  return {
    body: res.Body as Readable,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
  };
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
  );
}

// Vídeos en Cloudflare R2 (compatible con S3) y datos en Supabase.
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.mjs";

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const s3 = new S3Client({
  region: "auto",
  endpoint: config.r2.endpoint,
  credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
});

export async function download(key, file) {
  const res = await s3.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  await pipeline(res.Body, createWriteStream(file));
}

export async function upload(file, key, contentType = "video/mp4") {
  await new Upload({
    client: s3,
    params: { Bucket: config.r2.bucket, Key: key, Body: createReadStream(file), ContentType: contentType },
  }).done();
}

export async function remove(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}

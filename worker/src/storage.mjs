// Vídeos en Cloudflare R2 (compatible con S3) y datos en Supabase.
import { createReadStream, createWriteStream } from "node:fs";
import { open } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

const PART = 8 * 1024 * 1024;
const PARALLEL = 8;

// Descarga en trozos a la vez: con el bucket lejos (EE. UU.), una sola conexión va lenta.
export async function download(key, file) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  const size = head.ContentLength ?? 0;
  if (size <= PART) {
    const res = await s3.send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    await pipeline(res.Body, createWriteStream(file));
    return;
  }
  const handle = await open(file, "w");
  try {
    const ranges = [];
    for (let start = 0; start < size; start += PART) ranges.push([start, Math.min(size, start + PART) - 1]);
    await Promise.all(
      Array.from({ length: PARALLEL }, async () => {
        for (let range = ranges.shift(); range; range = ranges.shift()) {
          const [start, end] = range;
          const res = await s3.send(
            new GetObjectCommand({ Bucket: config.r2.bucket, Key: key, Range: `bytes=${start}-${end}` }),
          );
          const bytes = await res.Body.transformToByteArray();
          await handle.write(bytes, 0, bytes.length, start);
        }
      }),
    );
  } finally {
    await handle.close();
  }
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

// Enlace temporal de descarga (Instagram descarga el vídeo desde aquí al publicar)
export function signedUrl(key, seconds = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }), { expiresIn: seconds });
}

// Vídeos en Cloudflare R2 (compatible con S3). Solo se usa en el servidor.
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function r2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET,
  );
}

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!.trim(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  });
  return client;
}

const bucket = () => process.env.R2_BUCKET!.trim();

// Enlace temporal para que el navegador suba el archivo directamente a R2, sin pasar por Vercel.
export function signUpload(key: string, contentType: string) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), {
    expiresIn: 60 * 60,
  });
}

// Enlace temporal para ver o descargar un vídeo.
export function signDownload(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 60 * 60 * 6 });
}

export async function removeObjects(keys: string[]) {
  if (keys.length === 0) return;
  await s3().send(
    new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
  );
}

// Pone en la cola un vídeo del PC para probar la edición sin pasar por la web.
// Uso: npm run probar -- "C:\ruta\al\video.mp4" ["indicaciones"]
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { supabase, upload } from "./storage.mjs";

const [file, instructions] = process.argv.slice(2);
if (!file || !existsSync(file)) {
  console.error('Uso: npm run probar -- "C:\\ruta\\al\\video.mp4" ["indicaciones"]');
  process.exit(1);
}

// El vídeo se asigna a la cuenta que tiene Instagram conectado (o a la primera cuenta)
async function findUser() {
  const { data: account } = await supabase.from("social_accounts").select("user_id").limit(1).maybeSingle();
  if (account) return account.user_id;
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (error || !data.users[0]) throw new Error("No hay ninguna cuenta en Mova");
  return data.users[0].id;
}

const userId = await findUser();
const id = randomUUID();
const ext = path.extname(file).toLowerCase() || ".mp4";
const key = `videos/${userId}/${id}/original${ext}`;

console.log("Subiendo el vídeo a R2…");
await upload(file, key, ext === ".mov" ? "video/quicktime" : "video/mp4");

const { error } = await supabase.from("videos").insert({
  id,
  user_id: userId,
  title: path.basename(file, ext),
  raw_path: key,
  status: "editing",
  edit_status: "queued",
  edit_instructions: instructions ?? null,
  platforms: ["instagram"],
});
if (error) {
  console.error(`No se pudo poner en la cola: ${error.message}`);
  process.exit(1);
}
console.log(`En cola (${id}). Con el worker corriendo (npm start), el resultado aparecerá en worker\\salida.`);

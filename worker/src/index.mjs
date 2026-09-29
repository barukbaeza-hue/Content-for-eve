// Worker de edición: toma vídeos de la cola de Supabase y los edita uno a uno.
import { config } from "./config.mjs";
import { editVideo } from "./edit.mjs";
import { supabase } from "./storage.mjs";
import { checkTools } from "./tools.mjs";

const MAX_ATTEMPTS = 3;
let stopping = false;

process.on("SIGINT", () => {
  if (stopping) process.exit(1);
  stopping = true;
  console.log("\nParando cuando termine el vídeo actual… (Ctrl+C otra vez para salir ya)");
});

function time() {
  return new Date().toLocaleTimeString("es-CL");
}

async function main() {
  await checkTools();
  console.log(`Worker de Mova listo. Revisando la cola cada ${config.pollSeconds} s (Ctrl+C para parar).`);

  while (!stopping) {
    const { data, error } = await supabase.rpc("claim_next_edit");
    if (error) {
      console.error(`[${time()}] No se pudo leer la cola: ${error.message}`);
      await sleep(config.pollSeconds * 3);
      continue;
    }
    const video = data?.[0];
    if (!video) {
      await sleep(config.pollSeconds);
      continue;
    }

    console.log(`\n[${time()}] Editando "${video.title}" (${video.id})`);
    const started = Date.now();
    try {
      await editVideo(video, (msg) => console.log(`  ${msg}`));
      console.log(`[${time()}] Terminado en ${Math.round((Date.now() - started) / 1000)} s`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const failed = video.edit_attempts >= MAX_ATTEMPTS;
      console.error(`[${time()}] Error: ${message}`);
      console.error(failed ? "  Se marca como fallido." : "  Vuelve a la cola para reintentar.");
      await supabase
        .from("videos")
        .update({ edit_status: failed ? "failed" : "queued", edit_error: message.slice(0, 2000) })
        .eq("id", video.id);
    }
  }
  console.log("Worker parado.");
}

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

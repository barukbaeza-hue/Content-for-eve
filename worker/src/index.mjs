// Worker de Mova: edita los vídeos de la cola uno a uno y, en paralelo, publica los programados cuando llega su hora.
import { config } from "./config.mjs";
import { editVideo, resubtitleVideo } from "./edit.mjs";
import { publishDue } from "./publish.mjs";
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

// Revisa el calendario cada pocos segundos, sin esperar a que termine una edición
async function publishLoop() {
  while (!stopping) {
    try {
      await publishDue((msg) => console.log(`[${time()}] Publicar · ${msg}`));
    } catch (e) {
      console.error(`[${time()}] Publicar · ${e instanceof Error ? e.message : e}`);
    }
    await sleep(config.publishSeconds);
  }
}

async function main() {
  await checkTools();
  console.log(`Worker de Mova listo. Revisando la cola cada ${config.pollSeconds} s y el calendario cada ${config.publishSeconds} s (Ctrl+C para parar).`);
  const publishing = publishLoop();

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

    const what = video.edit_job === "subtitulos" ? "Corrigiendo subtítulos de" : "Editando";
    console.log(`\n[${time()}] ${what} "${video.title}" (${video.id})`);
    const started = Date.now();
    try {
      const job = video.edit_job === "subtitulos" ? resubtitleVideo : editVideo;
      await job(video, (msg) => console.log(`  ${msg}`));
      console.log(`[${time()}] Terminado en ${Math.round((Date.now() - started) / 1000)} s`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[${time()}] Error: ${message}`);
      if (video.edit_job === "subtitulos") {
        // El vídeo editado sigue bien: vuelve a "listo" con el aviso de que la corrección no se aplicó
        await supabase
          .from("videos")
          .update({ edit_status: "edited", edit_job: "completa", edit_error: `No se pudieron corregir los subtítulos: ${message}`.slice(0, 2000) })
          .eq("id", video.id);
        continue;
      }
      const failed = video.edit_attempts >= MAX_ATTEMPTS;
      console.error(failed ? "  Se marca como fallido." : "  Vuelve a la cola para reintentar.");
      await supabase
        .from("videos")
        .update({ edit_status: failed ? "failed" : "queued", edit_error: message.slice(0, 2000) })
        .eq("id", video.id);
    }
  }
  await publishing;
  console.log("Worker parado.");
}

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

// Programas externos: ffmpeg (instalado en el sistema), whisper.cpp y DeepFilterNet (en worker/bin).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { ROOT, config } from "./config.mjs";

const BIN = path.join(ROOT, "bin");
const EXE = process.platform === "win32" ? ".exe" : "";

function binary(...names) {
  for (const name of names) {
    const local = path.join(BIN, name + EXE);
    if (existsSync(local)) return local;
  }
  return names[0];
}

export const tools = {
  ffmpeg: "ffmpeg",
  ffprobe: "ffprobe",
  whisper: binary("whisper-cli", "main"),
  deepFilter: binary("deep-filter"),
};

/**
 * Ejecuta un programa y devuelve su salida. Falla con las últimas líneas del error.
 * @param {string} command
 * @param {string[]} args
 */
export function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => {
      stderr += d;
      // Solo interesa el final (ffmpeg escribe mucho)
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    child.on("error", (error) =>
      reject(new Error(`No se pudo ejecutar ${path.basename(command)}: ${error.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} falló (código ${code}): ${stderr.trim().slice(-1500)}`));
    });
  });
}

// Comprueba al arrancar que está todo instalado, con mensajes claros.
export async function checkTools() {
  const problems = [];
  for (const [name, command] of Object.entries({ ffmpeg: tools.ffmpeg, ffprobe: tools.ffprobe })) {
    await run(command, ["-version"]).catch(() => problems.push(`${name} no está instalado (winget install Gyan.FFmpeg)`));
  }
  if (!existsSync(tools.whisper)) problems.push("Falta whisper.cpp en worker/bin (ejecuta instalar.ps1)");
  if (!existsSync(tools.deepFilter)) problems.push("Falta DeepFilterNet en worker/bin (ejecuta instalar.ps1)");
  if (!existsSync(config.whisperModel)) problems.push(`Falta el modelo de Whisper: ${config.whisperModel} (ejecuta instalar.ps1)`);
  if (problems.length) throw new Error(`Faltan herramientas:\n- ${problems.join("\n- ")}`);
}

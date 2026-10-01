# Worker de edición de Mova

Programa que edita los vídeos de la cola. Por ahora corre en el PC del equipo (Windows); más adelante, en un servidor.

Toma el siguiente vídeo de la cola de Supabase, lo baja de Cloudflare R2 y:

1. Limpia el audio con **DeepFilterNet**.
2. Transcribe con **Whisper** (whisper.cpp), con el tiempo de cada palabra.
3. Quita los silencios con **ffmpeg** y nivela el volumen.
4. Sube el vídeo editado a R2 y lo marca como listo en el banco.

Pendiente: subtítulos animados, zooms y música con Remotion, y cortes decididos por Claude con el contexto del founder.

## Instalación (una vez)

Requiere Node.js 22 o superior, Git y ffmpeg (`winget install OpenJS.NodeJS.LTS Git.Git Gyan.FFmpeg`).

```powershell
cd worker
powershell -ExecutionPolicy Bypass -File .\instalar.ps1
copy .env.example .env
notepad .env
```

## Uso

```powershell
npm start                                   # arranca el worker (Ctrl+C para parar)
npm run probar -- "C:\ruta\video.mp4"       # pone un vídeo del PC en la cola
```

Con `GUARDAR_COPIA=1` (por defecto), cada vídeo editado se guarda también en `worker\salida`.

## Publicación

Mientras el worker está encendido, cada 30 s revisa el calendario. Cuando llega la hora de un vídeo programado lo publica en las redes elegidas (Instagram y/o TikTok) con su descripción:

- **Instagram:** Instagram descarga el vídeo desde R2 con un enlace temporal, lo procesa y el worker lo publica como Reel.
- **TikTok:** el worker sube el archivo y TikTok lo publica con los ajustes elegidos en «Descripción y redes» (quién puede verlo, comentarios, dúos, stitch y contenido comercial). Mientras TikTok no apruebe la app, solo se puede publicar en cuentas privadas.

El estado de cada red se ve en Vídeos ("Publicando…", "Publicado en…", o el error). Si una red falla, el vídeo vuelve al banco para reprogramarlo. **Si el PC está apagado a la hora programada, el vídeo se publica en cuanto se encienda el worker.**

Para TikTok, añade a `worker/.env` las claves `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET` (las mismas que en Vercel).

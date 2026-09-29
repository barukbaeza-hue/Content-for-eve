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

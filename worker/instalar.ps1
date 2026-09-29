# Instala lo que necesita el worker en Windows: whisper.cpp, el modelo de Whisper y DeepFilterNet.
# Uso (desde la carpeta worker): powershell -ExecutionPolicy Bypass -File .\instalar.ps1
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # sin esto las descargas van muy lentas
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bin = Join-Path $root "bin"
$models = Join-Path $root "models"
New-Item -ItemType Directory -Force $bin, $models | Out-Null

# Busca en las últimas versiones de un repositorio de GitHub el primer archivo que cumpla el patrón
function Find-Asset($repo, $pattern) {
  $releases = Invoke-RestMethod "https://api.github.com/repos/$repo/releases?per_page=15" -Headers @{ "User-Agent" = "mova-worker" }
  foreach ($release in $releases) {
    $asset = $release.assets | Where-Object { $_.name -like $pattern } | Select-Object -First 1
    if ($asset) { return $asset }
  }
  throw "No se encontró $pattern en $repo"
}

Write-Host "1/4 Descargando whisper.cpp..."
$asset = Find-Asset "ggml-org/whisper.cpp" "whisper-bin-x64.zip"
$zip = Join-Path $env:TEMP "whisper-bin-x64.zip"
$unzipped = Join-Path $env:TEMP "whisper-bin-x64"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip
if (Test-Path $unzipped) { Remove-Item -Recurse -Force $unzipped }
Expand-Archive -Force $zip $unzipped
Get-ChildItem $unzipped -Recurse -Include *.exe, *.dll | Copy-Item -Destination $bin -Force

Write-Host "2/4 Descargando el modelo de Whisper (small, ~190 MB)..."
$model = Join-Path $models "ggml-small-q5_1.bin"
if (-not (Test-Path $model)) {
  Invoke-WebRequest "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin" -OutFile $model
}

Write-Host "3/4 Descargando DeepFilterNet..."
$asset = Find-Asset "Rikorose/DeepFilterNet" "deep-filter-*-x86_64-pc-windows-msvc.exe"
Invoke-WebRequest $asset.browser_download_url -OutFile (Join-Path $bin "deep-filter.exe")

Write-Host "4/4 Instalando dependencias de Node..."
Push-Location $root
npm install
Pop-Location

Write-Host ""
Write-Host "Listo. Siguiente paso: crear el archivo .env (copy .env.example .env) y rellenarlo."

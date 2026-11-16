# Inicia o app Smart Lamp em qualquer PC Windows, mesmo sem Node compatível e sem administrador.
#
#   1. Usa o Node instalado, se a versão for compatível com o Expo SDK 58 (22.13+, 24.3+ ou 26+)
#   2. Senão, baixa o Node LTS portátil do nodejs.org para %LOCALAPPDATA%\smart-lamp-node (só na 1ª vez)
#   3. Instala as dependências (só na 1ª vez) e abre o Expo em modo túnel (funciona no Wi-Fi da faculdade)
#
# Uso: dê dois cliques em iniciar.cmd, ou rode  .\scripts\iniciar.cmd  no terminal.
# Parâmetro opcional: -Modo web       (abre no navegador em vez do QR code)
#                     -Modo simular   (simula a VM e o ESP32 neste PC; ver scripts\simular.cmd)

param([ValidateSet('tunnel', 'lan', 'web', 'simular')][string]$Modo = 'tunnel')

$ErrorActionPreference = 'Stop'
$AppDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'app'
$PortableRoot = Join-Path $env:LOCALAPPDATA 'smart-lamp-node'

function Test-NodeCompativel([string]$versao) {
    if ($versao -notmatch '^v?(\d+)\.(\d+)') { return $false }
    $maior = [int]$Matches[1]; $menor = [int]$Matches[2]
    return ($maior -eq 22 -and $menor -ge 13) -or ($maior -eq 24 -and $menor -ge 3) -or ($maior -ge 26)
}

function Get-NodeInstalado {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $cmd) { return $null }
    $v = (& node -v) 2>$null
    if (Test-NodeCompativel $v) { return $v }
    Write-Host "Node $v encontrado, mas o Expo SDK 58 precisa de 22.13+ / 24.3+ / 26+." -ForegroundColor Yellow
    return $null
}

function Install-NodePortatil {
    $existente = Get-ChildItem $PortableRoot -Directory -Filter 'node-v*-win-x64' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($existente) { return $existente.FullName }

    Write-Host 'Baixando Node.js LTS portátil (só na primeira vez, ~30 MB)...' -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $indice = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
    $lts = $indice | Where-Object { $_.lts -and (Test-NodeCompativel $_.version) -and ($_.files -contains 'win-x64-zip') } |
        Select-Object -First 1
    if (-not $lts) { throw 'Não encontrei uma versão LTS compatível em nodejs.org.' }

    $nome = "node-$($lts.version)-win-x64"
    $zip = Join-Path $env:TEMP "$nome.zip"
    New-Item -ItemType Directory -Force $PortableRoot | Out-Null
    Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/$nome.zip" -OutFile $zip -UseBasicParsing

    # Confere o SHA-256 publicado pelo nodejs.org antes de extrair
    $somas = (Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/SHASUMS256.txt" -UseBasicParsing).Content
    $esperado = ($somas -split "`n" | Where-Object { $_ -match "\s$nome\.zip$" }) -replace '\s.*$', ''
    $obtido = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if (-not $esperado -or $obtido -ne $esperado.Trim().ToLower()) { throw 'Falha na verificação do download do Node.' }

    Expand-Archive $zip -DestinationPath $PortableRoot -Force
    Remove-Item $zip -Force
    Write-Host "Node $($lts.version) instalado em $PortableRoot" -ForegroundColor Green
    return (Join-Path $PortableRoot $nome)
}

$v = Get-NodeInstalado
if (-not $v) {
    $dir = Install-NodePortatil
    $env:Path = "$dir;$env:Path"   # vale só para esta janela; não altera o sistema
    $v = & node -v
}
Write-Host "Usando Node $v" -ForegroundColor Green

# O simulador não tem dependências: não precisa de npm install
if ($Modo -eq 'simular') {
    $servidor = Join-Path (Split-Path -Parent $PSScriptRoot) 'simulador\servidor.mjs'
    Start-Job -ScriptBlock { Start-Sleep -Seconds 2; Start-Process 'http://localhost:1026'; Start-Process 'http://localhost:8080' } | Out-Null
    & node $servidor
    return
}

Set-Location $AppDir
if (-not (Test-Path 'node_modules')) {
    Write-Host 'Instalando dependências (só na primeira vez)...' -ForegroundColor Cyan
    & npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install falhou.' }
}

switch ($Modo) {
    'web'    { & npx expo start --web }
    'lan'    { & npx expo start }
    # "--tunnel ngrok": o túnel padrão do SDK 58 exige login na Expo; o ngrok não.
    default  { & npx expo start --tunnel ngrok }
}

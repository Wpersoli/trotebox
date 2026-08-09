[CmdletBinding()]
param(
  [ValidateSet('docker', 'supabase')]
  [string]$Database = 'docker',
  [string]$DatabaseUrl = '',
  [string]$DirectUrl = '',
  [switch]$SkipInstall,
  [switch]$SkipQuality
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando obrigatório não localizado: $Name"
  }
}

function New-Secret([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
  $content = if (Test-Path $Path) { Get-Content $Path -Raw } else { '' }
  $escapedName = [Regex]::Escape($Name)
  if ($content -match "(?m)^$escapedName=") {
    $content = [Regex]::Replace($content, "(?m)^$escapedName=.*$", "$Name=$Value")
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
    $content += "$Name=$Value`r`n"
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}

function Get-EnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path $Path)) { return '' }
  $escapedName = [Regex]::Escape($Name)
  $match = [Regex]::Match((Get-Content $Path -Raw), "(?m)^$escapedName=(.*)$")
  if ($match.Success) { return $match.Groups[1].Value.Trim() }
  return ''
}

function Ensure-Secret([string]$Path, [string]$Name, [int]$Bytes = 48) {
  $current = Get-EnvValue $Path $Name
  if ([string]::IsNullOrWhiteSpace($current) -or $current -like 'replace-*') {
    Set-EnvValue $Path $Name (New-Secret $Bytes)
  }
}

Require-Command node
Require-Command npm
$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -ne 22) { throw "Use Node.js 22. Versão encontrada: $(node -v)" }

$apiEnv = Join-Path $Root 'apps\api\.env.local'
$webEnv = Join-Path $Root 'apps\web\.env.local'
$dbEnv = Join-Path $Root 'packages\db\.env'

if (-not (Test-Path $apiEnv)) { Copy-Item 'apps\api\.env.example' $apiEnv }
if (-not (Test-Path $webEnv)) { Copy-Item 'apps\web\.env.example' $webEnv }
if (-not (Test-Path $dbEnv)) { Copy-Item 'packages\db\.env.example' $dbEnv }

Ensure-Secret $apiEnv 'JWT_SECRET'
Ensure-Secret $apiEnv 'DATA_ENCRYPTION_KEY'
Ensure-Secret $apiEnv 'HASH_PEPPER'
Ensure-Secret $apiEnv 'AUTH_CODE_PEPPER'
Ensure-Secret $apiEnv 'CRON_SECRET' 32
Set-EnvValue $apiEnv 'ENABLE_DEV_AUTH' 'true'
Set-EnvValue $apiEnv 'AUTH_DELIVERY' 'console'
Set-EnvValue $apiEnv 'TELEPHONY_PROVIDER' 'mock'
Set-EnvValue $apiEnv 'MOCK_CALL_AUTO_COMPLETE' 'true'
Set-EnvValue $apiEnv 'RECORDING_ENABLED' 'false'
Set-EnvValue $webEnv 'NEXT_PUBLIC_PREVIEW_MODE' 'false'
Set-EnvValue $webEnv 'NEXT_PUBLIC_AUTH_MODE' 'dev'
Set-EnvValue $webEnv 'NEXT_PUBLIC_COMMERCE_MODE' 'web'

if ($Database -eq 'docker') {
  Require-Command docker
  docker compose version | Out-Null
  docker compose up -d
  $DatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/trotebox?schema=public'
  $DirectUrl = $DatabaseUrl
} else {
  if ([string]::IsNullOrWhiteSpace($DatabaseUrl) -or [string]::IsNullOrWhiteSpace($DirectUrl)) {
    throw 'Para Supabase, informe -DatabaseUrl e -DirectUrl. Consulte SUPABASE_LOCAL.md.'
  }
}

Set-EnvValue $apiEnv 'DATABASE_URL' $DatabaseUrl
Set-EnvValue $apiEnv 'DIRECT_URL' $DirectUrl
Set-EnvValue $dbEnv 'DATABASE_URL' $DatabaseUrl
Set-EnvValue $dbEnv 'DIRECT_URL' $DirectUrl

if (-not $SkipInstall) { npm install }
npm run db:generate
npm run db:deploy
npm run db:seed
npm run preflight
npm run validate:repo
if (-not $SkipQuality) { npm run quality:full }

Write-Host ''
Write-Host 'SETUP LOCAL APROVADO' -ForegroundColor Green
Write-Host 'Execute: npm run dev'
Write-Host 'Depois, em outro terminal: npm run smoke:local'

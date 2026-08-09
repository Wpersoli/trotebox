[CmdletBinding()]
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
npm run preflight
npm run validate:repo
npm run lint
npm run typecheck
npm run test
if (-not $SkipBuild) { npm run build:all }
Write-Host 'VALIDAÇÃO LOCAL APROVADA' -ForegroundColor Green

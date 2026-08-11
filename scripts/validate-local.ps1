[CmdletBinding()]
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Invoke-Native([string]$Description, [scriptblock]$Command) {
  & $Command
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  if ($code -ne 0) { throw "$Description falhou com exit code $code." }
}

Invoke-Native 'preflight' { npm run preflight }
Invoke-Native 'validate:repo' { npm run validate:repo }
Invoke-Native 'lint' { npm run lint }
Invoke-Native 'typecheck' { npm run typecheck }
Invoke-Native 'test' { npm run test }
if (-not $SkipBuild) { Invoke-Native 'build:all' { npm run build:all } }
Write-Host 'VALIDAÇÃO LOCAL APROVADA' -ForegroundColor Green

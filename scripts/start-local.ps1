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
Invoke-Native 'dev' { npm run dev }

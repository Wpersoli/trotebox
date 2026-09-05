[CmdletBinding()]
param(
  [switch]$SkipAudit,
  [int]$StartupTimeoutSeconds = 90
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Invoke-Native([string]$Description, [scriptblock]$Command) {
  & $Command
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  if ($code -ne 0) { throw "$Description falhou com exit code $code." }
}

function Test-PortOpen([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync('127.0.0.1', $Port)
    if (-not $task.Wait(300)) { return $false }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-Http([string]$Url, [int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $response }
    } catch {
      $lastError = $_.Exception.Message
    }
    Start-Sleep -Seconds 2
  }
  throw "Timeout aguardando $Url. Último erro: $lastError"
}

function Stop-ProcessTreeBestEffort([int]$RootProcessId) {
  try {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $childrenByParent = @{}

    foreach ($process in $processes) {
      $parentId = [int]$process.ParentProcessId
      if (-not $childrenByParent.ContainsKey($parentId)) {
        $childrenByParent[$parentId] = New-Object System.Collections.Generic.List[int]
      }
      $childrenByParent[$parentId].Add([int]$process.ProcessId)
    }

    $stack = New-Object System.Collections.Generic.Stack[int]
    $visited = New-Object 'System.Collections.Generic.HashSet[int]'
    $tree = New-Object System.Collections.Generic.List[int]
    $stack.Push($RootProcessId)

    while ($stack.Count -gt 0) {
      $currentId = $stack.Pop()
      if (-not $visited.Add($currentId)) { continue }
      $tree.Add($currentId)

      if ($childrenByParent.ContainsKey($currentId)) {
        foreach ($childId in $childrenByParent[$currentId]) {
          $stack.Push($childId)
        }
      }
    }

    for ($index = $tree.Count - 1; $index -ge 0; $index--) {
      Stop-Process -Id $tree[$index] -Force -ErrorAction SilentlyContinue
    }
  } catch {
    Write-Warning "Limpeza da árvore de processos encontrou um problema não crítico: $($_.Exception.Message)"
  }

  try {
    Stop-Process -Id $RootProcessId -Force -ErrorAction SilentlyContinue
  } catch {
    Write-Warning "Processo raiz já estava encerrado ou não pôde ser finalizado: $($_.Exception.Message)"
  }

  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    if (-not (Test-PortOpen 3000) -and -not (Test-PortOpen 3001)) {
      Write-Host 'Servidores locais encerrados: OK' -ForegroundColor Green
      return
    }
    Start-Sleep -Milliseconds 500
  }

  Write-Warning 'A acceptance foi aprovada, mas uma das portas 3000/3001 ainda parece ocupada. Feche o processo manualmente antes da próxima execução local.'
}

Write-Host ''
Write-Host '===================================================' -ForegroundColor Cyan
Write-Host ' TROTEBOX - ACCEPTANCE LOCAL 0.3.9' -ForegroundColor Cyan
Write-Host '===================================================' -ForegroundColor Cyan

if ((Test-PortOpen 3000) -or (Test-PortOpen 3001)) {
  throw 'As portas 3000 ou 3001 já estão em uso. Encerre qualquer npm run dev anterior e execute a acceptance novamente.'
}

Invoke-Native 'preflight' { npm run preflight }
Invoke-Native 'quality:full' { npm run quality:full }
if (-not $SkipAudit) { Invoke-Native 'audit de produção' { npm audit --omit=dev } }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $env:TEMP "trotebox-dev-$stamp.out.log"
$stderr = Join-Path $env:TEMP "trotebox-dev-$stamp.err.log"
$devProcess = $null
$acceptanceSucceeded = $false

try {
  Write-Host ''
  Write-Host 'Iniciando Web + API em segundo plano...' -ForegroundColor Yellow
  $devProcess = Start-Process `
    -FilePath 'cmd.exe' `
    -ArgumentList '/d', '/s', '/c', 'npm run dev' `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

  $webResponse = Wait-Http 'http://localhost:3000' $StartupTimeoutSeconds
  if ($webResponse.StatusCode -ne 200) { throw "Web não respondeu HTTP 200: $($webResponse.StatusCode)" }
  $healthResponse = Wait-Http 'http://localhost:3001/api/v1/health' $StartupTimeoutSeconds
  if ($healthResponse.StatusCode -ne 200) { throw "Health não respondeu HTTP 200: $($healthResponse.StatusCode)" }
  $health = $healthResponse.Content | ConvertFrom-Json
  if ($health.status -ne 'ok') { throw "Health da API não retornou status ok: $($healthResponse.Content)" }

  Write-Host 'Web HTTP 200: OK' -ForegroundColor Green
  Write-Host 'API health: OK' -ForegroundColor Green

  Invoke-Native 'smoke:local' { npm run smoke:local }

  Write-Host ''
  Write-Host '===== GIT STATUS =====' -ForegroundColor Yellow
  git status --short

  $acceptanceSucceeded = $true
}
catch {
  Write-Host ''
  Write-Host '===== FALHA NA ACCEPTANCE =====' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if (Test-Path $stdout) {
    Write-Host ''
    Write-Host '===== DEV STDOUT (últimas 80 linhas) =====' -ForegroundColor Yellow
    Get-Content $stdout -Tail 80 -ErrorAction SilentlyContinue
  }
  if (Test-Path $stderr) {
    Write-Host ''
    Write-Host '===== DEV STDERR (últimas 80 linhas) =====' -ForegroundColor Yellow
    Get-Content $stderr -Tail 80 -ErrorAction SilentlyContinue
  }
  throw
}
finally {
  if ($null -ne $devProcess) {
    Stop-ProcessTreeBestEffort $devProcess.Id
  }
}

if ($acceptanceSucceeded) {
  Write-Host ''
  Write-Host '===================================================' -ForegroundColor Green
  Write-Host ' TROTEBOX 0.3.9 - ACCEPTANCE APROVADA' -ForegroundColor Green
  Write-Host '===================================================' -ForegroundColor Green
}

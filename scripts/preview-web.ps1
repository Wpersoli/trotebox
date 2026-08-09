$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
Write-Host 'TroteBox - preview visual local' -ForegroundColor Magenta
Write-Host 'Nenhum Supabase, Docker, Vercel, GitHub ou backend será iniciado.' -ForegroundColor DarkGray
npm run preview:web

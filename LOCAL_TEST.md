# Teste local no Windows PowerShell

## Preview visual — recomendado agora

Não exige Docker, Supabase, Vercel, GitHub ou API.

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm run preview:web
```

Abra `http://127.0.0.1:3000`.

O preview utiliza dados mock para landing, login, dashboard, catálogo, novo trote, histórico, créditos e configurações.

## Stack completa com Docker — opcional

```powershell
cd "C:\Projetos\trote-box"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-local.ps1 -Database docker
.\scripts\start-local.ps1
```

Em outro PowerShell:

```powershell
cd "C:\Projetos\trote-box"
npm run smoke:local
```

## Stack completa com Supabase — opcional

Consulte `SUPABASE_LOCAL.md` e execute `setup-local.ps1 -Database supabase` somente depois de criar o projeto Supabase.

## URLs

- Preview/Web: `http://localhost:3000`
- API completa: `http://localhost:3001/api/v1/health`

## Revalidação completa

```powershell
.\scripts\validate-local.ps1
```

Executa preflight, validação estrutural, ESLint, TypeScript, testes e builds. O preflight valida `next`, `eslint` e `tsc` diretamente e não depende mais do executável nativo do Turborepo.

## Acceptance automatizada com Supabase já configurado

```powershell
cd "C:\Projetos\trote-box"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\acceptance-local.ps1
```

O script executa qualidade completa, audit, sobe Web/API temporariamente, roda o smoke funcional e encerra os processos.

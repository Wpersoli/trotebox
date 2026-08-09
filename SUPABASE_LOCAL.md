# Supabase no desenvolvimento local

**Não é necessário para visualizar o TroteBox.** Use este procedimento somente quando for ativar a stack real.

O Prisma utiliza duas conexões:

- `DATABASE_URL`: Supavisor/transaction pooler (porta 6543), apropriado ao runtime serverless;
- `DIRECT_URL`: conexão direta ou session pooler (porta 5432), usada por migrations.

## Configuração

```powershell
cd "C:\Projetos\trote-box"
Set-ExecutionPolicy -Scope Process Bypass -Force

$DatabaseUrl = Read-Host "Cole a URL Transaction Pooler porta 6543"
$DirectUrl = Read-Host "Cole a URL Session Pooler porta 5432"

$DatabaseUrl.StartsWith("postgresql://")
$DirectUrl.StartsWith("postgresql://")

& ".\scripts\setup-local.ps1" -Database supabase -DatabaseUrl $DatabaseUrl -DirectUrl $DirectUrl -SkipInstall

Remove-Variable DatabaseUrl, DirectUrl
```

Nunca envie essas URLs ao GitHub e nunca coloque credenciais de banco em `NEXT_PUBLIC_*`.

## Produção

- use projeto/organização comercial separados;
- desative `ENABLE_DEV_AUTH` e `NEXT_PUBLIC_ENABLE_DEV_LOGIN`;
- gere segredos novos para produção;
- use migrations controladas;
- mantenha `service_role` fora do frontend.

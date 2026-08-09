# TroteBox 0.3.4 — notas da revisão Windows

Esta revisão responde diretamente à validação executada em `C:\Projetos\trote-box`.

## Corrigido

- crash do executável `turbo.exe` no Windows (`-1073741515` / `0xC0000135`);
- warnings `@next/next/no-img-element` no dashboard e login;
- falsos avisos de Pages Router nos pacotes `contracts` e `db`;
- preflight dependente de Turbo;
- CI agora usa a validação completa sem depender de Turbo.

## Novos comandos

```powershell
npm run quality       # antes do Git, sem Supabase
npm run quality:full  # stack configurada / CI
```

`quality` é o gate recomendado para o primeiro push.

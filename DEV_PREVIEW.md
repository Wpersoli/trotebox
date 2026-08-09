# Preview local — TroteBox

Use:

```powershell
cd "C:\Projetos\trote-box"
npm run preview:web
```

Abra `http://127.0.0.1:3000` e mantenha o terminal aberto.

## Console em desenvolvimento

O Next.js injeta ferramentas exclusivas do modo `next dev`, incluindo Hot Module Replacement (HMR) via WebSocket e fontes internas do painel de desenvolvimento (`/__nextjs_font/geist-latin.woff2`). Esses recursos não fazem parte do bundle estático de produção.

A configuração inclui `allowedDevOrigins` para `localhost` e `127.0.0.1`. Se o Chrome ainda bloquear o WebSocket local, confira a permissão do site para acesso a dispositivos/rede local e permita para o endereço de desenvolvimento.

## Produção

A aplicação usa `output: export`; HMR, React DevTools overlay e `__nextjs_font` não fazem parte do artefato exportado para produção/Capacitor.

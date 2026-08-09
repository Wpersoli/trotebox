# TroteBox 0.3.5

Correção de typecheck da API identificada durante `npm run quality` no Windows.

Principais correções:
- aliases `@/server/*`;
- Prisma + `exactOptionalPropertyTypes`;
- cron `CallStatus`;
- Twilio sem propriedades opcionais `undefined`;
- Vonage conforme os tipos do SDK;
- callback Vonage compatível com GET e POST.

Execute `npm install` e `npm run quality` em uma extração limpa antes do primeiro push.

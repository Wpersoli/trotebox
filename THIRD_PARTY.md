# Dependências de terceiros

Este repositório contém código original do produto e referencia bibliotecas de terceiros por meio do `package.json`. Cada dependência conserva sua própria licença e seus termos.

Principais componentes:

- Next.js e React — frontend e API;
- Capacitor — wrappers Android/iOS;
- Prisma — ORM e migrações;
- Zod — contratos e validação;
- Twilio SDK — telefonia programável;
- Vonage Voice API — integração HTTPS direta; autenticação JWT usa `jose`;
- Stripe SDK — checkout e webhooks;
- jose — JWT;
- Vitest, TypeScript e ESLint — testes, tipagem e qualidade. Os workspaces são orquestrados diretamente pelo npm para evitar dependência de binários adicionais no Windows.

Consulte também `DEPENDENCY_MANIFEST.csv` e `DEPENDENCY_POLICY.md`.

Antes da distribuição:

1. execute uma ferramenta de inventário/SBOM e licença com o lockfile definitivo;
2. preserve avisos exigidos pelas licenças aplicáveis;
3. verifique incompatibilidades com a licença comercial escolhida;
4. não reutilize marcas, exemplos, vozes, roteiros ou assets dos fornecedores como identidade do produto.

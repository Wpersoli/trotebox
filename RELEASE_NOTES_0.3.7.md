# TroteBox 0.3.7 — HOME passwordless + hardening financeiro

## Escopo

Versão de endurecimento da jornada pública e financeira, preservando a arquitetura Vercel + GitHub + Supabase/Prisma e as áreas autenticadas existentes.

## Alterações aprovadas

- HOME unificada conforme referência visual: hero/explicação e acesso no mesmo layout;
- `/login` deixa de possuir formulário próprio e redireciona para `/#acesso`;
- campo **Nome** removido do login;
- acesso por e-mail + OTP de seis dígitos, com código anterior invalidado no reenvio;
- cooldown de 60 segundos e rate limits adicionais por e-mail/IP;
- sessão revogável no servidor (`Session` + `sid` no JWT);
- logout revoga a sessão no banco;
- Pix Mercado Pago usa obrigatoriamente o e-mail do usuário autenticado;
- CPF/CNPJ removido do payload do Pix nesta jornada para minimizar tratamento de dados pessoais;
- consulta autenticada de status do Mercado Pago para recuperar atraso/perda de webhook durante a jornada;
- cron também tenta reconciliar pagamentos Mercado Pago pendentes;
- constraints SQL para sinais do ledger, reservas e valores positivos;
- proxy da API rejeita origem web não autorizada em requisições mutáveis;
- respostas 5xx não expõem payload bruto de provedores/infraestrutura em produção;
- conciliação Mercado Pago valida referência interna e identificador do provedor;
- fluxo público de carteira expõe Pix/Mercado Pago; adaptador Stripe permanece preservado no backend;
- documentação/OpenAPI/testes atualizados para 0.3.7.

## Migração obrigatória

Antes de publicar a API que exige sessões revogáveis, execute:

```powershell
npm run db:generate
npm run db:deploy
```

Isso aplica `20260815213000_revocable_sessions` no Supabase/PostgreSQL.

## Segurança de distribuição

O pacote entregue ao usuário final/repositório não deve conter `.env`, `.env.local`, `packages/db/.env`, `.git`, `node_modules`, `.next`, `out`, logs ou `*.tsbuildinfo`.

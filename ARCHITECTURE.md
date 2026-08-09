# Arquitetura

## Decisões

### 1. Web e mobile compartilham o mesmo frontend

`apps/web` utiliza Next.js App Router com `output: "export"`. O resultado estático em `out/` pode ser servido pela Vercel, CDN ou incorporado pelo Capacitor. Todas as operações sensíveis chamam `apps/api` por HTTPS.

### 2. Backend modular em um único projeto

A primeira versão usa monólito modular serverless. Os domínios `auth`, `wallet`, `payments`, `calls`, `telephony`, `webhooks`, `policy` e `audit` são separados por módulos, mas implantados juntos. Telefonia e pagamentos usam interfaces para permitir troca de fornecedor.

### 3. PostgreSQL é a fonte de verdade

Saldo, reservas, pagamentos, chamadas e webhooks são persistidos no PostgreSQL. Redis pode ser adicionado mais tarde para filas e rate limit de alto volume; não é necessário para o MVP.

### 4. Consistência financeira

Toda alteração de créditos ocorre dentro de uma transação e produz um lançamento imutável. `WalletAccount.balanceCredits` e `reservedCredits` são projeções transacionais para consulta rápida.

## Componentes

```text
Next.js Web/Capacitor
        |
        | HTTPS + JWT
        v
Next.js API (Node runtime)
  |         |          |
  |         |          +--> Stripe / Mercado Pago
  |         +-------------> Twilio / Vonage
  +-----------------------> PostgreSQL
```

## Estado de chamada

`VALIDATING -> CREDIT_RESERVED -> QUEUED -> DIALING -> ANSWERED -> COMPLETED`

Estados terminais alternativos: `FAILED`, `CANCELED`, `REFUNDED`, `EXPIRED`.

## Evolução recomendada

- fase 1: monólito modular, provedor mock, catálogo e carteira;
- fase 2: Twilio em sandbox, Stripe e Mercado Pago em teste;
- fase 3: fila dedicada para chamadas, armazenamento de gravações e push;
- fase 4: segundo provedor de telefonia e roteamento por custo/país;
- fase 5: painel administrativo independente, antifraude avançado e data warehouse.

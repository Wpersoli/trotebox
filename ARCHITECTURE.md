# Arquitetura

## Decisões

### 1. Web e mobile compartilham o mesmo frontend

`apps/web` utiliza Next.js App Router com `output: "export"`. O resultado estático em `out/` pode ser servido pela Vercel, CDN ou incorporado pelo Capacitor.

Na Vercel, o Web usa `/api/v1/*` no próprio host e um rewrite externo encaminha as requisições para o projeto `apps/api`. Isso permite manter sessão web `HttpOnly; SameSite=Lax` sem depender de cookie cross-site entre dois domínios `*.vercel.app`. Clientes nativos continuam podendo acessar a API diretamente e recebem token somente quando identificados como `native`.

### 2. Backend modular em um único projeto

A primeira versão usa monólito modular serverless. Os domínios `auth`, `wallet`, `payments`, `calls`, `telephony`, `webhooks`, `policy` e `audit` são separados por módulos, mas implantados juntos. Telefonia, pagamentos e entrega transacional de e-mail são encapsulados no backend para permitir troca controlada de fornecedor.

### 3. PostgreSQL é a fonte de verdade

Saldo, reservas, pagamentos, chamadas e webhooks são persistidos no PostgreSQL. Redis pode ser adicionado mais tarde para filas e rate limit de alto volume; não é necessário para o MVP.

### 4. Consistência financeira

Toda alteração de créditos ocorre dentro de uma transação e produz um lançamento imutável. `WalletAccount.balanceCredits` e `reservedCredits` são projeções transacionais para consulta rápida.

### 5. OTP e entrega de e-mail são responsabilidades separadas

Geração, hash, expiração, tentativas e consumo do OTP pertencem ao domínio de autenticação. O transporte de e-mail fica em módulo separado e, na 0.3.8, usa a API transacional Brevo. A chave da Brevo existe somente no backend.

## Componentes

```text
Browser
  |
  | HTTPS /api/v1 (same-origin)
  v
Vercel Web reverse proxy ----------------------+
                                                |
                                                v
                                      Next.js API (Node runtime)
                                       |      |       |       |
                                       |      |       |       +--> Brevo (OTP)
                                       |      |       +----------> Stripe / Mercado Pago
                                       |      +------------------> Twilio / Vonage
                                       +-------------------------> PostgreSQL/Supabase

Capacitor/native -------------------------------> API direta + token nativo
```

## Estado de chamada

`VALIDATING -> CREDIT_RESERVED -> QUEUED -> DIALING -> ANSWERED -> COMPLETED`

Estados terminais alternativos: `FAILED`, `CANCELED`, `REFUNDED`, `EXPIRED`.

## Evolução recomendada

- fase 1: monólito modular, provedor mock, catálogo e carteira;
- fase 2: OTP transacional, Twilio em sandbox, Mercado Pago/Stripe em teste;
- fase 3: domínio próprio autenticado (DKIM/DMARC), fila dedicada para chamadas, armazenamento de gravações e push;
- fase 4: segundo provedor de telefonia e roteamento por custo/país;
- fase 5: painel administrativo independente, antifraude avançado e data warehouse.

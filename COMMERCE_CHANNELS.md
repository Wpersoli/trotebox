# Canais de cobrança

## Web e PWA

Use:

```text
NEXT_PUBLIC_COMMERCE_MODE=web
```

Nesse modo, a interface pública oferece **Pix via Mercado Pago**, sempre vinculado ao e-mail autenticado. A confirmação ocorre no backend por webhook assinado e também pode ser reconciliada por consulta server-to-server. O adaptador Stripe permanece no código apenas para compatibilidade/expansão futura e não é exposto na carteira desta versão.

## Compilações de loja iOS/Android

Use inicialmente:

```text
NEXT_PUBLIC_COMMERCE_MODE=store
```

Esse modo remove os botões externos até a integração do canal compatível com a loja. Créditos usados dentro do aplicativo são bens digitais; as regras atuais da Apple e do Google exigem integração e apresentação específicas, com alternativas dependentes de país, programa e elegibilidade.

Para publicação comercial:

- iOS: integrar StoreKit/App Store Server API e notificações; no Brasil, avaliar as opções externas vigentes sem omitir a opção Apple quando ela for obrigatória;
- Android Google Play: integrar Play Billing e backend de validação, ou aderir formalmente a programa elegível de cobrança alternativa;
- APK distribuído fora da Play Store e PWA: Pix/Mercado Pago (e outros adaptadores habilitados futuramente) podem ser mantidos, sujeito a contratos, legislação e regras do canal;
- todos os canais alimentam o mesmo `Payment` e o mesmo ledger, com uma referência única por transação.

Não altere apenas a interface para contornar política de loja. A conformidade inclui cadastro no programa, APIs, telas obrigatórias, relatórios de transação, taxas e validação server-side.

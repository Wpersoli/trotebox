# Identidade TroteBox

A versão 0.3.5 consolida **TroteBox** como a identidade utilizada pelo projeto.

## Identidade visual

Slogan:

> **Riso na linha. Surpresa na caixa.**

Paleta principal:

| Papel | Cor |
|---|---|
| Tinta/texto | `#18173F` |
| Roxo profundo | `#2C0B78` |
| Roxo | `#4B18B8` |
| Roxo principal | `#5B21C7` |
| Violeta | `#7B4CF0` |
| Lilás | `#B65FFB` |
| Coral | `#FD463D` |
| Laranja | `#FE5C22` |
| Amarelo | `#FFC928` |
| Verde | `#54B95F` |
| Fundo principal | `#FFFFFF` |
| Fundo alternativo | `#F7F7FB` |

## Assets

Em `apps/web/public/brand/`:

- `logo-wordmark.png` — wordmark horizontal;
- `mascot-hero.png` — mascote independente para layout responsivo;
- `lockup-full.png` — composição integral;
- `app-icon-512.png` — ícone mestre;
- `icon-16/32/48/64/180/192/256.png` — ícones derivados;
- `apple-touch-icon.png` — iOS/PWA;
- `trotebox-brand-source.png` — arte-base preservada no projeto.

Separar wordmark e mascote permite reorganizar o hero em desktop, tablet e celular sem reduzir uma arte horizontal inteira.

## Identificadores técnicos

- npm: `@trotebox/*`;
- app Capacitor provisório: `br.com.seudominio.trotebox`;
- issuer JWT: `trotebox-api`;
- audience JWT: `trotebox-clients`;
- cookie web: `trotebox_session`.

Antes da publicação comercial definitiva, substitua `br.com.seudominio.trotebox` pelo bundle/application ID pertencente ao domínio oficial e faça pesquisa formal de disponibilidade da marca/domínio.

# Validação no Windows — TroteBox 0.3.6

A versão 0.3.6 não depende do executável nativo do Turborepo. O código `-1073741515` (`0xC0000135`) observado no Windows indicava falha de carregamento de uma dependência nativa do `turbo.exe`; a orquestração foi removida para evitar esse ponto único de falha.

## Antes do primeiro push

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm run quality
```

`quality` executa, em ordem:

1. validação estrutural do repositório;
2. testes das regras telefônicas;
3. ESLint de todos os workspaces;
4. typecheck de todos os workspaces;
5. testes Vitest de todos os workspaces;
6. build real do frontend Next.js.

Isso não exige Supabase. Quando banco e API estiverem configurados, execute:

```powershell
npm run quality:full
```

## Se existir uma instalação anterior

Após substituir uma versão antiga, use sempre o lockfile versionado. Para reconstruir os workspaces e dependências de forma limpa:

```powershell
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm ci
```

Não apague `package-lock.json`: ele é parte do baseline reproduzível. O `preflight` também valida se os links `@trotebox/*` foram recriados corretamente.

# Primeiro commit — TroteBox

Destino confirmado:

```text
Pasta local: C:\Projetos\trote-box
GitHub:      https://github.com/Wpersoli/trotebox.git
Branch:      main
```

## 1. Instalar e visualizar antes do commit

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm run preview:web
```

Confira `http://127.0.0.1:3000` e encerre com `Ctrl+C`.

O `package-lock.json` já faz parte do repositório; `npm ci` instala exatamente esse baseline sem reescrever o lockfile.

## 2. Validação obrigatória antes do commit

```powershell
npm run quality
```

Na versão 0.3.6 esse comando não exige Supabase: executa validação estrutural, testes de domínio, lint dos quatro workspaces, typecheck, testes e o build real do frontend. Só prossiga para o Git se terminar sem `npm error`.

## 3. Inicializar e conectar ao GitHub

```powershell
cd "C:\Projetos\trote-box"

git init
git branch -M main

git remote remove origin 2>$null
git remote add origin https://github.com/Wpersoli/trotebox.git

git status --short
git remote -v

git add -A
git diff --cached --stat

git commit -m "feat: inicia plataforma autoral TroteBox"
git push -u origin main
```

## 4. Conferência

```powershell
git status
git log -3 --oneline
git remote -v
```

Para recuperação do projeto existente, preserve o repositório Git e mantenha `.env*` reais fora do commit.

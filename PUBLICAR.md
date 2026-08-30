# Pôr The Creator Works no ar

O repositório já está em `github.com/catiacreator/the-creator-works` (privado).
Falta o que só tu podes fazer: a conta, as chaves e o domínio.

## 1. Criar o projeto na Vercel — 5 minutos

1. Vai a **vercel.com** e entra com o GitHub (o mesmo `catiacreator`).
2. **Add New… → Project** e escolhe `the-creator-works`.
3. Não mexas em nada nas definições de build — a Vercel reconhece o Next.js sozinha.
4. Antes de carregar em **Deploy**, abre **Environment Variables** e cola estas.
   Os valores estão todos no teu `.env.local`, nesta pasta:

   Obrigatórias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TOKEN_ENCRYPTION_KEY`
   - `ANTHROPIC_API_KEY`
   - `AI_PROVIDER` → `claude`
   - `NEXT_PUBLIC_APP_URL` → `https://thecreatorworks.com`

   Só se as usares:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (Drive)
   - `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI` (Canva)
   - `JOBS_RUN_SECRET`

   **Não leves** o `DEV_LOGIN_EMAIL` nem o `DEV_LOGIN_PASSWORD`: a entrada sem
   palavra-passe só existe em desenvolvimento e está desligada em produção.

5. **Deploy**. Ao fim de dois minutos tens um endereço `…vercel.app`.

## 2. Dizer ao Supabase que a app mudou de casa

No painel do Supabase, projeto `catiacreator's Project`:

**Authentication → URL Configuration**
- *Site URL*: `https://thecreatorworks.com`
- *Redirect URLs*: acrescenta `https://thecreatorworks.com/auth/callback`
  (e o endereço `…vercel.app/auth/callback`, para poderes testar antes do domínio)

Sem isto o link de entrada por email leva-te ao sítio errado.

## 3. Apontar o domínio

Na Vercel: **Project → Settings → Domains → Add** → `thecreatorworks.com`.
A Vercel mostra dois registos para criares no Hostinger, em
**Domínios → thecreatorworks.com → DNS**:

- um registo **A** para `@`, com o endereço IP que a Vercel te der
- um registo **CNAME** para `www`, com o destino que a Vercel te der

Usa os valores que a Vercel mostrar nesse momento — são eles que mandam.
O DNS costuma demorar entre dez minutos e algumas horas a espalhar-se.

## 4. Depois de estar no ar

- Entra em `thecreatorworks.com`, pede o link por email e confirma que entras.
- Faz um carrossel de ponta a ponta: Carrosséis Creator → estilo → descarregar.
- Vê a Última hora: é a parte que demora mais (a busca leva 40 a 60 segundos).
  Se der erro de tempo esgotado, é o limite do plano da Vercel — diz-me e eu
  parto a busca em pedaços mais pequenos.

## O que fica a saber-se

- **A app é privada por natureza**: quem lá chegar sem conta vê o ecrã de entrada.
- **As chaves nunca entram no repositório** — só nas variáveis da Vercel.
- **Cada vez que mudarmos alguma coisa**, basta um `git push` e a Vercel
  republica sozinha.

# Um só domínio: CarouselSnap e Creator Works em `carouselsnap.app`

As duas apps continuam a ser dois projetos — o CarouselSnap no Lovable, o
Creator Works aqui, na Vercel — mas passam a viver no mesmo endereço:

| O que | Onde |
|---|---|
| CarouselSnap (página de vendas, `/main`, `/renew`, …) | `https://carouselsnap.app/…` |
| Creator Works | `https://carouselsnap.app/creator-works/…` |

Quem entra no Creator Works pelo botão do CarouselSnap nem repara que mudou de
app: o domínio é o mesmo, só o caminho muda.

---

## Como funciona

O Lovable não sabe reencaminhar pedidos para outro servidor. Por isso quem
responde pelo domínio é **este Next, na Vercel**:

```
browser ──► carouselsnap.app (Vercel, este projeto)
              │
              ├── /creator-works/…   → serve a app daqui
              │
              └── tudo o resto       → vai buscar ao Lovable e devolve
                                       (CAROUSELSNAP_ORIGEM)
```

Três peças, todas em `next.config.mjs`:

1. **`basePath: '/creator-works'`** — a app inteira muda-se para debaixo do
   prefixo: páginas, `/api`, ficheiros de `public/`. Os `<Link>` e o
   `router.push` ganham o prefixo sozinhos; o que fala com o browser à mão
   (`fetch('/api/…')`, `window.location.href`, `<a href>`, `<img src>`) passa
   por `comBase()`, em `src/lib/caminho.ts`.
2. **`rewrites.fallback`** — o que não é desta app é pedido a
   `CAROUSELSNAP_ORIGEM` e devolvido tal e qual. É o CarouselSnap a aparecer
   no domínio sem sair do Lovable.
3. **`redirects`** — quem ainda chegar por `thecreatorworks.com` é mandado
   para o endereço novo, com o caminho que trazia.

O CarouselSnap não muda de sítio: continua publicado no Lovable, com o
endereço `*.lovable.app` de sempre. O que muda é para onde aponta o DNS de
`carouselsnap.app`.

---

## O que só tu podes fazer

Pela ordem. Nada disto está no código.

### 1. Saber o endereço do Lovable

No Lovable, projeto CarouselSnap → **Publish** → o endereço `…lovable.app`
(não o `id-preview…`). É esse que vai para `CAROUSELSNAP_ORIGEM`.

### 2. Variáveis na Vercel (projeto `the-creator-works`)

**Settings → Environment Variables**, marcadas em *Production* **e**
*Preview*:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://carouselsnap.app/creator-works` |
| `CAROUSELSNAP_ORIGEM` | o endereço do passo 1, ex. `https://carouselsnap.lovable.app` |
| `CAROUSELSNAP_URL` | **Apaga-a**, se lá estiver. Sem ela, «Voltar ao CarouselSnap» e «Assinar» apontam ao CarouselSnap deste mesmo domínio (`/main` e `/`), o que serve tanto em produção como nas pré-visualizações. |
| `GOOGLE_REDIRECT_URI` | `https://carouselsnap.app/creator-works/api/google/oauth/callback` (se usares o Drive) |
| `CANVA_REDIRECT_URI` | `https://carouselsnap.app/creator-works/api/canva/oauth/callback` (se usares o Canva) |

Depois **Redeploy**: as variáveis `NEXT_PUBLIC_*` entram no build, não chegam
com um restart.

### 3. O domínio

Na Vercel, **Settings → Domains → Add** → `carouselsnap.app` (e `www`, se o
usares). A Vercel dá-te os registos DNS. No Hostinger (ou onde estiver o
domínio), aponta o `A` de `@` e o `CNAME` de `www` para o que a Vercel
mostrar.

No Lovable, em **Project → Settings → Domains**, o domínio `carouselsnap.app`
pode ficar ou sair — quem manda é o DNS, e o DNS passa a apontar para a
Vercel. Remover evita confusão.

Mantém o `thecreatorworks.com` ligado a este projeto na Vercel: é isso que
faz os links antigos redirecionarem.

### 4. Supabase do Creator Works

**Authentication → URL Configuration**:

- *Site URL*: `https://carouselsnap.app/creator-works`
- *Redirect URLs*: acrescenta `https://carouselsnap.app/creator-works/auth/callback`
  (o antigo pode ficar até teres a certeza de que tudo funciona)

### 5. Serviços que batem à porta desta app

Onde tiveres o endereço antigo, troca-o:

| Serviço | Onde | Novo endereço |
|---|---|---|
| Hotmart | Ferramentas → Webhook | `https://carouselsnap.app/creator-works/api/webhooks/hotmart` |
| Stripe | Developers → Webhooks | `https://carouselsnap.app/creator-works/api/webhooks/stripe` |
| Google Cloud | OAuth client → Redirect URIs | `https://carouselsnap.app/creator-works/api/google/oauth/callback` |
| Canva | Integration → Redirect URL | `https://carouselsnap.app/creator-works/api/canva/oauth/callback` |

O cron da Vercel (`vercel.json`) já aponta a `/creator-works/api/jobs/run`.

### 6. O CarouselSnap

Depois de fazeres **Merge** do pull request do repositório `carouselsnap`, o
botão «The Creator Works» passa a abrir
`https://carouselsnap.app/creator-works/entrar?t=BILHETE`. A edge function
`passagem` não muda: o bilhete é o mesmo, só o destino é outro.

---

## Como se confirma

1. `https://carouselsnap.app/` → a página de vendas do CarouselSnap.
2. `https://carouselsnap.app/main` → o CarouselSnap, com sessão.
3. `https://carouselsnap.app/creator-works/login` → o Creator Works.
4. Botão «The Creator Works» no CarouselSnap → entra no Creator Works sem
   pedir nada; a barra do browser fica em `carouselsnap.app/creator-works/…`.
5. `https://thecreatorworks.com/criar` → redireciona para
   `https://carouselsnap.app/creator-works/criar`.
6. No Creator Works, Admin → «A entrada pelo CarouselSnap» → tudo verde.

---

## No computador

Localmente a app abre em `http://localhost:3000/creator-works`. O `/` sem
prefixo dá 404 — é esperado: sem `CAROUSELSNAP_ORIGEM` não há CarouselSnap
para mostrar. Se quiseres ver as duas juntas no computador, põe
`CAROUSELSNAP_ORIGEM` no `.env.local` a apontar ao endereço do Lovable.

---

## Se for preciso voltar atrás

Aponta o DNS de `carouselsnap.app` outra vez para o Lovable e o de
`thecreatorworks.com` continua na Vercel. A app volta a responder em
`thecreatorworks.com/creator-works/…`; para tirar o prefixo, é o `basePath`
em `next.config.mjs` e o `CREATOR_WORKS_PATH` em `src/lib/creatorWorks.ts`
do CarouselSnap.

# The Creator Works

Fábrica de carrosséis de Instagram em massa: pega em PDFs, Docs, ficheiros do
Drive ou temas escritos à mão, reparte o texto pelos slides (ou reescreve-o com
IA, se quiseres), compõe tudo no teu template com uma fotografia tua e devolve
PNGs 1080×1350 prontos a publicar.

---

## O que faz

| Área | O que é |
|---|---|
| **Fontes** | Carregas PDF/DOCX/TXT, importas do Google Drive ou colas texto. A app extrai o texto e guarda-o como matéria-prima. |
| **Templates** | Reproduzes aqui o teu template do Canva: o fundo exportado sem texto + as caixas onde o texto entra. Pré-visualização ao vivo. |
| **Fotografias** | Biblioteca de fotos. Carregas as tuas — a app não gera imagens. |
| **Gerar em massa** | Escolhes fontes e/ou temas, quantidade e template → a app cria N carrosséis numa fila. |
| **Carrosséis** | Lista, edição slide a slide, troca de fotografia, download em `.zip` com os PNGs e a legenda. |
| **Chat** | Conversa ligada à tua chave da OpenAI, para pensar temas e afinar ganchos. |
| **Definições** | Chave da OpenAI (cifrada), modelo de texto, voz da marca, ligações Canva e Drive. |

---

## ⚠️ Sobre o Canva

A app tem **dois motores** para compor os slides, à escolha em *Definições*:

**1. Motor local (por defeito).** A app compõe os PNGs a partir do teu
`TemplateSpec`: fundo, fotografia, véu, caixas de texto, numeração. Funciona sem
Canva nenhum e é o caminho recomendado.

**2. Canva Connect (autofill + export).** Está todo implementado
(`src/lib/canva.ts`), mas as APIs de *Brand Templates* e *Autofill* exigem que a
integração atue em nome de um utilizador de uma organização **Canva
Enterprise** — está escrito na documentação oficial deles. Com Free, Pro ou
Teams os endpoints devolvem `permission_denied`. Se um dia tiveres Enterprise, é
só ligar o Canva em Definições, associar o Brand Template e mudar o motor.

### Como fazer o motor local sair igual ao teu Canva

1. No Canva, abre o template e **apaga (ou esconde) todo o texto**.
2. Exporta como PNG 1080×1350. Se quiseres ver a fotografia por baixo do
   grafismo, exporta com fundo transparente.
3. Em *Templates*, cria um template novo e carrega esse PNG como fundo.
4. Põe as fontes do template na pasta `fonts/` (ver `fonts/README.md`).
5. Ajusta as caixas de texto (X, Y, largura, altura, tamanho, cor) até a
   pré-visualização ficar igual ao teu desenho. Guarda.

---

## Instalação

```bash
npm install
cp .env.example .env.local   # e preenche
npm run dev
```

Enquanto faltarem variáveis obrigatórias, a app não rebenta: abre
`http://localhost:3000/configurar`, que mostra o que já está preenchido, o que
falta e os passos do Supabase. Assim que o `.env.local` ficar completo, essa
página desaparece do caminho e o `/` volta a levar-te à app.

### 1. Supabase

1. Cria um projeto em https://supabase.com
2. SQL Editor → cola e corre `supabase/schema.sql`
3. Authentication → Providers → Email → ativa **Magic Link**
4. Authentication → URL Configuration → acrescenta
   `http://localhost:3000/auth/callback` e o mesmo no domínio de produção
5. Copia URL, anon key e service-role key para o `.env.local`

### 2. Chave de cifra

```bash
openssl rand -base64 32
```

Põe o resultado em `TOKEN_ENCRYPTION_KEY`. É com isto que os tokens de OAuth e a
chave da OpenAI ficam cifrados na base de dados.

### 3. OpenAI

Podes pôr a chave em `OPENAI_API_KEY` ou — melhor — colá-la em *Definições*
dentro da app, onde fica cifrada.

Modelo por defeito: `gpt-5` para texto. Muda-se em Definições sem tocar no
código. Imagens não se geram — carregas as tuas em *Fotografias*.

### 4. Google Drive (opcional)

1. https://console.cloud.google.com → novo projeto
2. APIs & Services → ativa a **Google Drive API**
3. Credentials → OAuth client ID → Web application
4. Redirect URI: `http://localhost:3000/api/google/oauth/callback`
5. Client ID e secret para o `.env.local`

### 5. Canva (opcional, precisa de Enterprise)

1. https://www.canva.com/developers/ → Integrations → nova integração
2. Scopes: `design:content:read`, `design:content:write`, `design:meta:read`,
   `brandtemplate:meta:read`, `brandtemplate:content:read`, `asset:read`,
   `asset:write`, `profile:read`
3. Redirect URL: `http://localhost:3000/api/canva/oauth/callback`

---

## A fila

A geração corre em segundo plano, dois passos por carrossel:

```
write  →  render (ou canva)
```

O `write` tem dois modos: **partir o teu texto** (sem IA, sem custos) ou
**escrever com a OpenAI**. Escolhes em *Gerar em massa*. Sem chave configurada,
usa sempre o primeiro.

Duas coisas puxam a fila:

- **A app**, enquanto a tiveres aberta (`src/components/job-runner.tsx`).
- **O cron da Vercel**, definido em `vercel.json`, de 5 em 5 minutos. Precisa de
  `JOBS_RUN_SECRET` definido no ambiente — a Vercel envia-o no header
  `Authorization`.

Um trabalho que falhe tenta 3 vezes; à terceira o carrossel fica com estado
`failed` e a mensagem de erro aparece na página dele.

---

## Deploy na Vercel

```bash
vercel
```

Depois, em *Project Settings → Environment Variables*, mete tudo o que está no
`.env.example` (com `NEXT_PUBLIC_APP_URL` e os redirect URIs no domínio real).

Nota: `@resvg/resvg-js` e `sharp` são binários nativos — a Vercel resolve-os
sozinha no runtime Node. Se usares outro alojamento, garante que o build corre
em Linux x64.

---

## Estrutura

```
src/
  app/
    (app)/            páginas com sessão iniciada
    api/              rotas de API
    login/            entrada por link mágico
  components/         nav, cartões, fila
  lib/
    canva.ts          Canva Connect (OAuth, autofill, export)
    google.ts         Google Drive
    openai.ts         escrita dos carrosséis com a OpenAI
    split.ts          divisor de texto — o modo sem IA
    render.ts         motor local (satori + resvg)
    default-spec.ts   template inicial
    pipeline.ts       os dois passos da fábrica
    extract.ts        PDF / DOCX / TXT → texto
    crypto.ts         cifra dos segredos
supabase/schema.sql   tabelas, RLS e bucket
fonts/                as fontes do teu template
```

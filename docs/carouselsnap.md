# Ligar o Creator Works ao CarouselSnap

O que é preciso fazer, dos dois lados, para que só entre aqui quem tem
subscrição no CarouselSnap.

> **As duas apps vivem agora no mesmo domínio.** O Creator Works responde em
> `https://carouselsnap.app/creator-works/…` e não em `thecreatorworks.com`.
> Onde este documento diz `https://thecreatorworks.com/entrar`, lê-se
> `https://carouselsnap.app/creator-works/entrar`. Como isso se monta está em
> `docs/um-so-dominio.md`.

---

## O que já está feito deste lado

- `/entrar` — a porta. Recebe um bilhete assinado, confere-o, dá o lugar,
  empurra o prazo sete dias e abre a sessão.
- `/assinar` — deixou de vender; diz onde é a entrada.
- `/renovar` — manda ao CarouselSnap em vez do Stripe.
- Os códigos de sistema deixaram de valer escritos à mão em `/acesso`.

Nada disto funciona enquanto as duas coisas abaixo não estiverem postas.

---

## 1. O que tens de pôr na Vercel

Em **Settings → Environment Variables**, no projeto `the-creator-works`:

| Nome | O que é |
|---|---|
| `PASSAGEM_SEGREDO` | O segredo partilhado. Inventa uma linha comprida e aleatória — 40 caracteres ou mais. Tem de ser **exatamente a mesma** nas duas apps. |
| `CAROUSELSNAP_URL` | Já não existe: as duas apps vivem no mesmo domínio, a porta da rua é a raiz (`/`) e o botão de voltar o `/main`. |
| `SUPABASE_SERVICE_ROLE_KEY` | A chave *service_role* do Supabase, se ainda lá não estiver. É ela que deixa abrir a sessão sem email. |

Para inventar o segredo, num terminal:

```
openssl rand -hex 32
```

> **Não mo mandes a mim nem a ninguém.** Escreve-o direto no painel da Vercel
> e no do Lovable. Eu não preciso dele para nada.

---

## 2. O que tens de correr no Supabase

No **SQL Editor** do projeto do Creator Works, o conteúdo de:

```
supabase/migrations/024_carouselsnap.sql
```

E o `026_identidade.sql`, que é o que faz a pessoa ser identificada pelo id
e não pelo email.

E, se ainda não correste, também o `022_consumos.sql`, o `023_stripe.sql` e o
`025_financeiro.sql`.

---

## 3. O que o Lovable tem de acrescentar no CarouselSnap

Cola isto no Lovable, tal e qual:

> Preciso de um botão "Abrir o Creator Works" que só aparece a quem tem a
> subscrição ativa. Quando se carrega nele, abre-se
> `https://carouselsnap.app/creator-works/entrar?t=BILHETE` numa página nova.
>
> O BILHETE é gerado numa edge function do Supabase (nunca no browser, porque
> leva um segredo). A função:
>
> 1. Confirma que quem a chama tem sessão e subscrição ativa. Se não tiver,
>    devolve 403.
> 2. Monta este objeto:
>    `{ "u": <id da pessoa no CarouselSnap>, "e": <email dela>, "n": <nome, se souberes>, "ate": <agora em segundos + 60>, "j": <crypto.randomUUID()> }`
>
>    O `u` é o mais importante: é ele que diz ao Creator Works QUEM é a
>    pessoa. Manda o id estável dela — o `user.id` do Supabase serve — e não
>    o email. Se um dia ela mudar de email, o id não muda e ela continua a ser
>    a mesma pessoa do outro lado, com a biblioteca e a memória dela intactas.
> 3. Converte-o para JSON, depois para **base64url** (base64 normal, com `+`
>    trocado por `-`, `/` por `_`, e sem os `=` do fim). A isto chama-se CORPO.
> 4. Calcula `HMAC-SHA256(CORPO, PASSAGEM_SEGREDO)` e passa o resultado
>    também a base64url. A isto chama-se ASSINATURA.
> 5. Devolve `CORPO + "." + ASSINATURA`.
>
> O `PASSAGEM_SEGREDO` vem dos secrets do Supabase, nunca do código.
>
> Não mudes mais nada na app.

### A função, se preferires dar-lha feita

```ts
// supabase/functions/passagem/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return new Response('sem sessão', { status: 401 });

  // ⚠️ troca isto pela tua tabela e pela tua coluna de estado
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (sub?.status !== 'active') return new Response('sem subscrição', { status: 403 });

  const recado = {
    u: user.id, // ← o id estável. É ISTO que diz quem ela é.
    e: user.email.toLowerCase(),
    n: user.user_metadata?.full_name ?? undefined,
    ate: Math.floor(Date.now() / 1000) + 60,
    j: crypto.randomUUID(),
  };

  const corpo = b64url(new TextEncoder().encode(JSON.stringify(recado)));
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(Deno.env.get('PASSAGEM_SEGREDO')!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinatura = b64url(
    await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo)),
  );

  return Response.json({ bilhete: `${corpo}.${assinatura}` });
});
```

E o botão:

```ts
const { data } = await supabase.functions.invoke('passagem');
window.location.href = `https://carouselsnap.app/creator-works/entrar?t=${data.bilhete}`;
```

---

## Como se confirma que está a funcionar

1. `https://carouselsnap.app/creator-works/entrar` sem bilhete nenhum → vai parar a
   `/assinar`. É o esperado.
2. Com uma conta de teste no CarouselSnap, carregar no botão → entra no
   Creator Works sem pedir nada.
3. Voltar a abrir o **mesmo endereço** do histórico → não entra. O bilhete
   serve uma vez.
4. No Supabase do Creator Works, `select * from membros where email = …` →
   `acesso_ate` está a sete dias daqui.

---

## Sobre a Hotmart

A subscrição é cobrada pela Hotmart, mas quem decide quem entra aqui é o
**login do CarouselSnap** — não a Hotmart diretamente. A Hotmart diz ao
CarouselSnap quem pagou; o CarouselSnap escreve o bilhete; o bilhete abre
esta porta. É uma corrente, e cada elo só fala com o seguinte.

O webhook `/api/webhooks/hotmart` desta app continua a existir e a funcionar,
mas deixa de ser o caminho normal: passa a ser rede de segurança, para o caso
de precisares de dar acesso a alguém sem passar pelo CarouselSnap.

---

## Sobre o email mudar

Se alguém mudar de email no CarouselSnap, o bilhete seguinte traz o email
novo e o mesmo `u`. Esta app reconhece-a pelo `u`, **renomeia a conta que já
existe** e segue em frente — ela nem dá por isso, e não perde nada.

Isto só funciona se o `u` vier no bilhete. Sem ele, a identidade volta a ser
o email, e quem mudar de email passa a ser outra pessoa aqui dentro: conta
nova, biblioteca vazia, briefing por responder. Por isso o `u` não é um
extra — é a peça que evita a única perda de dados possível nesta ligação.

Se a renomeação falhar por alguma razão, a app **recusa a entrada** em vez de
abrir uma conta nova. Mais vale uma pessoa a bater à porta do que uma pessoa
a pensar que perdeu o trabalho todo.

---

## O que ainda não está decidido

**As sete dias.** Escolhi sete porque fecha a porta a quem cancela dentro de
uma semana sem incomodar quem continua a pagar. Se quiseres mais apertado
(dois dias) ou mais folgado (um mês), é um número num ficheiro:
`DIAS_POR_PASSAGEM`, em `src/lib/passagem.ts`.

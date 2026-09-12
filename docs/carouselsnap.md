# Ligar o Creator Works ao CarouselSnap

O que é preciso fazer, dos dois lados, para que só entre aqui quem tem
subscrição no CarouselSnap.

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
| `CAROUSELSNAP_URL` | `https://carouselsnap.lovable.app` |
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

E, se ainda não correste, também o `022_consumos.sql` e o `023_stripe.sql`.

---

## 3. O que o Lovable tem de acrescentar no CarouselSnap

Cola isto no Lovable, tal e qual:

> Preciso de um botão "Abrir o Creator Works" que só aparece a quem tem a
> subscrição ativa. Quando se carrega nele, abre-se
> `https://thecreatorworks.com/entrar?t=BILHETE` numa página nova.
>
> O BILHETE é gerado numa edge function do Supabase (nunca no browser, porque
> leva um segredo). A função:
>
> 1. Confirma que quem a chama tem sessão e subscrição ativa. Se não tiver,
>    devolve 403.
> 2. Monta este objeto:
>    `{ "e": <email da pessoa>, "n": <nome, se souberes>, "ate": <agora em segundos + 60>, "j": <crypto.randomUUID()> }`
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
window.open(`https://thecreatorworks.com/entrar?t=${data.bilhete}`, '_blank');
```

---

## Como se confirma que está a funcionar

1. `https://thecreatorworks.com/entrar` sem bilhete nenhum → vai parar a
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

## O que ainda não está decidido

**As sete dias.** Escolhi sete porque fecha a porta a quem cancela dentro de
uma semana sem incomodar quem continua a pagar. Se quiseres mais apertado
(dois dias) ou mais folgado (um mês), é um número num ficheiro:
`DIAS_POR_PASSAGEM`, em `src/lib/passagem.ts`.

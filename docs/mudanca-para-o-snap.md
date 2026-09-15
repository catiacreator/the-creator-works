# Mudar o Creator Works para dentro do CarouselSnap

Este documento é para quem vai fazer a mudança — o Lovable, ou quem vier a
seguir. Diz o que existe, o que se move tal e qual, o que tem de ser
reescrito, e as decisões que ninguém pode tomar sozinho.

Foi escrito a partir do código, não de memória: cada número aqui foi contado.

---

## 1. O que é esta app

O Creator Works escreve conteúdo de Instagram com a voz de quem o usa. A
pessoa responde a um briefing de vinte e uma perguntas — nicho, público,
posicionamento, autoridade — e a partir daí a Cát.IA escreve carrosséis,
roteiros de Reels e Stories, legendas, e transforma notícias do dia em
conteúdo. Há um editor visual para desenhar os slides, uma biblioteca de
estilos e templates, e uma análise de perfil que devolve um plano de trinta
dias.

O que a distingue não é a tecnologia — é o **método**, que está escrito em
prompts. Se tudo o resto se perdesse e os prompts ficassem, a app era
recuperável. Ao contrário, não.

## 2. O tamanho

| | quantos |
|---|---|
| páginas | 29 |
| rotas de API | 67 |
| componentes | 33 |
| módulos de lógica (`src/lib`) | 62 |
| migrações de SQL | 29 |
| linhas (ts, tsx, sql, mjs) | 34 477 |

## 3. As duas casas não são iguais

|  | Creator Works | CarouselSnap |
|---|---|---|
| framework | Next.js 14, App Router | React + Vite |
| onde corre a lógica | servidor (rotas de API) | browser + edge functions |
| navegação | ficheiros em `src/app` | React Router em `App.tsx` |
| quem guarda a sessão | middleware + cookies | `useAuth` no browser |
| desenho | Tailwind próprio | Tailwind + shadcn |

A diferença que manda em tudo: **esta app tem servidor e a outra não.** As 67
rotas correm em Node, com a chave da Anthropic e a `service_role` do Supabase
em mãos. Do lado do Snap isso não existe — o equivalente são as **edge
functions** do Supabase, que é onde o Snap já põe o `drop-content`, o
`generate-carousel` e as outras.

## 4. O que se move tal e qual

**50 dos 62 módulos de `src/lib` são lógica pura.** Não tocam no servidor,
não leem variáveis de ambiente, não sabem o que é o Supabase. Copiam-se para
o projeto do Snap e funcionam:

```
agente-carrossel  analise-perfil  biblioteca-ganchos  briefing
carrossel-texto   cartao-noticia  chave-admin         consumo
conversas         creditos        criar-opcoes        default-spec
design-para-spec  dividir         documento-mestre    editor-store
export-image      extract         extrair-slides      fabrica-extrair
fontes-do-utilizador   fontes-editor   fonts          ganchos
guias             limites         material            memoria
metodo-catia      migracoes       paginas             papeis
papeis-servidor   portas          pptx                prompts
regioes           render          spec-para-design    split
storage           studio-estilos  studio-render       studio-texto
types             ultima-hora     usar-fontes
```

Dentro destes, os que interessam mesmo:

- **`metodo-catia.ts` e `prompts.ts`** — o método. É isto que faz a app ser
  dela e não de outra pessoa. Move-se sem uma vírgula mudada.
- **`briefing.ts`** — as vinte e uma perguntas, os quatro separadores, e a
  função que as transforma no texto que vai para a IA.
- **`types.ts`, `render.ts`, `studio-render.ts`** — como um slide se
  desenha. O editor inteiro assenta nisto.
- **`papeis.ts`** — quem pode ver o quê.

**O SQL também se move quase todo.** As 29 migrações criam 17 tabelas, e
**nenhuma choca com as 35 tabelas do Snap** — os nomes são todos diferentes.
Correm por cima do que lá está sem partir nada.

## 5. O que tem de ser reescrito

**As 67 rotas de API → edge functions.** Não é tradução linha a linha: cada
rota é um ficheiro com um `POST` que já faz quase tudo o que uma edge
function faz. O que muda é a casca (o `serve()` do Deno em vez do
`withUser()` daqui) e de onde vêm os segredos.

As que interessam mais, por ordem:

| rota | o que faz |
|---|---|
| `chat` | o Agente Cát.IA a conversar |
| `carousels`, `carousels/[id]` | escrever e guardar carrosséis |
| `estudio/ler`, `estudio/separar` | a Fábrica: documento → slides |
| `ultima-hora/*` | notícia → conteúdo |
| `analise`, `perfil/avaliar` | a análise de perfil e o plano de 30 dias |
| `ganchos` | nove ganchos de uma vez |
| `export/[id]` | o PNG e o zip |
| `jobs/run` | os lotes a correr em fundo |

**As 29 páginas → React Router.** O desenho passa quase inteiro (as duas
apps usam Tailwind), mas os componentes de servidor têm de virar componentes
de browser que pedem os dados por `fetch`.

**O middleware → `RequireAuth` + `RequireSubscription`.** O Snap já tem
estes dois. O que o middleware daqui faz a mais — distinguir quem caducou de
quem nunca teve lugar, e mandar um para `/renovar` e o outro para fora — tem
de ir para lá.

## 6. As quatro decisões que só a Cátia pode tomar

Os nomes das tabelas não chocam, mas os **conceitos** chocam. Cada par
abaixo são duas maneiras de dizer a mesma coisa, e a app não pode ficar com
as duas:

| o conceito | no Creator Works | no CarouselSnap |
|---|---|---|
| quem é a pessoa e o que pode | `membros` + `papeis` | `profiles` + `user_roles` |
| quanto já gastou | `consumos` (250 créditos/mês) | `usage_tracking` + `subscription_grants` |
| códigos de convite | `codigos` | `access_codes` |
| a porta da admin | `chaves_admin` + `porta_admin_*` | `admin_allowed_emails` |

**A recomendação, para cada um: fica o do Snap.** O ponto de mudar para lá é
haver **uma conta, uma assinatura, um sítio**. Duas contagens de créditos
dentro da mesma app é exactamente a confusão que o `creditos.ts` já avisa
que existe hoje:

> «Estes créditos são só do Creator Works. Os do CarouselSnap contam à
> parte: gastar aqui não tira nada de lá, e gastar lá não tira nada daqui.»

Depois da mudança, essa frase deixa de ter de existir — e isso é metade do
valor de mudar.

O que **não** se abandona é a tabela `settings` com o **briefing**. Não tem
par do lado do Snap e é a coisa mais valiosa que cada pessoa tem lá dentro.

## 7. A ordem por que se faz

1. **O SQL.** As 17 tabelas e as funções, tal e qual. Sem isto nada mais
   pode ser testado.
2. **Os 50 módulos puros.** Copiar. É meia hora e desbloqueia tudo o resto.
3. **O Agente Cát.IA.** O `chat` é uma rota só, e é a peça de que as pessoas
   mais dão por falta. Já há `tcw_chat_messages` e `tcw_chat_threads` do
   lado do Snap — o Lovable já começou isto, e há que ver o que lá está
   antes de escrever de novo.
4. **O briefing (`/perfil`).** Sem ele tudo o que a IA escreve sai genérico.
5. **Criar** — carrosséis, roteiros, stories.
6. **A Fábrica e o Editor.** São as peças maiores e as que mais dependem do
   desenho.
7. **A Última hora, a Análise de perfil, a Biblioteca.**
8. **O Admin.**

## 8. O que não deve ir

- **`src/app/entrar`, `src/lib/passagem.ts`, `porta/*`** — a ponte entre as
  duas apps. Quando forem a mesma app, uma ponte entre elas é um sítio onde
  alguém se engana.
- **`src/app/assinar` e `obrigada`** — a página de vendas daqui. O Snap tem
  a dele (`Planos`).
- **`src/middleware.ts`** — não tem equivalente e não se traduz; o que ele
  decide passa para os `Require*` do Snap.
- **`configurar`** — a página que aparece quando falta o Supabase. Do lado
  do Snap essa situação não existe.

## 9. Antes de começar

O repositório é público:

```
github.com/catiacreator/the-creator-works
```

Está lá tudo — o código, as migrações, e os comentários, que em muitos
ficheiros explicam **porque** é que uma coisa está como está. Esses
comentários são metade do valor deste repositório: quem os ignorar vai
repetir enganos que já foram pagos uma vez.

Dois que valem a pena ler antes de tocar em SQL: a migração
`029_bilhete_ambiguo.sql` (porque é que um parâmetro com o nome de uma coluna
rebenta só ao executar, nunca ao criar) e `027_porta_admin.sql` (porque é que
a chave da admin é scrypt e não HMAC).

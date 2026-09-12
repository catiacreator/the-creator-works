# O tema do Creator Works, para levar ao CarouselSnap

Tudo o que é preciso para as duas apps parecerem a mesma app — em claro e em
escuro. Está por ordem: primeiro o que se copia, depois como se liga, e no
fim as três armadilhas que já custaram tempo deste lado.

---

## 1. Como funciona, em três linhas

- As cores vivem em **variáveis CSS**, não no Tailwind. O Tailwind só lhes
  aponta.
- O modo escuro é uma **classe `dark` no `<html>`** — não é `prefers-color-scheme`
  sozinho, porque a pessoa tem de poder escolher contra o sistema.
- Trocar de modo **redefine as variáveis**, não as classes. Nenhum componente
  sabe em que modo está, e é por isso que nada se esquece de mudar.

---

## 2. As cores

Os valores são `R G B` sem vírgulas, de propósito: é o que deixa escrever
`rgb(var(--ink) / 0.5)` e ter transparências.

```css
:root {
  color-scheme: light;

  --ink: 20 16 16;          /* texto, títulos, botões escuros */
  --carvao: 33 27 26;       /* o ink ao passar o rato */
  --paper: 255 255 255;     /* fundo da página */
  --superficie: 255 255 255;/* cartões, caixas, campos */
  --creme: 246 244 241;     /* faixas, hover, fundos suaves */
  --sand: 232 228 222;      /* bordas */
  --muted: 138 124 99;      /* texto secundário */
  --rosa-suave: 251 218 231;/* fundo rosa claro */
}

.dark {
  color-scheme: dark;

  --ink: 244 241 238;
  --carvao: 226 220 214;
  --paper: 22 18 16;
  --superficie: 30 25 23;
  --creme: 38 32 29;
  --sand: 56 47 43;
  --muted: 163 150 138;
  --rosa-suave: 58 30 42;
}
```

Duas cores **não** mudam entre modos, porque são a marca:

```
rosa      #EE4E8B    ações, estados ativos, foco
manteiga  #F7E3A0    acento, só em etiquetas de estado
```

E o laranja do botão de voltar, que é o único que não é desta paleta —
serve precisamente para não se confundir com ela:

```
laranja        #F97316
laranja hover  #EA580C
```

**O modo escuro não é o claro invertido.** O fundo é castanho-escuro quente
(`22 18 16`), não preto nem cinzento-azulado. É o que faz a app continuar a
parecer a mesma app com a luz apagada. Se trocares isto por `#000` ou por um
cinzento neutro, deixa de combinar.

---

## 3. O Tailwind

```ts
// tailwind.config.ts
const config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        carvao: 'rgb(var(--carvao) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        superficie: 'rgb(var(--superficie) / <alpha-value>)',
        creme: 'rgb(var(--creme) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        rosaSuave: 'rgb(var(--rosa-suave) / <alpha-value>)',
        rosa: '#EE4E8B',
        manteiga: '#F7E3A0',
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(20,16,16,0.04), 0 8px 24px -16px rgba(20,16,16,0.18)',
        lift: '0 2px 4px rgba(20,16,16,0.06), 0 16px 40px -20px rgba(238,78,139,0.35)',
      },
    },
  },
};
```

O `<alpha-value>` é o que faz `bg-rosa/25` funcionar. Sem ele, as
transparências do Tailwind partem-se em silêncio.

---

## 4. As formas

O que dá à app o ar dela não são só as cores — são três medidas repetidas:

```css
body { @apply bg-paper text-ink antialiased; }
::selection { @apply bg-rosa/25; }

/* ── superfícies ── */
.card {
  @apply rounded-[1.25rem] border border-sand bg-superficie p-5 shadow-soft;
}

/* ── botões: uma base, e variantes por cima ── */
.btn {
  @apply inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm
         font-medium transition focus-visible:outline-none focus-visible:ring-2
         focus-visible:ring-rosa/50 focus-visible:ring-offset-2
         focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-45;
}

.btn-primary {
  @apply btn bg-rosa text-white shadow-lift hover:bg-[#DC3F7C] active:translate-y-px;
}

.btn-escuro {
  @apply btn bg-ink text-paper hover:bg-carvao active:translate-y-px;
}

.btn-ghost {
  @apply btn border border-sand bg-superficie text-ink
         hover:border-rosa/40 hover:bg-rosaSuave/40;
}

/* ── formulários ── */
.input {
  @apply w-full rounded-xl border border-sand bg-superficie px-3.5 py-2.5 text-sm
         outline-none transition placeholder:text-muted/70
         focus:border-rosa focus:ring-4 focus:ring-rosa/20;
}

.label {
  @apply mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted;
}

input[type='checkbox'], input[type='radio'] { @apply accent-rosa; }

/* ── etiquetas e chips ── */
.pill { @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium; }

.chip {
  @apply inline-flex cursor-pointer items-center gap-1 rounded-full px-3.5 py-1.5 text-sm transition;
}
.chip-on  { @apply chip bg-rosa text-white; }
.chip-off { @apply chip border border-sand bg-superficie text-ink
                   hover:border-rosa/40 hover:bg-rosaSuave/40; }
```

Raios: **1.25rem** nos cartões, **0.75rem** (`rounded-xl`) nos campos, e os
botões são **redondos** (`rounded-full`) — é essa a assinatura da app.
Tipo de letra: **Poppins**.

---

## 5. O interruptor

O botão só faz uma coisa: põe ou tira a classe no `<html>` e guarda a escolha.

```tsx
function alternar() {
  const novo = !escuro;
  setEscuro(novo);
  document.documentElement.classList.toggle('dark', novo);
  try {
    localStorage.setItem('tema', novo ? 'escuro' : 'claro');
  } catch {}
}
```

E — **isto é o mais importante de tudo** — um script que corre **dentro do
`<head>`, antes de a página desenhar**:

```html
<script>
try {
  var t = localStorage.getItem('tema');
  var escuro = t === 'escuro' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
  if (escuro) document.documentElement.classList.add('dark');
} catch (e) {}
</script>
```

Sem ele, quem usa o modo escuro vê **um clarão branco a cada página que
abre**, porque o React só corre depois de haver ecrã. É o erro mais comum a
fazer isto, e nota-se muito.

Repara também no `!t &&`: sem escolha guardada, segue o sistema. Depois de
ela escolher uma vez, a escolha dela ganha ao sistema — e continua a ganhar.

---

## 6. As três armadilhas

**1. Uma variável que não existe não dá erro — dá invisível.**
Se escreveres `bg-superficie` num sítio onde `--superficie` não está
definida, a declaração fica inválida e **nada é pintado**. Sem aviso na
consola. Já aconteceu aqui: um cartão apareceu completamente transparente, e
o mesmo bug estava a apagar dois botões noutro sítio. A regra: **define todas
as variáveis no `:root`**, mesmo as que só um componente usa.

**2. Define sempre o fundo do `body`.**
Um `body` transparente pega no fundo do que estiver por trás. Se a app for
embebida, ou se o browser pintar o seu próprio fundo, fica um modo escuro com
uma tira branca.

**3. Não ponhas cores só dentro do bloco `.dark`.**
Toda a cor tem de ter um valor no `:root`. O `.dark` só **redefine**. Uma cor
que só existe no escuro aparece em falta no claro — e outra vez sem erro
nenhum.

---

## 7. Se o CarouselSnap não usar Tailwind

Só o ponto 2 (as variáveis) e o ponto 5 (o interruptor) é que são mesmo
precisos. Em CSS simples fica assim:

```css
.cartao {
  background: rgb(var(--superficie));
  border: 1px solid rgb(var(--sand));
  color: rgb(var(--ink));
  border-radius: 1.25rem;
  padding: 1.25rem;
}
```

---

## 8. Para colares no Lovable

> Aplica este tema à app, em claro e em escuro.
>
> As cores vivem em variáveis CSS no `:root` e são redefinidas numa classe
> `.dark` no `<html>`. [cola aqui o bloco do ponto 2]
>
> O rosa `#EE4E8B` e a manteiga `#F7E3A0` não mudam entre modos.
>
> Põe um script no `<head>`, antes de a página desenhar, que lê
> `localStorage.getItem('tema')` e acrescenta a classe `dark` ao `<html>` se
> for `'escuro'`, ou se não houver nada guardado e o sistema estiver em
> escuro. Sem isto há um clarão branco a cada página.
>
> Cartões com raio de 1.25rem, o resto com 0.75rem. Tipo de letra Poppins.
>
> Todas as cores têm de ter valor no `:root` — o `.dark` só as redefine.
> Uma variável em falta não dá erro, dá um elemento invisível.

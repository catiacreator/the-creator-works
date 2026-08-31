# Trabalhar nos dois sítios

Este projecto pode ser mexido em dois lugares, e os dois servem para coisas
diferentes. Não competem — é o mesmo repositório, visto de duas janelas.

| Onde | Para quê | O preview |
|---|---|---|
| **No teu computador** | O dia-a-dia. Mudar uma cor, endireitar um texto, ver logo se ficou bem. | `localhost:3000`, imediato, com os teus dados verdadeiros. |
| **Na nuvem** (Claude Code na web ou no telemóvel) | Trabalho mais demorado, ou quando não estás ao computador. | Um endereço da Vercel, que nasce a cada alteração. |

---

## A regra de ouro

**Puxa antes de começar. Empurra quando acabas.** Duas linhas, e nunca há
trapalhada:

```bash
git pull origin main      # antes de mexer seja no que for
# … trabalhas …
git push origin main      # quando estiver como querias
```

O que se passa se te esqueceres: o Git avisa-te e não deixa empurrar por cima
do trabalho do outro lado. Não perdes nada — só tens de puxar primeiro.

---

## 1. No teu computador

Uma vez, quando abres o projecto pela primeira vez numa pasta nova:

```bash
git clone https://github.com/catiacreator/the-creator-works.git
cd the-creator-works
npm install
cp .env.example .env.local     # e preenches com as tuas chaves
```

Depois, sempre que te sentas a trabalhar:

```bash
git pull origin main
npm run dev
```

E abres `http://localhost:3000`. Quando estiver como querias:

```bash
git add -A
git commit -m "diz aqui o que mudaste"
git push origin main
```

A Vercel republica sozinha o site verdadeiro a cada `push` para o `main`.

---

## 2. Na nuvem

Aqui não existe `localhost` que tu possas abrir: o código corre numa máquina
que não é a tua, e o browser do teu computador não chega lá. Por isso o
caminho é outro — o Claude trabalha num ramo à parte e a Vercel publica um
endereço de pré-visualização.

O que acontece, por ordem:

1. O Claude puxa o `main` para ter a tua última versão.
2. Trabalha num ramo próprio, `claude/…`, nunca directamente no `main`.
3. Confirma que compila (`npm run build`) antes de empurrar seja o que for.
4. Empurra e abre um *pull request* em rascunho.
5. A Vercel comenta lá um endereço de pré-visualização. Abres, vês, dizes o
   que achas. A cada alteração nova, o mesmo endereço actualiza-se.
6. Quando gostares, carregas em **Merge** no GitHub — e aí sim entra no `main`
   e vai para o site verdadeiro.

Ou seja: **nada do que se faz na nuvem toca no teu site sem tu carregares em
Merge.** Podes experimentar à vontade.

Para trazeres essas alterações para o teu computador, depois do Merge:

```bash
git pull origin main
```

---

## 3. O `.env.local` nunca viaja

As tuas chaves — Supabase, Anthropic, Google — vivem no ficheiro `.env.local`,
na pasta do projecto **no teu computador**. O `.gitignore` ignora-o de
propósito, para nunca irem parar ao GitHub.

Consequências, para não te apanharem de surpresa:

- Uma pasta nova (outro computador, ou a nuvem) **não tem** esse ficheiro. A
  app abre no ecrã `/configurar`, a dizer o que falta. É esperado, não é avaria.
- Na Vercel, as chaves não vêm do ficheiro: estão em *Settings → Environment
  Variables*. Para o endereço de pré-visualização funcionar, cada variável tem
  de estar marcada também em **Preview**, não só em *Production*.
- Se puseres uma chave nova num sítio, tens de a pôr no outro à mão. São dois
  cofres separados, de propósito.

---

## 4. Quando os dois mexem no mesmo sítio

Se alteraste um ficheiro no computador e o Claude alterou o mesmo ficheiro na
nuvem, o Git não escolhe por ti — pára e pede que decidas. Aparece assim:

```
CONFLICT (content): Merge conflict in src/components/nav.tsx
```

Não é um erro nem se perdeu nada: são duas versões à espera que digas qual
vale. O mais simples é dizeres ao Claude *"há um conflito no ficheiro X"* e
ele resolve.

**Como evitar quase sempre:** não deixes trabalho por empurrar de um lado
enquanto trabalhas do outro. Acabas, empurras, e só depois mudas de janela.

---

## 5. Se te enganares

Quase nada é definitivo, e nada do que está empurrado se perde.

| Situação | O que fazer |
|---|---|
| Mexeste e não gostaste, ainda não guardaste | `git checkout -- .` devolve tudo ao último ponto guardado. |
| Já fizeste `commit` mas ainda não `push` | `git reset --soft HEAD~1` desfaz o commit e deixa as alterações à mão. |
| Já está no GitHub e queres voltar atrás | Diz ao Claude qual era a versão boa — a história toda está guardada. |
| A pré-visualização da Vercel ficou estranha | Não faz mal nenhum: é uma cópia à parte. O site verdadeiro só muda com um Merge. |

Na dúvida, `git status` diz-te sempre onde estás e o que tens por guardar.

# O briefing preenchido no CarouselSnap

Para dar ao Lovable. A ideia: a pessoa responde ao briefing **lá**, descarrega
um documento, e no Creator Works só tem de o carregar — as respostas aparecem
todas preenchidas, sem escrever nada outra vez.

Isto já funciona deste lado. Não é preciso mudar nada no Creator Works: a
página **Sobre mim** tem um botão de carregar documento, e o que ele faz está
descrito na última secção.

---

## As 21 perguntas

Quatro secções. Dezanove são obrigatórias; duas têm uma caixa de "não tenho",
assinaladas abaixo.

O que interessa guardar é o **id** de cada resposta — é por ele que o Creator
Works as reconhece. O texto da pergunta pode ser reescrito à vontade; o id
não.

### Nicho

| id | pergunta | feitio |
|---|---|---|
| `instagram` | Qual o seu @ no Instagram? | linha |
| `genero` | Você é: | escolha: Homem · Mulher |
| `pais` | De que país fala? | escolha: Portugal · Brasil · Espanha · Outro |
| `nicho` | Qual o seu nicho? | linha — *ex.: Marketing Digital* |
| `subnicho` | Qual o seu subnicho? Temas de que fala? | texto — *ex.: tráfego pago, copy, funis* |
| `adicional` | Informações adicionais sobre si | texto — **pode ficar vazia** |

O `pais` não é decoração: é por ele que a Última hora sabe onde procurar
notícias.

### Público

| id | pergunta |
|---|---|
| `cliente_ideal` | Descreva o seu cliente ideal |
| `frustracoes` | O que eles odeiam / o que os frustra? |
| `desejos` | O que eles amam / querem alcançar? |
| `objecoes` | Quais as suas maiores objeções de venda? |
| `quem_compra` | Quem mais compra os seus produtos? |

### Posicionamento

| id | pergunta |
|---|---|
| `historia` | Como começou a fazer o que faz? (a tua história) |
| `defende` | O que defende no seu nicho? |
| `valores` | Os seus valores (vida e trabalho) |
| `tom` | Tom de voz e comunicação |
| `evita` | Assuntos ou termos que evita falar |

### Autoridade

| id | pergunta | |
|---|---|---|
| `resultado` | Que resultado gera para o seu cliente? | |
| `diferente` | Porque é diferente? | |
| `produtos` | Produtos e preços | **pode ficar vazia** |
| `promessas` | Promessas de cada produto | |
| `concorrentes` | Maiores concorrentes (URLs) | |

Todas as de Público, Posicionamento e Autoridade são caixas de texto livre,
de várias linhas.

---

## O bloco que faz a leitura ser exata

O documento pode ser lido de duas maneiras do lado do Creator Works:

**Com bloco** — leitura exata, instantânea, e **não gasta créditos nenhuns**.
**Sem bloco** — a Cát.IA lê o texto corrido e arruma as respostas pelas
perguntas. Funciona, mas é uma interpretação, e custa 10 créditos à pessoa.

Vale muito a pena pôr o bloco. É três linhas de código.

### Como se escreve

No fim do documento, estas três linhas:

```
<<<THE-CREATOR-WORKS
BASE64_AQUI
THE-CREATOR-WORKS>>>
```

Onde `BASE64_AQUI` é o JSON das respostas, convertido para base64:

```ts
const respostas = {
  instagram: '@tiago',
  genero: 'Homem',
  pais: 'Portugal',
  nicho: 'Marketing com IA',
  subnicho: 'tráfego pago, copy, funis',
  // … os ids todos que a pessoa respondeu
};

const bloco =
  '<<<THE-CREATOR-WORKS\n' +
  btoa(unescape(encodeURIComponent(JSON.stringify(respostas)))) +
  '\nTHE-CREATOR-WORKS>>>';
```

(O `unescape(encodeURIComponent(...))` é para os acentos sobreviverem ao
base64. Em Node é mais simples:
`Buffer.from(JSON.stringify(respostas), 'utf8').toString('base64')`.)

### O que está garantido

Isto foi testado contra o código que faz a leitura:

- **as quebras de linha não estragam nada.** O base64 pode vir partido em
  linhas de 40 caracteres, como um PDF costuma fazer;
- **os espaços também não.** Tudo o que não é base64 é ignorado entre as duas
  marcas;
- **as duas marcas têm de estar escritas tal e qual**, com os `<<<` e os `>>>`;
- só as chaves que correspondem a perguntas reais são aproveitadas — mandar
  mais campos não faz mal, são ignorados;
- se o bloco não existir ou estiver estragado, a leitura cai no caminho da IA
  em vez de falhar.

### Onde pôr o bloco

Em qualquer sítio do documento — o que conta é estar no texto. Duas opções:

- **no fim da última página**, em letra pequena e cinzenta. Fica à vista mas
  não incomoda;
- **nas propriedades do PDF**, no campo *Keywords*. Aí não se vê de todo. O
  Creator Works olha para as Keywords primeiro, antes até do texto.

A segunda é mais limpa se o documento for para a pessoa mostrar a alguém.

---

## O que a pessoa faz, do princípio ao fim

1. No CarouselSnap, responde ao briefing e descarrega o documento (PDF, Word
   ou texto — os três servem).
2. No Creator Works, vai a **Sobre mim** e carrega o ficheiro.
3. As respostas aparecem preenchidas. Ela confere, corrige o que quiser, e
   guarda.

E é aqui que isto vale a pena: **enquanto o briefing não estiver respondido, o
Creator Works não abre.** É a primeira coisa que a pessoa vê e a única página
que funciona. Com o documento, esse passo passa de vinte e uma perguntas para
um clique.

---

## Um aviso sobre o email

Quem se registar no Creator Works deve usar **o mesmo email que usa no
CarouselSnap**. É assim que as duas contas se reconhecem uma à outra quando a
entrada automática estiver a funcionar. Com emails diferentes ficam duas
pessoas distintas, e o trabalho feito numa não aparece na outra.

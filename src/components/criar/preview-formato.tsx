'use client';

import { useState } from 'react';

/**
 * O desenho que cada formato mostra dentro do card, na vitrine do passo
 * "Qual o formato?".
 *
 * Há dois níveis:
 *  1. Se existir uma imagem em `public/formatos/{tipo}-{id}.jpg` (ou .png),
 *     é essa que aparece — é onde se põem exemplos reais.
 *  2. Enquanto não existir, desenha-se o esquema do formato: um telemóvel
 *     com a forma daquilo, para se perceber de relance o que é.
 */

type Esquema =
  | 'falar'
  | 'cortes'
  | 'opiniao'
  | 'direct'
  | 'entrevista'
  | 'aula'
  | 'historia'
  | 'ecra'
  | 'prova'
  | 'dividido'
  | 'mito'
  | 'lista'
  | 'serie'
  | 'slides'
  | 'texto'
  | 'numeros'
  | 'stop'
  | 'trend'
  | 'bastidor'
  | 'cena'
  | 'voz'
  | 'estrutura'
  | 'stories-conexao'
  | 'stories-desejo'
  | 'stories-vendas'
  | 'stories-premium';

/** `tipo:id` → esquema. O que não estiver aqui cai no esquema base. */
const ESQUEMAS: Record<string, Esquema> = {
  // ── carrossel ──────────────────────────────────
  'carrossel:storytelling': 'historia',
  'carrossel:dualidade': 'dividido',
  'carrossel:erro-comum': 'stop',
  'carrossel:pauta-quente': 'prova',
  'carrossel:certo-errado': 'mito',
  'carrossel:lista': 'lista',
  'carrossel:padrao': 'slides',

  // ── reels ──────────────────────────────────────
  'reels:lo-fi': 'falar',
  'reels:leia-legenda': 'texto',
  'reels:fala-dinamica': 'cortes',
  'reels:serie': 'serie',
  'reels:sketch': 'cena',
  'reels:rotina': 'bastidor',
  'reels:narrado': 'voz',
  'reels:pauta-quente': 'prova',
  'reels:padrao': 'estrutura',
  'reels:talking-head': 'falar',
  'reels:opiniao-contra': 'opiniao',
  'reels:resposta-direct': 'direct',
  'reels:micro-aula': 'aula',
  'reels:oi-pessoa': 'entrevista',
  'reels:storytime': 'historia',
  'reels:tutorial': 'ecra',
  'reels:demo-ferramenta': 'ecra',
  'reels:green-screen': 'prova',
  'reels:antes-depois': 'dividido',
  'reels:comparacao': 'dividido',
  'reels:lista-rapida': 'lista',
  'reels:broll-legendas': 'texto',
  'reels:mito-verdade': 'mito',
  'reels:pov': 'cena',
  'reels:slides-movimento': 'slides',
  'reels:estudo-caso': 'numeros',
  'reels:para-de-fazer': 'stop',
  'reels:serie-numerada': 'serie',
  'reels:trend-nicho': 'trend',
  'reels:bastidor-trabalho': 'bastidor',

  // ── stories ────────────────────────────────────
  'stories:conexao': 'stories-conexao',
  'stories:desejo': 'stories-desejo',
  'stories:vendas': 'stories-vendas',
  'stories:premium': 'stories-premium',
};

/** Uma barra de texto fingido. */
function B({ w, tom = 'sand', alto }: { w: string; tom?: 'sand' | 'ink' | 'rosa'; alto?: boolean }) {
  const cor = tom === 'ink' ? 'bg-ink/70' : tom === 'rosa' ? 'bg-rosa' : 'bg-sand';
  return <div className={`${alto ? 'h-2' : 'h-1.5'} rounded-full ${cor}`} style={{ width: w }} />;
}

function Cabeca({ pequena }: { pequena?: boolean }) {
  const d = pequena ? 'h-4 w-4' : 'h-7 w-7';
  const o = pequena ? 'h-4 w-8' : 'h-7 w-12';
  return (
    <div className="flex flex-col items-center">
      <div className={`${d} rounded-full bg-sand`} />
      <div className={`${o} -mt-0.5 rounded-t-full bg-sand`} />
    </div>
  );
}

function Legendas() {
  return (
    <div className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-1">
      <B w="80%" tom="ink" alto />
      <B w="55%" tom="ink" />
    </div>
  );
}

function Desenho({ esquema }: { esquema: Esquema }) {
  switch (esquema) {
    case 'falar':
      return (
        <>
          <div className="absolute inset-x-0 top-[22%] flex justify-center">
            <Cabeca />
          </div>
          <Legendas />
        </>
      );

    case 'cortes':
      return (
        <>
          <div className="absolute inset-x-0 top-[20%] flex justify-center">
            <Cabeca />
          </div>
          <div className="absolute inset-x-2 bottom-6 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-[3px] ${i === 1 ? 'bg-rosa' : 'bg-sand'}`}
              />
            ))}
          </div>
          <div className="absolute inset-x-3 bottom-2">
            <B w="70%" tom="ink" />
          </div>
        </>
      );

    case 'opiniao':
      return (
        <>
          <div className="absolute left-2 top-[18%] flex w-[70%] flex-col gap-1 rounded-lg rounded-bl-none bg-rosa/60 p-1.5">
            <B w="90%" tom="ink" />
            <B w="60%" tom="ink" />
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <Cabeca />
          </div>
        </>
      );

    case 'direct':
      return (
        <>
          <div className="absolute inset-x-2 top-3 flex flex-col gap-1.5">
            <div className="w-[75%] rounded-lg rounded-tl-none bg-sand p-1.5">
              <B w="85%" tom="ink" />
            </div>
            <div className="ml-auto w-[65%] rounded-lg rounded-tr-none bg-rosa p-1.5">
              <B w="70%" tom="ink" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <Cabeca />
          </div>
        </>
      );

    case 'entrevista':
      return (
        <>
          {/* a pergunta vem de fora do enquadramento */}
          <div className="absolute -left-1.5 top-3 flex w-[62%] flex-col gap-1 rounded-lg rounded-bl-none bg-rosa px-1.5 py-1.5">
            <B w="85%" tom="ink" />
            <B w="55%" tom="ink" />
          </div>
          <div className="absolute inset-x-0 top-[42%] flex justify-center">
            <Cabeca />
          </div>
          <Legendas />
        </>
      );

    case 'aula':
      return (
        <>
          <div className="absolute inset-x-2 top-3 flex flex-col gap-1.5 rounded-md border border-sand bg-paper p-2">
            <B w="70%" tom="ink" alto />
            <B w="95%" />
            <B w="80%" />
            <B w="55%" />
          </div>
          <div className="absolute bottom-2 left-2">
            <Cabeca pequena />
          </div>
        </>
      );

    case 'historia':
      return (
        <>
          <div className="absolute left-3 top-3 font-serif text-2xl leading-none text-sand">“</div>
          <svg
            viewBox="0 0 60 40"
            preserveAspectRatio="none"
            className="absolute inset-x-2 top-[36%] h-8"
            fill="none"
          >
            <path
              d="M2 30 C 14 30, 12 8, 24 8 S 40 32, 52 12"
              stroke="#EE4E8B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <Legendas />
        </>
      );

    case 'ecra':
      return (
        <>
          <div className="absolute inset-x-2 top-3 overflow-hidden rounded-md border border-sand bg-paper">
            <div className="flex gap-1 border-b border-sand px-1.5 py-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-sand" />
              ))}
            </div>
            <div className="flex flex-col gap-1 p-1.5">
              <B w="90%" />
              <B w="70%" />
              <B w="80%" tom="rosa" />
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink/60" />
          <div className="absolute inset-x-3 bottom-2">
            <B w="100%" tom="ink" />
          </div>
        </>
      );

    case 'prova':
      return (
        <>
          <div className="absolute inset-x-2 top-4 -rotate-3 rounded-md border border-sand bg-paper p-1.5 shadow-soft">
            <div className="flex flex-col gap-1">
              <B w="85%" tom="ink" />
              <B w="60%" tom="rosa" />
              <B w="75%" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2">
            <Cabeca pequena />
          </div>
        </>
      );

    case 'dividido':
      return (
        <>
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-sand/60" />
            <div className="flex-1 bg-rosa/50" />
          </div>
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-paper" />
          <div className="absolute inset-x-1.5 bottom-2 flex gap-1.5">
            <div className="flex flex-1 flex-col gap-1">
              <B w="100%" tom="ink" />
              <B w="70%" tom="ink" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <B w="100%" tom="ink" />
              <B w="70%" tom="ink" />
            </div>
          </div>
        </>
      );

    case 'mito':
      return (
        <div className="absolute inset-2 flex flex-col gap-2">
          <div className="flex flex-1 flex-col justify-center gap-1 rounded-md bg-sand/60 p-1.5">
            <span className="text-[10px] font-bold leading-none text-ink/50">✕</span>
            <B w="90%" tom="ink" />
            <B w="60%" tom="ink" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 rounded-md bg-rosa/50 p-1.5">
            <span className="text-[10px] font-bold leading-none text-ink/60">✓</span>
            <B w="90%" tom="ink" />
            <B w="60%" tom="ink" />
          </div>
        </div>
      );

    case 'lista':
      return (
        <div className="absolute inset-2 flex flex-col justify-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-1.5">
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] text-[7px] font-bold ${
                  n === 2 ? 'bg-rosa text-ink' : 'bg-sand text-ink/60'
                }`}
              >
                {n}
              </span>
              <B w={n === 2 ? '80%' : '65%'} tom="ink" />
            </div>
          ))}
        </div>
      );

    case 'serie':
      return (
        <>
          <div className="absolute left-2 top-2 rounded-[4px] bg-ink px-1 py-0.5 text-[7px] font-bold leading-none text-paper">
            #4
          </div>
          <div className="absolute inset-x-0 top-[34%] flex justify-center">
            <Cabeca />
          </div>
          <div className="absolute inset-x-2 bottom-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-rosa' : 'bg-sand'}`}
              />
            ))}
          </div>
        </>
      );

    case 'slides':
      return (
        <>
          <div className="absolute inset-x-4 top-4 h-[52%] rounded-md border border-sand bg-sand/40" />
          <div className="absolute inset-x-3 top-5 h-[52%] rounded-md border border-sand bg-creme" />
          <div className="absolute inset-x-2 top-6 flex h-[52%] flex-col gap-1 rounded-md border border-sand bg-paper p-1.5">
            <B w="85%" tom="ink" alto />
            <B w="60%" />
          </div>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-ink/60' : 'bg-sand'}`}
              />
            ))}
          </div>
        </>
      );

    case 'texto':
      return (
        <div className="absolute inset-2 flex flex-col items-center justify-center gap-1.5">
          <B w="85%" tom="ink" alto />
          <B w="95%" tom="ink" alto />
          <B w="60%" tom="rosa" alto />
        </div>
      );

    case 'numeros':
      return (
        <>
          <div className="absolute inset-x-0 top-[18%] text-center text-[15px] font-bold leading-none tracking-tight text-ink/70">
            11k
          </div>
          <div className="absolute inset-x-3 bottom-6 flex items-end gap-1">
            {[30, 45, 60, 100].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-[3px] ${i === 3 ? 'bg-rosa' : 'bg-sand'}`}
                style={{ height: `${h * 0.28}px` }}
              />
            ))}
          </div>
          <div className="absolute inset-x-3 bottom-2">
            <B w="80%" tom="ink" />
          </div>
        </>
      );

    case 'stop':
      return (
        <>
          <div className="absolute inset-x-0 top-[24%] flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-rosa">
              <div className="h-[3px] w-5 -rotate-45 rounded-full bg-rosa" />
            </div>
          </div>
          <Legendas />
        </>
      );

    case 'trend':
      return (
        <>
          <div className="absolute inset-x-0 top-[22%] text-center text-base leading-none text-ink/50">
            ♪
          </div>
          <div className="absolute inset-x-3 top-[45%] flex items-end justify-center gap-[3px]">
            {[6, 12, 8, 16, 10, 14, 7].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full bg-rosa" style={{ height: h }} />
            ))}
          </div>
          <Legendas />
        </>
      );

    case 'bastidor':
      return (
        <>
          <div className="absolute inset-x-3 top-[26%] flex h-8 items-center justify-center rounded-md bg-sand">
            <div className="h-4 w-4 rounded-full border-2 border-paper" />
          </div>
          <div className="absolute inset-x-0 top-[52%] flex justify-center">
            <div className="h-6 w-px bg-sand" />
          </div>
          <div className="absolute inset-x-4 top-[68%] flex justify-between">
            <div className="h-5 w-px rotate-12 bg-sand" />
            <div className="h-5 w-px -rotate-12 bg-sand" />
          </div>
          <div className="absolute inset-x-3 bottom-2">
            <B w="70%" tom="ink" />
          </div>
        </>
      );

    case 'cena':
      return (
        <>
          <div className="absolute inset-x-0 top-[28%] flex items-end justify-center gap-1">
            <Cabeca pequena />
            <Cabeca pequena />
          </div>
          <div className="absolute inset-x-2 top-[14%] rounded-[4px] bg-ink/80 px-1 py-0.5 text-[7px] font-semibold leading-none text-paper">
            POV
          </div>
          <Legendas />
        </>
      );

    case 'voz':
      return (
        <>
          <div className="absolute inset-x-2 top-3 h-[45%] rounded-md bg-sand/70" />
          <div className="absolute inset-x-3 top-[58%] flex items-center justify-center gap-[3px]">
            {[8, 14, 6, 18, 10, 16, 8, 12].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full bg-rosa" style={{ height: h }} />
            ))}
          </div>
          <Legendas />
        </>
      );

    case 'estrutura':
      return (
        <div className="absolute inset-2 flex flex-col justify-center gap-1.5">
          {[
            { w: '100%', t: 'rosa' as const },
            { w: '85%', t: 'sand' as const },
            { w: '95%', t: 'sand' as const },
            { w: '70%', t: 'ink' as const },
          ].map((l, i) => (
            <div
              key={i}
              className={`h-4 rounded-[4px] ${
                l.t === 'rosa' ? 'bg-rosa' : l.t === 'ink' ? 'bg-ink/60' : 'bg-sand'
              }`}
              style={{ width: l.w }}
            />
          ))}
        </div>
      );

    case 'stories-conexao':
    case 'stories-desejo':
    case 'stories-vendas':
    case 'stories-premium':
      return (
        <>
          <div className="absolute inset-x-1.5 top-1.5 flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full ${i <= 1 ? 'bg-ink/60' : 'bg-sand'}`}
              />
            ))}
          </div>
          <div className="absolute left-1.5 top-4 h-3 w-3 rounded-full bg-sand" />

          {esquema === 'stories-conexao' && (
            <div className="absolute inset-x-0 top-[30%] flex justify-center">
              <Cabeca />
            </div>
          )}
          {esquema === 'stories-desejo' && (
            <>
              <div className="absolute inset-x-3 top-[28%] h-10 rounded-md bg-sand/70" />
              <div className="absolute inset-x-0 top-[42%] text-center text-[11px] leading-none text-rosa">
                ♥
              </div>
            </>
          )}
          {esquema === 'stories-vendas' && (
            <div className="absolute inset-x-2 top-[34%] flex flex-col gap-1">
              <div className="rounded-[4px] bg-rosa px-1 py-1">
                <B w="70%" tom="ink" />
              </div>
              <div className="rounded-[4px] bg-sand px-1 py-1">
                <B w="55%" tom="ink" />
              </div>
            </div>
          )}
          {esquema === 'stories-premium' && (
            <div className="absolute inset-x-2 top-[32%] flex flex-col gap-1 rounded-md border border-sand bg-paper p-1.5">
              <B w="80%" tom="ink" alto />
              <B w="95%" />
              <B w="65%" />
            </div>
          )}

          <div className="absolute inset-x-2 bottom-2 flex justify-center">
            <div className="w-full rounded-full border border-sand py-1 text-center text-[6px] leading-none text-muted">
              enviar mensagem
            </div>
          </div>
        </>
      );

    default:
      return <Legendas />;
  }
}

export function PreviewFormato({
  tipo,
  id,
  imagem,
}: {
  tipo: string;
  id: string;
  /** exemplo real, quando já há um em public/formatos */
  imagem?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const esquema = ESQUEMAS[`${tipo}:${id}`] ?? 'texto';
  /** carrossel é 4:5, reels e stories são 9:16 */
  const proporcao = tipo === 'carrossel' ? 'aspect-[4/5]' : 'aspect-[9/16]';

  return (
    <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-creme p-2.5">
      <div
        className={`relative h-full ${proporcao} overflow-hidden rounded-lg bg-paper ring-1 ring-sand`}
      >
        {imagem && !falhou ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imagem}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFalhou(true)}
          />
        ) : (
          <Desenho esquema={esquema} />
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, DoorOpen, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';

interface Peca {
  id: string;
  nome: string;
  feito: boolean;
  falta?: string;
}

/** Uma vez em que a porta disse que não, e porquê. */
interface Recusa {
  porque: string;
  email: string | null;
  quando: string;
}

interface Estado {
  pecas: Peca[];
  entradas: number | null;
  /** as últimas vezes que a porta recusou alguém. Nulo = a tabela não existe */
  recusas: Recusa[] | null;
  /** oito dígitos que dependem do segredo sem o revelar. Nulo = não há segredo */
  marca: string | null;
  desteLado: boolean;
  carouselSnap: string;
  /** o identificador do projeto do Supabase que esta app usa */
  projeto: string | null;
  /** porque é que cada variável não está a ser lida, quando não está */
  diagnostico?: {
    chave: string;
    segredo: string;
    nomes: string[];
  };
}

/**
 * O estado da porta do CarouselSnap.
 *
 * Existe por causa de uma pergunta que não tinha resposta: quando alguém
 * carrega no botão lá e acaba na página de entrada daqui, de que lado está o
 * problema? A ligação tem quatro peças e três delas não estão no código —
 * variáveis na Vercel, migrações no Supabase, e o botão do outro lado. Sem
 * uma lista, a única resposta possível era «não funciona».
 *
 * A última linha é a mais importante e a menos óbvia: se este lado estiver
 * todo pronto e mesmo assim nunca tiver entrado ninguém, a peça que falta é a
 * de lá. É a única maneira de ver, daqui, uma coisa que vive noutra app.
 */
export function PortaDoSnap() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/porta/estado')
      .then((r) => r.json())
      .then((d) => (d.error ? setErro(d.error) : setEstado(d)))
      .catch(() => setErro('Não deu para ver o estado da porta.'));
  }, []);

  // a conta inclui a peça do outro lado: o número tem de bater com os
  // círculos vermelhos que se veem por baixo, senão parece que falta uma coisa
  // e mostram-se duas
  const semBotao = Boolean(estado) && !(estado!.entradas && estado!.entradas > 0);
  const faltam = (estado?.pecas ?? []).filter((p) => !p.feito).length + (semBotao ? 1 : 0);

  return (
    <Card className="mb-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <DoorOpen className="h-4 w-4 text-muted" />
        <h2 className="font-medium">A entrada pelo CarouselSnap</h2>
        {estado && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              estado.desteLado ? 'bg-rosa text-white' : 'bg-manteiga text-ink'
            }`}
          >
            {estado.desteLado && !semBotao ? 'pronta' : `faltam ${faltam}`}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm leading-relaxed text-muted">
        Quem vem do CarouselSnap deve entrar direto, sem pedir nada. Isso só
        acontece se as peças abaixo estiverem todas postas — e a última delas
        é do outro lado.
      </p>

      {erro && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </p>
      )}

      {!estado && !erro && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> A ver…
        </p>
      )}

      {estado && (
        <>
          {/*
            Qual é a base de dados desta app.

            Parece um pormenor e não é: quem tem vários projetos no Supabase,
            todos com nomes parecidos, não tem como saber em qual é que corre
            as migrações — e correr no projeto errado é mexer na base de dados
            de outra app. Este identificador aparece em Settings → API de cada
            projeto, e há de bater com um só.
          */}
          {estado.projeto && (
            <p className="mb-3 rounded-xl bg-creme/70 px-4 py-3 text-xs leading-relaxed text-muted">
              As migrações correm-se no projeto do Supabase cujo Project URL
              começa por{' '}
              <code className="rounded bg-superficie px-1.5 py-0.5 font-mono text-ink">
                {estado.projeto}
              </code>
              . É o que esta app usa. Em Settings → API de cada projeto vês qual
              é qual.
            </p>
          )}

          <ul className="mb-4 space-y-2">
            {estado.pecas.map((p) => (
              <li key={p.id} className="flex gap-2.5 text-sm">
                {p.feito ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
                )}
                <span className="min-w-0">
                  <span className={p.feito ? 'text-muted line-through' : 'font-medium'}>
                    {p.nome}
                  </span>
                  {!p.feito && p.falta && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {p.falta}
                    </span>
                  )}
                </span>
              </li>
            ))}

            {/* a peça que vive na outra app */}
            <li className="flex gap-2.5 text-sm">
              {estado.entradas && estado.entradas > 0 ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
              )}
              <span className="min-w-0">
                <span
                  className={
                    estado.entradas && estado.entradas > 0 ? 'text-muted line-through' : 'font-medium'
                  }
                >
                  O botão do lado do CarouselSnap
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {estado.entradas === null
                    ? 'Não dá para contar sem as peças de cima.'
                    : estado.entradas > 0
                      ? `${estado.entradas} ${estado.entradas === 1 ? 'entrada' : 'entradas'} por aqui — está a funcionar.`
                      : 'Nunca entrou ninguém por aqui. O botão lá tem de abrir thecreatorworks.com/entrar?t=BILHETE, com um bilhete feito por uma edge function. Se abrir só thecreatorworks.com, a pessoa cai na página de entrada — é o que está a acontecer.'}
                </span>
              </span>
            </li>
          </ul>

          {/*
            O porquê, quando uma variável está no painel e a app não a lê.

            Só aparece quando falta alguma: com tudo posto é ruído. Mostra
            contagens de caracteres e nomes, nunca valores.
          */}
          {estado.diagnostico && faltam > 0 && (
            <details className="mb-4 rounded-xl bg-creme/70 px-4 py-3 text-xs leading-relaxed text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                Está no painel da Vercel mas aparece a vermelho?
              </summary>
              <p className="mt-2">
                É isto que a app vê, agora, no ambiente onde está a correr:
              </p>
              <ul className="mt-2 space-y-1">
                <li>
                  <code className="font-mono text-ink">SUPABASE_SERVICE_ROLE_KEY</code> —{' '}
                  {estado.diagnostico.chave}
                </li>
                <li>
                  <code className="font-mono text-ink">PASSAGEM_SEGREDO</code> —{' '}
                  {estado.diagnostico.segredo}
                </li>
              </ul>
              <p className="mt-2">
                Os nomes que existem aqui:{' '}
                {estado.diagnostico.nomes.length ? (
                  estado.diagnostico.nomes.map((n, i) => (
                    <span key={n}>
                      {i > 0 && ', '}
                      <code className="font-mono text-ink">{n}</code>
                    </span>
                  ))
                ) : (
                  <em>nenhum</em>
                )}
                .
              </p>
              <p className="mt-2">
                &quot;Não existe&quot; com a variável à vista no painel quer dizer que o nome
                guardado não é exactamente este — um espaço a mais no fim, um underscore a
                menos. &quot;Está vazia&quot; quer dizer que foi criada e o valor ficou por
                colar. E um número de caracteres pequeno de mais é uma chave cortada ou trocada
                (a <em>service_role</em> do Supabase passa dos 200).
              </p>
              <p className="mt-2">
                Nunca se mostra o valor de nada — só o tamanho e os nomes.
              </p>
            </details>
          )}

          {/*
            As últimas recusas.

            É a peça que faltava a este cartão. Tudo o resto diz o que está
            posto; isto diz o que aconteceu quando alguém tentou mesmo entrar.

            A quem bate à porta com um bilhete que não presta diz-se sempre a
            mesma coisa — «a ligação já não serve» — porque explicar-lhe qual
            das contas falhou é ensinar-lhe a forjar o bilhete seguinte. O
            motivo verdadeiro vem para aqui, que é onde a Cátia o pode ler.

            A leitura mais útil é a primeira linha com a hora: se for de há
            instantes, é a tentativa que ela acabou de fazer.
          */}
          {estado.recusas && estado.recusas.length > 0 && (
            <div className="mb-4 rounded-xl border border-sand bg-creme/70 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-ink">
                As últimas vezes que a porta disse que não
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-muted">
                {estado.recusas.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-ink">{r.porque}</span>
                    <span>
                      {new Date(r.quando).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {r.email && ` · ${r.email}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <strong className="font-medium text-ink">assinatura não bate</strong> quer dizer
                que o <code className="font-mono">PASSAGEM_SEGREDO</code> desta app e o do
                CarouselSnap não são a mesma linha — é o motivo mais comum e o mais fácil de
                arranjar.{' '}
                <strong className="font-medium text-ink">bilhete fora de horas</strong> é um
                relógio trocado de um dos lados, ou o bilhete a ser feito muito antes de ser
                usado.{' '}
                <strong className="font-medium text-ink">bilhete já usado</strong> é mesmo uma
                ligação repetida — recarregar a página, ou voltar atrás no browser.
              </p>
            </div>
          )}

          {estado.recusas && estado.recusas.length === 0 && estado.entradas === 0 && (
            <p className="mb-4 rounded-xl border border-sand bg-creme/70 px-4 py-3 text-xs leading-relaxed text-muted">
              Nunca entrou ninguém por aqui <em>e</em> a porta também nunca recusou ninguém. Quer
              dizer que não está a chegar cá bilhete nenhum — o botão de lá ainda não está a
              chamar o <code className="font-mono">/entrar?t=</code>.
            </p>
          )}

          {/*
            A marca do segredo.

            É a única peça da ligação que não se pode conferir a olho: o
            segredo está no painel da Vercel de um lado e nos secrets do
            Supabase do outro, escondido nos dois, e a maneira óbvia de os
            comparar — cada lado mostrar o seu — é a única que nunca se pode
            fazer.

            Isto compara sem mostrar. Oito dígitos que dependem do segredo e
            de onde não se volta atrás para ele.
          */}
          {estado.marca && (
            <div className="mb-4 rounded-xl border border-sand bg-creme/70 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-ink">
                A marca do segredo deste lado
              </p>
              <p className="mb-2 font-mono text-lg tracking-wider text-ink">{estado.marca}</p>
              <p className="text-xs leading-relaxed text-muted">
                Pede ao pessoal do CarouselSnap a marca do lado deles. <strong className="font-medium text-ink">Se
                for igual a esta, os dois segredos são a mesma linha</strong> e a assinatura não
                é o problema. Se for diferente, é aí que está a avaria — e é só colar um dos
                dois no outro lado.
              </p>
              <details className="mt-2 text-xs leading-relaxed text-muted">
                <summary className="cursor-pointer text-ink">
                  Como é que eles calculam a deles
                </summary>
                <p className="mt-2">
                  Os primeiros oito dígitos hexadecimais do HMAC-SHA256 desta frase, assinada com
                  o segredo — em maiúsculas, com um hífen ao meio:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-paper px-3 py-2 font-mono text-ink">
the-creator-works/passagem/marca/v1
                </pre>
                <p className="mt-2">
                  Em Deno ou Node:{' '}
                  <code className="font-mono text-ink">
                    createHmac(&apos;sha256&apos;, segredo).update(frase).digest(&apos;hex&apos;).slice(0,
                    8)
                  </code>
                  .
                </p>
                <p className="mt-2">
                  Isto não deixa escapar o segredo: de oito dígitos não se volta atrás para a
                  linha que os gerou. É a mesma ideia com que se comparam chaves de SSH pela
                  impressão digital, em vez de as mostrar.
                </p>
              </details>
            </div>
          )}

          <a href="/api/porta/testar" className="btn-fantasma">
            <ExternalLink className="h-4 w-4" />
            Experimentar a porta
          </a>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Escreve um bilhete a valer para a tua conta e atira-te para a porta com ele. Se
            entrares, este lado está pronto e o que falta é o botão de lá. Se caíres na página de
            assinatura, o problema é cá.
          </p>
        </>
      )}
    </Card>
  );
}

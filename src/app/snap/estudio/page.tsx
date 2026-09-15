'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Download, Loader2, Package, Save } from 'lucide-react';
import { TEMPLATES, limparSlide, type TemplateSlide } from '@/snap/templates';
import type { SlideDoDrop } from '@/snap/drop-content';
import { carrosselParaZip, descarregar, slideParaPng } from '@/snap/exportar';
import { desenhoDe, guardarCarrossel, meusCarrosseis } from '@/snap/carrosseis';
import { migracaoEmFalta } from '@/lib/migracoes';

/**
 * O estúdio do CarouselSnap: os 18 templates a desenhar de verdade.
 *
 * Veio depressa por uma razão que não é mérito nenhum meu — os templates
 * dela sabem desenhar-se sozinhos. Cada um traz a sua função `render` que
 * devolve o HTML pronto, e por isso não foi preciso portar as cinco mil
 * linhas de editor: bastou trazer os templates e dar-lhes os slides.
 *
 * O texto passa SEMPRE pelo `limparSlide` antes de chegar a um template.
 * Os `render` metem o que recebem directamente no HTML, e sem essa passagem
 * um título com marcação lá dentro executava. Os templates ficam como ela os
 * escreveu; quem trata disso é a porta, não eles.
 *
 * Os slides vêm do Drop Content pela memória do separador, e daqui podem ir
 * para a tabela `carousel_history` — a do Snap, copiada coluna a coluna na
 * migração 030. A memória do separador continua a ser a ponte entre os dois
 * ecrãs (é imediata e não gasta nada); guardar é uma decisão de quem está a
 * trabalhar, e não uma coisa que aconteça sozinha a cada rascunho.
 *
 * Com `?c=<id>` na morada, abre um carrossel guardado em vez do que está na
 * memória — é assim que a lista em /snap/carrosseis volta a entrar aqui.
 */

const GUARDADO = 'snap-slides';

export default function EstudioPage() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [c1, setC1] = useState(TEMPLATES[0].defaults.c1);
  const [c2, setC2] = useState(TEMPLATES[0].defaults.c2);
  const [meus, setMeus] = useState<SlideDoDrop[] | null>(null);

  /**
   * Os nós desenhados, para o exportador os fotografar.
   *
   * Guardam-se por referência e não por id: dois separadores abertos no
   * mesmo browser teriam os mesmos ids, e o exportador podia fotografar o
   * slide do outro.
   */
  const caixas = useRef<(HTMLDivElement | null)[]>([]);
  const [aExportar, setAExportar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoAgora, setGuardadoAgora] = useState(false);

  const params = useSearchParams();
  const pedido = params.get('c');

  useEffect(() => {
    // um carrossel guardado ganha à memória do separador: se ela pediu
    // aquele, é aquele que quer ver
    if (pedido) {
      let vivo = true;
      meusCarrosseis()
        .then((linhas) => {
          if (!vivo) return;
          const achado = linhas.find((l) => l.id === pedido);
          if (!achado) {
            setErro('Não encontrei esse carrossel. Pode ter sido apagado.');
            return;
          }
          setMeus(achado.carousel_data);
          const desenho = desenhoDe(achado);
          if (desenho.templateId && TEMPLATES.some((t) => t.id === desenho.templateId)) {
            setTemplateId(desenho.templateId);
          }
          if (desenho.c1) setC1(desenho.c1);
          if (desenho.c2) setC2(desenho.c2);
        })
        .catch((e) => setErro(migracaoEmFalta(e) ?? 'Não consegui abrir esse carrossel.'));
      return () => {
        vivo = false;
      };
    }

    try {
      const cru = window.sessionStorage.getItem(GUARDADO);
      if (cru) setMeus(JSON.parse(cru) as SlideDoDrop[]);
    } catch {
      /* memória do separador fechada ou cheia: fica-se com os de exemplo */
    }
  }, [pedido]);

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  /** trocar de template traz as cores dele — são metade do desenho */
  function escolher(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setC1(t.defaults.c1);
    setC2(t.defaults.c2);
  }

  const slides: TemplateSlide[] = useMemo(() => {
    if (!meus?.length) return template.slides;
    return meus.map((s) => ({
      label: s.tipo_slide,
      title: s.texto_principal,
      sub: s.texto_secundario,
      tag: String(s.numero).padStart(2, '0'),
    }));
  }, [meus, template]);

  const cfg = { c1, c2, font: 'Poppins', bgUrl: null };

  async function umSlide(i: number) {
    const node = caixas.current[i];
    if (!node) return;
    setAExportar(String(i));
    setErro(null);
    try {
      descarregar(await slideParaPng(node), `${String(i + 1).padStart(2, '0')}.png`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui exportar este slide.');
    } finally {
      setAExportar(null);
    }
  }

  async function guardar() {
    if (!meus?.length) return;
    setAGuardar(true);
    setErro(null);
    try {
      await guardarCarrossel({ titulo: '', slides: meus, templateId, c1, c2 });
      setGuardadoAgora(true);
      // o visto desaparece sozinho: é uma confirmação, não um estado
      window.setTimeout(() => setGuardadoAgora(false), 2500);
    } catch (e) {
      setErro(
        migracaoEmFalta(e) ??
          (e instanceof Error ? e.message : 'Não consegui guardar este carrossel.'),
      );
    } finally {
      setAGuardar(false);
    }
  }

  async function tudo() {
    const nodes = caixas.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;
    setErro(null);
    try {
      const zip = await carrosselParaZip(nodes, (feitos, total) =>
        setAExportar(`${feitos}/${total}`),
      );
      descarregar(zip, `carrossel-${template.id}.zip`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui montar o zip.');
    } finally {
      setAExportar(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-snapTexto">Estúdio</h2>
          <p className="mt-0.5 text-[13px] font-light text-snapApagado">
            {meus?.length
              ? `Os teus ${meus.length} slides, nos 18 templates.`
              : 'Escolhe um template. Traz slides do Drop Content para os veres aqui.'}
          </p>
        </div>

        {!meus?.length && (
          <Link
            href="/snap/drop"
            className="flex items-center gap-1.5 text-[12.5px] text-snapApagado transition-colors hover:text-snapTexto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ir ao Drop Content
          </Link>
        )}
      </div>

      {/* ── os templates ────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => escolher(t.id)}
            className={`rounded-full border px-3.5 py-1 text-[11.5px] font-medium transition-all ${
              t.id === templateId
                ? 'border-snapDestaque bg-snapDestaque text-snapSobreDestaque'
                : 'border-snapBorda bg-snapCartao text-snapApagado hover:border-snapDestaque'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* ── as duas cores ───────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-snapBorda bg-snapCartao p-3.5">
        {(
          [
            ['Fundo', c1, setC1],
            ['Destaque', c2, setC2],
          ] as const
        ).map(([nome, valor, muda]) => (
          <label key={nome} className="flex items-center gap-2 text-[12.5px] text-snapApagado">
            {nome}
            <input
              type="color"
              value={valor}
              onChange={(e) => muda(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-snapBorda bg-transparent"
            />
            <code className="text-[11px] text-snapApagado/70">{valor}</code>
          </label>
        ))}

        <button
          onClick={() => escolher(templateId)}
          className="text-[11.5px] text-snapApagado underline-offset-2 hover:text-snapTexto hover:underline"
        >
          Voltar às cores do template
        </button>

        {/*
          Guardar só aparece quando há trabalho dela na página. Com os slides
          de exemplo do template não havia o que guardar, e um botão que não
          faz nada é pior do que um botão que não está lá.
        */}
        {Boolean(meus?.length) && (
          <button
            onClick={guardar}
            disabled={aGuardar}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-snapBorda bg-snapCartao px-4 py-2 text-[12.5px] font-medium text-snapTexto transition-colors hover:border-snapDestaque disabled:opacity-60"
          >
            {aGuardar ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                A guardar
              </>
            ) : guardadoAgora ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Guardado
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Guardar
              </>
            )}
          </button>
        )}

        <button
          onClick={tudo}
          disabled={Boolean(aExportar)}
          className={`${meus?.length ? '' : 'ml-auto '}flex items-center gap-1.5 rounded-full bg-snapDestaque px-4 py-2 text-[12.5px] font-medium text-snapSobreDestaque transition-opacity hover:opacity-90 disabled:opacity-60`}
        >
          {aExportar && aExportar.includes('/') ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {aExportar}
            </>
          ) : (
            <>
              <Package className="h-3.5 w-3.5" />
              Descarregar tudo
            </>
          )}
        </button>
      </div>

      {erro && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
        </p>
      )}

      {/* ── os slides desenhados ────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((s, i) => (
          <div key={i} className="group relative overflow-hidden rounded-xl border border-snapBorda">
            <button
              onClick={() => umSlide(i)}
              disabled={Boolean(aExportar)}
              title={`Descarregar o slide ${i + 1}`}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 disabled:opacity-40"
            >
              {aExportar === String(i) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
            {/*
              O HTML vem da função do template — código dela, não de fora.
              O que vem de fora é o texto, e esse passa pelo limparSlide antes
              de aqui chegar. É essa passagem que torna isto seguro.
            */}
            <div
              ref={(el) => {
                caixas.current[i] = el;
              }}
              className="aspect-square w-full [&>*]:h-full [&>*]:w-full"
              dangerouslySetInnerHTML={{ __html: template.render(limparSlide(s), cfg) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  LayoutTemplate,
  LogOut,
  Sun,
  Moon,
  HelpCircle,
  X,
} from 'lucide-react';
import { GUIAS } from '@/lib/guias';
import { useEditor } from '@/lib/editor-store';
import { FORMATOS, type Formato, type Slide } from '@/lib/types';
import { exportarPng, descarregar } from '@/lib/export-image';
import { BarraFerramentas } from './barra-ferramentas';
import { BarraRapida } from './barra-rapida';
import { Canvas, ID_CANVAS } from './canvas';
import { PainelPropriedades } from './painel-propriedades';
import { TiraSlides } from './tira-slides';

interface Props {
  userId: string;
  projeto?: { id: string; nome: string; formato: Formato; slides: Slide[] } | null;
  tituloInicial?: string;
  /** 'template' guarda de volta no template; 'carrossel' guarda um rascunho */
  modo?: 'carrossel' | 'template';
}

export function Editor({ userId, projeto, tituloInicial, modo = 'carrossel' }: Props) {
  const router = useRouter();
  const {
    carregar, nome, setNome, formato, setFormato, slides, slideAtivo,
    setSlideAtivo, desfazer, refazer, sujo, marcarGuardado, projetoId, adicionar,
  } = useEditor();

  const [aGuardar, setAGuardar] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [aSair, setASair] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState<string | null>(null);
  const [tema, setTema] = useState<'escuro' | 'claro'>('escuro');

  // o tema fica guardado no browser — é uma preferência de quem desenha
  useEffect(() => {
    const guardado = window.localStorage.getItem('editor-tema');
    if (guardado === 'claro' || guardado === 'escuro') setTema(guardado);
  }, []);

  useEffect(() => {
    const raiz = document.querySelector('.editor-tema');
    raiz?.setAttribute('data-tema', tema);
    window.localStorage.setItem('editor-tema', tema);
  }, [tema]);
  const [aviso, setAviso] = useState<string | null>(null);

  // carrega o projeto (ou começa em branco com o título vindo das pautas)
  useEffect(() => {
    if (projeto) {
      carregar({ id: projeto.id, nome: projeto.nome, formato: projeto.formato, slides: projeto.slides });
    } else {
      carregar({ id: null, nome: tituloInicial || 'Template sem nome', formato: '3:4', slides: [] });
      if (tituloInicial) {
        adicionar({
          tipo: 'texto', texto: tituloInicial, x: 8, y: 18, w: 84, h: 24, rot: 0,
          cor: '#ffffff', fundo: 'transparent', tamanho: 88, peso: 800,
          alinhamento: 'left', raio: 0,
        } as any);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto?.id]);

  // atalhos de teclado
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); guardar(); }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, nome, formato]);

  /**
   * Guarda. Se vieste de um template, volta para o template; senão, fica um
   * rascunho em Carrosséis.
   */
  async function guardar(): Promise<boolean> {
    setAGuardar(true);
    try {
      const desenho = { kind: 'editor', formato, slides };

      if (modo === 'template' && projetoId) {
        const json = await fetch(`/api/templates/${projetoId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: nome, spec: desenho }),
        }).then((r) => r.json());
        if (json.error) {
          setAviso(json.error);
          return false;
        }
        marcarGuardado();
        setAviso(`Template “${nome}” guardado.`);
        return true;
      }

      const r = await fetch(projetoId ? `/api/carousels/${projetoId}` : '/api/carousels', {
        method: projetoId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: nome, design: desenho }),
      });
      const json = await r.json();
      if (json.error) {
        setAviso(json.error);
        return false;
      }
      marcarGuardado();
      const novoId = json.carousel?.id;
      if (!projetoId && novoId) router.replace(`/editor/${novoId}`);
      return true;
    } finally {
      setAGuardar(false);
    }
  }

  /** Guarda só a estrutura — sem o conteúdo — para reutilizares. */
  async function criarTemplate(nomeTemplate: string) {
    setAGuardar(true);
    try {
      const r = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: nomeTemplate,
          spec: { kind: 'editor', formato, slides },
        }),
      });
      const json = await r.json();
      setAviso(json.error ?? `Template “${nomeTemplate}” guardado em Templates.`);
      setNomeTemplate(null);
    } finally {
      setAGuardar(false);
    }
  }

  async function sair(guardarAntes: boolean) {
    if (guardarAntes && !(await guardar())) return;
    router.push(modo === 'template' ? '/templates' : '/carrosseis');
  }

  /** Exporta todos os slides em sequência, esperando o render de cada um. */
  async function exportarTodos(): Promise<Blob[]> {
    const original = slideAtivo;
    const blobs: Blob[] = [];
    for (let i = 0; i < slides.length; i++) {
      setSlideAtivo(i);
      await new Promise((r) => setTimeout(r, 260));
      blobs.push(await exportarPng(ID_CANVAS, formato));
    }
    setSlideAtivo(original);
    return blobs;
  }

  async function descarregarAtual() {
    const blob = await exportarPng(ID_CANVAS, formato);
    descarregar(blob, `${nome.replace(/\s+/g, '-')}-slide-${slideAtivo + 1}.png`);
  }

  async function descarregarTudo() {
    const blobs = await exportarTodos();
    blobs.forEach((b, i) => descarregar(b, `${nome.replace(/\s+/g, '-')}-${i + 1}.png`));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-edLinha">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="bg-transparent font-semibold text-sm outline-none min-w-0 flex-1
                     focus:bg-edFundo rounded-lg px-2 py-1"
        />

        <div className="flex gap-1">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => (
            <button key={f} onClick={() => setFormato(f)}
              className={`chip ${formato === f ? 'chip-ativo' : ''}`}>{f}</button>
          ))}
        </div>

        <span className="w-px h-6 bg-edLinha mx-1" />

        <button
          onClick={() => setGuiaAberto((g) => !g)}
          className="btn-fantasma p-2"
          title="Como funciona o editor"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
          className="btn-fantasma p-2"
          title={tema === 'escuro' ? 'Passar a claro' : 'Passar a escuro'}
        >
          {tema === 'escuro' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button onClick={desfazer} className="btn-fantasma p-2" title="Desfazer (⌘Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={refazer} className="btn-fantasma p-2" title="Refazer (⇧⌘Z)">
          <Redo2 className="w-4 h-4" />
        </button>

        <button onClick={guardar} className="btn-secundario text-xs" disabled={aGuardar}>
          <Save className="w-3.5 h-3.5" />
          {aGuardar ? 'A guardar…' : sujo ? 'Guardar' : 'Guardado'}
        </button>

        <button
          onClick={() => setNomeTemplate(`${nome} — template`)}
          className="btn-secundario text-xs"
          disabled={aGuardar}
        >
          <LayoutTemplate className="w-3.5 h-3.5" /> Criar template
        </button>

        {guiaAberto && (
          <div className="absolute right-4 top-14 z-40 w-80 rounded-2xl border border-edLinha bg-edSuperficie p-4 text-edTexto shadow-lift">
            <div className="mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-edSuave" />
              <p className="text-sm font-semibold">{GUIAS['/editor'].titulo}</p>
              <button
                onClick={() => setGuiaAberto(false)}
                className="ml-auto rounded-full p-1 text-edSuave transition hover:text-edTexto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ol className="space-y-1.5">
              {GUIAS['/editor'].passos.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-edSuave">
                  <span className="font-semibold text-edTexto">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        )}

        <button
          onClick={() => (sujo ? setASair(true) : sair(false))}
          className="btn-fantasma text-xs"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>

        <div className="relative group">
          <button className="btn-secundario text-xs">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block cartao p-1 w-44 z-50">
            <button onClick={descarregarAtual}
              className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-edFundo">
              Só este slide
            </button>
            <button onClick={descarregarTudo}
              className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-edFundo">
              Todos ({slides.length})
            </button>
          </div>
        </div>
      </div>

      {aviso && (
        <button
          onClick={() => setAviso(null)}
          className="border-b border-edLinha bg-rosa/15 px-4 py-2 text-left text-xs text-brand-soft"
        >
          {aviso} <span className="opacity-60">— clica para fechar</span>
        </button>
      )}

      {nomeTemplate !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="cartao w-full max-w-sm p-6">
            <h2 className="mb-1 text-base font-semibold">Guardar como template</h2>
            <p className="mb-4 text-sm text-edSuave">
              Fica a estrutura deste desenho — posições, cores, tipos de letra. O conteúdo
              volta a ser escrito de cada vez que o usares.
            </p>
            <input
              autoFocus
              className="campo mb-4"
              value={nomeTemplate}
              onChange={(e) => setNomeTemplate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nomeTemplate.trim()) criarTemplate(nomeTemplate.trim());
                if (e.key === 'Escape') setNomeTemplate(null);
              }}
            />
            <div className="flex gap-2">
              <button
                className="btn-primario text-xs"
                disabled={aGuardar || !nomeTemplate.trim()}
                onClick={() => criarTemplate(nomeTemplate.trim())}
              >
                {aGuardar ? 'A guardar…' : 'Guardar template'}
              </button>
              <button className="btn-fantasma ml-auto text-xs" onClick={() => setNomeTemplate(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {aSair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="cartao w-full max-w-sm p-6">
            <h2 className="mb-1 text-base font-semibold">Sair sem guardar?</h2>
            <p className="mb-5 text-sm text-edSuave">
              Tens alterações por guardar. Se guardares,{' '}
              {modo === 'template' ? (
                <>o template é atualizado em <strong className="text-edTexto">Templates</strong>.</>
              ) : (
                <>este carrossel fica em <strong className="text-edTexto">Carrosséis</strong>, como rascunho.</>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primario text-xs" onClick={() => sair(true)} disabled={aGuardar}>
                {aGuardar ? 'A guardar…' : 'Guardar e sair'}
              </button>
              <button className="btn-secundario text-xs" onClick={() => sair(false)}>
                Sair sem guardar
              </button>
              <button className="btn-fantasma ml-auto text-xs" onClick={() => setASair(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <BarraFerramentas userId={userId} />
        <div className="flex-1 flex flex-col min-w-0">
          <BarraRapida />
          <Canvas />
          <TiraSlides />
        </div>
        <PainelPropriedades />
      </div>

    </div>
  );
}

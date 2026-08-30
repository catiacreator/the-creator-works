'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Elemento, Formato, Slide } from './types';

interface Estado {
  projetoId: string | null;
  nome: string;
  formato: Formato;
  slides: Slide[];
  slideAtivo: number;
  selecionado: string | null;
  historico: Slide[][];
  futuro: Slide[][];
  sujo: boolean;
  /** linhas de centragem: aparecem enquanto arrastas, quando encostas ao meio */
  guias: { v: boolean; h: boolean };
}

interface Acoes {
  carregar: (p: { id: string | null; nome: string; formato: Formato; slides: Slide[] }) => void;
  setNome: (n: string) => void;
  setFormato: (f: Formato) => void;
  setSlideAtivo: (i: number) => void;
  selecionar: (id: string | null) => void;

  novoSlide: () => void;
  duplicarSlide: () => void;
  apagarSlide: (i: number) => void;
  moverSlide: (de: number, para: number) => void;
  patchSlide: (patch: Partial<Slide>) => void;
  /** mesmo fundo em todos os slides — cor, imagem e véu */
  patchTodosOsSlides: (patch: Partial<Slide>) => void;
  /** Veste os slides com o desenho de um template, sem perder o texto. */
  aplicarTemplate: (molde: Slide) => void;

  adicionar: (el: Omit<Elemento, 'id' | 'z'>) => void;
  patchElemento: (id: string, patch: Partial<Elemento>) => void;
  apagarElemento: (id: string) => void;
  duplicarElemento: (id: string) => void;
  trazerFrente: (id: string) => void;
  enviarTras: (id: string) => void;

  setGuias: (g: { v: boolean; h: boolean }) => void;
  desfazer: () => void;
  refazer: () => void;
  marcarGuardado: () => void;
}

export const slideVazio = (): Slide => ({
  id: nanoid(8),
  fundoCor: '#FFFFFF',
  fundoEscurecer: 0,
  elementos: [],
});

const MAX_HISTORICO = 50;

export const useEditor = create<Estado & Acoes>((set, get) => ({
  projetoId: null,
  nome: 'Sem título',
  formato: '3:4',
  slides: [slideVazio()],
  slideAtivo: 0,
  selecionado: null,
  historico: [],
  futuro: [],
  sujo: false,
  guias: { v: false, h: false },

  setGuias: (guias) => set({ guias }),

  carregar: ({ id, nome, formato, slides }) =>
    set({
      projetoId: id,
      nome,
      formato,
      slides: slides.length ? slides : [slideVazio()],
      slideAtivo: 0,
      selecionado: null,
      historico: [],
      futuro: [],
      sujo: false,
    }),

  setNome: (nome) => set({ nome, sujo: true }),
  setFormato: (formato) => set({ formato, sujo: true }),
  setSlideAtivo: (slideAtivo) => set({ slideAtivo, selecionado: null }),
  selecionar: (selecionado) => set({ selecionado }),

  novoSlide: () => {
    empurrar(set, get);
    const slides = [...get().slides, slideVazio()];
    set({ slides, slideAtivo: slides.length - 1, selecionado: null, sujo: true });
  },

  duplicarSlide: () => {
    empurrar(set, get);
    const { slides, slideAtivo } = get();
    const copia: Slide = {
      ...structuredClone(slides[slideAtivo]),
      id: nanoid(8),
      elementos: slides[slideAtivo].elementos.map((e) => ({ ...structuredClone(e), id: nanoid(8) })),
    };
    const novos = [...slides];
    novos.splice(slideAtivo + 1, 0, copia);
    set({ slides: novos, slideAtivo: slideAtivo + 1, sujo: true });
  },

  apagarSlide: (i) => {
    const { slides } = get();
    if (slides.length === 1) return;
    empurrar(set, get);
    const novos = slides.filter((_, idx) => idx !== i);
    set({
      slides: novos,
      slideAtivo: Math.max(0, Math.min(get().slideAtivo, novos.length - 1)),
      selecionado: null,
      sujo: true,
    });
  },

  moverSlide: (de, para) => {
    empurrar(set, get);
    const slides = [...get().slides];
    const [s] = slides.splice(de, 1);
    slides.splice(para, 0, s);
    set({ slides, slideAtivo: para, sujo: true });
  },

  patchSlide: (patch) => {
    empurrar(set, get);
    const { slides, slideAtivo } = get();
    const novos = slides.map((s, i) => (i === slideAtivo ? { ...s, ...patch } : s));
    set({ slides: novos, sujo: true });
  },

  patchTodosOsSlides: (patch) => {
    empurrar(set, get);
    set({ slides: get().slides.map((s) => ({ ...s, ...patch })), sujo: true });
  },

  aplicarTemplate: (molde) => {
    empurrar(set, get);
    const ehTexto = (e: Elemento) => e.tipo === 'texto' || e.tipo === 'balao';

    const slides = get().slides.map((slide) => {
      // o texto que já lá está, pela ordem em que aparece
      const textosAntigos = [...slide.elementos]
        .filter(ehTexto)
        .sort((a, b) => a.z - b.z)
        .map((e) => (e as { texto: string }).texto);

      let i = 0;
      const elementos = molde.elementos.map((base) => {
        const novo = { ...structuredClone(base), id: nanoid(8) } as Elemento;
        if (ehTexto(novo)) {
          const antigo = textosAntigos[i++];
          // sem texto para esta caixa, fica o do template (a @, uma assinatura)
          if (antigo !== undefined) (novo as { texto: string }).texto = antigo;
        }
        return novo;
      });

      return {
        ...slide,
        fundoCor: molde.fundoCor,
        // a fotografia é dela — o template não a leva
        fundoEscurecer: molde.fundoEscurecer,
        elementos,
      };
    });

    set({ slides, selecionado: null, sujo: true });
  },

  adicionar: (el) => {
    empurrar(set, get);
    const { slides, slideAtivo } = get();
    const zMax = Math.max(0, ...slides[slideAtivo].elementos.map((e) => e.z));
    const novo = { ...el, id: nanoid(8), z: zMax + 1 } as Elemento;
    const novos = slides.map((s, i) =>
      i === slideAtivo ? { ...s, elementos: [...s.elementos, novo] } : s
    );
    set({ slides: novos, selecionado: novo.id, sujo: true });
  },

  patchElemento: (id, patch) => {
    const { slides, slideAtivo } = get();
    const novos = slides.map((s, i) =>
      i === slideAtivo
        ? { ...s, elementos: s.elementos.map((e) => (e.id === id ? ({ ...e, ...patch } as Elemento) : e)) }
        : s
    );
    set({ slides: novos, sujo: true });
  },

  apagarElemento: (id) => {
    empurrar(set, get);
    const { slides, slideAtivo } = get();
    const novos = slides.map((s, i) =>
      i === slideAtivo ? { ...s, elementos: s.elementos.filter((e) => e.id !== id) } : s
    );
    set({ slides: novos, selecionado: null, sujo: true });
  },

  duplicarElemento: (id) => {
    empurrar(set, get);
    const { slides, slideAtivo } = get();
    const alvo = slides[slideAtivo].elementos.find((e) => e.id === id);
    if (!alvo) return;
    const copia = { ...structuredClone(alvo), id: nanoid(8), x: alvo.x + 3, y: alvo.y + 3, z: alvo.z + 1 };
    const novos = slides.map((s, i) =>
      i === slideAtivo ? { ...s, elementos: [...s.elementos, copia] } : s
    );
    set({ slides: novos, selecionado: copia.id, sujo: true });
  },

  trazerFrente: (id) => {
    const { slides, slideAtivo } = get();
    const zMax = Math.max(0, ...slides[slideAtivo].elementos.map((e) => e.z));
    get().patchElemento(id, { z: zMax + 1 } as Partial<Elemento>);
  },

  enviarTras: (id) => {
    const { slides, slideAtivo } = get();
    const zMin = Math.min(0, ...slides[slideAtivo].elementos.map((e) => e.z));
    get().patchElemento(id, { z: zMin - 1 } as Partial<Elemento>);
  },

  desfazer: () => {
    const { historico, slides, futuro } = get();
    if (!historico.length) return;
    const anterior = historico[historico.length - 1];
    set({
      slides: anterior,
      historico: historico.slice(0, -1),
      futuro: [slides, ...futuro].slice(0, MAX_HISTORICO),
      selecionado: null,
      sujo: true,
    });
  },

  refazer: () => {
    const { futuro, slides, historico } = get();
    if (!futuro.length) return;
    set({
      slides: futuro[0],
      futuro: futuro.slice(1),
      historico: [...historico, slides].slice(-MAX_HISTORICO),
      selecionado: null,
      sujo: true,
    });
  },

  marcarGuardado: () => set({ sujo: false }),
}));

function empurrar(set: any, get: () => Estado) {
  const { historico, slides } = get();
  set({
    historico: [...historico, structuredClone(slides)].slice(-MAX_HISTORICO),
    futuro: [],
  });
}

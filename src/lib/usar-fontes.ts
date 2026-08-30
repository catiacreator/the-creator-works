'use client';

import { useCallback, useEffect, useState } from 'react';
import { FONTES } from './fontes-editor';

export interface FonteDela {
  id: string;
  name: string;
  weight: number;
  url: string | null;
}

/**
 * As fontes dela, carregadas no browser.
 * Registam-se com a FontFace API para o editor as mostrar tal como vão sair
 * no PNG. Ficam no perfil, por isso aparecem em qualquer computador.
 */
export function useFontesDela() {
  const [fontes, setFontes] = useState<FonteDela[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const registar = useCallback((lista: FonteDela[]) => {
    if (typeof window === 'undefined' || !('FontFace' in window)) return;
    for (const f of lista) {
      if (!f.url) continue;
      try {
        const face = new FontFace(f.name, `url(${f.url})`, { weight: String(f.weight) });
        face.load().then((carregada) => document.fonts.add(carregada)).catch(() => {});
      } catch {
        /* uma fonte estragada não pode partir o editor */
      }
    }
  }, []);

  const recarregar = useCallback(async () => {
    const d = await fetch('/api/fontes').then((r) => r.json());
    const lista: FonteDela[] = d.fontes ?? [];
    setFontes(lista);
    registar(lista);
    setACarregar(false);
    return lista;
  }, [registar]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** As da app mais as dela, sem repetidas, prontas para uma lista. */
  const todas = [
    ...FONTES.map((f) => ({ valor: f.valor, nome: f.nome, css: f.css, grupo: f.grupo as string, id: null as string | null })),
    ...[...new Set(fontes.map((f) => f.name))].map((nome) => ({
      valor: nome,
      nome,
      css: `'${nome}', system-ui, sans-serif`,
      grupo: 'Tuas',
      id: fontes.find((f) => f.name === nome)?.id ?? null,
    })),
  ];

  return { fontes, todas, aCarregar, recarregar };
}

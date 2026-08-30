'use client';

/**
 * Paleta de cores do editor — bolinhas, como no Canva.
 * O último círculo abre a roda de cores do sistema.
 */

export const PALETA_CORES = [
  '#FFFFFF', '#000000', '#3A3A3A', '#F7BFD0', '#F09BC0', '#DFA0C8', '#C9A6E9',
  '#B58FCB', '#B0AEEE', '#A9C4E4', '#8ECAF2', '#A5CBD8', '#BFEBD8', '#C3DDBA',
  '#DDF2A5', '#FBFBD0', '#F7E3A0', '#F6DCC0', '#E3A96A', '#EFC9C2', '#E28470',
  '#EE4E8B', '#E63329', '#EE7040', '#F5D33B', '#2F7DF6', '#4FC46A', '#8B5CF6',
  '#C93A66',
];

import { Seccao } from './seccao';

interface Props {
  label: string;
  valor: string;
  set: (c: string) => void;
  /** oferece "sem cor" — faz sentido no fundo do texto, não no do slide */
  comTransparente?: boolean;
  /** abrir logo, para a cor de fundo do slide */
  aberta?: boolean;
}

export function PaletaCores({ label, valor, set, comTransparente = true, aberta = false }: Props) {
  const hex = /^#[0-9a-f]{6}$/i.test(valor) ? valor : '#FFFFFF';
  const igual = (c: string) => valor?.toLowerCase() === c.toLowerCase();
  const anel = (on: boolean) =>
    on ? 'ring-2 ring-rosa ring-offset-2 ring-offset-ink' : 'ring-1 ring-white/15 hover:ring-white/40';

  const amostra = (
    <span className="flex items-center gap-1.5">
      <span
        className="h-4 w-4 rounded-full ring-1 ring-white/25"
        style={{
          background:
            valor === 'transparent'
              ? 'repeating-conic-gradient(#555 0 25%, #888 0 50%) 0 0 / 8px 8px'
              : valor,
        }}
      />
      <span className="font-mono text-[10px] text-edSuave">
        {valor === 'transparent' ? 'sem cor' : valor}
      </span>
    </span>
  );

  return (
    <Seccao titulo={label} resumo={amostra} abertaPorDefeito={aberta}>
      <div>
        <div className="grid grid-cols-7 gap-2">
          {PALETA_CORES.map((c) => (
            <button
              key={c}
              onClick={() => set(c)}
              aria-label={c}
              title={c}
              style={{ background: c }}
              className={`aspect-square w-full rounded-full transition ${anel(igual(c))}`}
            />
          ))}

          {comTransparente && (
            <button
              onClick={() => set('transparent')}
              title="Sem cor"
              aria-label="Sem cor"
              className={`aspect-square w-full rounded-full bg-[repeating-conic-gradient(#555_0_25%,#888_0_50%)] bg-[length:8px_8px] transition ${anel(
                valor === 'transparent',
              )}`}
            />
          )}

          <label
            title="Escolher outra cor"
            className="relative aspect-square w-full cursor-pointer rounded-full ring-1 ring-white/25 transition hover:ring-white/50"
            style={{
              background:
                'conic-gradient(#e63329,#f5d33b,#4fc46a,#2f7df6,#8b5cf6,#ee4e8b,#e63329)',
            }}
          >
            <input
              type="color"
              value={hex}
              onChange={(e) => set(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-edLinha pt-2">
          <span
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/20"
            style={{ background: valor === 'transparent' ? 'transparent' : valor }}
          />
          <input
            value={valor}
            onChange={(e) => set(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-edTexto outline-none"
          />
        </div>
      </div>
    </Seccao>
  );
}

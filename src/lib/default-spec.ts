import type { TemplateSpec } from './types';

/**
 * Template inicial, no estilo dos carrosséis da Cátia:
 * fotografia a sangrar, faixa escura translúcida só atrás do título,
 * título em maiúsculas ao centro e a @ em baixo.
 * Formato 3:4 — 1080×1440.
 *
 * A folha é branca. Quando há fotografia, ela cobre-a de lado a lado; sem
 * fotografia, fica o branco com a faixa escura do título por cima.
 */
export function defaultSpec(): TemplateSpec {
  return {
    width: 1080,
    height: 1440,
    background: '#FFFFFF',
    photo: { mode: 'full-bleed', opacity: 1 },
    // sem véu sobre a foto toda — o escuro é só atrás do texto
    overlay: undefined,
    pager: { show: false, x: 900, y: 1320, color: 'rgba(253,247,228,0.7)', fontSize: 28 },
    boxes: [
      {
        key: 'kicker',
        label: 'Etiqueta de topo (opcional)',
        x: 90,
        y: 90,
        width: 900,
        height: 70,
        fontFamily: 'Inter',
        fontSize: 30,
        lineHeight: 1.2,
        color: '#FDF7E4',
        align: 'center',
        weight: 600,
        uppercase: true,
        letterSpacing: 4,
        maxChars: 30,
        scope: 'all',
        valign: 'top',
        backdrop: { color: 'rgba(20,16,16,0.55)', padding: 14, radius: 8 },
      },
      {
        key: 'titulo',
        label: 'Título — a faixa escura',
        x: 80,
        y: 700,
        width: 920,
        height: 460,
        fontFamily: 'Inter',
        fontSize: 82,
        lineHeight: 1.12,
        color: '#FDF7E4',
        align: 'center',
        weight: 700,
        uppercase: true,
        maxChars: 70,
        scope: 'all',
        valign: 'center',
        backdrop: { color: 'rgba(20,16,16,0.58)', padding: 32, radius: 4 },
      },
      {
        key: 'corpo',
        label: 'Corpo (opcional)',
        x: 110,
        y: 1180,
        width: 860,
        height: 150,
        fontFamily: 'Inter',
        fontSize: 38,
        lineHeight: 1.3,
        color: 'rgba(253,247,228,0.92)',
        align: 'center',
        weight: 400,
        maxChars: 180,
        scope: 'middle',
        valign: 'top',
      },
      {
        key: 'assinatura',
        label: 'A tua @ (em todos os slides)',
        x: 90,
        y: 1330,
        width: 900,
        height: 60,
        fontFamily: 'Inter',
        fontSize: 34,
        lineHeight: 1.2,
        color: '#FDF7E4',
        align: 'center',
        weight: 600,
        scope: 'all',
        valign: 'center',
        fixed: '@catiacreator',
      },
    ],
  };
}

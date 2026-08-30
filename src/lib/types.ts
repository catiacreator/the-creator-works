// ── Especificação de um template local ───────────────────────
// O template do Canva é reproduzido aqui: um fundo fixo + caixas
// de texto posicionadas em coordenadas absolutas (px, na escala
// do template — 1080×1440 (3:4) por defeito).

export type TextAlign = 'left' | 'center' | 'right';

export interface TextBox {
  /** chave do campo, ex.: "titulo", "corpo", "kicker", "cta" */
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  align: TextAlign;
  weight: 400 | 500 | 600 | 700 | 800;
  uppercase?: boolean;
  letterSpacing?: number;
  /** limite sugerido de caracteres — usado no prompt da IA */
  maxChars?: number;
  /** em que slides aparece: 'all' | 'first' | 'last' | 'middle' */
  scope?: 'all' | 'first' | 'last' | 'middle';
  /** alinhamento vertical dentro da caixa */
  valign?: 'top' | 'center' | 'bottom';
  /** faixa translúcida colada ao texto (o teu bloco escuro atrás do título) */
  backdrop?: { color: string; padding?: number; radius?: number };
  /** texto sempre igual — para a tua @ ou uma assinatura. Ignora o conteúdo. */
  fixed?: string;
  /** contorno à volta das letras */
  contorno?: { cor: string; espessura: number };
  /** sombra por baixo das letras */
  sombra?: { cor: string; desfoque: number; x: number; y: number };
}

export interface Overlay {
  /** véu de cor por cima da fotografia, para o texto respirar */
  color: string;   // ex.: 'rgba(20,18,16,0.45)'
  radius?: number;
}

export interface TemplateSpec {
  width: number;
  height: number;
  /** como a fotografia entra no slide */
  photo: {
    mode: 'full-bleed' | 'top' | 'bottom' | 'none';
    /** altura da faixa de foto quando mode != full-bleed (px) */
    band?: number;
    opacity?: number;
  };
  /** cor de fundo por baixo de tudo */
  background: string;
  overlay?: Overlay;
  /** imagem fixa do template (logo, moldura, grafismo) por cima da foto */
  frameUrl?: string;
  boxes: TextBox[];
  /** faixas de cor por baixo do texto, vindas das formas do editor */
  formas?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    radius?: number;
    opacity?: number;
  }>;
  /** paginação "1/7" no canto */
  pager?: { show: boolean; x: number; y: number; color: string; fontSize: number };
}

// ── Conteúdo gerado ──────────────────────────────────────────
export interface SlideContent {
  idx: number;
  fields: Record<string, string>;
}

export interface CarouselContent {
  title: string;
  topic: string;
  caption: string;
  hashtags: string;
  slides: SlideContent[];
}

// ── Linhas da base de dados (subconjunto usado no cliente) ───
export interface TemplateRow {
  id: string;
  name: string;
  engine: 'local' | 'canva';
  width: number;
  height: number;
  bg_path: string | null;
  spec: TemplateSpec;
  canva_brand_template_id: string | null;
  canva_dataset: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  kind: 'upload' | 'ai';
  storage_path: string;
  prompt: string | null;
  width: number | null;
  height: number | null;
  tags: string[];
  folder_id: string | null;
  created_at: string;
}

export interface FolderRow {
  id: string;
  kind: 'foto' | 'carrossel';
  name: string;
  created_at: string;
}

export interface SourceRow {
  id: string;
  name: string;
  kind: 'pdf' | 'docx' | 'txt' | 'drive' | 'text';
  origin: string | null;
  chars: number;
  created_at: string;
}

export interface CarouselRow {
  id: string;
  title: string;
  topic: string | null;
  caption: string | null;
  hashtags: string | null;
  status: 'draft' | 'writing' | 'imaging' | 'rendering' | 'ready' | 'failed';
  template_id: string | null;
  photo_id: string | null;
  batch_id: string | null;
  canva_design_id: string | null;
  error: string | null;
  created_at: string;
}

export interface SlideRow {
  id: string;
  carousel_id: string;
  idx: number;
  fields: Record<string, string>;
  render_path: string | null;
}

export interface BatchRow {
  id: string;
  name: string;
  quantity: number;
  slides_per: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  template_id: string | null;
  topics: string[];
  source_ids: string[];
  created_at: string;
}

// ---------------------------------------------------------------------
// Editor visual — modelo de elementos
// Posições em percentagem do slide, para o desenho escalar em qualquer
// formato. Aproveitado da app Postei.
// ---------------------------------------------------------------------

export type Formato = '3:4' | '4:5' | '1:1' | '9:16';

export const FORMATOS: Record<Formato, { w: number; h: number; label: string }> = {
  '3:4': { w: 1080, h: 1440, label: 'Carrossel (3:4)' },
  '4:5': { w: 1080, h: 1350, label: 'Feed (4:5)' },
  '1:1': { w: 1080, h: 1080, label: 'Quadrado' },
  '9:16': { w: 1080, h: 1920, label: 'Story / Reel' },
};

export type ElementoTipo = 'texto' | 'balao' | 'sticker' | 'imagem' | 'forma';

export interface ElementoBase {
  id: string;
  tipo: ElementoTipo;
  /** percentagens 0-100 relativas ao slide */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
  locked?: boolean;
}

export interface ElementoTexto extends ElementoBase {
  tipo: 'texto' | 'balao';
  texto: string;
  cor: string;
  fundo: string;
  tamanho: number;
  peso: 400 | 600 | 800;
  alinhamento: 'left' | 'center' | 'right';
  raio: number;
  italico?: boolean;
  /** família tipográfica — ver lib/fontes-editor.ts */
  fonte?: string;
  /** contorno à volta das letras */
  contorno?: { cor: string; espessura: number };
  /** sombra por baixo das letras */
  sombra?: { cor: string; desfoque: number; x: number; y: number };
  bico?: 'nenhum' | 'esq' | 'dir';
  /**
   * Liga esta caixa a um campo do carrossel ('titulo', 'corpo', 'kicker'…).
   * Com campo, a fábrica enche-a em cada carrossel do lote.
   * Sem campo, o texto é literal — a tua @, uma assinatura.
   */
  campo?: string | null;
}

export interface ElementoSticker extends ElementoBase {
  tipo: 'sticker';
  valor: string;
}

export interface ElementoImagem extends ElementoBase {
  tipo: 'imagem';
  url: string;
  /** id na biblioteca — o url é assinado e expira, o id não */
  fotoId?: string | null;
  raio: number;
  mockup?: 'nenhum' | 'telemovel' | 'polaroid' | 'browser';
}

export interface ElementoForma extends ElementoBase {
  tipo: 'forma';
  cor: string;
  raio: number;
  opacidade: number;
}

export type Elemento = ElementoTexto | ElementoSticker | ElementoImagem | ElementoForma;

export interface Slide {
  id: string;
  fundoCor: string;
  fundoUrl?: string;
  /** id da fotografia na biblioteca */
  fundoFotoId?: string | null;
  /** 0-100 — véu escuro por cima da fotografia */
  fundoEscurecer: number;
  elementos: Elemento[];
}

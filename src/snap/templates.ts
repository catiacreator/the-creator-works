/**
 * Os 18 templates do CarouselSnap.
 *
 * Trazidos do `src/data/carousel-templates.ts` do Snap sem uma linha mudada.
 * São da Cátia: as cores, as medidas, os pesos das letras, a maneira como o
 * título quebra. É o que faz um carrossel parecer dela.
 *
 * Cada um traz a sua própria função `render(slide, cfg)` que devolve o HTML
 * pronto. É por isso que vieram inteiros e depressa: não precisam de editor
 * nenhum para se desenharem — sabem desenhar-se sozinhos.
 *
 * ── Um aviso a quem lhes mexer ───────────────────────────────
 *
 * Estas funções metem o texto do slide directamente no HTML, sem o escapar:
 *
 *     <p style="...">${slide.title}</p>
 *
 * Quer dizer que um título com `<img src=x onerror=...>` lá dentro executa.
 * No Snap isso quase nunca dá problema — é o texto da própria pessoa, no
 * browser dela. Mas basta um carrossel ser partilhado ou exportado para
 * deixar de ser só dela.
 *
 * NÃO se arranja aqui. Arranja-se à entrada: quem chamar estas funções
 * escapa o texto antes, com o `limparSlide` que está ao lado. Assim os
 * templates ficam exactamente como ela os escreveu, e o buraco fecha-se na
 * mesma. Se um dia forem actualizados a partir do Snap, copiam-se por cima
 * sem se ter de lembrar de nada.
 */

/**
 * CAROUSEL SNAP — 18 TEMPLATES
 * Each template has: id, name, defaults (c1, c2), slides[], and render(slide, cfg) → HTML string
 * cfg = { c1, c2, font, bgUrl }
 * slide = { title, sub, tag }
 */

export interface TemplateSlide {
  label: string;
  title: string;
  sub: string;
  tag: string;
}

export interface TemplateCfg {
  c1: string;
  c2: string;
  font: string;
  bgUrl: string | null;
}

export interface CarouselTemplate {
  id: string;
  name: string;
  defaults: { c1: string; c2: string };
  slides: TemplateSlide[];
  render: (slide: TemplateSlide, cfg: TemplateCfg) => string;
}

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#000000" : "#FFFFFF";
}

function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const TEMPLATES: CarouselTemplate[] = [

  /* 1 — EDITORIAL */
  {
    id: "editorial",
    name: "Editorial",
    defaults: { c1: "#f5f0e8", c2: "#2c2c2c" },
    slides: [
      { label: "Capa", title: "A maioria dos criadores faz isto ao contrário.", sub: "E depois pergunta-se porque é que ninguém lê o segundo slide.", tag: "01" },
      { label: "Ideia 1", title: "O hook não é o primeiro slide. É a primeira frase.", sub: "Podes ter o melhor design do mundo — se a primeira linha não para o scroll, perdeste.", tag: "02" },
      { label: "Ideia 2", title: "Estrutura vende mais do que estética.", sub: "Um carrossel bem estruturado converte mais do que um bonito mas confuso.", tag: "03" },
      { label: "CTA", title: "Grava isto.", sub: "Segue para mais estratégia sem floreados.", tag: "04" },
    ],
    render(slide, cfg) {
      const bg = cfg.bgUrl ? `background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;` : "";
      return `<div style="width:100%;height:100%;background:${cfg.c1};${bg}display:flex;flex-direction:column;justify-content:space-between;padding:10%;font-family:${cfg.font};position:relative;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="width:40px;height:3px;background:${cfg.c2};margin-top:6px;"></div>
    <span style="font-size:14px;color:${hexAlpha(cfg.c2, 0.3)};font-weight:300;">${slide.tag || ""}</span>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:8% 0;">
    <p style="font-size:28px;font-weight:700;color:${cfg.c2};line-height:1.25;margin:0;">${slide.title}</p>
  </div>
  <p style="font-size:14px;color:${hexAlpha(cfg.c2, 0.55)};line-height:1.5;margin:0;">${slide.sub}</p>
</div>`;
    },
  },

  /* 2 — BOLD BLOCK */
  {
    id: "bold",
    name: "Bold Block",
    defaults: { c1: "#1a1a2e", c2: "#e63946" },
    slides: [
      { label: "Capa", title: "PARA DE\nPOSTAR\nSEM\nESTRATÉGIA", sub: "Há uma razão para o teu conteúdo não crescer. E não é o algoritmo.", tag: "NOVO" },
      { label: "Ponto 1", title: "O ALGORITMO NÃO\nTEM CULPA.", sub: "A culpa é tua. Mas podes resolver isso agora.", tag: "#01" },
      { label: "Ponto 2", title: "HOOK É\nTUDO.", sub: "Se o primeiro slide não prende, o resto não interessa.", tag: "#02" },
      { label: "CTA", title: "SEGUE\nE CRESCE.", sub: "Estratégia de conteúdo sem guru. Sem frescuras.", tag: "FIM" },
    ],
    render(slide, cfg) {
      const bg = cfg.bgUrl ? `background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;` : "";
      return `<div style="width:100%;height:100%;background:${cfg.c1};${bg}display:flex;flex-direction:column;justify-content:space-between;padding:10%;font-family:${cfg.font};position:relative;overflow:hidden;">
  <div style="position:absolute;top:-5%;right:-5%;font-size:180px;font-weight:900;color:${hexAlpha(cfg.c2, 0.07)};line-height:1;pointer-events:none;">${(slide.tag || "01").replace(/[^0-9]/g, "") || "01"}</div>
  <span style="display:inline-block;background:${cfg.c2};color:${contrastText(cfg.c2)};padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;align-self:flex-start;">${slide.tag || ""}</span>
  <div style="flex:1;display:flex;align-items:center;">
    <p style="font-size:32px;font-weight:900;color:#ffffff;line-height:1.15;margin:0;text-transform:uppercase;">${slide.title.replace(/\n/g, "<br>")}</p>
  </div>
  <div style="background:${cfg.c2};padding:10px 16px;border-radius:6px;">
    <p style="font-size:13px;color:${contrastText(cfg.c2)};margin:0;line-height:1.4;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 3 — SPLIT */
  {
    id: "split",
    name: "Split",
    defaults: { c1: "#f7f3ed", c2: "#2d2d2d" },
    slides: [
      { label: "Capa", title: "Criadores que crescem fazem isto diferente.", sub: "Não é sorte. É estrutura.", tag: "01" },
      { label: "Item 1", title: "Postam com intenção.", sub: "Cada post tem um objetivo: awareness, consideração ou conversão. Nunca os três ao mesmo tempo.", tag: "02" },
      { label: "Item 2", title: "Conhecem o seu leitor.", sub: "Não falam para toda a gente. Falam para uma pessoa específica.", tag: "03" },
      { label: "CTA", title: "Vai lá começar.", sub: "Um post com estratégia vale mais do que dez ao acaso.", tag: "04" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;display:flex;font-family:${cfg.font};overflow:hidden;">
  <div style="width:35%;background:${cfg.c2};display:flex;flex-direction:column;justify-content:flex-end;padding:8%;">
    <span style="font-size:48px;font-weight:900;color:${hexAlpha('#ffffff', 0.15)};line-height:1;">${slide.tag || "01"}</span>
    <div style="width:30px;height:3px;background:${cfg.c1};margin-top:12px;"></div>
  </div>
  <div style="width:65%;background:${cfg.c1};display:flex;flex-direction:column;justify-content:center;padding:8% 10%;">
    <p style="font-size:24px;font-weight:700;color:${cfg.c2};line-height:1.25;margin:0 0 16px 0;">${slide.title}</p>
    <p style="font-size:13px;color:${hexAlpha(cfg.c2, 0.6)};line-height:1.6;margin:0;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 4 — MINIMAL LINE */
  {
    id: "minimal",
    name: "Minimal Line",
    defaults: { c1: "#ffffff", c2: "#111111" },
    slides: [
      { label: "Capa", title: "O segredo não é postar mais.", sub: "É postar melhor. E há uma diferença enorme entre os dois.", tag: "Intro" },
      { label: "Ideia", title: "Consistência não é frequência.", sub: "É coerência de voz, de tema, de promessa ao teu seguidor.", tag: "01 / 04" },
      { label: "Ideia 2", title: "O teu melhor conteúdo já existe.", sub: "Está nas perguntas que te fazem repetidamente.", tag: "02 / 04" },
      { label: "CTA", title: "Segue para mais.", sub: "Sem gurus. Sem fórmulas milagrosas. Só estratégia.", tag: "Fim" },
    ],
    render(slide, cfg) {
      const bg = cfg.bgUrl ? `background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;` : "";
      return `<div style="width:100%;height:100%;background:${cfg.c1};${bg}display:flex;flex-direction:column;padding:12%;font-family:${cfg.font};position:relative;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8%;">
    <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${hexAlpha(cfg.c2, 0.35)};">Estúdio Creator</span>
    <span style="font-size:11px;color:${hexAlpha(cfg.c2, 0.35)};">${slide.tag || ""}</span>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <p style="font-size:26px;font-weight:600;font-style:italic;color:${cfg.c2};line-height:1.35;margin:0;">${slide.title}</p>
  </div>
  <div style="width:100%;height:1px;background:${hexAlpha(cfg.c2, 0.12)};margin:16px 0;"></div>
  <p style="font-size:13px;color:${hexAlpha(cfg.c2, 0.5)};line-height:1.5;margin:0;">${slide.sub}</p>
</div>`;
    },
  },

  /* 5 — GRADIENT */
  {
    id: "gradient",
    name: "Gradient",
    defaults: { c1: "#667eea", c2: "#764ba2" },
    slides: [
      { label: "Capa", title: "Ninguém para o scroll por acidente.", sub: "Aprende a fazer conteúdo que retém atenção.", tag: "Estratégia" },
      { label: "Dica 1", title: "A primeira frase é o teu filtro.", sub: "Atrai as pessoas certas e repele as erradas. Isso é bom.", tag: "Hook" },
      { label: "Dica 2", title: "Design serve o texto. Não o contrário.", sub: "Um carrossel feio com bom copy converte mais do que um bonito e vazio.", tag: "Design" },
      { label: "CTA", title: "Segue @catiacreator", sub: "Estratégia de Instagram sem floreados.", tag: "CTA" },
    ],
    render(slide, cfg) {
      const bgLayer = cfg.bgUrl
        ? `<div style="position:absolute;inset:0;background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;"></div>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,${cfg.c1},${cfg.c2});"></div>`;
      return `<div style="width:100%;height:100%;position:relative;font-family:${cfg.font};overflow:hidden;">
  ${bgLayer}
  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);"></div>
  <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:10%;">
    <span style="display:inline-block;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:16px;align-self:flex-start;">${slide.tag || ""}</span>
    <p style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;margin:0 0 12px 0;">${slide.title}</p>
    <p style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5;margin:0;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 6 — MONO GRID */
  {
    id: "mono",
    name: "Mono Grid",
    defaults: { c1: "#0d0d0d", c2: "#00ff88" },
    slides: [
      { label: "Capa", title: "// conteúdo.exe\ncarregando estratégia...", sub: "O que os criadores que crescem fazem diferente. Sem filtros.", tag: "v2.4.1" },
      { label: "Linha 1", title: "01 — hook primeiro,\ndesign depois.", sub: "A maioria faz o oposto. E depois pergunta-se porque não cresce.", tag: "sys.log" },
      { label: "Linha 2", title: "02 — consistência\nnão é volume.", sub: "É coerência. Podes postar 3x por semana e crescer mais do que quem posta todos os dias.", tag: "sys.log" },
      { label: "CTA", title: "// seguir @catiacreator", sub: "Estratégia de conteúdo. Sem guru.", tag: "end()" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:'JetBrains Mono',${cfg.font},monospace;display:flex;flex-direction:column;justify-content:space-between;padding:8%;position:relative;overflow:hidden;background-image:radial-gradient(${hexAlpha(cfg.c2, 0.15)} 1px,transparent 1px);background-size:16px 16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;color:${hexAlpha(cfg.c2, 0.5)};letter-spacing:1px;">CAROUSEL_SNAP</span>
    <span style="font-size:10px;color:${hexAlpha(cfg.c2, 0.5)};">${slide.tag || "v1.0"}</span>
  </div>
  <div style="flex:1;display:flex;align-items:center;padding:6% 0;">
    <div>
      <p style="font-size:22px;font-weight:700;color:${cfg.c2};line-height:1.4;margin:0 0 16px 0;">${slide.title.replace(/\n/g, "<br>")}</p>
      <p style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;margin:0;">${slide.sub}</p>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:9px;color:rgba(255,255,255,0.25);">STATUS: OK</span>
    <span style="font-size:10px;color:${hexAlpha(cfg.c2, 0.4)};">■ ■ □</span>
  </div>
</div>`;
    },
  },

  /* 7 — STACKED */
  {
    id: "stacked",
    name: "Stacked",
    defaults: { c1: "#fafafa", c2: "#ff4500" },
    slides: [
      { label: "Capa", title: "3 razões para o teu Instagram não crescer", sub: "1. Estás a postar para toda a gente\n2. O hook é fraco\n3. Não há estrutura nos slides", tag: "" },
      { label: "Razão 1", title: "Motivos", sub: "1. Estás a postar para toda a gente\n2. O hook é fraco\n3. Não há estrutura nos slides", tag: "" },
      { label: "Razão 2", title: "O que fazer", sub: "1. Define um leitor específico\n2. Começa com uma afirmação forte\n3. Cada slide tem uma ideia só", tag: "" },
      { label: "CTA", title: "Salva este post", sub: "1. Vai precisar mais tarde\n2. Partilha com um criador\n3. Segue para mais", tag: "" },
    ],
    render(slide, cfg) {
      const items = slide.sub.split("\n").filter(Boolean);
      const itemsHtml = items.length > 1
        ? items.map((it, i) => `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;${i < items.length - 1 ? `border-bottom:1px solid ${hexAlpha(cfg.c2, 0.1)};` : ""}">
    <span style="font-size:20px;font-weight:800;color:${cfg.c2};min-width:32px;">0${i + 1}</span>
    <p style="font-size:13px;color:#333;line-height:1.5;margin:0;">${it.replace(/^\d+\.\s*/, "")}</p>
  </div>`).join("")
        : `<p style="font-size:13px;color:#333;line-height:1.5;padding:12px 0;margin:0;">${slide.sub}</p>`;
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;overflow:hidden;">
  <div style="background:${cfg.c2};padding:10% 10% 8%;">
    <p style="font-size:24px;font-weight:800;color:${contrastText(cfg.c2)};line-height:1.2;margin:0;">${slide.title}</p>
  </div>
  <div style="flex:1;padding:6% 10%;overflow:hidden;">${itemsHtml}</div>
</div>`;
    },
  },

  /* 8 — MAGAZINE */
  {
    id: "magazine",
    name: "Magazine",
    defaults: { c1: "#ffffff", c2: "#1d3557" },
    slides: [
      { label: "Capa", title: "O algoritmo não é teu inimigo.", sub: "por @catiacreator", tag: "Estratégia" },
      { label: "Artigo 1", title: "O problema não é o alcance. É o que fazes com ele.", sub: "por @catiacreator", tag: "Insight" },
      { label: "Artigo 2", title: "Criadores que crescem não têm mais talento. Têm mais estrutura.", sub: "por @catiacreator", tag: "Análise" },
      { label: "CTA", title: "Segue para mais análises sem floreados.", sub: "por @catiacreator", tag: "CTA" },
    ],
    render(slide, cfg) {
      const imgHtml = cfg.bgUrl
        ? `<div style="width:100%;height:45%;background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;"></div>`
        : `<div style="width:100%;height:45%;background:${cfg.c2};"></div>`;
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;overflow:hidden;">
  ${imgHtml}
  <div style="flex:1;padding:8% 10%;display:flex;flex-direction:column;justify-content:center;">
    <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${cfg.c2};font-weight:600;margin-bottom:10px;">${slide.tag || ""}</span>
    <p style="font-size:22px;font-weight:700;color:${cfg.c2};line-height:1.3;margin:0 0 12px 0;">${slide.title}</p>
    <p style="font-size:12px;color:${hexAlpha(cfg.c2, 0.5)};margin:0;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 9 — QUOTE */
  {
    id: "quote",
    name: "Quote",
    defaults: { c1: "#818cf8", c2: "#1e1b4b" },
    slides: [
      { label: "Capa", title: "«A diferença entre os criadores que crescem e os que estagnaram é simples: estrutura.»", sub: "— Cátia Creator", tag: "" },
      { label: "Citação 1", title: "«Não precisas de mais seguidores. Precisas de melhores conteúdos para os que já tens.»", sub: "— Cátia Creator", tag: "" },
      { label: "Citação 2", title: "«O teu conteúdo não é o problema. É a forma como o estruturas.»", sub: "— Cátia Creator", tag: "" },
      { label: "CTA", title: "«Segue e aprende a postar com estratégia, de verdade.»", sub: "— @catiacreator", tag: "" },
    ],
    render(slide, cfg) {
      const bg = cfg.bgUrl ? `background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;` : "";
      return `<div style="width:100%;height:100%;background:${cfg.c2};${bg}font-family:${cfg.font};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:12%;text-align:center;position:relative;">
  <span style="font-size:64px;color:${cfg.c1};line-height:1;margin-bottom:16px;opacity:0.6;">"</span>
  <p style="font-size:22px;font-weight:600;font-style:italic;color:${cfg.c1};line-height:1.4;margin:0 0 24px 0;">${slide.title}</p>
  <p style="font-size:12px;color:${hexAlpha('#ffffff', 0.5)};margin:0;">${slide.sub}</p>
</div>`;
    },
  },

  /* 10 — STEP CARD */
  {
    id: "step",
    name: "Step Card",
    defaults: { c1: "#f0faf5", c2: "#059669" },
    slides: [
      { label: "Capa", title: "Como criar carrosséis que convertem em 5 passos.", sub: "Sem fórmulas milagrosas. Só estrutura.", tag: "0" },
      { label: "Passo 1", title: "Define o teu leitor antes de escrever uma palavra.", sub: "Não fales para toda a gente. Fala para uma pessoa. O alcance vem depois.", tag: "1" },
      { label: "Passo 2", title: "O primeiro slide é o único que importa a princípio.", sub: "Se não para o scroll, o resto é invisível. Começa sempre pelo hook.", tag: "2" },
      { label: "CTA", title: "Salva este post e volta quando fores criar.", sub: "Vais precisar dele.", tag: "✓" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:10%;text-align:center;">
  <div style="width:64px;height:64px;border-radius:50%;background:${cfg.c2};display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
    <span style="font-size:24px;font-weight:800;color:${contrastText(cfg.c2)};">${slide.tag || "1"}</span>
  </div>
  <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${hexAlpha(cfg.c2, 0.6)};margin-bottom:16px;">Passo ${slide.tag || "1"} de 5</span>
  <p style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 14px 0;">${slide.title}</p>
  <p style="font-size:13px;color:${hexAlpha('#1a1a1a', 0.55)};line-height:1.5;margin:0;">${slide.sub}</p>
</div>`;
    },
  },

  /* 11 — DUOTONE */
  {
    id: "duotone",
    name: "Duotone",
    defaults: { c1: "#f72585", c2: "#3a0ca3" },
    slides: [
      { label: "Capa", title: "Para de tentar ser viral.", sub: "Foca-te em ser relevante para as pessoas certas. O viral vem por acidente.", tag: "" },
      { label: "Contraste", title: "Antes:\npostar todos os dias", sub: "Depois: postar com intenção 3x por semana e crescer mais.", tag: "" },
      { label: "Contraste 2", title: "Antes:\ncopiar o que funciona", sub: "Depois: adaptar à tua voz e ao teu leitor específico.", tag: "" },
      { label: "CTA", title: "Segue @catiacreator", sub: "Estratégia. Sem guru. Sem motivacional.", tag: "" },
    ],
    render(slide, cfg) {
      const [top, ...rest] = slide.title.split("\n");
      return `<div style="width:100%;height:100%;font-family:${cfg.font};display:flex;flex-direction:column;overflow:hidden;">
  <div style="height:45%;background:${cfg.c1};display:flex;align-items:flex-end;padding:8% 10%;">
    <p style="font-size:28px;font-weight:800;color:${contrastText(cfg.c1)};line-height:1.2;margin:0;">${top}</p>
  </div>
  <div style="height:55%;background:${cfg.c2};padding:8% 10%;display:flex;flex-direction:column;justify-content:center;">
    ${rest.length ? `<p style="font-size:20px;font-weight:700;color:${contrastText(cfg.c2)};line-height:1.3;margin:0 0 12px 0;">${rest.join(" ")}</p>` : ""}
    <p style="font-size:13px;color:${hexAlpha(contrastText(cfg.c2), 0.7)};line-height:1.5;margin:0;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 12 — OUTLINE */
  {
    id: "outline",
    name: "Outline",
    defaults: { c1: "#ffffff", c2: "#111111" },
    slides: [
      { label: "Capa", title: "ESTRATÉGIA\nNÃO É\nMÁGIA", sub: "É trabalho com estrutura.", tag: "" },
      { label: "Ponto 1", title: "HOOK\nTUDO\nO RESTO\nVEM DEPOIS", sub: "A primeira frase decide tudo.", tag: "" },
      { label: "Ponto 2", title: "VOZ\nÉ O\nTEU\nATIVO", sub: "Não podes ser copiado se és genuíno.", tag: "" },
      { label: "CTA", title: "SEGUE\nE CRESCE\nCOM\nESTRATÉGIA", sub: "@catiacreator", tag: "" },
    ],
    render(slide, cfg) {
      const bg = cfg.bgUrl ? `background-image:url('${cfg.bgUrl}');background-size:cover;background-position:center;` : "";
      return `<div style="width:100%;height:100%;background:${cfg.c1};${bg}font-family:${cfg.font};display:flex;align-items:center;justify-content:center;padding:6%;position:relative;">
  <div style="width:100%;height:100%;border:2px solid ${cfg.c2};display:flex;align-items:center;justify-content:center;position:relative;">
    <div style="position:absolute;inset:6px;border:1px solid ${hexAlpha(cfg.c2, 0.2)};pointer-events:none;"></div>
    <div style="text-align:center;padding:10%;">
      <p style="font-size:30px;font-weight:900;color:${cfg.c2};line-height:1.15;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:2px;">${slide.title.replace(/\n/g, "<br>")}</p>
      <p style="font-size:12px;color:${hexAlpha(cfg.c2, 0.5)};margin:0;">${slide.sub}</p>
    </div>
  </div>
</div>`;
    },
  },

  /* 13 — CLAUDE WARM */
  {
    id: "claude-warm",
    name: "Claude Warm",
    defaults: { c1: "#f9f6f0", c2: "#c8622a" },
    slides: [
      { label: "Capa", title: "A maioria dos criadores posta. Poucos comunicam.", sub: "Há uma diferença enorme — e está toda na estrutura.", tag: "Estúdio Creator" },
      { label: "Ideia 1", title: "O hook não é o título. É a primeira emoção.", sub: "A frase que para o scroll não informa — provoca.", tag: "01 — Hook" },
      { label: "Ideia 2", title: "Cada slide tem de ganhar o próximo.", sub: "Não é design. É promessa. Cada slide cria expectativa para o seguinte.", tag: "02 — Estrutura" },
      { label: "CTA", title: "Segue para mais estratégia sem floreados.", sub: "@catiacreator — Estúdio Creator", tag: "CTA" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;justify-content:space-between;padding:10%;">
  <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${cfg.c2};font-weight:600;">${slide.tag || ""}</span>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:8% 0;">
    <div style="width:36px;height:3px;background:${cfg.c2};margin-bottom:20px;"></div>
    <p style="font-size:24px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0;">${slide.title}</p>
  </div>
  <p style="font-size:13px;color:${hexAlpha('#1a1a1a', 0.5)};line-height:1.5;margin:0;">${slide.sub}</p>
</div>`;
    },
  },

  /* 14 — CLAUDE CARD */
  {
    id: "claude-card",
    name: "Claude Card",
    defaults: { c1: "#f4f0ea", c2: "#c8622a" },
    slides: [
      { label: "Capa", title: "O que muda quando posts com estratégia", sub: "Não é magia. É estrutura aplicada de forma consistente.", tag: "CS" },
      { label: "Insight 1", title: "O alcance deixa de ser acidente.", sub: "Quando sabes o que estás a comunicar e para quem, o algoritmo torna-se irrelevante.", tag: "01" },
      { label: "Insight 2", title: "O teu tempo vale mais.", sub: "Um post com estrutura demora o mesmo a fazer — mas converte 10x mais.", tag: "02" },
      { label: "CTA", title: "Começa hoje. Um post de cada vez.", sub: "Segue @catiacreator para estratégia sem guru.", tag: "→" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;align-items:center;justify-content:center;padding:8%;">
  <div style="width:100%;background:#ffffff;border-radius:16px;padding:10%;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:36px;height:36px;border-radius:8px;background:${cfg.c2};display:flex;align-items:center;justify-content:center;">
        <span style="font-size:12px;font-weight:800;color:${contrastText(cfg.c2)};">${slide.tag || "CS"}</span>
      </div>
      <span style="font-size:11px;color:${hexAlpha('#1a1a1a', 0.4)};font-weight:500;">Estúdio Creator</span>
    </div>
    <p style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 12px 0;">${slide.title}</p>
    <p style="font-size:13px;color:${hexAlpha('#1a1a1a', 0.5)};line-height:1.5;margin:0 0 20px 0;">${slide.sub}</p>
    <span style="font-size:10px;color:${hexAlpha('#1a1a1a', 0.3)};">@catiacreator — Carousel Snap</span>
  </div>
</div>`;
    },
  },

  /* 15 — CLAUDE PROSE */
  {
    id: "claude-prose",
    name: "Claude Prose",
    defaults: { c1: "#faf8f5", c2: "#bf5c26" },
    slides: [
      { label: "Capa", title: "Porque é que o teu conteúdo não cresce", sub: "Não é o algoritmo. Não é a frequência. É outra coisa.", tag: "01 / 05" },
      { label: "Razão 1", title: "Estás a falar para toda a gente.", sub: "Conteúdo genérico não ressoa com ninguém. Escolhe uma pessoa específica e fala só para ela.", tag: "02 / 05" },
      { label: "Razão 2", title: "O teu hook não provoca nada.", sub: "A primeira frase tem de criar uma emoção — curiosidade, reconhecimento, discordância.", tag: "03 / 05" },
      { label: "CTA", title: "Salva este post.", sub: "E quando fores criar o próximo conteúdo, volta aqui.", tag: "05 / 05" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;padding:10%;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:6%;">
    <span style="font-size:32px;font-weight:800;color:${cfg.c2};">${(slide.tag || "01").split(" ")[0]}</span>
    <div style="flex:1;height:1px;background:${hexAlpha(cfg.c2, 0.2)};"></div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <p style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 16px 0;">${slide.title}</p>
    <p style="font-size:14px;color:${hexAlpha('#1a1a1a', 0.55)};line-height:1.7;margin:0;">${slide.sub}</p>
  </div>
  <span style="font-size:10px;color:${hexAlpha('#1a1a1a', 0.3)};margin-top:auto;">@catiacreator — Estúdio Creator</span>
</div>`;
    },
  },

  /* 16 — CLAUDE CLEAN */
  {
    id: "claude-clean",
    name: "Claude Clean",
    defaults: { c1: "#ffffff", c2: "#c8622a" },
    slides: [
      { label: "Capa", title: "Postar não é o mesmo que comunicar.", sub: "A diferença está na estrutura. E a estrutura aprende-se.", tag: "Estratégia" },
      { label: "Ponto 1", title: "A voz é o teu ativo mais difícil de copiar.", sub: "O design copia-se. A estratégia copia-se. A voz genuína, não.", tag: "Voz" },
      { label: "Ponto 2", title: "Consistência não é postar todos os dias.", sub: "É manter a mesma promessa ao teu leitor, independentemente da frequência.", tag: "Consistência" },
      { label: "CTA", title: "Segue @catiacreator para mais.", sub: "Estratégia de conteúdo sem fórmulas milagrosas.", tag: "CTA" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;position:relative;overflow:hidden;">
  <div style="width:100%;height:4px;background:${cfg.c2};"></div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:10%;">
    <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${cfg.c2};font-weight:600;">${slide.tag || ""}</span>
    <div style="flex:1;display:flex;align-items:center;">
      <p style="font-size:24px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0;">${slide.title}</p>
    </div>
    <div>
      <p style="font-size:13px;color:${hexAlpha('#1a1a1a', 0.5)};line-height:1.5;margin:0 0 16px 0;">${slide.sub}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;color:${hexAlpha('#1a1a1a', 0.3)};">Estúdio Creator</span>
        <span style="font-size:9px;color:${cfg.c2};">@catiacreator</span>
      </div>
    </div>
  </div>
</div>`;
    },
  },

  /* 17 — CLAUDE DARK */
  {
    id: "claude-dark",
    name: "Claude Dark",
    defaults: { c1: "#1c1713", c2: "#e8845c" },
    slides: [
      { label: "Capa", title: "Há criadores com 1k seguidores que convertem mais do que outros com 100k.", sub: "O número de seguidores não é o indicador certo.", tag: "Estúdio Creator" },
      { label: "Insight 1", title: "Alcance sem relevância é ruído.", sub: "Prefere 500 pessoas certas a 50.000 indiferentes.", tag: "01 — Alcance" },
      { label: "Insight 2", title: "A voz é o que faz alguém ficar.", sub: "Não o design. Não a frequência. A sensação de 'esta pessoa fala para mim'.", tag: "02 — Voz" },
      { label: "CTA", title: "Segue para aprender a postar com intenção.", sub: "@catiacreator — Estúdio Creator by Cátia", tag: "→ Segue" },
    ],
    render(slide, cfg) {
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;justify-content:space-between;padding:10%;position:relative;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${cfg.c2};font-weight:600;">${slide.tag || ""}</span>
    <div style="width:8px;height:8px;border-radius:50%;background:${cfg.c2};"></div>
  </div>
  <div style="flex:1;display:flex;align-items:center;padding:8% 0;">
    <p style="font-size:24px;font-weight:700;color:#f5f0e8;line-height:1.3;margin:0;">${slide.title}</p>
  </div>
  <div style="border-top:1px solid ${hexAlpha(cfg.c2, 0.2)};padding-top:12px;">
    <p style="font-size:13px;color:${hexAlpha('#f5f0e8', 0.5)};line-height:1.5;margin:0;">${slide.sub}</p>
  </div>
</div>`;
    },
  },

  /* 18 — CLAUDE LIST */
  {
    id: "claude-list",
    name: "Claude List",
    defaults: { c1: "#f9f6f0", c2: "#c8622a" },
    slides: [
      { label: "Capa", title: "5 sinais de que o teu conteúdo precisa de estrutura", sub: "01. Poucos saves\n02. Pouco tempo de leitura\n03. Nenhum clique no perfil\n04. Seguidores mas sem vendas\n05. Crescimento estagnado", tag: "" },
      { label: "Solução", title: "O que fazer agora mesmo", sub: "01. Define o teu leitor específico\n02. Reescreve o hook do teu último post\n03. Adiciona um CTA claro\n04. Verifica se cada slide tem uma ideia só\n05. Testa e itera", tag: "" },
      { label: "Regras", title: "A regra de ouro do carrossel", sub: "01. Hook que para o scroll\n02. Slides que justificam o swipe\n03. CTA que pede uma ação concreta\n04. Consistência na voz\n05. Valor antes de vender", tag: "" },
      { label: "CTA", title: "Segue @catiacreator", sub: "01. Estratégia sem guru\n02. Conteúdo prático\n03. Posts que funcionam mesmo\n04. Comunidade de criadores\n05. Sem fórmulas milagrosas", tag: "" },
    ],
    render(slide, cfg) {
      const items = slide.sub.split("\n").filter(Boolean);
      const itemsHtml = items
        .map((it) => {
          const text = it.replace(/^\d+\.\s*/, "");
          return `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
    <div style="width:20px;height:20px;border-radius:50%;background:${cfg.c2};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
      <span style="font-size:9px;font-weight:700;color:${contrastText(cfg.c2)};">✓</span>
    </div>
    <p style="font-size:13px;color:#1a1a1a;line-height:1.5;margin:0;">${text}</p>
  </div>`;
        })
        .join("");
      return `<div style="width:100%;height:100%;background:${cfg.c1};font-family:${cfg.font};display:flex;flex-direction:column;padding:10%;">
  <p style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 24px 0;">${slide.title}</p>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${itemsHtml}</div>
</div>`;
    },
  },
];

export function getTemplate(id: string): CarouselTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export const TEMPLATE_LIST = TEMPLATES.map(({ id, name, defaults }) => ({ id, name, defaults }));

/**
 * Limpar um slide antes de o entregar a um template.
 *
 * Os `render` acima confiam no que recebem e metem-no no HTML tal e qual.
 * Esta é a porta por onde o texto passa antes de lá chegar: o que for
 * marcação deixa de o ser, e passa a ser as letras que a pessoa escreveu.
 *
 * Só se escapam os cinco caracteres que importam. As quebras de linha ficam
 * como estão — há templates que as trocam por <br> de propósito, e esse <br>
 * é escrito pelo template, não pela pessoa.
 *
 * Para texto normal — que é todo o texto — o resultado no ecrã é o mesmo.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function limparSlide(slide: TemplateSlide): TemplateSlide {
  return {
    label: slide.label,
    title: escapar(slide.title ?? ''),
    sub: escapar(slide.sub ?? ''),
    tag: escapar(slide.tag ?? ''),
  };
}

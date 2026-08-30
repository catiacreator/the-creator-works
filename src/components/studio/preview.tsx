'use client';

import { corDoTexto, hexParaRgba, normalizar, type Estilo } from '@/lib/studio-estilos';

/**
 * A pré-visualização de um slide.
 * A geometria é a mesma do render: 3:4, margem de 6%, a caixa a subir e a
 * descer pela mesma conta — o que se vê aqui é o que sai no ficheiro.
 */
export function SlidePreview({
  estilo: cru,
  foto,
  texto,
  handle,
  arredondado = true,
}: {
  estilo: Estilo;
  foto?: string | null;
  texto: string;
  handle?: string;
  arredondado?: boolean;
}) {
  const estilo = normalizar(cru);

  return (
    <div
      className={`overflow-hidden ${arredondado ? 'rounded-xl border border-sand' : ''}`}
    >
      <div
        className="relative aspect-[3/4]"
        style={{
          background: foto ? `url(${foto}) center/cover` : estilo.corFundo,
          fontFamily: estilo.fonte,
        }}
      >
        <div className="absolute inset-[6%]">
          <div
            className="absolute left-0 flex overflow-hidden px-3 py-2.5 leading-snug"
            style={{
              top: estilo.caixaFixa
                ? `${(estilo.caixaY / 100) * Math.max(0, 100 - estilo.caixaAltura)}%`
                : `${estilo.caixaY}%`,
              transform: estilo.caixaFixa ? 'none' : `translateY(-${estilo.caixaY}%)`,
              width: estilo.caixaFixa ? `${estilo.caixaLargura}%` : '100%',
              height: estilo.caixaFixa ? `${estilo.caixaAltura}%` : 'auto',
              alignItems: estilo.caixaFixa ? 'center' : 'flex-start',
              background: hexParaRgba(estilo.corCaixa, estilo.opacidadeCaixa),
              borderRadius: estilo.raio,
              fontSize: estilo.tamanho * 0.62,
              fontWeight: 700,
              color: corDoTexto(estilo),
            }}
          >
            <span className="line-clamp-6">{texto}</span>
          </div>
        </div>

        {handle && (
          <span
            className="absolute bottom-[3%] left-0 w-full text-center font-semibold text-white/80"
            style={{ fontSize: 9 }}
          >
            {handle}
          </span>
        )}
      </div>
    </div>
  );
}

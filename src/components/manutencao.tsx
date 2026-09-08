import { Wrench } from 'lucide-react';

/** O que se vê quando uma página está fechada para obras. */
export function Manutencao({ nome }: { nome: string }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-creme text-ink">
        <Wrench className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {nome} está <span className="text-rosa">em manutenção</span>
      </h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Estamos a mexer nesta página. Volta daqui a bocado — o resto da app continua a funcionar
        normalmente.
      </p>
    </div>
  );
}

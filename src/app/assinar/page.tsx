import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, ExternalLink, Flame } from 'lucide-react';
import { GUARDA, INCLUI, TECTO, haOndePagar, precos } from '@/lib/assinatura';

export const metadata: Metadata = {
  title: 'The Creator Works — assinar',
  description: 'Um mês de conteúdo para o Instagram numa tarde. 49 € por mês.',
};

/**
 * A página de vendas.
 *
 * É a única página da app aberta a quem não tem conta — a app é privada, e
 * esta é a porta. O botão vai direito ao link de pagamento do Stripe; quando
 * a cobrança passa, o webhook faz o lugar e manda o email para escolher a
 * palavra-passe. Ninguém tem de tratar de nada à mão.
 *
 * Os links vêm do ambiente, lidos a cada pedido — ver src/lib/assinatura.ts.
 */
export const dynamic = 'force-dynamic';

export default function AssinarPage() {
  const lista = precos();
  const pagar = lista.filter((p) => p.link);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 text-center">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosaSuave">
          <Flame className="h-5 w-5 text-rosa" />
        </span>
        <h1 className="mb-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Um mês de conteúdo numa tarde
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted">
          Colas o teu texto — ou um PDF, ou um Word — e sai um carrossel de
          Instagram pronto a publicar, no teu visual e com a tua voz. Sem
          desenhar slide a slide, sem começar do zero de cada vez.
        </p>
      </header>

      {/* ── o cartão do preço ─────────────────────── */}
      <section className="mb-10">
        <div className="card mx-auto max-w-md">
          <p className="label">Assinatura</p>

          <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {lista.map((p, i) => (
              <span key={p.moeda} className="flex items-baseline gap-3">
                {i > 0 && <span className="text-muted">ou</span>}
                <span className="text-3xl font-semibold">{p.valor}</span>
              </span>
            ))}
          </div>
          <p className="mb-6 text-sm text-muted">por mês · cancelas quando quiseres</p>

          <ul className="mb-6 space-y-2.5">
            {INCLUI.map((linha) => (
              <li key={linha} className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />
                <span>{linha}</span>
              </li>
            ))}
          </ul>

          <div className="mb-6 rounded-xl bg-creme px-4 py-3 text-xs leading-relaxed text-muted">
            <p className="mb-1 font-semibold text-ink">O que está incluído, ao certo</p>
            {TECTO}. Guardas {GUARDA.join(', ')}. Os carrosséis que fazes
            descarregas para o teu computador — a app não os guarda por ti.
          </div>

          {haOndePagar(lista) ? (
            <div className="space-y-2">
              {pagar.map((p) => (
                <a
                  key={p.moeda}
                  href={p.link!}
                  className="btn-primary w-full justify-center"
                  rel="noopener noreferrer"
                >
                  Assinar por {p.valor}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ))}
              <p className="pt-1 text-center text-xs leading-relaxed text-muted">
                Pagamento no Stripe. A seguir recebes um email para escolheres a
                palavra-passe e entras.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-creme px-4 py-3 text-sm leading-relaxed text-muted">
              Os pagamentos ainda não estão ligados. Volta daqui a pouco.
            </p>
          )}
        </div>
      </section>

      {/* ── as perguntas de sempre ────────────────── */}
      <section className="mx-auto max-w-md space-y-5 text-sm leading-relaxed">
        <div>
          <p className="mb-1 font-semibold">Posso cancelar?</p>
          <p className="text-muted">
            Quando quiseres, no Stripe. Ficas com acesso até ao fim do mês que
            pagaste.
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold">O que acontece se não pagar?</p>
          <p className="text-muted">
            A app fecha-se e mostra-te um botão para renovares. Nada do que
            fizeste se perde — volta tudo assim que pagares.
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold">Preciso de saber desenhar?</p>
          <p className="text-muted">
            Não. Escolhes um estilo e a app compõe os slides. Se quiseres mexer,
            o Editor está lá.
          </p>
        </div>
      </section>

      <footer className="mt-14 text-center text-xs text-muted">
        Já tens conta?{' '}
        <Link href="/login" className="underline hover:text-ink">
          Entra por aqui
        </Link>
      </footer>
    </main>
  );
}

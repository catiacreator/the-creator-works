'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ArrowRight, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Passo = 'codigo' | 'conta' | 'feito';

/**
 * A porta de entrada de quem comprou.
 *
 * Não há registo aberto nesta app — quem paga recebe um código dela, e é o
 * código que abre a conta. Sem código não se passa daqui, e a página não
 * está ligada a lado nenhum: o endereço vai com o código, na compra.
 */
export default function AcessoPage() {
  const [passo, setPasso] = useState<Passo>('codigo');
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [palavra, setPalavra] = useState('');
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('codigo_valido', { c: codigo.trim() });
    setBusy(false);

    if (error) return setErro(error.message);
    if (!data) {
      return setErro('Este código não serve — ou já foi usado, ou passou da validade.');
    }
    setPasso('conta');
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (palavra.length < 8) return setErro('A palavra-passe tem de ter pelo menos 8 caracteres.');

    setBusy(true);
    const supabase = createClient();

    // 1. o lugar na app fica guardado para este email, e o código gasta um uso
    const { data: papel, error: erroDoCodigo } = await supabase.rpc('resgatar_codigo', {
      c: codigo.trim(),
      e: email.trim(),
    });

    if (erroDoCodigo || !papel) {
      setBusy(false);
      return setErro(
        erroDoCodigo?.message ?? 'Este código deixou de servir enquanto preenchias. Fala comigo.',
      );
    }

    // 2. a conta em si
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: palavra,
      options: {
        data: { full_name: nome.trim() || null },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setBusy(false);
    if (error) {
      return setErro(
        /already/i.test(error.message)
          ? 'Já existe conta com este email. Entra pela página de login.'
          : error.message,
      );
    }

    // sem sessão de volta quer dizer que o Supabase mandou email de confirmação
    setPrecisaConfirmar(!data.session);
    if (data.session) await supabase.auth.signOut();
    setPasso('feito');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src="/the-creator-works.png"
          alt="The Creator Works"
          className="mb-2 h-9 w-auto dark:hidden"
        />
        <img
          src="/the-creator-works-escuro.png"
          alt="The Creator Works"
          className="mb-2 hidden h-9 w-auto dark:block"
        />
        {/* eslint-enable @next/next/no-img-element */}

        {passo === 'codigo' && (
          <>
            <p className="mb-8 text-sm text-muted">
              Recebeste um código quando compraste. É com ele que se abre a porta.
            </p>

            <form onSubmit={verificarCodigo} className="card space-y-4">
              <div>
                <label className="label" htmlFor="codigo">
                  Código de acesso
                </label>
                <input
                  id="codigo"
                  required
                  autoFocus
                  className="input text-center text-lg font-semibold uppercase tracking-[0.2em]"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="••••••"
                />
              </div>

              {erro && <p className="text-sm text-rose-700">{erro}</p>}

              <button className="btn-primary w-full" disabled={busy}>
                <KeyRound className="h-4 w-4" />
                {busy ? 'A verificar…' : 'Continuar'}
              </button>
            </form>
          </>
        )}

        {passo === 'conta' && (
          <>
            <p className="mb-8 text-sm text-muted">
              Código aceite. Falta só a conta com que vais entrar.
            </p>

            <form onSubmit={criarConta} className="card space-y-4">
              <div>
                <label className="label" htmlFor="nome">
                  Como te chamas
                </label>
                <input
                  id="nome"
                  autoFocus
                  className="input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="O teu nome"
                />
              </div>

              <div>
                <label className="label" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@exemplo.com"
                />
              </div>

              <div>
                <label className="label" htmlFor="palavra">
                  Palavra-passe
                </label>
                <input
                  id="palavra"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="input"
                  value={palavra}
                  onChange={(e) => setPalavra(e.target.value)}
                  placeholder="pelo menos 8 caracteres"
                />
              </div>

              {erro && <p className="text-sm text-rose-700">{erro}</p>}

              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'A criar…' : 'Criar a minha conta'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        )}

        {passo === 'feito' && (
          <div className="card space-y-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rosaSuave text-ink">
              <Mail className="h-5 w-5" strokeWidth={1.8} />
            </span>

            <div>
              <h1 className="mb-1 text-lg font-semibold tracking-tight">
                {precisaConfirmar ? 'Confirma o teu email' : 'Conta criada'}
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                {precisaConfirmar ? (
                  <>
                    Enviámos um email para <strong className="text-ink">{email}</strong>. Abre-o
                    para confirmar que és tu, e depois entra aqui.
                  </>
                ) : (
                  <>
                    Já podes entrar com <strong className="text-ink">{email}</strong> e a
                    palavra-passe que escolheste.
                  </>
                )}
              </p>
            </div>

            <Link href="/login" className="btn-primary w-full">
              Ir para a entrada
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Já tens conta?{' '}
          <Link href="/login" className="underline-offset-2 hover:text-ink hover:underline">
            Entra por aqui
          </Link>
        </p>
      </div>
    </div>
  );
}

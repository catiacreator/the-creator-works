'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { migracaoEmFalta } from '@/lib/migracoes';
import { comBase } from '@/lib/caminho';

/**
 * Criar conta, sem código nenhum.
 *
 * As outras três maneiras de entrar — o código de convite, o bilhete do
 * CarouselSnap, a compra anunciada pelo webhook — dependem todas de outra
 * pessoa ou de outro sistema ter feito alguma coisa primeiro. Quem chegava
 * sem nada disso não tinha por onde começar.
 *
 * O lugar na app não se pede aqui: pede-o a função `registar_me`, já com a
 * sessão aberta, e o email dela vem do token e não deste formulário. É por
 * isso que ninguém consegue dar lugar ao email de outra pessoa a partir
 * daqui — nem reactivar o de alguém que foi posto fora.
 *
 * Com a confirmação por email ligada no Supabase, o `signUp` não devolve
 * sessão nenhuma. Nesse caso não há token, não há lugar, e a pessoa tem de
 * confirmar primeiro — é o `/auth/callback` que trata do resto quando ela
 * voltar pelo link.
 */
export default function RegistarPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [palavra, setPalavra] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (palavra.length < 8) return setErro('A palavra-passe tem de ter pelo menos 8 caracteres.');

    setBusy(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: palavra,
      options: {
        data: { full_name: nome.trim() || null },
        emailRedirectTo: `${window.location.origin}${comBase('/auth/callback')}`,
      },
    });

    if (error) {
      setBusy(false);
      return setErro(
        /already/i.test(error.message)
          ? 'Já existe conta com este email. Entra pela página de login.'
          : error.message,
      );
    }

    // sem sessão de volta quer dizer que o Supabase mandou email de
    // confirmação: o lugar fica para quando ela voltar pelo link
    if (!data.session) {
      setBusy(false);
      return setConfirmar(true);
    }

    const { error: erroDoLugar } = await supabase.rpc('registar_me', { nome: nome.trim() });
    setBusy(false);
    if (erroDoLugar) {
      return setErro(
        migracaoEmFalta(erroDoLugar) ??
          'A conta ficou feita, mas não consegui abrir-te lugar. Fala com a Cátia.',
      );
    }

    window.location.href = comBase('/');
  }

  if (confirmar) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="card text-sm leading-relaxed">
            <p className="mb-2 font-semibold text-ink">Falta confirmar o email.</p>
            <p className="text-muted">
              Enviámos uma mensagem para <strong>{email}</strong>. Abre o link que lá
              está e entras logo a seguir. Se não aparecer, vê o lixo eletrónico.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={comBase('/the-creator-works.png')}
          alt="The Creator Works"
          className="mb-2 h-9 w-auto dark:hidden"
        />
        <img
          src={comBase('/the-creator-works-escuro.png')}
          alt="The Creator Works"
          className="mb-2 hidden h-9 w-auto dark:block"
        />
        {/* eslint-enable @next/next/no-img-element */}

        <p className="mb-8 text-sm text-muted">Cria a tua conta.</p>

        <form onSubmit={criar} className="card space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Nome
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              className="input w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="input w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              Palavra-passe
            </span>
            <input
              type="password"
              required
              value={palavra}
              onChange={(e) => setPalavra(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="input w-full"
            />
            <span className="mt-1.5 block text-[12px] text-muted">Pelo menos 8 caracteres.</span>
          </label>

          {erro && <p className="text-sm text-rosa">{erro}</p>}

          <button type="submit" disabled={busy} className="btn-principal w-full">
            {busy ? 'A criar…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tens conta?{' '}
          <Link href="/login" className="underline underline-offset-2 hover:text-ink">
            Entra por aqui
          </Link>
        </p>
      </div>
    </div>
  );
}

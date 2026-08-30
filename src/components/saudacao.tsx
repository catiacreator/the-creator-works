'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * "Bem-vinda, Cátia".
 * O género vem do briefing (Sobre mim); o nome, do perfil da conta. Se ainda
 * não houver nome, pergunta-se aqui mesmo — uma vez só.
 */
export function Saudacao() {
  const [nome, setNome] = useState<string | null>(null);
  const [genero, setGenero] = useState<string>('');
  const [rascunho, setRascunho] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    fetch('/api/perfil')
      .then((r) => r.json())
      .then((d) => {
        setNome(d.nome ?? '');
        setGenero((d.briefing ?? {}).genero ?? '');
      });
  }, []);

  async function guardar() {
    const limpo = rascunho.trim();
    if (!limpo) return;
    setAGuardar(true);
    await fetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: limpo }),
    });
    setNome(limpo);
    setAGuardar(false);
  }

  if (nome === null) return <span className="inline-block h-9" />;

  const bemVindo =
    genero === 'Homem' ? 'Bem-vindo' : genero === 'Mulher' ? 'Bem-vinda' : 'Bem-vindo/a';

  if (!nome) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[30px] font-semibold tracking-tight">{bemVindo}!</span>
        <span className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1.5">
          <input
            className="w-32 bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="como te chamas?"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guardar()}
          />
          <button
            onClick={guardar}
            disabled={aGuardar || !rascunho.trim()}
            className="rounded-full p-1 text-muted transition hover:bg-creme hover:text-rosa disabled:opacity-40"
            title="Guardar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <span className="text-[30px] font-semibold tracking-tight">
      {bemVindo}, <span className="text-rosa">{nome}</span>
    </span>
  );
}

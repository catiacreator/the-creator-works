import { ok, withUser } from '@/lib/api';
import { acessoDe } from '@/lib/acesso';
import { carregarMatriz } from '@/lib/papeis-servidor';
import { pode, type Papel } from '@/lib/papeis';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export const runtime = 'nodejs';

async function exigirAdmin(supabase: SupabaseClient, user: User) {
  const acesso = await acessoDe(supabase, user.email);
  const matriz = await carregarMatriz(supabase);
  if (!pode(acesso?.papel, 'gerir-pessoas', matriz)) {
    throw new Error('Só a admin mexe nos códigos.');
  }
}

/** Letras e números sem os que se confundem a ler em voz alta (0/O, 1/I). */
function novoCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += letras[Math.floor(Math.random() * letras.length)];
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export const GET = withUser(async ({ user, supabase }) => {
  await exigirAdmin(supabase, user);
  const { data, error } = await supabase
    .from('codigos')
    .select('codigo, papel, nota, usos, usos_max, expira, ativo, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ok({ codigos: data ?? [] });
});

export const POST = withUser(async ({ user, supabase, request }) => {
  await exigirAdmin(supabase, user);
  const body = (await request.json()) as {
    papel?: Papel;
    nota?: string;
    usos_max?: number;
    expira?: string | null;
  };

  const { data, error } = await supabase
    .from('codigos')
    .insert({
      codigo: novoCodigo(),
      papel: body.papel ?? 'aluno',
      nota: body.nota?.trim() || null,
      usos_max: Math.max(1, Math.min(500, body.usos_max ?? 1)),
      expira: body.expira || null,
      criado_por: user.email,
    })
    .select('codigo, papel, nota, usos, usos_max, expira, ativo, created_at')
    .single();

  if (error) {
    throw new Error(
      /row-level security/i.test(error.message)
        ? 'A base de dados não te reconhece como admin nesta conta. Entra com o email da dona da app.'
        : error.message,
    );
  }
  return ok({ codigo: data });
});

/** Desligar e voltar a ligar um código. */
export const PATCH = withUser(async ({ user, supabase, request }) => {
  await exigirAdmin(supabase, user);
  const { codigo, ativo } = (await request.json()) as { codigo?: string; ativo?: boolean };
  if (!codigo) throw new Error('Falta dizer qual.');

  const { data, error } = await supabase
    .from('codigos')
    .update({ ativo: Boolean(ativo) })
    .eq('codigo', codigo)
    .select('codigo');

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('A base de dados não deixou guardar.');
  return ok();
});

export const DELETE = withUser(async ({ user, supabase, request }) => {
  await exigirAdmin(supabase, user);
  const codigo = new URL(request.url).searchParams.get('codigo');
  if (!codigo) throw new Error('Falta dizer qual.');

  const { data, error } = await supabase
    .from('codigos')
    .delete()
    .eq('codigo', codigo)
    .select('codigo');

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('A base de dados não deixou remover.');
  return ok();
});

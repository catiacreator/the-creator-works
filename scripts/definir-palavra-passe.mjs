/**
 * Define a palavra-passe de uma conta da app, sem passar por email nenhum.
 *
 *   npm run palavra-passe                 → catiacreator@gmail.com
 *   npm run palavra-passe -- outro@mail   → outra conta
 *
 * A palavra-passe é escrita aqui no terminal, não aparece no ecrã e não fica
 * gravada em lado nenhum: vai direta para o Supabase com a chave service-role
 * do .env.local. Se a conta ainda não existir, é criada já confirmada.
 */
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.argv[2] ?? 'catiacreator@gmail.com';

/** Lê o .env.local à mão — o script corre fora do Next. */
function ambiente() {
  const env = {};
  for (const ficheiro of ['.env.local', '.env']) {
    let texto;
    try {
      texto = readFileSync(new URL(`../${ficheiro}`, import.meta.url), 'utf8');
    } catch {
      continue;
    }
    for (const linha of texto.split('\n')) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

/** Pergunta sem mostrar o que se escreve. */
function perguntar(pergunta) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const escrever = rl._writeToOutput?.bind(rl);
    let escondido = false;
    rl._writeToOutput = (s) => {
      if (escondido && !s.includes(pergunta)) return;
      escrever?.(s);
    };
    rl.question(pergunta, (resposta) => {
      rl.close();
      process.stdout.write('\n');
      resolve(resposta);
    });
    escondido = true;
  });
}

const env = ambiente();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const chave = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error(
    'Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local.',
  );
  process.exit(1);
}

const nova = await perguntar(`Palavra-passe nova para ${EMAIL} (não aparece no ecrã): `);
if (nova.length < 8) {
  console.error('Tem de ter pelo menos 8 caracteres. Nada foi alterado.');
  process.exit(1);
}
const outra = await perguntar('Outra vez, para confirmar: ');
if (nova !== outra) {
  console.error('As duas não são iguais. Nada foi alterado.');
  process.exit(1);
}

const admin = createClient(url, chave, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Procura a conta pelo email, página a página. */
async function procurar(email) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (achado) return achado;
    if (data.users.length < 200) return null;
  }
  return null;
}

const conta = await procurar(EMAIL);

if (conta) {
  const { error } = await admin.auth.admin.updateUserById(conta.id, { password: nova });
  if (error) {
    console.error('Não deu:', error.message);
    process.exit(1);
  }
  console.log(`Pronto. ${EMAIL} já entra com palavra-passe.`);
} else {
  const { error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: nova,
    email_confirm: true,
  });
  if (error) {
    console.error('Não deu:', error.message);
    process.exit(1);
  }
  console.log(`Conta ${EMAIL} criada e já com palavra-passe.`);
}

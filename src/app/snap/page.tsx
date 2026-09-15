import Link from 'next/link';
import { Clapperboard, Images, MessageCircle, Sparkles, Type } from 'lucide-react';
import { getUser } from '@/lib/supabase/server';

/**
 * A porta da casa.
 *
 * É esta a página que o CarouselSnap mostra a quem entra — o `Welcome.tsx`
 * dele, com os cartões por onde se escolhe o que fazer hoje. Vem tal e qual:
 * os mesmos cartões, a mesma ordem, as mesmas cores, o mesmo "Escolhe por
 * onde queres começar hoje".
 *
 * Três coisas mudam, e são todas do facto de as duas apps passarem a viver
 * na mesma morada:
 *
 *   **O Creator Works deixa de ser um link para fora.** Lá era um site
 *   diferente, com um bilhete assinado a fazer a travessia. Aqui é o andar
 *   de cima — carrega e está lá, sem voltar a entrar.
 *
 *   **Sai o cadeado do Pro.** Lá o cartão do Creator Works vinha fechado a
 *   quem não tivesse o plano; aqui quem está dentro está dentro, e a
 *   assinatura já foi conferida à porta.
 *
 *   **O cavalo é um ícone.** O desenho original está guardado no Lovable e
 *   não veio no código; até vir, fica um ícone no mesmo laranja.
 */

interface Cartao {
  nome: string;
  descricao: string;
  icone: React.ElementType;
  href: string;
  fora?: boolean;
  cor: string;
}

const CARTOES: Cartao[] = [
  {
    nome: 'The Creator Works',
    descricao:
      'Cria os melhores roteiros em todos os formatos disponíveis do Instagram.',
    icone: Clapperboard,
    href: '/criar',
    cor: '#D6528A',
  },
  {
    nome: 'Carousel Snap',
    descricao: 'Cria carrosséis com IA a partir de um tema ou de um documento.',
    icone: Images,
    href: '/snap/drop',
    cor: '#ff3b00',
  },
  {
    nome: 'carrossel.studio',
    descricao:
      'O ChatGPT ou o Claude deram-te 20 ou mais carrosséis? Cola aqui todos que nós fazemos o resto.',
    icone: Sparkles,
    href: '/snap/estudio',
    cor: '#7c3aed',
  },
  {
    nome: 'Ganchos',
    descricao: 'Cem aberturas prontas. Carrega numa para copiar.',
    icone: Type,
    href: '/snap/ganchos',
    cor: '#0ea5e9',
  },
  {
    nome: 'Grupo do WhatsApp',
    descricao: 'Partilha de ideias e conteúdos em alta.',
    icone: MessageCircle,
    href: 'https://chat.whatsapp.com/De5LbpTAsQHJEGbcTFrufR?s=sh&p=i&mlu=0&ilr=4',
    fora: true,
    cor: '#25D366',
  },
];

function Cartao({ cartao }: { cartao: Cartao }) {
  const Icone = cartao.icone;
  return (
    <Link
      href={cartao.href}
      {...(cartao.fora ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex flex-col items-start gap-4 rounded-2xl border border-snapBorda bg-snapCartao p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-snapDestaque/40 hover:shadow-lg"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: cartao.cor }}
      >
        <Icone className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-snapTexto">{cartao.nome}</h3>
        <p className="text-sm leading-snug text-snapApagado">{cartao.descricao}</p>
      </div>
    </Link>
  );
}

export default async function SnapInicio() {
  const user = await getUser();
  // o nome só aparece se houver um; o email inteiro no cabeçalho era feio e
  // não era saudação nenhuma
  const nome = (user?.email ?? '').split('@')[0] || 'criador';

  return (
    <div className="py-4">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-widest text-snapApagado">Bem-vindo</p>
        <h1 className="mt-2 text-3xl font-bold text-snapTexto md:text-4xl">
          Olá, <span className="text-snapDestaque">{nome}</span> 👋
        </h1>
        <p className="mt-2 text-snapApagado">Escolhe por onde queres começar hoje.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((c) => (
          <Cartao key={c.nome} cartao={c} />
        ))}
      </section>
    </div>
  );
}

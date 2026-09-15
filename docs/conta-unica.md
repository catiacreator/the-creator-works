# Uma conta só

O objectivo: quem entra no CarouselSnap e quem entra no Creator Works usa a
mesma conta e a mesma palavra-passe. Hoje não usa, e este documento diz
porquê, o que é preciso, e por que ordem.

Escrito a partir das duas bases de dados, não de memória.

---

## 1. Porque é que hoje são duas contas

Não é o domínio. É a base de dados.

|  | Creator Works | CarouselSnap |
|---|---|---|
| onde corre | Vercel | Lovable |
| projeto Supabase | **A** | **B** |
| tabela de contas | `auth.users` de A | `auth.users` de B |

Cada projeto de Supabase tem o seu próprio `auth.users`. A conta
`catiacreator@gmail.com` em A e a conta `catiacreator@gmail.com` em B são
**duas linhas em duas bases de dados diferentes**, com ids diferentes e
palavras-passe diferentes. Não há nada partilhado entre elas — nem podia
haver, porque não se falam.

Enquanto forem dois projetos, são duas contas. Não há definição nenhuma que
mude isso.

## 2. O que é «uma conta só», em concreto

As duas apps passarem a autenticar-se contra **o mesmo projeto de Supabase**.
A partir daí há um `auth.users` só, e entrar num lado é estar entrado no
outro.

**Qual dos dois fica?** O **B**, o do CarouselSnap. Não é por ser melhor: é
por ser onde estão os clientes a pagar, as assinaturas, o histórico de
carrosséis e trinta e cinco tabelas de coisas. Mover essas pessoas é mover o
negócio. Mover o Creator Works é mover software.

Ou seja: **o Creator Works muda-se para a Supabase do CarouselSnap.**

## 3. O que torna isto fazível

Duas coisas que já verifiquei:

**Nenhuma tabela choca.** As 17 do Creator Works e as 35 do Snap não têm um
nome em comum. As migrações daqui correm por cima das de lá sem partir nada.

**As migrações estão todas escritas.** São 29 ficheiros em
`supabase/migrations/`, por ordem, e foram feitas para correr de novo sem
estragar (`if not exists`, `create or replace`).

## 4. O que torna isto difícil

### Os ids mudam

Nove tabelas do Creator Works não guardam o email — guardam o `user_id`, que
é o id da linha em `auth.users`:

```
campanhas   carrossel_versoes   consumos   folders   fonts
historias   hot_topics          memorias   profile_analyses
```

Mais a `settings`, que é onde vive o briefing.

O id da conta dela em A **não é** o id da conta dela em B. Copiar estas
tabelas tal e qual põe o trabalho de cada pessoa debaixo do id errado — ou
de id nenhum. Cada linha tem de ser reescrita, atravessando pelo email:

```sql
-- o mapa: email → id novo. Faz-se uma vez, e usa-se em todas as tabelas.
create temp table mapa as
select a.id as id_antigo, b.id as id_novo
from users_exportados a
join auth.users b on lower(b.email) = lower(a.email);
```

Quem tiver conta num lado e não no outro não aparece no mapa. Essas pessoas
têm de ser decididas à mão, uma a uma — não há regra automática que sirva.

### A tabela `settings` não existe nas migrações

É onde está o **briefing** — as vinte e uma respostas de cada pessoa, e a
coisa mais valiosa que cada uma tem cá dentro. As migrações só lhe fazem
`alter table`; nenhuma a cria. Foi feita à mão na Supabase A, algures antes
destas migrações existirem.

Numa Supabase nova ela não nasce. Tem de ser criada antes de tudo o resto:

```sql
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  briefing jsonb,
  perfil text,
  perfil_origem text,
  perfil_atualizado_em timestamptz,
  studio_styles jsonb
);

alter table public.settings enable row level security;

create policy "cada um vê o seu" on public.settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

*(As colunas vêm das migrações 003, 005 e 010. Antes de correr isto,
confirmar na Supabela A se há mais alguma coluna lá que as migrações não
mencionem — foi feita à mão, e o que está à mão não está escrito.)*

### Duas ideias de «quem é esta pessoa»

Os nomes não chocam, mas os conceitos sim:

| o conceito | Creator Works | CarouselSnap |
|---|---|---|
| a pessoa e o que pode | `membros` + `papeis` | `profiles` + `user_roles` |
| quanto já gastou | `consumos` | `usage_tracking` + `subscription_grants` |
| códigos de convite | `codigos` | `access_codes` |
| a porta da admin | `chaves_admin` (scrypt) | `ADMIN_PASSWORD` (texto simples) |

Não é preciso resolver isto para ter uma conta só — o `auth.users` partilhado
já dá o login único, e o `membros` pode continuar a ser só «quem tem acesso
ao Creator Works», que é uma pergunta diferente de «quem tem o Pro do Snap».

Mas há uma que vale a pena resolver ao mesmo tempo, porque é a que dá dinheiro:
**o acesso ao Creator Works passar a ser lido do `subscription_grants` do
Snap** em vez da `membros`. Aí, quem compra o Pro tem o Creator Works no
mesmo instante, sem bilhete, sem webhook, sem código. É o que se anda a
tentar fazer o dia todo por caminhos tortos.

## 5. A ordem

1. **Exportar a Supabase A inteira.** Antes de tocar em nada. É a única
   maneira de voltar atrás.
2. **Criar a `settings` na B** (acima), e correr as 29 migrações do Creator
   Works na B.
3. **Exportar as contas da A** (`auth.users`: id, email) e montar o mapa.
4. **Copiar as tabelas do Creator Works** de A para B, reescrevendo os
   `user_id` pelo mapa. A `membros` vai pelo email e não precisa de mapa.
5. **Decidir à mão** quem ficou de fora do mapa: contas que existem em A e
   não em B. São as pessoas que têm Creator Works e nunca tiveram Snap.
6. **Mudar as três variáveis na Vercel** — `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — para as da
   B. Redeploy.
7. **Confirmar com uma conta de teste** antes de dizer a alguém que mudou.
8. **Só depois**, e como passo separado, ligar o acesso ao
   `subscription_grants`.
9. **Desligar a ponte.** O `/entrar`, o `PASSAGEM_SEGREDO`, as `passagens`,
   as `recusas` — tudo isso existe para atravessar entre duas casas. Com uma
   casa só, é um sítio onde alguém se engana.

## 6. O que eu não consigo fazer, e porquê

Não tenho acesso a nenhuma das duas bases de dados. As credenciais que tenho
aqui são fictícias — servem para o servidor arrancar e mais nada. Também não
tenho acesso ao projeto do Lovable.

O que posso fazer: escrever cada passo em SQL, conferi-lo, e mudar o código
do Creator Works onde for preciso. O que tem de ser feito por ela, ou pelo
Lovable: correr, e pôr as chaves na Vercel.

**O que preciso para avançar**, por ordem de utilidade:

1. A lista de colunas real da tabela `settings` na Supabase A
   (`select column_name, data_type from information_schema.columns where
   table_name = 'settings';`). Sem isso estou a adivinhar a partir dos
   `alter table`.
2. Quantas contas há em cada lado, e quantas existem nas duas
   (`select count(*) from auth.users;` em cada uma).

Nenhuma destas respostas é um segredo. Com elas, escrevo o SQL da mudança
inteira.

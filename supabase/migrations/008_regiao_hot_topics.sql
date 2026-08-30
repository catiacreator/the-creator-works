-- A Última hora deixa de ser só de Portugal: cada assunto sabe de onde veio.
alter table public.hot_topics
  add column if not exists regiao text not null default 'global';

create index if not exists hot_topics_regiao_idx
  on public.hot_topics (user_id, regiao, created_at desc);

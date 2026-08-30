-- ============================================================
-- CCreator Lab — esquema Supabase
-- Correr no SQL Editor do projeto Supabase (uma vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Perfis ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Definições do utilizador ─────────────────────────────────
create table if not exists public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  openai_key_enc   text,                       -- cifrada (AES-256-GCM)
  text_model       text not null default 'gpt-5',
  image_model      text not null default 'gpt-image-1.5',
  render_engine    text not null default 'local' check (render_engine in ('local','canva')),
  brand_voice      text,                       -- descrição da voz/tom para a IA
  image_style      text,                       -- estilo visual base para as fotografias geradas
  updated_at       timestamptz not null default now()
);

-- ── Integrações OAuth (Canva, Google Drive) ──────────────────
create table if not exists public.integrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null check (provider in ('canva','google')),
  access_token_enc  text not null,
  refresh_token_enc text,
  expires_at        timestamptz,
  scope             text,
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (user_id, provider)
);

-- ── Templates ────────────────────────────────────────────────
-- engine = 'local'  → renderizado pela app a partir de bg_path + spec
-- engine = 'canva'  → autofill via Canva Connect (exige Canva Enterprise)
create table if not exists public.templates (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  name                     text not null,
  engine                   text not null default 'local' check (engine in ('local','canva')),
  width                    int  not null default 1080,
  height                   int  not null default 1350,
  bg_path                  text,               -- storage: fundo fixo do template (opcional)
  spec                     jsonb not null default '{}'::jsonb,  -- ver lib/types.ts → TemplateSpec
  canva_brand_template_id  text,
  canva_dataset            jsonb,              -- campos autofilláveis devolvidos pelo Canva
  is_default               boolean not null default false,
  created_at               timestamptz not null default now()
);
create index if not exists templates_user_idx on public.templates(user_id);

-- ── Biblioteca de fotografias ────────────────────────────────
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null default 'upload' check (kind in ('upload','ai')),
  storage_path  text not null,
  prompt        text,
  width         int,
  height        int,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists photos_user_idx on public.photos(user_id, created_at desc);

-- ── Fontes de conteúdo (PDF / DOCX / TXT / Drive / texto) ────
create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('pdf','docx','txt','drive','text')),
  origin      text,                 -- nome do ficheiro ou id do Drive
  content     text not null default '',
  chars       int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists sources_user_idx on public.sources(user_id, created_at desc);

-- ── Lotes ────────────────────────────────────────────────────
create table if not exists public.batches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  template_id  uuid references public.templates(id) on delete set null,
  source_ids   uuid[] not null default '{}',
  topics       text[] not null default '{}',
  quantity     int  not null default 5,
  slides_per   int  not null default 7,
  config       jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending','running','done','failed','cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists batches_user_idx on public.batches(user_id, created_at desc);

-- ── Carrosséis ───────────────────────────────────────────────
create table if not exists public.carousels (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  batch_id       uuid references public.batches(id) on delete set null,
  template_id    uuid references public.templates(id) on delete set null,
  source_id      uuid references public.sources(id) on delete set null,
  photo_id       uuid references public.photos(id) on delete set null,
  title          text not null default 'Sem título',
  topic          text,
  caption        text,
  hashtags       text,
  status         text not null default 'draft'
                 check (status in ('draft','writing','imaging','rendering','ready','failed')),
  canva_design_id text,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists carousels_user_idx on public.carousels(user_id, created_at desc);

-- ── Slides ───────────────────────────────────────────────────
create table if not exists public.slides (
  id            uuid primary key default gen_random_uuid(),
  carousel_id   uuid not null references public.carousels(id) on delete cascade,
  idx           int  not null,
  fields        jsonb not null default '{}'::jsonb,  -- { titulo, corpo, kicker, cta, ... }
  render_path   text,                                 -- storage: PNG final
  created_at    timestamptz not null default now(),
  unique (carousel_id, idx)
);

-- ── Fila de trabalhos ────────────────────────────────────────
create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  batch_id     uuid references public.batches(id) on delete cascade,
  carousel_id  uuid references public.carousels(id) on delete cascade,
  type         text not null check (type in ('write','image','render','canva')),
  status       text not null default 'queued'
               check (status in ('queued','running','done','failed')),
  attempts     int  not null default 0,
  payload      jsonb not null default '{}'::jsonb,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists jobs_queue_idx on public.jobs(status, created_at);

-- ── Chat ─────────────────────────────────────────────────────
create table if not exists public.chat_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Nova conversa',
  created_at  timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null default '',
  photo_id    uuid references public.photos(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.settings       enable row level security;
alter table public.integrations   enable row level security;
alter table public.templates      enable row level security;
alter table public.photos         enable row level security;
alter table public.sources        enable row level security;
alter table public.batches        enable row level security;
alter table public.carousels      enable row level security;
alter table public.slides         enable row level security;
alter table public.jobs           enable row level security;
alter table public.chat_threads   enable row level security;
alter table public.chat_messages  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'settings','integrations','templates','photos','sources',
    'batches','carousels','jobs','chat_threads','chat_messages'
  ] loop
    execute format('drop policy if exists "own_%1$s" on public.%1$I;', t);
    execute format(
      'create policy "own_%1$s" on public.%1$I
         for all using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own_slides" on public.slides;
create policy "own_slides" on public.slides
  for all using (
    exists (select 1 from public.carousels c
            where c.id = slides.carousel_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carousels c
            where c.id = slides.carousel_id and c.user_id = auth.uid())
  );

-- ============================================================
-- Storage
-- ============================================================
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

drop policy if exists "assets_own" on storage.objects;
create policy "assets_own" on storage.objects
  for all
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- CCreator Lab — pastas para fotografias e carrosséis
-- Correr no SQL Editor depois do schema.sql.
-- ============================================================

create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('foto','carrossel')),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- não deixa duas pastas com o mesmo nome no mesmo sítio
create unique index if not exists folders_user_kind_name_idx
  on public.folders (user_id, kind, lower(name));

alter table public.folders enable row level security;

drop policy if exists "own_folders" on public.folders;
create policy "own_folders" on public.folders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Apagar a pasta não apaga o que está lá dentro: fica sem pasta.
alter table public.photos
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

alter table public.carousels
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists photos_folder_idx    on public.photos (user_id, folder_id);
create index if not exists carousels_folder_idx on public.carousels (user_id, folder_id);

-- Passa as pastas antigas (guardadas em tags) para a tabela nova.
do $$
declare r record; fid uuid;
begin
  for r in
    select distinct user_id, tags[1] as nome
    from public.photos
    where array_length(tags, 1) >= 1 and tags[1] <> ''
  loop
    insert into public.folders (user_id, kind, name)
    values (r.user_id, 'foto', r.nome)
    on conflict do nothing;

    select id into fid from public.folders
    where user_id = r.user_id and kind = 'foto' and lower(name) = lower(r.nome);

    update public.photos set folder_id = fid
    where user_id = r.user_id and tags[1] = r.nome and folder_id is null;
  end loop;
end $$;

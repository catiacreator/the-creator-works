-- As imagens que vêm de uma notícia não são fotografias dela: vivem só dentro
-- do carrossel que as trouxe e não aparecem na biblioteca.
alter table public.photos drop constraint if exists photos_kind_check;

alter table public.photos
  add constraint photos_kind_check
  check (kind in ('upload', 'ai', 'efemera'));

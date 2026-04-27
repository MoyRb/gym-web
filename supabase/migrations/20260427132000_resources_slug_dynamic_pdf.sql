alter table public.resources
add column if not exists slug text;

update public.resources
set slug = coalesce(
  nullif(slug, ''),
  nullif(regexp_replace(split_part(file_url, '/', array_length(string_to_array(file_url, '/'), 1)), '\\.pdf$', ''), ''),
  trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
)
where slug is null or slug = '';

with duplicated as (
  select id, slug, row_number() over (partition by slug order by created_at, id) as rn
  from public.resources
)
update public.resources r
set slug = r.slug || '-' || substr(r.id::text, 1, 8)
from duplicated d
where r.id = d.id
  and d.rn > 1;

alter table public.resources
alter column slug set not null;

create unique index if not exists resources_slug_idx on public.resources(slug);

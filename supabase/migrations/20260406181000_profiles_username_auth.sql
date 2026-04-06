alter table public.profiles
add column if not exists username text;

update public.profiles
set username = coalesce(
  username,
  nullif(
    lower(regexp_replace(split_part(coalesce(u.email, ''), '@', 1), '[^a-z0-9._-]', '', 'g')),
    ''
  ),
  'user_' || left(replace(public.profiles.id::text, '-', ''), 12)
)
from auth.users u
where u.id = public.profiles.id
  and (public.profiles.username is null or public.profiles.username = '');

alter table public.profiles
alter column username set not null;

create unique index if not exists profiles_username_unique_idx
on public.profiles (username);

alter table public.profiles
drop constraint if exists profiles_username_format_check;

alter table public.profiles
add constraint profiles_username_format_check
check (username ~ '^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set username = excluded.username,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

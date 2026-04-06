create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_username text;
  metadata_full_name text;
  fallback_username text;
begin
  metadata_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  metadata_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  fallback_username := nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '');

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(metadata_username, fallback_username, 'user_' || left(replace(new.id::text, '-', ''), 12)),
    coalesce(metadata_full_name, fallback_username)
  )
  on conflict (id) do update
  set username = coalesce(
        nullif(trim(excluded.username), ''),
        public.profiles.username
      ),
      full_name = coalesce(
        nullif(trim(excluded.full_name), ''),
        public.profiles.full_name
      );

  return new;
end;
$$;

-- profiles upsert compatibility
--
-- useProfile.saveProfile performs an UPSERT including profiles.id.
-- RLS still prevents changing a profile to another user's id.

grant update (id)
on table public.profiles
to authenticated;
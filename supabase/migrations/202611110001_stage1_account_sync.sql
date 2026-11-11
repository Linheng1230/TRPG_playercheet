-- Stage 1 account sync: one client-side character identity per authenticated owner.
create table if not exists public.characters (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  client_character_id text not null check (char_length(client_character_id) between 1 and 128),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  schema_version integer not null default 0 check (schema_version >= 0),
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, client_character_id)
);

alter table public.characters enable row level security;

revoke all on table public.characters from anon;
grant select, insert, update, delete on table public.characters to authenticated;

drop policy if exists characters_select_own on public.characters;
create policy characters_select_own
on public.characters for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

drop policy if exists characters_insert_own on public.characters;
create policy characters_insert_own
on public.characters for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

drop policy if exists characters_update_own on public.characters;
create policy characters_update_own
on public.characters for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

drop policy if exists characters_delete_own on public.characters;
create policy characters_delete_own
on public.characters for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

comment on table public.characters is
'Local-first D&D character snapshots. The browser uses owner_user_id + client_character_id as identity and revision for optimistic concurrency.';

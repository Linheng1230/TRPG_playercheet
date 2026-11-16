-- Isolated Supabase proof-of-concept migration. Not applied to any live project.
-- RPCs in public are security-definer with explicit auth.uid() checks.
-- A separate security review and live RLS/role tests are required before release.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;

create table public.characters (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_character_id text not null,
  import_fingerprint text not null,
  ruleset text not null check (ruleset in ('2014','2024')),
  save_version integer not null check (save_version in (9,10)),
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, import_fingerprint),
  unique (owner_id, local_character_id),
  constraint snapshot_identity check (
    jsonb_typeof(payload) = 'object'
    and payload->>'id' = local_character_id
    and payload->>'ruleset' = ruleset
    and (payload->>'v')::integer = save_version
  )
);

create table public.campaigns (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  invite_hash bytea not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_memberships (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('dm','player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table public.character_links (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (campaign_id, character_id)
);

-- Supabase projects can grant broad default table permissions in public.
-- Remove them before allowing only owner-scoped SELECT on characters.
revoke all on table public.characters, public.campaigns,
  public.campaign_memberships, public.character_links from public, anon, authenticated;
grant select on table public.characters to authenticated;

alter table public.characters enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_memberships enable row level security;
alter table public.character_links enable row level security;

-- Private RLS helpers prevent cross-table policy recursion.
create or replace function private.is_campaign_member(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $fn$
 select auth.uid() is not null and exists (
  select 1 from public.campaign_memberships m
  where m.campaign_id = p_campaign_id and m.user_id = auth.uid()
 )
$fn$;
create or replace function private.is_campaign_dm(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $fn$
 select auth.uid() is not null and exists (
  select 1 from public.campaign_memberships m
  where m.campaign_id = p_campaign_id and m.user_id = auth.uid() and m.role = 'dm'
 )
$fn$;
revoke all on function private.is_campaign_member(uuid), private.is_campaign_dm(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_campaign_member(uuid), private.is_campaign_dm(uuid) to authenticated;

create policy characters_owner_read on public.characters
for select to authenticated using (owner_id = auth.uid());
create policy campaigns_member_read on public.campaigns
for select to authenticated using (owner_id = auth.uid() or private.is_campaign_member(id));
create policy memberships_self_or_dm_read on public.campaign_memberships
for select to authenticated using (user_id = auth.uid() or private.is_campaign_dm(campaign_id));
create policy character_links_owner_or_dm_read on public.character_links
for select to authenticated using (owner_id = auth.uid() or private.is_campaign_dm(campaign_id));
-- No write policies. All writes must pass authenticated, checked RPCs.

create or replace function private.assert_native_payload(p_payload jsonb)
returns void language plpgsql set search_path = ''
as $fn$
begin
 if p_payload is null or coalesce(jsonb_typeof(p_payload), '') <> 'object'
    or coalesce(p_payload->>'id', '') !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    or coalesce(p_payload->>'ruleset', '') not in ('2014','2024')
    or coalesce(p_payload->>'v', '') not in ('9','10')
    or coalesce(jsonb_typeof(p_payload->'base'), '') <> 'object'
    or coalesce(jsonb_typeof(p_payload->'meta'), '') <> 'object'
    or coalesce(jsonb_typeof(p_payload->'play'), '') <> 'object'
    or coalesce(jsonb_typeof(p_payload->'slotsUsed'), '') <> 'object'
 then
  raise exception 'invalid_native_snapshot' using errcode = '22023';
 end if;
 if pg_catalog.octet_length(pg_catalog.convert_to(p_payload::text, 'UTF8')) > 2097152 then
  raise exception 'payload_too_large' using errcode = '22023';
 end if;
end
$fn$;
create or replace function private.snapshot_fingerprint(p_payload jsonb)
returns text language sql immutable set search_path = ''
as $fn$
 select pg_catalog.encode(extensions.digest(
   pg_catalog.convert_to(p_payload->>'ruleset' || ':' || p_payload->>'id', 'UTF8'),
   'sha256'), 'hex')
$fn$;
revoke all on function private.assert_native_payload(jsonb),
  private.snapshot_fingerprint(jsonb) from public, anon, authenticated;

create or replace function public.create_character(p_payload jsonb, p_import_fingerprint text)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
 v_fingerprint text;
 v_row public.characters%rowtype;
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 perform private.assert_native_payload(p_payload);
 v_fingerprint := private.snapshot_fingerprint(p_payload);
 if p_import_fingerprint is distinct from v_fingerprint then
  raise exception 'fingerprint_mismatch' using errcode='22023';
 end if;
 insert into public.characters(owner_id, local_character_id, import_fingerprint, ruleset, save_version, payload)
 values (v_user_id, p_payload->>'id', v_fingerprint, p_payload->>'ruleset', (p_payload->>'v')::integer, p_payload)
 on conflict (owner_id, import_fingerprint) do nothing
 returning * into v_row;
 if v_row.id is null then
  select * into v_row from public.characters
  where owner_id=v_user_id and import_fingerprint=v_fingerprint;
 end if;
 if v_row.id is null then raise exception 'character_identity_conflict' using errcode='23505'; end if;
 return pg_catalog.jsonb_build_object('id',v_row.id,'revision',v_row.revision,
    'local_character_id',v_row.local_character_id,'ruleset',v_row.ruleset);
end
$fn$;

create or replace function public.update_character_cas(
 p_character_id uuid, p_expected_revision bigint, p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
 v_row public.characters%rowtype;
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if p_expected_revision is null or p_expected_revision < 1 then
  raise exception 'bad_revision' using errcode='22023';
 end if;
 perform private.assert_native_payload(p_payload);
 update public.characters
 set payload=p_payload, save_version=(p_payload->>'v')::integer,
     revision = revision + 1, updated_at=now()
 where id=p_character_id and owner_id=v_user_id and revision=p_expected_revision
   and local_character_id=p_payload->>'id' and ruleset=p_payload->>'ruleset'
 returning * into v_row;
 if v_row.id is null then
  if exists(select 1 from public.characters where id=p_character_id and owner_id=v_user_id) then
   raise exception 'revision_conflict_or_identity_changed' using errcode='40001';
  end if;
  raise exception 'character_not_found' using errcode='P0002';
 end if;
 return pg_catalog.jsonb_build_object('id',v_row.id,'revision',v_row.revision,'updated_at',v_row.updated_at);
end
$fn$;

create or replace function public.create_campaign(p_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
 v_code text;
 v_campaign_id uuid;
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 100 then
  raise exception 'invalid_campaign_name' using errcode='22023';
 end if;
 v_code := pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
 insert into public.campaigns(owner_id,name,invite_hash)
 values(v_user_id,btrim(p_name),extensions.digest(pg_catalog.convert_to(v_code,'UTF8'),'sha256'))
 returning id into v_campaign_id;
 insert into public.campaign_memberships(campaign_id,user_id,role)
 values(v_campaign_id,v_user_id,'dm');
 return pg_catalog.jsonb_build_object('campaign_id',v_campaign_id,'invite_code',v_code);
end
$fn$;

create or replace function public.join_campaign(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
 v_campaign_id uuid;
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if p_invite_code is null or p_invite_code !~ '^[0-9a-f]{64}$' then
  raise exception 'invalid_invite_code' using errcode='22023';
 end if;
 select id into v_campaign_id from public.campaigns
 where invite_hash=extensions.digest(pg_catalog.convert_to(p_invite_code,'UTF8'),'sha256');
 if v_campaign_id is null then raise exception 'invalid_invite_code' using errcode='P0002'; end if;
 insert into public.campaign_memberships(campaign_id,user_id,role)
 values(v_campaign_id,v_user_id,'player')
 on conflict (campaign_id,user_id) do nothing;
 return pg_catalog.jsonb_build_object('campaign_id',v_campaign_id);
end
$fn$;

create or replace function public.list_campaigns()
returns setof jsonb language plpgsql stable security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 return query select pg_catalog.jsonb_build_object(
   'id',c.id,'name',c.name,'owner_id',c.owner_id,
   'member_role',m.role,'created_at',c.created_at,'updated_at',c.updated_at)
 from public.campaigns c
 join public.campaign_memberships m on m.campaign_id=c.id
 where m.user_id=v_user_id order by c.updated_at desc;
end
$fn$;

create or replace function public.link_character(p_campaign_id uuid, p_character_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if not exists(select 1 from public.characters where id=p_character_id and owner_id=v_user_id) then
  raise exception 'character_not_owned' using errcode='42501';
 end if;
 if not exists(select 1 from public.campaign_memberships
               where campaign_id=p_campaign_id and user_id=v_user_id) then
  raise exception 'not_campaign_member' using errcode='42501';
 end if;
 insert into public.character_links(campaign_id,character_id,owner_id)
 values(p_campaign_id,p_character_id,v_user_id)
 on conflict(campaign_id,character_id) do nothing;
 return pg_catalog.jsonb_build_object('campaign_id',p_campaign_id,'character_id',p_character_id);
end
$fn$;

create or replace function public.revoke_character_link(p_campaign_id uuid, p_character_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
 v_deleted integer;
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 delete from public.character_links where campaign_id=p_campaign_id
  and character_id=p_character_id and owner_id=v_user_id;
 get diagnostics v_deleted = row_count;
 return pg_catalog.jsonb_build_object('revoked',v_deleted>0);
end
$fn$;

create or replace function public.list_linked_characters(p_campaign_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path = ''
as $fn$
declare
 v_user_id uuid := auth.uid();
begin
 if v_user_id is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if not exists(select 1 from public.campaign_memberships
       where campaign_id=p_campaign_id and user_id=v_user_id and role='dm') then
  raise exception 'dm_required' using errcode='42501';
 end if;
 return query select pg_catalog.jsonb_build_object(
   'id',c.id,'character_id',c.id,'owner_id',c.owner_id,
   'local_character_id',c.local_character_id,'ruleset',c.ruleset,
   'revision',c.revision,'payload',c.payload,'updated_at',c.updated_at)
 from public.character_links l
 join public.characters c on c.id=l.character_id
 where l.campaign_id=p_campaign_id order by l.linked_at desc;
end
$fn$;

-- Never expose write grants for tenant tables. SECURITY DEFINER RPCs must
-- validate the calling identity and ownership on every call.
revoke all on function public.create_character(jsonb,text),
 public.update_character_cas(uuid,bigint,jsonb), public.create_campaign(text),
 public.join_campaign(text), public.list_campaigns(),
 public.link_character(uuid,uuid), public.revoke_character_link(uuid,uuid),
 public.list_linked_characters(uuid) from public, anon, authenticated;
grant execute on function public.create_character(jsonb,text) to authenticated;
grant execute on function public.update_character_cas(uuid,bigint,jsonb) to authenticated;
grant execute on function public.create_campaign(text) to authenticated;
grant execute on function public.join_campaign(text) to authenticated;
grant execute on function public.list_campaigns() to authenticated;
grant execute on function public.link_character(uuid,uuid) to authenticated;
grant execute on function public.revoke_character_link(uuid,uuid) to authenticated;
grant execute on function public.list_linked_characters(uuid) to authenticated;

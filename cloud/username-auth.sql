-- D&D 5R opt-in username/password bridge; NEVER apply automatically.
-- Requires Supabase Auth and the existing cloud/schema.sql tenant schema.
-- Security: all public roles denied; only Edge service role may call the RPCs.
-- Do not alter, link, or delete any existing LINE / Email auth users.

create table if not exists public.cloud_login_accounts (
  username text primary key check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  internal_email text not null unique,
  user_id uuid unique references auth.users(id) on delete restrict,
  recovery_digest text not null check (recovery_digest ~ '^[0-9a-f]{64}$'),
  registration_nonce uuid not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'active')),
  recovery_nonce uuid,
  recovery_next_digest text check (recovery_next_digest is null or recovery_next_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  check (
    (status = 'pending' and user_id is null) or
    (status = 'active' and user_id is not null)
  ),
  check (
    (recovery_nonce is null and recovery_next_digest is null) or
    (recovery_nonce is not null and recovery_next_digest is not null)
  )
);

create table if not exists public.cloud_auth_rate_limits (
  bucket text primary key check (bucket ~ '^[0-9a-f]{64}$'),
  attempts integer not null check (attempts >= 0),
  expires_at timestamptz not null
);
create index if not exists cloud_auth_rate_limits_expiry
  on public.cloud_auth_rate_limits(expires_at);

alter table public.cloud_login_accounts enable row level security;
alter table public.cloud_auth_rate_limits enable row level security;

revoke all on table public.cloud_login_accounts from public, anon, authenticated;
revoke all on table public.cloud_auth_rate_limits from public, anon, authenticated;
-- A BYPASSRLS role still needs ordinary table privileges in PostgreSQL 16.
-- Never assume default Supabase grants exist in another project/clone.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.cloud_login_accounts to service_role;
grant select, insert, update, delete on table public.cloud_auth_rate_limits to service_role;
-- No SELECT/INSERT/UPDATE/DELETE RLS policies are granted to user roles.
-- The Edge function is the sole privileged writer; other app tables untouched.

create or replace function public.cloud_take_auth_rate_limit(
  p_bucket text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_attempts integer;
begin
  if p_bucket !~ '^[0-9a-f]{64}$'
    or p_max_attempts not between 1 and 1000
    or p_window_seconds not between 60 and 86400 then
    raise exception 'invalid limit arguments';
  end if;
  insert into public.cloud_auth_rate_limits(bucket, attempts, expires_at)
    values (p_bucket, 1, clock_timestamp() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set attempts = case when public.cloud_auth_rate_limits.expires_at <= clock_timestamp()
      then 1 else least(public.cloud_auth_rate_limits.attempts + 1, 2147483647) end,
        expires_at = case when public.cloud_auth_rate_limits.expires_at <= clock_timestamp()
      then clock_timestamp() + make_interval(secs => p_window_seconds)
      else public.cloud_auth_rate_limits.expires_at end
  returning attempts into v_attempts;
  return coalesce(v_attempts <= p_max_attempts, false);
end $$;

-- Reserve first. A failed/unknown partial create remains pending and is never
-- recycled automatically: an operator must reconcile it against auth.users.
create or replace function public.cloud_reserve_username(
  p_username text, p_internal_email text, p_recovery_digest text, p_nonce uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_found integer;
begin
  if p_username !~ '^[a-z][a-z0-9_]{2,23}$'
    or p_internal_email !~ '^[a-z0-9_-]+@[a-z0-9.-]+$'
    or p_recovery_digest !~ '^[0-9a-f]{64}$'
    or p_nonce is null then
    raise exception 'invalid reservation';
  end if;
  insert into public.cloud_login_accounts
    (username, internal_email, recovery_digest, registration_nonce, status)
    values (p_username, p_internal_email, p_recovery_digest, p_nonce, 'pending')
  on conflict do nothing;
  get diagnostics v_found = row_count;
  return v_found = 1;
end $$;

create or replace function public.cloud_finalize_username(
  p_username text, p_nonce uuid, p_user_id uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_found integer;
begin
  if p_user_id is null then return false; end if;
  update public.cloud_login_accounts
    set user_id = p_user_id, status = 'active', activated_at = clock_timestamp()
    where username = p_username and status = 'pending'
      and user_id is null and registration_nonce = p_nonce;
  get diagnostics v_found = row_count;
  return v_found = 1;
end $$;

-- Safe cleanup only when the admin createUser call definitively failed.
-- If Auth user was possibly created, leave reservation pending for operator repair.
create or replace function public.cloud_cancel_reservation(
  p_username text, p_nonce uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_found integer;
begin
  delete from public.cloud_login_accounts
    where username = p_username and status = 'pending'
      and user_id is null and registration_nonce = p_nonce;
  get diagnostics v_found = row_count;
  return v_found = 1;
end $$;

-- Atomic claim. A used code may never be concurrently claimed twice.
-- Password is changed in Supabase Auth after the claim; finalize rotates code.
-- Crashed/incomplete recovery stays claimed for manual operator reconciliation.
create or replace function public.cloud_claim_recovery(
  p_username text, p_old_digest text, p_nonce uuid, p_new_digest text
) returns table(claimed_user_id uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  if p_old_digest !~ '^[0-9a-f]{64}$'
    or p_new_digest !~ '^[0-9a-f]{64}$'
    or p_nonce is null then
    return;
  end if;
  return query
  update public.cloud_login_accounts as a
    set recovery_nonce = p_nonce,
        recovery_next_digest = p_new_digest
    where a.username = p_username and a.status = 'active'
      and a.recovery_digest = p_old_digest and a.recovery_nonce is null
    returning a.user_id;
end $$;

create or replace function public.cloud_complete_recovery(
  p_username text, p_nonce uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_found integer;
begin
  update public.cloud_login_accounts
    set recovery_digest = recovery_next_digest,
        recovery_nonce = null, recovery_next_digest = null
    where username = p_username and status = 'active'
      and recovery_nonce = p_nonce and recovery_next_digest is not null;
  get diagnostics v_found = row_count;
  return v_found = 1;
end $$;

-- Only call if updateUserById definitively failed. Never reset an uncertain result.
create or replace function public.cloud_abort_recovery(
  p_username text, p_nonce uuid
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_found integer;
begin
  update public.cloud_login_accounts
    set recovery_nonce = null, recovery_next_digest = null
    where username = p_username and status = 'active'
      and recovery_nonce = p_nonce and recovery_next_digest is not null;
  get diagnostics v_found = row_count;
  return v_found = 1;
end $$;

revoke all on function public.cloud_take_auth_rate_limit(text,integer,integer)
  from public, anon, authenticated;
revoke all on function public.cloud_reserve_username(text,text,text,uuid)
  from public, anon, authenticated;
revoke all on function public.cloud_finalize_username(text,uuid,uuid)
  from public, anon, authenticated;
revoke all on function public.cloud_cancel_reservation(text,uuid)
  from public, anon, authenticated;
revoke all on function public.cloud_claim_recovery(text,text,uuid,text)
  from public, anon, authenticated;
revoke all on function public.cloud_complete_recovery(text,uuid)
  from public, anon, authenticated;
revoke all on function public.cloud_abort_recovery(text,uuid)
  from public, anon, authenticated;

grant execute on function public.cloud_take_auth_rate_limit(text,integer,integer)
  to service_role;
grant execute on function public.cloud_reserve_username(text,text,text,uuid)
  to service_role;
grant execute on function public.cloud_finalize_username(text,uuid,uuid)
  to service_role;
grant execute on function public.cloud_cancel_reservation(text,uuid)
  to service_role;
grant execute on function public.cloud_claim_recovery(text,text,uuid,text)
  to service_role;
grant execute on function public.cloud_complete_recovery(text,uuid)
  to service_role;
grant execute on function public.cloud_abort_recovery(text,uuid)
  to service_role;

-- Cleanup must be scheduled by an operator with privileged access:
-- DELETE FROM public.cloud_auth_rate_limits WHERE expires_at < now() - interval '1 day';
-- Never auto-delete pending cloud_login_accounts: possible orphan auth.users ID.

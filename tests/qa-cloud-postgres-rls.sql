-- Real PostgreSQL 16 tenant/security integration tests for the isolated PoC.
-- CI uses authenticated/anon roles and a TEST-ONLY auth.uid() JWT-claim shim.
-- This does NOT prove LINE OAuth, Supabase Auth issuance, JWT forgery protection,
-- or hosted Supabase permissions. Never run against a production database.
\set ON_ERROR_STOP on

CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users (id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444');

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $qa$
 SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid
$qa$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

\i cloud/schema.sql

CREATE SCHEMA qa;
CREATE TABLE qa.state (key text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE qa.payloads (key text PRIMARY KEY, payload jsonb NOT NULL, fingerprint text NOT NULL);
GRANT USAGE ON SCHEMA qa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qa.state TO authenticated;
GRANT SELECT ON qa.payloads TO authenticated;

INSERT INTO qa.payloads(key, payload, fingerprint) VALUES
 ('a',
  '{"v":10,"ruleset":"2024","id":"test-a","ts":1,"level":3,"cls":"德魯伊","base":{"str":8,"dex":14,"con":12,"int":10,"wis":16,"cha":13},"rolled":[],"skills":[],"asi":{},"meta":{"name":"A"},"play":{},"slotsUsed":{}}'::jsonb,
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('2024:test-a','UTF8'),'sha256'),'hex')),
 ('b',
  '{"v":10,"ruleset":"2014","id":"test-b","ts":1,"level":2,"cls":"戰士","base":{"str":8,"dex":14,"con":12,"int":10,"wis":16,"cha":13},"rolled":[],"skills":[],"asi":{},"meta":{"name":"B"},"play":{},"slotsUsed":{}}'::jsonb,
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('2014:test-b','UTF8'),'sha256'),'hex'));

-- The authenticated session is scoped to DM user. It can create but cannot
-- see others' character snapshots directly through table SELECT.
SET ROLE authenticated;
SET "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
INSERT INTO qa.state(key, data) SELECT 'campaign', public.create_campaign('Security QA group');
DO $qa$
DECLARE v jsonb := (SELECT data FROM qa.state WHERE key='campaign');
BEGIN
 IF v->>'invite_code' !~ '^[0-9a-f]{64}$' THEN
   RAISE EXCEPTION 'FAIL invite code lacks 256-bit hex entropy';
 END IF;
 IF (SELECT count(*) FROM public.characters) <> 0 THEN
   RAISE EXCEPTION 'FAIL DM can read unlinked character table';
 END IF;
 IF (SELECT count(*) FROM public.list_campaigns()) <> 1 THEN
   RAISE EXCEPTION 'FAIL DM list_campaigns result';
 END IF;
 IF (SELECT public.list_campaigns()::text LIKE '%invite_hash%') THEN
   RAISE EXCEPTION 'FAIL redacted campaign response leaked hash';
 END IF;
END $qa$;

-- Player A creates own 2024 character, and reimport is idempotent.
SET "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
INSERT INTO qa.state(key, data)
SELECT 'character_a', public.create_character(payload, fingerprint) FROM qa.payloads WHERE key='a';
DO $qa$
DECLARE v jsonb;
BEGIN
 SELECT public.create_character(payload, fingerprint) INTO v FROM qa.payloads WHERE key='a';
 IF (v->>'id') IS DISTINCT FROM ((SELECT data FROM qa.state WHERE key='character_a')->>'id') THEN
   RAISE EXCEPTION 'FAIL repeated import generated a duplicate';
 END IF;
 IF (SELECT count(*) FROM public.characters) <> 1 THEN
   RAISE EXCEPTION 'FAIL player A sees other snapshots';
 END IF;
END $qa$;

-- Player B creates 2014 character; cross-tenant raw reads remain hidden.
SET "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
INSERT INTO qa.state(key, data)
SELECT 'character_b', public.create_character(payload, fingerprint) FROM qa.payloads WHERE key='b';
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.characters) <> 1 THEN
   RAISE EXCEPTION 'FAIL player B sees player A character';
 END IF;
 IF EXISTS (SELECT 1 FROM public.characters WHERE id = ((SELECT data FROM qa.state WHERE key='character_a')->>'id')::uuid) THEN
   RAISE EXCEPTION 'FAIL cross-account character SELECT bypassed RLS';
 END IF;
END $qa$;

-- A joins and explicitly links their owned character. B joins but does not link.
SET "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
SELECT public.join_campaign((SELECT data->>'invite_code' FROM qa.state WHERE key='campaign'));
SELECT public.link_character(
 (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'),
 (SELECT (data->>'id')::uuid FROM qa.state WHERE key='character_a'));
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.list_campaigns()) <> 1 THEN
  RAISE EXCEPTION 'FAIL player A membership listing';
 END IF;
 IF (SELECT item->>'member_role' FROM public.list_campaigns() item LIMIT 1) <> 'player' THEN
  RAISE EXCEPTION 'FAIL member gained DM role';
 END IF;
 -- Attempts to self-promote via direct table write must be denied.
 BEGIN
  INSERT INTO public.campaign_memberships(campaign_id,user_id,role)
  VALUES ((SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'),
   '22222222-2222-4222-8222-222222222222','dm');
  RAISE EXCEPTION 'FAIL direct membership write permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 -- Player may not use the DM-only linked-character read endpoint.
 BEGIN
  PERFORM * FROM public.list_linked_characters(
   (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'));
  RAISE EXCEPTION 'FAIL player can read DM roster';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $qa$;

SET "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
SELECT public.join_campaign((SELECT data->>'invite_code' FROM qa.state WHERE key='campaign'));
DO $qa$
BEGIN
 -- A member cannot link a character owned by someone else.
 BEGIN
  PERFORM public.link_character(
   (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'),
   (SELECT (data->>'id')::uuid FROM qa.state WHERE key='character_a'));
  RAISE EXCEPTION 'FAIL linked character belonging to another player';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF (SELECT item->>'member_role' FROM public.list_campaigns() item LIMIT 1) <> 'player' THEN
  RAISE EXCEPTION 'FAIL player B can escalate DM status';
 END IF;
END $qa$;

-- Original DM only sees linked A, not B, and cannot edit A's snapshot.
SET "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.list_linked_characters(
    (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'))) <> 1 THEN
  RAISE EXCEPTION 'FAIL DM linked roster count is not 1';
 END IF;
 BEGIN
  PERFORM public.update_character_cas(
   (SELECT (data->>'id')::uuid FROM qa.state WHERE key='character_a'),
   1, (SELECT payload FROM qa.payloads WHERE key='a'));
  RAISE EXCEPTION 'FAIL DM could modify player character';
 EXCEPTION WHEN no_data_found THEN NULL;
 END;
END $qa$;

-- Owner CAS revision 1 -> 2 must succeed; stale revision 1 must fail 40001.
SET "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
DO $qa$
DECLARE
 v_id uuid := (SELECT (data->>'id')::uuid FROM qa.state WHERE key='character_a');
 v_payload jsonb := (SELECT payload FROM qa.payloads WHERE key='a');
 v_result jsonb;
BEGIN
 v_result := public.update_character_cas(v_id, 1,
   pg_catalog.jsonb_set(v_payload,'{meta,name}','"Updated A"',true));
 IF (v_result->>'revision')::integer <> 2 THEN
  RAISE EXCEPTION 'FAIL CAS did not increment revision';
 END IF;
 BEGIN
  PERFORM public.update_character_cas(v_id, 1, v_payload);
  RAISE EXCEPTION 'FAIL stale CAS overwrote more recent character state';
 EXCEPTION WHEN serialization_failure THEN NULL;
 END;
 IF (SELECT revision FROM public.characters WHERE id = v_id) <> 2 THEN
  RAISE EXCEPTION 'FAIL revision changed after rejected CAS';
 END IF;
 -- Owner cannot bypass controlled RPC using direct SQL UPDATE.
 BEGIN
  UPDATE public.characters SET revision = 999 WHERE id=v_id;
  RAISE EXCEPTION 'FAIL direct UPDATE allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $qa$;

-- A can revoke, and DM access ends immediately after revocation.
SELECT public.revoke_character_link(
 (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'),
 (SELECT (data->>'id')::uuid FROM qa.state WHERE key='character_a'));
SET "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.list_linked_characters(
    (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'))) <> 0 THEN
  RAISE EXCEPTION 'FAIL revoked link remains visible to DM';
 END IF;
END $qa$;

-- Stranger cannot even inspect the campaign or become DM without invite.
SET "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.list_campaigns()) <> 0 THEN
  RAISE EXCEPTION 'FAIL stranger sees unrelated campaigns';
 END IF;
 BEGIN
  PERFORM * FROM public.list_linked_characters(
    (SELECT (data->>'campaign_id')::uuid FROM qa.state WHERE key='campaign'));
  RAISE EXCEPTION 'FAIL stranger can read DM RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $qa$;

-- Anon lacks RPC EXECUTE and table SELECT.
RESET ROLE;
SET ROLE anon;
RESET "request.jwt.claim.sub";
DO $qa$
BEGIN
 BEGIN
  PERFORM public.create_campaign('Anonymous');
  RAISE EXCEPTION 'FAIL anonymous RPC permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM * FROM public.characters;
  RAISE EXCEPTION 'FAIL anonymous SELECT permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $qa$;
RESET ROLE;
\echo 'PASS: actual PostgreSQL 16 RLS and SECURITY DEFINER tenant/DM/CAS checks'

-- Additional tests for the opt-in username/password authentication bridge.
-- This is PostgreSQL ACL/transaction QA, NOT a hosted Supabase Auth test.
CREATE ROLE service_role NOLOGIN BYPASSRLS;
\i cloud/username-auth.sql

DO $username_qa$
BEGIN
 IF NOT pg_catalog.has_table_privilege('service_role','public.cloud_login_accounts','SELECT')
   OR NOT pg_catalog.has_table_privilege('service_role','public.cloud_login_accounts','INSERT')
   OR NOT pg_catalog.has_table_privilege('service_role','public.cloud_login_accounts','UPDATE') THEN
   RAISE EXCEPTION 'FAIL service_role missing explicit table permissions';
 END IF;
 IF pg_catalog.has_table_privilege('anon','public.cloud_login_accounts','SELECT')
   OR pg_catalog.has_table_privilege('authenticated','public.cloud_login_accounts','SELECT')
   OR pg_catalog.has_function_privilege('anon','public.cloud_claim_recovery(text,text,uuid,text)','EXECUTE')
   OR pg_catalog.has_function_privilege('authenticated','public.cloud_reserve_username(text,text,text,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'FAIL authentication mappings leaked to user roles';
 END IF;
END $username_qa$;

SET ROLE anon;
DO $username_qa$
BEGIN
 BEGIN
  PERFORM 1 FROM public.cloud_login_accounts;
  RAISE EXCEPTION 'FAIL anon read private username table';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.cloud_reserve_username('alice3','alias@owned.example.net',repeat('a',64),
    '55555555-5555-4555-8555-555555555555'::uuid);
  RAISE EXCEPTION 'FAIL anon executed privileged registration function';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $username_qa$;
RESET ROLE;

SET ROLE authenticated;
DO $username_qa$
BEGIN
 BEGIN
  PERFORM 1 FROM public.cloud_login_accounts;
  RAISE EXCEPTION 'FAIL authenticated read private username mapping';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.cloud_claim_recovery('alice3',repeat('a',64),
    '66666666-6666-4666-8666-666666666666'::uuid, repeat('b',64));
  RAISE EXCEPTION 'FAIL authenticated invoked privileged recovery RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $username_qa$;
RESET ROLE;

SET ROLE service_role;
DO $username_qa$
DECLARE
 v_registration uuid := '55555555-5555-4555-8555-555555555555';
 v_recovery uuid := '66666666-6666-4666-8666-666666666666';
 v_user uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
 IF NOT public.cloud_reserve_username('alice3','player1@owned.example.net',repeat('a',64),v_registration) THEN
   RAISE EXCEPTION 'FAIL first username reservation';
 END IF;
 IF public.cloud_reserve_username('alice3','player2@owned.example.net',repeat('b',64),
      '77777777-7777-4777-8777-777777777777'::uuid) THEN
   RAISE EXCEPTION 'FAIL duplicate username reservation';
 END IF;
 IF public.cloud_finalize_username('alice3','77777777-7777-4777-8777-777777777777'::uuid,v_user) THEN
   RAISE EXCEPTION 'FAIL incorrect nonce finalized username';
 END IF;
 IF NOT public.cloud_finalize_username('alice3',v_registration,v_user) THEN
   RAISE EXCEPTION 'FAIL correct nonce failed finalization';
 END IF;
 IF (SELECT count(*) FROM public.cloud_login_accounts WHERE username='alice3' AND user_id=v_user
      AND status='active') <> 1 THEN
   RAISE EXCEPTION 'FAIL active owner/UID mapping after finalization';
 END IF;
 IF NOT public.cloud_take_auth_rate_limit(repeat('f',64),2,60)
   OR NOT public.cloud_take_auth_rate_limit(repeat('f',64),2,60)
   OR public.cloud_take_auth_rate_limit(repeat('f',64),2,60) THEN
   RAISE EXCEPTION 'FAIL atomic rate limit must reject third attempt';
 END IF;
 IF (SELECT count(*) FROM public.cloud_claim_recovery('alice3',repeat('a',64),v_recovery,repeat('b',64))) <> 1 THEN
   RAISE EXCEPTION 'FAIL first recovery claim';
 END IF;
 IF (SELECT count(*) FROM public.cloud_claim_recovery('alice3',repeat('a',64),
    '88888888-8888-4888-8888-888888888888'::uuid,repeat('c',64))) <> 0 THEN
   RAISE EXCEPTION 'FAIL duplicate recovery claim';
 END IF;
 IF NOT public.cloud_complete_recovery('alice3',v_recovery) THEN
   RAISE EXCEPTION 'FAIL recovery completion';
 END IF;
 IF public.cloud_complete_recovery('alice3',v_recovery) THEN
   RAISE EXCEPTION 'FAIL second completion of consumed recovery nonce';
 END IF;
 IF (SELECT count(*) FROM public.cloud_claim_recovery('alice3',repeat('a',64),
      '99999999-9999-4999-8999-999999999999'::uuid,repeat('c',64))) <> 0 THEN
   RAISE EXCEPTION 'FAIL old recovery digest accepted after rotation';
 END IF;
 IF (SELECT user_id FROM public.cloud_login_accounts WHERE username='alice3') IS DISTINCT FROM v_user THEN
   RAISE EXCEPTION 'FAIL recovery changed stable Supabase UID';
 END IF;
END $username_qa$;
RESET ROLE;
\echo 'PASS: actual PostgreSQL username mapping ACL / reservation / atomic rate-limit / recovery claims'

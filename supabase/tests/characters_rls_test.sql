begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select hasnt_table_privilege('anon', 'public.characters', 'SELECT', 'anon has no SELECT privilege');
select has_table_privilege('authenticated', 'public.characters', 'SELECT', 'authenticated has SELECT privilege');

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111','a@example.test'),
  ('22222222-2222-2222-2222-222222222222','b@example.test')
on conflict (id) do nothing;

insert into public.characters(owner_user_id,client_character_id,snapshot,schema_version,revision)
values
  ('11111111-1111-1111-1111-111111111111','char-a','{"id":"char-a"}',9,1),
  ('22222222-2222-2222-2222-222222222222','char-b','{"id":"char-b"}',9,1)
on conflict do nothing;

set local role anon;
select throws_ok(
  $$select client_character_id from public.characters$$,
  '42501',
  null,
  'anon cannot select characters'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select client_character_id from public.characters order by client_character_id$$,
  $$values ('char-a'::text)$$,
  'user A sees only own row'
);

select results_eq(
  $$insert into public.characters(owner_user_id,client_character_id,snapshot,schema_version,revision)
    values ('11111111-1111-1111-1111-111111111111','char-a2','{"id":"char-a2"}',9,1)
    returning client_character_id$$,
  $$values ('char-a2'::text)$$,
  'user A can insert own row'
);

select throws_ok(
  $$insert into public.characters(owner_user_id,client_character_id,snapshot,schema_version,revision)
    values ('22222222-2222-2222-2222-222222222222','bad-insert','{"id":"bad-insert"}',9,1)$$,
  '42501',
  null,
  'user A cannot insert a row owned by user B'
);

select results_eq(
  $$update public.characters set revision=2
    where owner_user_id='11111111-1111-1111-1111-111111111111' and client_character_id='char-a'
    returning revision$$,
  $$values (2::bigint)$$,
  'user A can update own row'
);

select is_empty(
  $$update public.characters set revision=9
    where owner_user_id='22222222-2222-2222-2222-222222222222' and client_character_id='char-b'
    returning revision$$,
  'user A cannot update user B row'
);

select results_eq(
  $$delete from public.characters
    where owner_user_id='11111111-1111-1111-1111-111111111111' and client_character_id='char-a2'
    returning client_character_id$$,
  $$values ('char-a2'::text)$$,
  'user A can delete own row'
);

select is_empty(
  $$delete from public.characters
    where owner_user_id='22222222-2222-2222-2222-222222222222' and client_character_id='char-b'
    returning client_character_id$$,
  'user A cannot delete user B row'
);

select * from finish();
rollback;

-- Apply after 001_initial.sql. Access stays closed until the two emails are
-- inserted into private.allowed_members by the database administrator.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.allowed_members(email text primary key check(email=lower(trim(email))));
revoke all on private.allowed_members from public,anon,authenticated;

create function public.can_access_household(household uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.households h
 join auth.users owner_user on owner_user.id=h.owner_id
 join private.allowed_members owner_access on owner_access.email=lower(owner_user.email)
 where h.id=household and exists(select 1 from auth.users u
 join private.allowed_members allowed on allowed.email=lower(u.email)
 where u.id=auth.uid() and u.email_confirmed_at is not null));
$$;
revoke all on function public.can_access_household(uuid) from public;
grant execute on function public.can_access_household(uuid) to authenticated;

create function public.ensure_household() returns uuid
language plpgsql security definer set search_path='' as $$
declare hid uuid;
begin
 if not exists(select 1 from auth.users u join private.allowed_members a on a.email=lower(u.email)
 where u.id=auth.uid() and u.email_confirmed_at is not null) then raise exception 'Acesso reservado'; end if;
 perform pg_advisory_xact_lock(71593824);
 select h.id into hid from public.households h join auth.users u on u.id=h.owner_id
 join private.allowed_members a on a.email=lower(u.email) order by h.id limit 1;
 if hid is null then insert into public.households(owner_id) values(auth.uid()) returning id into hid; end if;
 return hid;
end $$;
revoke all on function public.ensure_household() from public;
grant execute on function public.ensure_household() to authenticated;

drop policy own_household on public.households;
create policy couple_household on public.households for select to authenticated using(public.can_access_household(id));
drop policy own_properties on public.properties;
create policy couple_properties on public.properties for all to authenticated using(public.can_access_household(household_id)) with check(public.can_access_household(household_id));
drop policy own_preferences on public.preferences;
create policy couple_preferences on public.preferences for all to authenticated using(public.can_access_household(household_id)) with check(public.can_access_household(household_id));
drop policy own_imports on public.ai_imports;
create policy couple_imports on public.ai_imports for select to authenticated using(public.can_access_household(household_id));
-- Finances, ratings and attachment metadata inherit the restrictive properties RLS.
create or replace function public.save_household(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare hid uuid; p jsonb;
begin
 hid:=public.ensure_household();
 if payload->>'version' is distinct from '1' or jsonb_typeof(payload->'properties') is distinct from 'array' then raise exception 'Cópia inválida'; end if;
 delete from properties where household_id=hid and id not in(select (value->>'id')::uuid from jsonb_array_elements(payload->'properties'));
 for p in select value from jsonb_array_elements(payload->'properties') loop
 insert into properties(id,household_id,data) values((p->>'id')::uuid,hid,p-'finance'-'ratings') on conflict(id) do update set data=excluded.data;
 insert into property_finances values((p->>'id')::uuid,p->'finance') on conflict(property_id) do update set data=excluded.data;
 insert into property_ratings values((p->>'id')::uuid,p->'ratings') on conflict(property_id) do update set data=excluded.data;
 end loop;
 insert into preferences values(hid,payload->'preferences') on conflict(household_id) do update set data=excluded.data;
end $$;
create or replace function public.load_household() returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('version',1,'preferences',pr.data,'properties',coalesce((select jsonb_agg(p.data||jsonb_build_object('finance',f.data,'ratings',r.data)) from properties p join property_finances f on f.property_id=p.id join property_ratings r on r.property_id=p.id where p.household_id=h.id),'[]'::jsonb)) from households h join preferences pr on pr.household_id=h.id where public.can_access_household(h.id) order by h.id limit 1;
$$;
create or replace function public.reserve_ai_import(hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare hid uuid; cached jsonb;
begin
 hid:=public.ensure_household();
 perform 1 from public.households where id=hid for update;
 select result into cached from public.ai_imports where household_id=hid and cache_key=hash and result is not null and created_at>now()-interval '24 hours' limit 1;
 if cached is not null then return jsonb_build_object('cached',cached); end if;
 if (select count(*) from public.ai_imports where household_id=hid and created_at>now()-interval '24 hours')>=10 then return jsonb_build_object('limited',true); end if;
 insert into public.ai_imports(household_id,cache_key) values(hid,hash);
 return jsonb_build_object('household_id',hid);
end $$;
create or replace function public.complete_ai_import(hash text, fields jsonb) returns void language plpgsql security definer set search_path='' as $$
declare hid uuid;
begin
 hid:=public.ensure_household();
 update public.ai_imports set result=fields where cache_key=hash and household_id=hid and result is null;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nosso-lar-private','nosso-lar-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy couple_files_select on storage.objects for select to authenticated
using(bucket_id='nosso-lar-private' and exists(select 1 from public.households h where h.id::text=(storage.foldername(storage.objects.name))[1] and public.can_access_household(h.id)));
create policy couple_files_insert on storage.objects for insert to authenticated
with check(bucket_id='nosso-lar-private' and exists(select 1 from public.households h where h.id::text=(storage.foldername(storage.objects.name))[1] and public.can_access_household(h.id)));
create policy couple_files_update on storage.objects for update to authenticated
using(bucket_id='nosso-lar-private' and exists(select 1 from public.households h where h.id::text=(storage.foldername(storage.objects.name))[1] and public.can_access_household(h.id)))
with check(bucket_id='nosso-lar-private' and exists(select 1 from public.households h where h.id::text=(storage.foldername(storage.objects.name))[1] and public.can_access_household(h.id)));
create policy couple_files_delete on storage.objects for delete to authenticated
using(bucket_id='nosso-lar-private' and exists(select 1 from public.households h where h.id::text=(storage.foldername(storage.objects.name))[1] and public.can_access_household(h.id)));
commit;

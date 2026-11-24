-- Execute no SQL Editor de um projeto Supabase Free. Nenhuma service_role é necessária.
create table public.households (id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade, name text not null default 'Nosso lar');
create table public.properties (id uuid primary key, household_id uuid not null references public.households on delete cascade, data jsonb not null);
create table public.property_finances (property_id uuid primary key references public.properties on delete cascade, data jsonb not null);
create table public.property_ratings (property_id uuid primary key references public.properties on delete cascade, data jsonb not null);
create table public.preferences (household_id uuid primary key references public.households on delete cascade, data jsonb not null);
create table public.attachments (id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties on delete cascade, path text not null);
create table public.ai_imports (id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade, created_at timestamptz not null default now(), cache_key text, result jsonb);
alter table public.households enable row level security;
alter table public.properties enable row level security;
alter table public.property_finances enable row level security;
alter table public.property_ratings enable row level security;
alter table public.preferences enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_imports enable row level security;
create policy own_household on public.households for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy own_properties on public.properties for all to authenticated using(exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid())) with check(exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy own_preferences on public.preferences for all to authenticated using(exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid())) with check(exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy own_imports on public.ai_imports for select to authenticated using(exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
revoke insert,update,delete on public.ai_imports from authenticated,anon;
create policy own_finances on public.property_finances for all to authenticated using(exists(select 1 from public.properties p where p.id=property_id)) with check(exists(select 1 from public.properties p where p.id=property_id));
create policy own_ratings on public.property_ratings for all to authenticated using(exists(select 1 from public.properties p where p.id=property_id)) with check(exists(select 1 from public.properties p where p.id=property_id));
create policy own_attachments on public.attachments for all to authenticated using(exists(select 1 from public.properties p where p.id=property_id)) with check(exists(select 1 from public.properties p where p.id=property_id));
-- Transação atômica. Security invoker preserva RLS; falhas revertem a gravação inteira.
create function public.save_household(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare hid uuid; p jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 if payload->>'version' <> '1' or jsonb_typeof(payload->'properties') <> 'array' then raise exception 'Backup inválido'; end if;
 insert into households(owner_id) values(auth.uid()) on conflict(owner_id) do nothing;
 select id into hid from households where owner_id=auth.uid();
 delete from properties where household_id=hid and id not in(select (value->>'id')::uuid from jsonb_array_elements(payload->'properties'));
 for p in select value from jsonb_array_elements(payload->'properties') loop
 insert into properties(id,household_id,data) values((p->>'id')::uuid,hid,p-'finance'-'ratings') on conflict(id) do update set data=excluded.data;
 insert into property_finances values((p->>'id')::uuid,p->'finance') on conflict(property_id) do update set data=excluded.data;
 insert into property_ratings values((p->>'id')::uuid,p->'ratings') on conflict(property_id) do update set data=excluded.data;
 end loop;
 insert into preferences values(hid,payload->'preferences') on conflict(household_id) do update set data=excluded.data;
end $$;
create function public.load_household() returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('version',1,'preferences',pr.data,'properties',coalesce((select jsonb_agg(p.data||jsonb_build_object('finance',f.data,'ratings',r.data)) from properties p join property_finances f on f.property_id=p.id join property_ratings r on r.property_id=p.id where p.household_id=h.id),'[]'::jsonb)) from households h join preferences pr on pr.household_id=h.id where h.owner_id=auth.uid();
$$;
revoke all on function public.save_household(jsonb) from public;
revoke all on function public.load_household() from public;
grant execute on function public.save_household(jsonb) to authenticated;
grant execute on function public.load_household() to authenticated;
-- Reserva persistente por usuário: serializa chamadas concorrentes e limita a 10/dia.
create function public.reserve_ai_import(hash text) returns jsonb language plpgsql security definer set search_path=public as $$
declare hid uuid; cached jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 select id into hid from households where owner_id=auth.uid() for update;
 if hid is null then raise exception 'Salve sua cópia na nuvem antes de importar'; end if;
 select result into cached from ai_imports where household_id=hid and cache_key=hash and result is not null and created_at>now()-interval '24 hours' limit 1;
 if cached is not null then return jsonb_build_object('cached',cached); end if;
 if (select count(*) from ai_imports where household_id=hid and created_at>now()-interval '24 hours')>=10 then return jsonb_build_object('limited',true); end if;
 insert into ai_imports(household_id,cache_key) values(hid,hash);
 return jsonb_build_object('household_id',hid);
end $$;
revoke all on function public.reserve_ai_import(text) from public;
grant execute on function public.reserve_ai_import(text) to authenticated;
-- Atualiza somente uma reserva do usuário autenticado; não permite apagar consumo.
create function public.complete_ai_import(hash text, fields jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 update ai_imports set result=fields where cache_key=hash and household_id in(select id from households where owner_id=auth.uid()) and result is null;
end $$;
revoke all on function public.complete_ai_import(text,jsonb) from public;
grant execute on function public.complete_ai_import(text,jsonb) to authenticated;

-- Additive migration: does not alter properties, finances, auth or their RPCs.
begin;
create table public.living_versions(household_id uuid primary key references public.households(id) on delete cascade, revision bigint not null default 0, future_reserve numeric check(future_reserve>=0));
create table public.purchase_items(id uuid primary key, household_id uuid not null references public.households(id) on delete cascade, data jsonb not null, unique(id,household_id));
create table public.purchase_options(id uuid primary key, household_id uuid not null, item_id uuid not null, data jsonb not null, unique(id,household_id), foreign key(item_id,household_id) references public.purchase_items(id,household_id) on delete cascade);
create table public.inspiration_collections(id uuid primary key, household_id uuid not null references public.households(id) on delete cascade, name text not null check(length(trim(name)) between 1 and 80), unique(id,household_id));
create table public.inspirations(id uuid primary key, household_id uuid not null, collection_id uuid not null, item_id uuid, data jsonb not null, unique(id,household_id), foreign key(collection_id,household_id) references public.inspiration_collections(id,household_id), foreign key(item_id,household_id) references public.purchase_items(id,household_id));
create table public.living_images(id uuid primary key, household_id uuid not null, item_id uuid, option_id uuid, inspiration_id uuid, data jsonb not null,
 check(num_nonnulls(item_id,option_id,inspiration_id)=1),
 foreign key(item_id,household_id) references public.purchase_items(id,household_id) on delete cascade,
 foreign key(option_id,household_id) references public.purchase_options(id,household_id) on delete cascade,
 foreign key(inspiration_id,household_id) references public.inspirations(id,household_id) on delete cascade);
do $$ declare t text; begin
 foreach t in array array['living_versions','purchase_items','purchase_options','inspiration_collections','inspirations','living_images'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy couple_access on public.%I for all to authenticated using(public.can_access_household(household_id)) with check(public.can_access_household(household_id))',t);
 end loop;
end $$;

create function public.load_living() returns jsonb language plpgsql security invoker set search_path='' as $$
declare hid uuid; result jsonb;
begin
 hid := public.ensure_household();
 select jsonb_build_object('revision',coalesce((select revision from public.living_versions where household_id=hid),0),
 'futureReserve',(select future_reserve from public.living_versions where household_id=hid),'items',coalesce((select jsonb_agg(p.data || jsonb_build_object('id',p.id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.item_id=p.id),'[]'::jsonb),'options',coalesce((select jsonb_agg(o.data || jsonb_build_object('id',o.id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.option_id=o.id),'[]'::jsonb))) from public.purchase_options o where o.item_id=p.id),'[]'::jsonb))) from public.purchase_items p where p.household_id=hid),'[]'::jsonb),
 'collections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.inspiration_collections where household_id=hid),'[]'::jsonb),
 'inspirations',coalesce((select jsonb_agg(r.data || jsonb_build_object('id',r.id,'collectionId',r.collection_id,'itemId',r.item_id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.inspiration_id=r.id),'[]'::jsonb))) from public.inspirations r where r.household_id=hid),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.save_living(payload jsonb, expected_revision bigint) returns bigint language plpgsql security invoker set search_path='' as $$
declare hid uuid; rev bigint; p jsonb; o jsonb; m jsonb; r jsonb;
begin
 hid := public.ensure_household();
 insert into public.living_versions(household_id,revision) values(hid,0) on conflict do nothing;
 select revision into rev from public.living_versions where household_id=hid for update;
 if rev <> expected_revision then raise exception 'CONFLICT'; end if;
 if octet_length(payload::text)>5000000 or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_typeof(payload->'collections') is distinct from 'array' or jsonb_typeof(payload->'inspirations') is distinct from 'array' then raise exception 'Invalid payload'; end if;
 delete from public.living_images where household_id=hid;
 delete from public.inspirations where household_id=hid;
 delete from public.purchase_options where household_id=hid;
 delete from public.purchase_items where household_id=hid;
 delete from public.inspiration_collections where household_id=hid;
 for p in select value from jsonb_array_elements(payload->'items') loop
  if length(trim(p->>'name'))=0 or (p->>'quantity')::numeric<1 then raise exception 'Invalid item'; end if;
  if p->>'selected' is not null and not exists(select 1 from jsonb_array_elements(p->'options') x where x->>'id'=p->>'selected') then raise exception 'Invalid option'; end if;
  insert into public.purchase_items values((p->>'id')::uuid,hid,p-'id'-'options'-'photos');
  for m in select value from jsonb_array_elements(p->'photos') loop
   insert into public.living_images values((m->>'id')::uuid,hid,(p->>'id')::uuid,null,null,m);
  end loop;
  for o in select value from jsonb_array_elements(p->'options') loop
   insert into public.purchase_options values((o->>'id')::uuid,hid,(p->>'id')::uuid,o-'id'-'photos');
   for m in select value from jsonb_array_elements(o->'photos') loop
    insert into public.living_images values((m->>'id')::uuid,hid,null,(o->>'id')::uuid,null,m);
   end loop;
  end loop;
 end loop;
 for p in select value from jsonb_array_elements(payload->'collections') loop
  insert into public.inspiration_collections values((p->>'id')::uuid,hid,p->>'name');
 end loop;
 for r in select value from jsonb_array_elements(payload->'inspirations') loop
  insert into public.inspirations values((r->>'id')::uuid,hid,(r->>'collectionId')::uuid,(r->>'itemId')::uuid,r-'id'-'collectionId'-'itemId'-'photos');
  for m in select value from jsonb_array_elements(r->'photos') loop
   insert into public.living_images values((m->>'id')::uuid,hid,null,null,(r->>'id')::uuid,m);
  end loop;
 end loop;
 update public.living_versions set revision=rev+1, future_reserve=(payload->>'futureReserve')::numeric where household_id=hid;
 return rev+1;
end $$;
revoke all on function public.load_living(), public.save_living(jsonb,bigint) from public;
grant execute on function public.load_living(), public.save_living(jsonb,bigint) to authenticated;
commit;


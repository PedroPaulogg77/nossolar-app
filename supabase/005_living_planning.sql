-- Run after 004. Keep existing purchases and properties.
begin;
alter table public.living_versions add column move_month text not null default '2027-12' check(move_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
alter table public.living_versions add column limit_enabled boolean not null default false;
alter table public.living_versions add column monthly_limit numeric check(monthly_limit >= 0);
create or replace function public.load_living() returns jsonb language plpgsql security invoker set search_path='' as $$
declare hid uuid; result jsonb;
begin
 hid := public.ensure_household();
 select jsonb_build_object('revision',coalesce((select revision from public.living_versions where household_id=hid),0),
 'futureReserve',(select future_reserve from public.living_versions where household_id=hid),'moveMonth',coalesce((select move_month from public.living_versions where household_id=hid),'2027-12'),'limitEnabled',coalesce((select limit_enabled from public.living_versions where household_id=hid),false),'monthlyLimit',(select monthly_limit from public.living_versions where household_id=hid),'items',coalesce((select jsonb_agg(p.data || jsonb_build_object('id',p.id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.item_id=p.id),'[]'::jsonb),'options',coalesce((select jsonb_agg(o.data || jsonb_build_object('id',o.id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.option_id=o.id),'[]'::jsonb))) from public.purchase_options o where o.item_id=p.id),'[]'::jsonb))) from public.purchase_items p where p.household_id=hid),'[]'::jsonb),
 'collections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.inspiration_collections where household_id=hid),'[]'::jsonb),
 'inspirations',coalesce((select jsonb_agg(r.data || jsonb_build_object('id',r.id,'collectionId',r.collection_id,'itemId',r.item_id,'photos',coalesce((select jsonb_agg(m.data) from public.living_images m where m.inspiration_id=r.id),'[]'::jsonb))) from public.inspirations r where r.household_id=hid),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.save_living(payload jsonb, expected_revision bigint) returns bigint language plpgsql security invoker set search_path='' as $$
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
 update public.living_versions set revision=rev+1, future_reserve=(payload->>'futureReserve')::numeric, move_month=coalesce(payload->>'moveMonth','2027-12'), limit_enabled=coalesce((payload->>'limitEnabled')::boolean,false), monthly_limit=(payload->>'monthlyLimit')::numeric where household_id=hid;
 return rev+1;
end $$;
commit;


-- Falhas de extração não devem consumir a cota diária de importações concluídas.
create or replace function public.reserve_ai_import(hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare hid uuid; cached jsonb;
begin
  hid := public.ensure_household();
  perform 1 from public.households where id=hid for update;
  select result into cached from public.ai_imports
    where household_id=hid and cache_key=hash and result is not null
      and created_at>now()-interval '24 hours'
    order by created_at desc limit 1;
  if cached is not null then return jsonb_build_object('cached',cached); end if;
  if (select count(*) from public.ai_imports
      where household_id=hid and result is not null
        and created_at>now()-interval '24 hours')>=10 then
    return jsonb_build_object('limited',true);
  end if;
  -- Protege a chave contra tentativas ilimitadas, sem bloquear após 10 erros.
  if (select count(*) from public.ai_imports
      where household_id=hid and created_at>now()-interval '24 hours')>=50 then
    return jsonb_build_object('attempt_limit',true);
  end if;
  insert into public.ai_imports(household_id,cache_key) values(hid,hash);
  return jsonb_build_object('reserved',true);
end $$;

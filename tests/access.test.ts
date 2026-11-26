import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { it, expect } from "vitest";
import { initialProperty, defaults } from "../lib/domain";
import { emptyLiving, newPurchase, livingSchema } from "../lib/living";
it("migrações: casal compartilha espaço; terceiros e anônimos não acessam dados nem anexos", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 alter default privileges in schema public grant all on tables to authenticated,anon;
 alter default privileges in schema public grant execute on functions to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant all on storage.objects to authenticated,anon;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 insert into auth.users values('00000000-0000-4000-8000-000000000001','one@example.test',now()),('00000000-0000-4000-8000-000000000002','two@example.test',now()),('00000000-0000-4000-8000-000000000003','stranger@example.test',now());`);
    await db.exec(
      await readFile(
        new URL("../supabase/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/002_private_couple_and_files.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/003_ai_import_success_limit.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `insert into private.allowed_members values('one@example.test'),('two@example.test');set role authenticated;set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';`,
    );
    await db.exec("reset role");
    await db.exec(
      await readFile(
        new URL("../supabase/004_living.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec("set role authenticated");
    const first = await db.query<{ id: string }>(
      "select public.ensure_household() id",
    );
    const hid = first.rows[0].id;
    const purchase = { ...newPurchase(), name: "Sofá de teste" };
    const optionId = crypto.randomUUID();
    const collectionId = crypto.randomUUID();
    const photo = { id: crypto.randomUUID(), name: "sala.jpg", mime: "image/jpeg", size: 1200, category: "Foto", createdAt: new Date().toISOString(), remotePath: `${hid}/living/photo` };
    const living = livingSchema.parse({ ...emptyLiving(), futureReserve: 1500, items: [{ ...purchase, selected: optionId, options: [{ id: optionId, name: "Modelo escolhido", store: "Loja", url: "https://example.com/item", price: 250, photos: [photo] }] }], collections: [{ id: collectionId, name: "Sala" }], inspirations: [{ id: crypto.randomUUID(), collectionId, itemId: purchase.id, title: "Referência", url: "https://example.com/sala", notes: "", photos: [] }] });
    await db.query("select public.save_living($1::jsonb,0)", [
      JSON.stringify(living),
    ]);
    const roundtrip = await db.query<{ data: unknown }>("select public.load_living() data");
    expect(livingSchema.parse(roundtrip.rows[0].data)).toEqual({ ...living, revision: 1 });
    await expect(
      db.query("select public.save_living($1::jsonb,0)", [
        JSON.stringify(living),
      ]),
    ).rejects.toThrow("CONFLICT");
    for (let i = 0; i < 10; i++)
      await db.query("select public.reserve_ai_import($1) result", [
        `failed-${i}`,
      ]);
    const afterFailures = await db.query<{ result: { reserved?: boolean } }>(
      "select public.reserve_ai_import('valid') result",
    );
    expect(afterFailures.rows[0].result.reserved).toBe(true);
    await db.query("select public.complete_ai_import('valid',$1::jsonb)", [
      JSON.stringify({ name: { valor: "Exemplo" } }),
    ]);
    const cached = await db.query<{ result: { cached?: object } }>(
      "select public.reserve_ai_import('valid') result",
    );
    expect(cached.rows[0].result.cached).toBeTruthy();
    for (let i = 0; i < 9; i++) {
      await db.query("select public.reserve_ai_import($1)", [`success-${i}`]);
      await db.query("select public.complete_ai_import($1,$2::jsonb)", [
        `success-${i}`,
        JSON.stringify({ name: { valor: "Exemplo" } }),
      ]);
    }
    const limit = await db.query<{ result: { limited?: boolean } }>(
      "select public.reserve_ai_import('eleventh-success') result",
    );
    expect(limit.rows[0].result.limited).toBe(true);
    const p = initialProperty();
    await db.query("select public.save_household($1::jsonb)", [
      JSON.stringify({ version: 1, properties: [p], preferences: defaults }),
    ]);
    await db.query(
      "insert into storage.objects(bucket_id,name) values($1,$2)",
      ["nosso-lar-private", `${hid}/${p.id}/file.pdf`],
    );
    await db.exec(
      `set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';`,
    );
    expect(
      (await db.query<{ id: string }>("select public.ensure_household() id"))
        .rows[0].id,
    ).toBe(hid);
    const shared = await db.query<{ data: { properties: { name: string }[] } }>(
      "select public.load_household() data",
    );
    const sharedLiving = await db.query<{
      data: { items: { name: string }[] };
    }>("select public.load_living() data");
    expect(sharedLiving.rows[0].data.items[0].name).toBe("Sofá de teste");
    expect(shared.rows[0].data.properties[0].name).toBe(
      "Cobertura em avaliação",
    );
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
    await db.query("select public.save_household($1::jsonb)", [
      JSON.stringify({
        version: 1,
        properties: [{ ...p, name: "Atualizado pelo casal" }],
        preferences: defaults,
      }),
    ]);
    await db.exec(
      `set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';`,
    );
    expect((await db.query("select * from properties")).rows).toHaveLength(0);
    expect((await db.query("select * from purchase_items")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query("select public.save_living($1::jsonb,1)", [
        JSON.stringify(living),
      ]),
    ).rejects.toThrow("Acesso reservado");
    expect(
      (await db.query("select * from property_finances")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await expect(db.query("select public.ensure_household()")).rejects.toThrow(
      "Acesso reservado",
    );
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
        "nosso-lar-private",
        `${hid}/malicious.pdf`,
      ]),
    ).rejects.toThrow();
    await db.exec(`set role anon;set request.jwt.claim.sub='';`);
    expect((await db.query("select * from properties")).rows).toHaveLength(0);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query("select public.ensure_household()"),
    ).rejects.toThrow();
    await db.exec("reset role");
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets",
        )
      ).rows[0].public,
    ).toBe(false);
  } finally {
    await db.close();
  }
}, 30000);

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { emptyLiving, livingSchema, type Living } from "./living";
import { putFile } from "./attachments";
import { validateFile, type Attachment } from "./attachment-types";
const KEY = "nosso-lar-living-v1";
const staged = new Map<string, Attachment>();
const allPhotos = (data: Living) => [
  ...data.items.flatMap((i) => [
    ...i.photos,
    ...i.options.flatMap((o) => o.photos),
  ]),
  ...data.inspirations.flatMap((r) => r.photos),
];
export async function discardLivingPhotos(keep: Attachment[] = []) {
  const kept = new Set(keep.map((f) => f.id));
  const paths = [...staged.values()]
    .filter((f) => !kept.has(f.id) && f.remotePath)
    .map((f) => f.remotePath!);
  if (supabase && paths.length) {
    try {
      await supabase.storage.from("nosso-lar-private").remove(paths);
    } catch {
      // Cleanup must not turn a successful save into an apparent failure.
    }
  }
  staged.clear();
}
export function useLiving() {
  const [data, setData] = useState<Living>(emptyLiving),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (supabase) {
        const result = await supabase.rpc("load_living");
        if (result.error)
          throw Error(
            "Não conseguimos abrir Mobília e Inspirações. Confira a conexão e se a atualização do banco foi aplicada.",
          );
        setData(livingSchema.parse(result.data));
      } else {
        const stored = localStorage.getItem(KEY);
        setData(
          stored ? livingSchema.parse(JSON.parse(stored)) : emptyLiving(),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function save(next: Living) {
    if (locked.current || loading || error)
      throw Error("Aguarde o carregamento ou tente atualizar a lista.");
    locked.current = true;
    setSaving(true);
    try {
      const checked = livingSchema.safeParse(next);
      if (!checked.success)
        throw Error(
          checked.error.issues[0]?.message ??
            "Confira os campos antes de salvar.",
        );
      const parsed = checked.data;
      let revision = data.revision + 1;
      if (supabase) {
        const result = await supabase.rpc("save_living", {
          payload: parsed,
          expected_revision: data.revision,
        });
        if (result.error)
          throw Error(
            result.error.message.includes("CONFLICT")
              ? "A lista mudou em outro aparelho. Feche esta edição e atualize a lista antes de tentar novamente."
              : "Não foi possível salvar na conta. Sua edição continua aberta; tente novamente.",
          );
        revision = result.data;
      } else localStorage.setItem(KEY, JSON.stringify({ ...parsed, revision }));
      setData({ ...parsed, revision });
      const retained = allPhotos(parsed);
      const ids = new Set(retained.map((f) => f.id));
      const removed = allPhotos(data)
        .filter((f) => !ids.has(f.id) && f.remotePath)
        .map((f) => f.remotePath!);
      if (supabase && removed.length) {
        try {
          await supabase.storage.from("nosso-lar-private").remove(removed);
        } catch {
          // The record is already saved; leftover files can be cleaned later.
        }
      }
      await discardLivingPhotos(retained);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return { data, loading, error, saving, save, reload };
}
export async function saveLivingPhoto(file: File): Promise<Attachment> {
  const mime = await validateFile(file, file.name);
  if (!mime.startsWith("image/"))
    throw Error("Escolha uma imagem JPG, PNG ou WebP.");
  const bitmap = await createImageBitmap(file).catch(() => { throw Error("Não conseguimos abrir essa imagem. Tente outra foto JPG, PNG ou WebP."); });
  let blob: Blob;
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("Não foi possível preparar a imagem.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("Não foi possível compactar a foto.")),
        "image/jpeg",
        0.82,
      ),
    );
  } finally {
    bitmap.close();
  }
  if (blob.size > 2 * 1024 * 1024)
    throw Error("A imagem continua grande. Escolha uma foto menor.");
  const id = crypto.randomUUID();
  const meta: Attachment = {
    id,
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 180) + ".jpg",
    mime: "image/jpeg",
    size: blob.size,
    category: "Foto",
    createdAt: new Date().toISOString(),
  };
  if (supabase) {
    const household = await supabase.rpc("ensure_household");
    if (household.error) throw Error("Entre na conta para guardar a foto.");
    const remotePath = `${household.data}/living/${id}`;
    const { error } = await supabase.storage
      .from("nosso-lar-private")
      .upload(remotePath, blob, { contentType: "image/jpeg" });
    if (error)
      throw Error(
        "Não foi possível guardar a foto. Confira a conexão e o espaço do Supabase Free; nenhuma compra foi salva sem sua confirmação.",
      );
    meta.remotePath = remotePath;
  }
  staged.set(id, meta);
  await putFile(id, blob);
  return meta;
}

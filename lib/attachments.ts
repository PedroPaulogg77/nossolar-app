import { supabase } from "./supabase";
import type { Property } from "./domain";
import {
  Attachment,
  MAX_TOTAL_SIZE,
  fileBackupSchema,
  validateFile,
} from "./attachment-types";
const BUCKET = "nosso-lar-private";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nosso-lar-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(Error("Não foi possível abrir os anexos neste navegador."));
  });
}
export async function putFile(id: string, blob: Blob) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          Error(
            "Não foi possível guardar o arquivo. Confira o espaço disponível.",
          ),
        );
      tx.onabort = () => reject(Error("O arquivo não foi salvo."));
    });
  } finally {
    db.close();
  }
}
export async function localFile(id: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("files").objectStore("files").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(Error("Não foi possível ler o anexo."));
    });
  } finally {
    db.close();
  }
}
export async function getFile(file: Attachment) {
  const local = await localFile(file.id);
  if (local) return local;
  if (!file.remotePath || !supabase)
    throw Error(
      "Este arquivo não está neste aparelho. Recupere uma cópia com os anexos ou entre na conta para baixá-lo.",
    );
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(file.remotePath);
  if (error || !data)
    throw Error(
      "Não foi possível abrir o arquivo agora. Tente novamente com a conta conectada.",
    );
  await putFile(file.id, data);
  return data;
}
export async function syncFiles(properties: Property[], householdId: string) {
  if (!supabase) throw Error("Conecte sua conta para guardar os anexos.");
  const result: Property[] = [];
  for (const p of properties) {
    const attachments: Attachment[] = [];
    for (const file of p.attachments) {
      const path = `${householdId}/${p.id}/${file.id}`;
      if (file.remotePath !== path) {
        const blob = await getFile(file);
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: file.mime, upsert: true });
        if (error)
          throw Error(
            "Não conseguimos guardar todos os anexos na conta. Os originais continuam neste aparelho; tente novamente.",
          );
      }
      attachments.push({ ...file, remotePath: path });
    }
    result.push({ ...p, attachments });
  }
  return result;
}
export async function packFiles(properties: Property[]) {
  const files = [];
  for (const p of properties)
    for (const file of p.attachments) {
      const blob = await getFile(file);
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () =>
          reject(Error("Não foi possível incluir um anexo na cópia."));
        reader.readAsDataURL(blob);
      });
      files.push({ id: file.id, data });
    }
  return files;
}
export async function restoreFiles(properties: Property[], raw: unknown) {
  const files = fileBackupSchema.parse(raw ?? []);
  const map = new Map(files.map((f) => [f.id, f.data]));
  let total = 0;
  const blobs: { id: string; blob: Blob }[] = [];
  for (const p of properties)
    for (const meta of p.attachments) {
      const data = map.get(meta.id);
      if (data === undefined) {
        if (!meta.remotePath && !(await localFile(meta.id)))
          throw Error(
            "A cópia não inclui todos os anexos. Nenhum imóvel foi substituído.",
          );
        continue;
      }
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data))
        throw Error("Anexo inválido na cópia.");
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      total += bytes.length;
      if (total > MAX_TOTAL_SIZE || bytes.length !== meta.size)
        throw Error("O tamanho dos anexos da cópia é inválido.");
      const blob = new Blob([bytes], { type: meta.mime });
      if ((await validateFile(blob, meta.name)) !== meta.mime)
        throw Error("Formato inválido na cópia.");
      blobs.push({ id: meta.id, blob });
    }
  // Validate every file before writing any of them; retain all originals on validation failure.
  for (const item of blobs) await putFile(item.id, item.blob);
}

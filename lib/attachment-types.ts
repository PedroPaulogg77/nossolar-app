import { z } from "zod";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_PROPERTY_FILES = 20;
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
export const attachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  mime: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  createdAt: z.string().datetime(),
  category: z.enum(["Foto", "Plano de pagamento", "Documento"]),
  remotePath: z.string().optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;
export const fileBackupSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      data: z.string().max(Math.ceil(MAX_FILE_SIZE / 3) * 4),
    }),
  )
  .max(200);
const extensions: Record<string, Attachment["mime"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export async function validateFile(
  file: Blob,
  name: string,
): Promise<Attachment["mime"]> {
  const mime = extensions[name.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) throw Error("Escolha PDF, JPG, PNG, WebP, DOCX ou XLSX.");
  if (!file.size || file.size > MAX_FILE_SIZE)
    throw Error("Cada arquivo precisa ter conteúdo e no máximo 10 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const head = String.fromCharCode(...bytes);
  const valid =
    mime === "application/pdf"
      ? head.startsWith("%PDF-")
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/png"
          ? bytes[0] === 137 && head.slice(1, 8) === "PNG\r\n\x1a\n"
          : mime === "image/webp"
            ? head.startsWith("RIFF") && head.slice(8, 12) === "WEBP"
            : head.startsWith("PK\x03\x04");
  if (!valid)
    throw Error(
      "O conteúdo do arquivo não corresponde ao formato. Escolha o arquivo original.",
    );
  return mime;
}
export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.ceil(bytes / 1024)} KB`;

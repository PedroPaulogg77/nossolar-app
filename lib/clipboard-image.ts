export function imageFromClipboard(data: DataTransfer): File | null {
  const item = [...data.items].find(
    (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (!file) return null;
  const extension =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : null;
  if (!extension) throw Error("Cole uma imagem JPG, PNG ou WebP.");
  return new File([file], `foto-colada.${extension}`, { type: file.type });
}

"use client";
import { useEffect, useState } from "react";
import type { Attachment } from "@/lib/attachment-types";
import { getFile } from "@/lib/attachments";
export function AttachmentCover({
  file,
  name,
  fallback,
}: {
  file?: Attachment;
  name: string;
  fallback: React.ReactNode;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    if (file)
      void getFile(file)
        .then((blob) => {
          if (active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file?.id, file?.remotePath]);
  return url ? <img src={url} alt={`Foto de ${name}`} /> : fallback;
}

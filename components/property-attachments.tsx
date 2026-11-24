"use client";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  ImageIcon,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import {
  Attachment,
  MAX_PROPERTY_FILES,
  MAX_TOTAL_SIZE,
  fileSize,
  validateFile,
} from "@/lib/attachment-types";
import { getFile, putFile } from "@/lib/attachments";
import { imageFromClipboard } from "@/lib/clipboard-image";
export function PropertyAttachments({
  files,
  onChange,
  onNotice,
  otherBytes = 0,
}: {
  files: Attachment[];
  onChange: (files: Attachment[]) => void;
  onNotice: (message: string) => void;
  otherBytes?: number;
}) {
  const [busy, setBusy] = useState(false),
    [category, setCategory] = useState<Attachment["category"]>("Documento"),
    [preview, setPreview] = useState<{ url: string; file: Attachment } | null>(
      null,
    );
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  function close() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
  }
  async function open(file: Attachment, download = false) {
    try {
      const blob = await getFile(file);
      const url = URL.createObjectURL(new Blob([blob], { type: file.mime }));
      if (
        download ||
        (!file.mime.startsWith("image/") && file.mime !== "application/pdf")
      ) {
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        close();
        previewRef.current = url;
        setPreview({ url, file });
      }
    } catch (e) {
      onNotice(
        e instanceof Error ? e.message : "Não foi possível abrir o anexo.",
      );
    }
  }
  async function add(incoming: File[]) {
    if (!incoming.length) return;
    setBusy(true);
    try {
      if (files.length + incoming.length > MAX_PROPERTY_FILES)
        throw Error("Guarde até 20 arquivos por imóvel.");
      if (
        otherBytes +
          files.reduce((n, f) => n + f.size, 0) +
          incoming.reduce((n, f) => n + f.size, 0) >
        MAX_TOTAL_SIZE
      )
        throw Error(
          "Seus anexos chegaram a 100 MB. Faça uma cópia e remova arquivos que não precisa mais.",
        );
      const prepared = [];
      for (const file of incoming) {
        const mime = await validateFile(file, file.name);
        const meta: Attachment = {
          id: crypto.randomUUID(),
          name: file.name.slice(0, 200),
          size: file.size,
          mime,
          category:
            mime.startsWith("image/") && category === "Documento"
              ? "Foto"
              : category,
          createdAt: new Date().toISOString(),
        };
        prepared.push({ meta, file });
      }
      for (const item of prepared) await putFile(item.meta.id, item.file);
      onChange([...files, ...prepared.map((x) => x.meta)]);
      onNotice("Arquivos preparados. Salve o imóvel para mantê-los na ficha.");
    } catch (e) {
      onNotice(
        e instanceof Error
          ? e.message
          : "Não foi possível guardar os arquivos.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="attachments-section" aria-label="Anexos do imóvel">
      <div className="attachments-heading">
        <div>
          <h3>Fotos e documentos</h3>
          <p>O plano de pagamento, as fotos da visita e o que vale guardar.</p>
        </div>
        <Paperclip size={20} />
      </div>
      <div className="upload-options">
        <label className="field">
          <span>O que vamos guardar?</span>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as Attachment["category"])
            }
          >
            <option>Documento</option>
            <option>Plano de pagamento</option>
            <option>Foto</option>
          </select>
        </label>
        <label className={"attachment-upload " + (busy ? "disabled" : "")}>
          <Paperclip size={18} />
          {busy ? "Guardando…" : "Anexar arquivos"}
          <input
            aria-label="Anexar arquivos"
            disabled={busy}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
            multiple
            onChange={(e) => {
              void add(e.target.files ? [...e.target.files] : []);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div
        className="attachment-paste"
        tabIndex={0}
        onPaste={(event) => {
          try {
            const image = imageFromClipboard(event.clipboardData);
            if (!image) return;
            event.preventDefault();
            void add([image]);
          } catch (error) {
            onNotice(
              error instanceof Error ? error.message : "Imagem inválida.",
            );
          }
        }}
      >
        Clique aqui e cole uma foto com Ctrl+V. A primeira foto aparece na capa
        do imóvel.
      </div>
      <p className="attachment-help">
        PDF, fotos, Word ou Excel · até 10 MB por arquivo. Os anexos não são
        enviados para a IA.
      </p>
      {!files.length ? (
        <div className="attachment-empty">
          Ainda não guardamos nenhum arquivo deste imóvel.
        </div>
      ) : (
        <ul className="attachment-list">
          {files.map((file) => (
            <li key={file.id}>
              {file.mime.startsWith("image/") ? (
                <ImageIcon size={21} />
              ) : (
                <FileText size={21} />
              )}
              <button className="attachment-name" onClick={() => open(file)}>
                <strong>{file.name}</strong>
                <span>
                  {file.category} · {fileSize(file.size)}
                </span>
              </button>
              <button
                className="icon-button"
                aria-label={`Baixar ${file.name}`}
                onClick={() => open(file, true)}
              >
                <Download size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={`Remover ${file.name}`}
                onClick={() => {
                  if (
                    confirm(
                      `Remover “${file.name}” desta ficha? A alteração será confirmada ao salvar o imóvel.`,
                    )
                  ) {
                    if (preview?.file.id === file.id) close();
                    onChange(files.filter((f) => f.id !== file.id));
                  }
                }}
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div className="attachment-preview">
          <div>
            <strong>{preview.file.name}</strong>
            <button
              className="icon-button"
              aria-label="Fechar prévia"
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>
          {preview.file.mime.startsWith("image/") ? (
            <img src={preview.url} alt={preview.file.name} />
          ) : (
            <iframe
              src={preview.url}
              title={`Prévia de ${preview.file.name}`}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
          <button
            className="text-button"
            onClick={() => open(preview.file, true)}
          >
            Baixar arquivo <Download size={15} />
          </button>
        </div>
      )}
    </section>
  );
}

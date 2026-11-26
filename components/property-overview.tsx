"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Pencil,
  Scale,
} from "lucide-react";
import { AttachmentCover } from "./attachment-cover";
import { Modal } from "./dialog";
import {
  type Property,
  documentation,
  entry,
  money,
  recurring,
} from "@/lib/domain";
import { propertyLocation } from "@/lib/locations";
import { getFile } from "@/lib/attachments";

export function PropertyOverview({
  property: p,
  onClose,
  onEdit,
  onPlan,
  onCompare,
  onNotice,
}: {
  property: Property;
  onClose: () => void;
  onEdit: () => void;
  onPlan: () => void;
  onCompare: () => void;
  onNotice: (message: string) => void;
}) {
  async function downloadFile(file: Property["attachments"][number]) {
    try {
      const blob = await getFile(file);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      onNotice("Não foi possível abrir o arquivo agora.");
    }
  }
  const facts = [
    p.area !== null && `${p.area} m²`,
    p.rooms !== null && `${p.rooms} quartos`,
    p.suites !== null && `${p.suites} suítes`,
    p.baths !== null && `${p.baths} banheiros`,
    p.parking !== null && `${p.parking} vagas`,
    p.balcony === true && "Varanda",
  ].filter(Boolean);
  const costs = [
    ["Entrada", entry(p)],
    [
      p.finance.docMode === "estimate"
        ? "Documentação estimada"
        : "Documentação",
      documentation(p),
    ],
    ["Mensal após financiamento", recurring(p)],
  ] as const;
  const hasCosts = costs.some(([, value]) => value !== null);
  const missingCosts = costs
    .filter(([, value]) => value === null)
    .map(([label]) => label.toLocaleLowerCase("pt-BR"));
  const image = p.attachments.find((file) => file.mime.startsWith("image/"));
  return (
    <Modal
      title={p.name}
      description={propertyLocation(p)}
      className="property-overview-dialog"
      onClose={onClose}
    >
      <div className="property-overview-body">
        {(p.photo || image) && (
          <div className="property-overview-hero">
            {p.photo && /^https?:\/\//i.test(p.photo) ? (
              <img src={p.photo} alt={`Foto de ${p.name}`} />
            ) : (
              <AttachmentCover
                file={image}
                name={p.name}
                fallback={<span>Foto indisponível</span>}
              />
            )}
          </div>
        )}
        <div className="property-overview-content">
          <div className="property-overview-intro">
            <div>
              <span className="eyebrow">
                {p.type ?? "TIPO A CONFIRMAR"} · {p.status}
              </span>
              <strong>{money(p.price)}</strong>
            </div>
            {/^https?:\/\//i.test(p.url) && (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                Abrir anúncio <ArrowUpRight size={16} />
              </a>
            )}
          </div>
          {facts.length > 0 && (
            <div
              className="property-overview-facts"
              aria-label="Características do imóvel"
            >
              {facts.map((fact) => (
                <span key={String(fact)}>{fact}</span>
              ))}
            </div>
          )}
          <section className="property-overview-section">
            <h3>Como fica no nosso bolso</h3>
            {hasCosts ? (
              <div className="property-overview-costs">
                {costs.map(
                  ([label, value]) =>
                    value !== null && (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{money(value)}</strong>
                      </div>
                    ),
                )}
              </div>
            ) : (
              <p>Os valores da proposta ainda não foram registrados.</p>
            )}
            {hasCosts && missingCosts.length > 0 && (
              <p>Falta informar: {missingCosts.join(", ")}.</p>
            )}
            <button className="primary" onClick={onPlan}>
              Ver gastos por mês <ArrowRight size={17} />
            </button>
          </section>
          {(p.listingHighlights || p.notes) && (
            <section className="property-overview-section">
              <h3>O que anotamos</h3>
              {p.listingHighlights && <p>{p.listingHighlights}</p>}
              {p.notes && <p>{p.notes}</p>}
            </section>
          )}
          {p.attachments.length > 0 && (
            <section className="property-overview-section">
              <h3>Arquivos guardados</h3>
              <div className="property-overview-files">
                {p.attachments.map((file) => (
                  <button
                    key={file.id}
                    className="text-button"
                    onClick={() => void downloadFile(file)}
                  >
                    {file.name} <ArrowDownToLine size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <div className="dialog-footer property-overview-actions">
        <button className="text-button" onClick={onCompare}>
          <Scale size={16} /> Comparar
        </button>
        <button className="secondary" onClick={onEdit}>
          <Pencil size={16} /> Editar informações
        </button>
      </div>
    </Modal>
  );
}

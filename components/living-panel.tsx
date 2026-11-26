"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Sofa,
  Images,
  ExternalLink,
  Trash2,
  RefreshCw,
  Heart,
} from "lucide-react";
import { Modal } from "./dialog";
import { PinterestReference } from "./pinterest-reference";
import { AttachmentCover } from "./attachment-cover";
import {
  budget,
  groups,
  priorities,
  rooms,
  itemTotal,
  newPurchase,
  purchasesFlow,
  livingSchema,
  type Purchase,
  type Inspiration,
  type Living,
} from "@/lib/living";
import {
  saveLivingPhoto,
  useLiving,
  discardLivingPhotos,
} from "@/lib/living-store";
import { money, cashflow, type Property } from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import type { Attachment } from "@/lib/attachment-types";
type Store = ReturnType<typeof useLiving>;
const DRAFT_KEY = "nosso-lar-shopping-draft-v1";
const CHECKLIST_KEY = "nosso-lar-moving-checklist-v1";
const STARTER_LIST: {
  room: string;
  group: Purchase["group"];
  items: string[];
}[] = [
  {
    room: "Entrada",
    group: "Outros",
    items: [
      "Fechadura ou troca de segredo",
      "Capacho",
      "Sapateira",
      "Cabideiro",
      "Luminária de entrada",
      "Porta-chaves",
    ],
  },
  {
    room: "Sala",
    group: "Móveis e eletrodomésticos",
    items: [
      "Sofá",
      "Rack ou painel",
      "Mesa de centro",
      "Mesa lateral",
      "Poltrona",
      "Estante",
      "Cortina",
      "Tapete",
      "Luminária",
      "TV",
    ],
  },
  {
    room: "Sala",
    group: "Decoração e iluminação",
    items: [
      "Lâmpadas",
      "Abajur",
      "Almofadas",
      "Quadros",
      "Espelho",
      "Vasos",
      "Manta",
      "Relógio de parede",
    ],
  },
  {
    room: "Cozinha",
    group: "Eletrodomésticos",
    items: [
      "Geladeira",
      "Fogão ou cooktop",
      "Forno",
      "Micro-ondas",
      "Depurador ou coifa",
      "Liquidificador",
      "Sanduicheira",
      "Cafeteira",
      "Air fryer",
      "Filtro de água",
    ],
  },
  {
    room: "Cozinha",
    group: "Móveis e eletrodomésticos",
    items: [
      "Mesa de jantar",
      "Cadeiras",
      "Armário ou solução de cozinha",
      "Bancada ou carrinho",
      "Banquetas",
      "Lixeira",
    ],
  },
  {
    room: "Cozinha",
    group: "Utensílios",
    items: [
      "Jogo de panelas",
      "Frigideira",
      "Panela de pressão",
      "Assadeira",
      "Forma",
      "Facas",
      "Tábua de corte",
      "Escorredor de louça",
      "Potes para alimentos",
      "Pratos",
      "Copos",
      "Canecas",
      "Talheres",
      "Concha e espátula",
      "Abridor de latas",
      "Ralador",
      "Peneira",
      "Jarra",
      "Garrafa térmica",
      "Panos de prato",
      "Luva térmica",
      "Lixeira e sacos",
    ],
  },
  {
    room: "Quarto",
    group: "Móveis e eletrodomésticos",
    items: [
      "Cama",
      "Colchão",
      "Guarda-roupa",
      "Criados-mudos",
      "Cômoda",
      "Cortina",
      "Espelho",
      "Ventilador",
    ],
  },
  {
    room: "Quarto",
    group: "Enxoval",
    items: [
      "Travesseiros",
      "Protetor de colchão",
      "Jogo de lençol",
      "Cobertor",
      "Edredom",
      "Colcha",
      "Cabides",
      "Cesto de roupa",
      "Luminária de cabeceira",
    ],
  },
  {
    room: "Banheiro",
    group: "Móveis e eletrodomésticos",
    items: [
      "Chuveiro (se não houver)",
      "Gabinete ou armário",
      "Espelho",
      "Lixeira",
      "Suporte de toalha",
    ],
  },
  {
    room: "Banheiro",
    group: "Enxoval",
    items: [
      "Toalhas de banho",
      "Toalhas de rosto",
      "Tapete de banheiro",
      "Cortina de box (se necessário)",
      "Porta-sabonete",
      "Porta-escovas",
      "Escova sanitária",
      "Desentupidor",
    ],
  },
  {
    room: "Lavanderia",
    group: "Eletrodomésticos",
    items: [
      "Máquina de lavar",
      "Varal",
      "Ferro de passar",
      "Tábua de passar",
      "Aspirador de pó",
      "Vassoura",
      "Rodo",
      "Balde",
      "Pá de lixo",
      "Mop",
    ],
  },
  {
    room: "Lavanderia",
    group: "Organização e limpeza",
    items: [
      "Cesto de roupa",
      "Pregadores",
      "Cesto de produtos",
      "Lixeira",
      "Panos de chão",
      "Esponjas",
      "Detergente",
      "Desinfetante",
      "Sabão para roupas",
      "Amaciante",
      "Água sanitária",
      "Luvas de limpeza",
    ],
  },
  {
    room: "Geral",
    group: "Organização e limpeza",
    items: [
      "Lâmpadas extras",
      "Extensão",
      "Filtro de linha",
      "Fita isolante",
      "Fita veda-rosca",
      "Kit de ferramentas",
      "Furadeira",
      "Escada doméstica",
      "Caixa organizadora",
      "Caixa de primeiros socorros",
      "Kit de costura",
      "Pilhas",
      "Carregadores",
      "Lixeira e sacos de lixo",
    ],
  },
];
const moments = [
  "Antes das chaves",
  "Na mudança",
  "Depois da mudança",
  "Só uma ideia",
  "Já temos",
  "Descartado",
] as const;
type Moment = (typeof moments)[number];
const momentOf = (item: Purchase, moveMonth: string): Moment =>
  item.moment ??
  (item.priority === "Depois"
    ? "Depois da mudança"
    : item.priority === "Desejo"
      ? "Só uma ideia"
      : item.priority === "Já temos"
        ? "Já temos"
        : item.priority === "Não comprar"
          ? "Descartado"
          : (item.options.find((o) => o.id === item.selected)?.firstMonth ||
                item.firstMonth) < moveMonth
            ? "Antes das chaves"
            : "Na mudança");
const priorityOf = (moment: Moment): Purchase["priority"] =>
  moment === "Depois da mudança"
    ? "Depois"
    : moment === "Só uma ideia"
      ? "Desejo"
      : moment === "Já temos"
        ? "Já temos"
        : moment === "Descartado"
          ? "Não comprar"
          : "Para a mudança";
const monthAfter = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${y + (m === 12 ? 1 : 0)}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
};
const momentForMonth = (month: string, moveMonth: string): Moment =>
  month < moveMonth
    ? "Antes das chaves"
    : month === moveMonth
      ? "Na mudança"
      : "Depois da mudança";
const number = (s: string) => (s === "" ? null : Number(s));
function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required={required}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Photos({
  files,
  onChange,
  onBusy,
  onError,
}: {
  files: Attachment[];
  onChange: (v: Attachment[]) => void;
  onBusy: (v: boolean) => void;
  onError: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="living-photos"
      tabIndex={0}
      onPaste={async (e) => {
        const image = [...e.clipboardData.items]
          .find((x) => x.type.startsWith("image/"))
          ?.getAsFile();
        if (!image) return;
        e.preventDefault();
        if (files.length >= 10) {
          onError("Use até 10 fotos.");
          return;
        }
        onBusy(true);
        setBusy(true);
        try {
          onChange([
            ...files,
            await saveLivingPhoto(
              new File(
                [image],
                `foto-colada.${image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg"}`,
                { type: image.type },
              ),
            ),
          ]);
        } catch (err) {
          onError(
            err instanceof Error
              ? err.message
              : "Não foi possível colar a foto.",
          );
        } finally {
          onBusy(false);
          setBusy(false);
        }
      }}
    >
      <div className="living-thumbnails">
        {files.map((file) => (
          <div key={file.id}>
            <AttachmentCover
              file={file}
              name={file.name}
              fallback={<Images />}
            />
            <button
              type="button"
              aria-label={`Remover foto ${file.name}`}
              onClick={() => onChange(files.filter((f) => f.id !== file.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <label className="attachment-upload">
        {busy ? "Guardando fotos…" : "Adicionar fotos"}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || files.length >= 10}
          onChange={async (e) => {
            const incoming = [...(e.target.files ?? [])];
            e.target.value = "";
            if (incoming.length + files.length > 10) {
              onError("Use até 10 fotos por item, opção ou referência.");
              return;
            }
            setBusy(true);
            onBusy(true);
            const added: Attachment[] = [];
            try {
              for (const file of incoming)
                added.push(await saveLivingPhoto(file));
            } catch (err) {
              onError(
                err instanceof Error
                  ? err.message
                  : "Não foi possível enviar a imagem.",
              );
            } finally {
              if (added.length) onChange([...files, ...added]);
              setBusy(false);
              onBusy(false);
            }
          }}
        />
      </label>
      <small>Clique nesta área e cole uma foto com Ctrl+V.</small>
      <small>
        JPG, PNG ou WebP, até 10 MB por foto. Compactamos antes de guardar.
      </small>
    </div>
  );
}
function Budget({
  data,
  properties,
  mode,
  onChange,
  saving,
}: {
  data: Living;
  properties: Property[];
  mode: "Simulação" | "Comprado";
  onChange: (patch: Partial<Living>) => void;
  saving: boolean;
}) {
  const [start, setStart] = useState(
    new Date().toLocaleDateString("sv-SE").slice(0, 7),
  );
  const [propertyId, setPropertyId] = useState("");
  const property = properties.find((p) => p.id === propertyId);
  const [limitDraft, setLimitDraft] = useState(String(data.monthlyLimit ?? ""));
  const monthCount = Math.max(
    12,
    Math.min(
      36,
      (Number(data.moveMonth.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
        Number(data.moveMonth.slice(5)) -
        Number(start.slice(5)) +
        4,
    ),
  );
  const plan = purchasesFlow(data.items, start, monthCount, "planned");
  const bought = purchasesFlow(data.items, start, monthCount, "bought");
  const home = property ? cashflow(property, start, monthCount) : null;
  const b = budget(data.items);
  return (
    <details className="planning">
      <summary>Ver gastos mês a mês</summary>
      <div className="planning-content">
        <div className="planning-heading">
          <h2>Quanto vamos pagar por mês?</h2>
          <label className="field">
            <span>Mudança prevista</span>
            <input
              type="month"
              value={data.moveMonth}
              disabled={saving}
              onChange={(e) => onChange({ moveMonth: e.target.value })}
            />
          </label>
        </div>
        <div className="planning-settings">
          <label className="field">
            <span>Somar um imóvel</span>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">Nenhum imóvel</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Ver a partir de</span>
            <input
              type="month"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="living-check">
            <input
              type="checkbox"
              checked={data.limitEnabled}
              disabled={saving}
              onChange={(e) => onChange({ limitEnabled: e.target.checked })}
            />{" "}
            Usar limite mensal
          </label>
          {data.limitEnabled && (
            <label className="field">
              <span>Limite por mês (R$)</span>
              <input
                type="number"
                min="0"
                value={limitDraft}
                onChange={(e) => setLimitDraft(e.target.value)}
                onBlur={() => {
                  if (number(limitDraft) !== data.monthlyLimit)
                    onChange({ monthlyLimit: number(limitDraft) });
                }}
              />
            </label>
          )}
        </div>
        <div className="planning-bars">
          {plan.months.map((m, i) => {
            const housing = home?.months[i]?.total ?? 0;
            const committed = bought.months[i].total;
            const simulated = mode === "Simulação" ? m.total : 0;
            const total = housing + committed + simulated;
            const max = Math.max(
              1,
              ...plan.months.map(
                (x, j) =>
                  (home?.months[j]?.total ?? 0) +
                  bought.months[j].total +
                  (mode === "Simulação" ? x.total : 0),
              ),
            );
            return (
              <div
                className={
                  m.key === data.moveMonth
                    ? "planning-bar moving"
                    : "planning-bar"
                }
                key={m.key}
                title={`Imóvel ${money(housing)} · Comprado ${money(committed)} · Planejado ${money(simulated)}`}
              >
                <strong>{money(total)}</strong>
                <div className="planning-bar-track">
                  <div
                    className="bar-plan"
                    style={{ height: `${(simulated / max) * 100}%` }}
                  />
                  <div
                    className="bar-bought"
                    style={{ height: `${(committed / max) * 100}%` }}
                  />
                  <div
                    className="bar-home"
                    style={{ height: `${(housing / max) * 100}%` }}
                  />
                </div>
                <span>
                  {m.key.slice(5)}/{m.key.slice(2, 4)}
                </span>
                {m.key === data.moveMonth && <small>Mudança</small>}
                {data.limitEnabled &&
                  data.monthlyLimit !== null &&
                  total > data.monthlyLimit && (
                    <small className="over-limit">Acima do limite</small>
                  )}
              </div>
            );
          })}
        </div>
        <div className="planning-legend">
          {property && <span>■ Imóvel</span>}
          <span>■ Comprado</span>
          {mode === "Simulação" && <span>■ Planejado</span>}
        </div>
        {[...plan.pending, ...bought.pending, ...(home?.pending ?? [])].length >
          0 && (
          <p className="hint">
            Sem preço ou mês definido:{" "}
            {[
              ...new Set([
                ...plan.pending,
                ...bought.pending,
                ...(home?.pending ?? []),
              ]),
            ].join(", ")}
            .
          </p>
        )}
      </div>
    </details>
  );
}
export function LivingPanel({
  area,
  store,
  properties,
}: {
  area: "Mobília" | "Inspirações";
  store: Store;
  properties: Property[];
}) {
  const { data, loading, error, saving, save, reload } = store;
  const [mode, setMode] = useState<"Simulação" | "Comprado">("Simulação");
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  useEffect(() => {
    try {
      setChecklist(JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]"));
    } catch {
      setChecklist([]);
    }
  }, []);
  const toggleChecklist = (key: string) =>
    setChecklist((current) => {
      const next = current.includes(key)
        ? current.filter((x) => x !== key)
        : [...current, key];
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  const [group, setGroup] = useState(""),
    [room, setRoom] = useState(""),
    [search, setSearch] = useState("");
  const [item, setItem] = useState<Purchase | null>(null),
    [reference, setReference] = useState<Inspiration | null>(null),
    [collection, setCollection] = useState(""),
    [editingCollection, setEditingCollection] = useState<{
      id: string;
      name: string;
    } | null>(null);
  const [message, setMessage] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(""),
    [sourceText, setSourceText] = useState(""),
    [importing, setImporting] = useState(false),
    [importOpen, setImportOpen] = useState(false);
  useEffect(() => {
    if (!item || data.items.some((i) => i.id === item.id)) return;
    const timer = setTimeout(() => {
      try {
        const safe = {
          ...item,
          photos: [],
          options: item.options.map((o) => ({ ...o, photos: [] })),
        };
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ at: Date.now(), item: safe, sourceUrl, sourceText }),
        );
      } catch {
        /* Storage can be unavailable. */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [item, sourceUrl, sourceText, data.items]);
  const newItem = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved && Date.now() - saved.at < 7 * 86400000) {
        const parsed = livingSchema.shape.items.element.safeParse(saved.item);
        if (parsed.success) {
          setSourceUrl(saved.sourceUrl ?? "");
          setSourceText(saved.sourceText ?? "");
          setItem(parsed.data);
          setImportOpen(false);
          return;
        }
      }
    } catch {
      /* Start a fresh item. */
    }
    setSourceUrl("");
    setSourceText("");
    setImportOpen(true);
    setItem({ ...newPurchase(), firstMonth: data.moveMonth });
  };
  const importProduct = async () => {
    setMessage("");
    setImporting(true);
    try {
      const session = await supabase?.auth.getSession();
      const response = await fetch("/api/import-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          url: sourceUrl.trim(),
          text: sourceText.trim(),
          consent: true,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Não foi possível ler o produto.");
      const p = result.product as {
        item: string;
        title: string;
        model: string;
        price: number | null;
        store: string;
        notes: string;
      };
      const id = crypto.randomUUID();
      setItem((current) =>
        current
          ? {
              ...current,
              name: current.name || p.item,
              options: [
                ...current.options,
                {
                  id,
                  name: p.title,
                  model: p.model,
                  price: p.price,
                  store: p.store,
                  notes: p.notes,
                  url: sourceUrl.trim(),
                  photos: [],
                },
              ],
              selected: current.selected ?? id,
            }
          : current,
      );
      setImportOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setImporting(false);
    }
  };
  const run = async (next: Living, done?: () => void) => {
    setMessage("");
    try {
      await save(next);
      done?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };
  const close = (fn: () => void) => {
    if (
      !saving &&
      !photoBusy &&
      ((item && !data.items.some((i) => i.id === item.id)) ||
        confirm("Fechar sem salvar esta edição?"))
    ) {
      if (item && !data.items.some((i) => i.id === item.id)) {
        try {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              at: Date.now(),
              item: {
                ...item,
                photos: [],
                options: item.options.map((o) => ({ ...o, photos: [] })),
              },
              sourceUrl,
              sourceText,
            }),
          );
        } catch {
          /* Storage can be unavailable. */
        }
      }
      fn();
      void discardLivingPhotos();
      setMessage("");
    }
  };
  const photoProps = { onBusy: setPhotoBusy, onError: setMessage };
  const visible = data.items.filter(
    (i) =>
      (mode === "Simulação" ? !i.purchased : i.purchased) &&
      (!group || i.group === group) &&
      (!room || i.room === room) &&
      i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const refs = data.inspirations.filter(
    (r) => !collection || r.collectionId === collection,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {area === "Mobília" ? "Compras da casa" : "Ideias para o nosso lar"}
          </h1>
        </div>
        <div className="living-heading-actions">
          <button
            className="text-button living-refresh"
            aria-label="Atualizar lista"
            title="Atualizar lista"
            disabled={loading || saving}
            onClick={() => void reload()}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="primary"
            disabled={loading || !!error}
            onClick={() => {
              setMessage("");
              if (area === "Mobília") newItem();
              else if (!data.collections.length)
                setEditingCollection({ id: crypto.randomUUID(), name: "" });
              else
                setReference({
                  id: crypto.randomUUID(),
                  collectionId: collection || data.collections[0].id,
                  title: "",
                  url: "",
                  notes: "",
                  itemId: null,
                  photos: [],
                });
            }}
          >
            <Plus size={18} />
            {area === "Mobília" ? "Adicionar item" : "Adicionar referência"}
          </button>
        </div>
      </div>
      {message && !item && !reference && !editingCollection && (
        <p role="alert" className="living-error">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Abrindo nosso espaço…</p>
      ) : error ? (
        <div className="collection-empty">
          <p role="alert">{error}</p>
          <button className="secondary" onClick={() => void reload()}>
            Tentar novamente
          </button>
        </div>
      ) : area === "Mobília" ? (
        <>
          <div className="planning-modes" role="tablist" aria-label="Compras">
            {(["Simulação", "Comprado"] as const).map((v) => (
              <button
                role="tab"
                aria-selected={mode === v}
                className={mode === v ? "active" : ""}
                key={v}
                onClick={() => setMode(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="shopping-overview">
            <span>
              {mode === "Simulação" ? "Total planejado" : "Já comprado"}
            </span>
            <strong>
              {money(
                data.items
                  .filter(
                    (i) =>
                      (i.priority === "Para a mudança" ||
                        i.priority === "Depois") &&
                      i.purchased === (mode === "Comprado"),
                  )
                  .reduce((sum, i) => sum + (itemTotal(i) ?? 0), 0),
              )}
            </strong>
          </div>
          <details
            className="starter-checklist"
            open={checklistOpen}
            onToggle={(e) => setChecklistOpen(e.currentTarget.open)}
          >
            <summary>
              Checklist da casa <small>· sugestões fora da simulação</small>
            </summary>
            <div className="starter-groups">
              {STARTER_LIST.map((section) => (
                <section key={section.room + section.group}>
                  <h3>
                    {section.room} <small>{section.group}</small>
                  </h3>
                  {section.items.map((name) => {
                    const key = `${section.room}|${name}`;
                    const included = data.items.some(
                      (i) =>
                        i.room === section.room &&
                        i.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
                    );
                    return (
                      <label className="starter-item" key={key}>
                        <input
                          type="checkbox"
                          checked={checklist.includes(key) || included}
                          disabled={included}
                          onChange={() => toggleChecklist(key)}
                        />
                        <span>{name}</span>
                        {!included && checklist.includes(key) && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const item = {
                                ...newPurchase(),
                                name,
                                room: section.room,
                                group: section.group,
                                firstMonth: data.moveMonth,
                              };
                              void run({
                                ...data,
                                items: [...data.items, item],
                              });
                            }}
                          >
                            Adicionar
                          </button>
                        )}
                      </label>
                    );
                  })}
                </section>
              ))}
            </div>
          </details>
          <details className="living-extra-filters">
            <summary>Buscar</summary>
            <div className="living-filters">
              <Input label="Buscar item" value={search} onChange={setSearch} />
              <label className="field">
                <span>Grupo</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="">Todos os grupos</option>
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Cômodo</span>
                <select value={room} onChange={(e) => setRoom(e.target.value)}>
                  <option value="">Todos os cômodos</option>
                  {rooms.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          {!visible.length ? (
            <div className="collection-empty">
              <Sofa />
              <h3>
                {mode === "Comprado"
                  ? "Ainda não compramos nenhum item"
                  : "Nossa lista está aberta"}
              </h3>
              <p>
                Adicione um item pelo nome. Fotos, preços e alternativas podem
                vir depois.
              </p>
              {(group || room || search) && (
                <button
                  className="secondary"
                  onClick={() => {
                    setGroup("");
                    setRoom("");
                    setSearch("");
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="shopping-list">
              {visible.map((i) => {
                const option = i.options.find((o) => o.id === i.selected);
                return (
                  <div className="shopping-row" key={i.id}>
                    <div
                      className="shopping-thumb"
                      tabIndex={0}
                      title="Passe o mouse e cole uma foto com Ctrl+V"
                      onPaste={async (e) => {
                        const image = [...e.clipboardData.items]
                          .find((x) => x.type.startsWith("image/"))
                          ?.getAsFile();
                        if (!image) return;
                        e.preventDefault();
                        try {
                          const photo = await saveLivingPhoto(
                            new File([image], `foto-${i.name}.png`, {
                              type: image.type,
                            }),
                          );
                          const next = {
                            ...data,
                            items: data.items.map((x) =>
                              x.id === i.id
                                ? { ...x, photos: [...x.photos, photo] }
                                : x,
                            ),
                          };
                          await save(next);
                        } catch (err) {
                          setMessage(
                            err instanceof Error
                              ? err.message
                              : "Não foi possível colar a foto.",
                          );
                        }
                      }}
                      onMouseEnter={(e) => e.currentTarget.focus()}
                    >
                      <AttachmentCover
                        file={option?.photos[0] || i.photos[0]}
                        name={i.name}
                        fallback={<Sofa size={20} />}
                      />
                    </div>
                    <div className="shopping-name">
                      <strong>{i.name}</strong>
                      <small>
                        {i.quantity} {i.quantity === 1 ? "unidade" : "unidades"}{" "}
                        · {i.room || i.group}
                      </small>
                    </div>
                    <label className="shopping-priority">
                      <span>Quando</span>
                      <select
                        aria-label={`Quando comprar ${i.name}`}
                        value={momentOf(i, data.moveMonth)}
                        disabled={saving}
                        onChange={(e) => {
                          const moment = e.target.value as Moment;
                          const firstMonth =
                            moment === "Na mudança"
                              ? data.moveMonth
                              : moment === "Depois da mudança"
                                ? monthAfter(data.moveMonth)
                                : i.firstMonth;
                          void run({
                            ...data,
                            items: data.items.map((x) =>
                              x.id === i.id
                                ? {
                                    ...x,
                                    moment,
                                    priority: priorityOf(moment),
                                    firstMonth,
                                    options: x.options.map((o) =>
                                      o.id === x.selected
                                        ? { ...o, firstMonth }
                                        : o,
                                    ),
                                  }
                                : x,
                            ),
                          });
                        }}
                      >
                        {moments.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="shopping-choice">
                      <span>Opção</span>
                      <select
                        aria-label={`Opção de ${i.name}`}
                        value={i.selected ?? ""}
                        disabled={saving}
                        onChange={(e) => {
                          const selected = e.target.value || null;
                          const month =
                            i.options.find((o) => o.id === selected)
                              ?.firstMonth || i.firstMonth;
                          const moment =
                            i.priority === "Para a mudança" ||
                            i.priority === "Depois"
                              ? momentForMonth(month, data.moveMonth)
                              : momentOf(i, data.moveMonth);
                          void run({
                            ...data,
                            items: data.items.map((x) =>
                              x.id === i.id
                                ? {
                                    ...x,
                                    selected,
                                    moment,
                                    priority: priorityOf(moment),
                                  }
                                : x,
                            ),
                          });
                        }}
                      >
                        <option value="">Estimativa</option>
                        {i.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ·{" "}
                            {o.price === null ? "sem preço" : money(o.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="shopping-when">
                      <span>Comprar em</span>
                      <input
                        aria-label={`Mês de compra de ${i.name}`}
                        type="month"
                        value={option?.firstMonth || i.firstMonth}
                        disabled={saving}
                        onChange={(e) => {
                          const firstMonth = e.target.value;
                          const moment =
                            i.priority === "Para a mudança" ||
                            i.priority === "Depois"
                              ? momentForMonth(firstMonth, data.moveMonth)
                              : momentOf(i, data.moveMonth);
                          void run({
                            ...data,
                            items: data.items.map((x) =>
                              x.id === i.id
                                ? {
                                    ...x,
                                    firstMonth,
                                    moment,
                                    priority: priorityOf(moment),
                                    options: x.options.map((o) =>
                                      o.id === x.selected
                                        ? { ...o, firstMonth }
                                        : o,
                                    ),
                                  }
                                : x,
                            ),
                          });
                        }}
                      />
                    </label>
                    <div className="shopping-price">
                      {itemTotal(i) === null
                        ? "Sem preço"
                        : money(itemTotal(i))}
                      <small>
                        {(option?.payment || i.payment) === "Parcelado"
                          ? `${option?.installments || i.installments}x`
                          : "À vista"}
                      </small>
                    </div>
                    <button
                      className="shopping-edit"
                      onClick={() => {
                        setMessage("");
                        setItem(structuredClone(i));
                      }}
                    >
                      Editar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <Budget
            data={data}
            properties={properties}
            mode={mode}
            saving={saving}
            onChange={(patch) => void run({ ...data, ...patch })}
          />
        </>
      ) : (
        <>
          <div className="living-tabs">
            <button
              className={!collection ? "chip selected" : "chip"}
              onClick={() => setCollection("")}
            >
              Todas
            </button>
            {data.collections.map((c) => (
              <button
                key={c.id}
                className={collection === c.id ? "chip selected" : "chip"}
                onClick={() => setCollection(c.id)}
              >
                {c.name}
              </button>
            ))}
            <button
              className="text-button"
              onClick={() =>
                setEditingCollection({ id: crypto.randomUUID(), name: "" })
              }
            >
              <Plus size={14} /> Nova coleção
            </button>
            {collection && (
              <button
                className="text-button"
                onClick={() =>
                  setEditingCollection(
                    data.collections.find((c) => c.id === collection)!,
                  )
                }
              >
                Editar coleção
              </button>
            )}
          </div>
          {!refs.length ? (
            <div className="collection-empty">
              <Images />
              <h3>Ideias que merecem ficar por perto</h3>
              <p>
                Crie uma coleção como Sala ou Cozinha e guarde fotos ou links de
                referência.
              </p>
            </div>
          ) : (
            <div className="living-grid inspirations-grid">
              {refs.map((r) => (
                <button
                  className="living-card"
                  key={r.id}
                  onClick={() => {
                    setMessage("");
                    setReference(structuredClone(r));
                  }}
                >
                  <div className="living-cover">
                    <AttachmentCover
                      file={r.photos[0]}
                      name={r.title || "Inspiração"}
                      fallback={<Images size={32} />}
                    />
                  </div>
                  <div className="living-card-body">
                    <small>
                      {
                        data.collections.find((c) => c.id === r.collectionId)
                          ?.name
                      }
                    </small>
                    <h3>
                      {r.title ||
                        (r.url ? new URL(r.url).hostname : "Uma inspiração")}
                    </h3>
                    {r.itemId && (
                      <p>{data.items.find((i) => i.id === r.itemId)?.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {item && (
        <Modal
          title={item.name || "Um novo item"}
          description=""
          onClose={() => close(() => setItem(null))}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                {
                  ...data,
                  items: data.items.some((i) => i.id === item.id)
                    ? data.items.map((i) => (i.id === item.id ? item : i))
                    : [...data.items, item],
                },
                () => {
                  localStorage.removeItem(DRAFT_KEY);
                  setItem(null);
                },
              );
            }}
          >
            <div className="dialog-body">
              {importOpen ? (
                <div className="product-import">
                  <h3>Você já tem um link do produto?</h3>
                  <label className="field">
                    <span>Link do anúncio</span>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                  </label>
                  <details>
                    <summary>
                      O site bloqueou? Cole o texto ou HTML da página
                    </summary>
                    <textarea
                      aria-label="Texto ou HTML do produto"
                      value={sourceText}
                      maxLength={50000}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Ctrl+A, Ctrl+C e cole aqui"
                    />
                  </details>
                  <div className="product-import-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        importing || (!sourceUrl.trim() && !sourceText.trim())
                      }
                      onClick={() => void importProduct()}
                    >
                      {importing ? "Lendo produto…" : "Preencher com IA"}
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setImportOpen(false)}
                    >
                      Não tenho link
                    </button>
                  </div>
                  <small>
                    O texto do anúncio é enviado à IA configurada no aplicativo.
                    Confira preço e características antes de salvar.
                  </small>
                  {message && (
                    <p role="alert" className="living-error">
                      {message}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setImportOpen(true)}
                >
                  Tenho um link ou texto para preencher com IA
                </button>
              )}
              {!importOpen && (
                <>
                  <div className="form-grid">
                    <Input
                      required
                      label="Nome do item"
                      value={item.name}
                      onChange={(name) => setItem({ ...item, name })}
                    />
                    <Input
                      label="Quantidade"
                      type="number"
                      value={item.quantity}
                      onChange={(v) =>
                        setItem({ ...item, quantity: Number(v) })
                      }
                    />

                    {!item.selected && (
                      <Input
                        label="Estimativa por unidade (R$)"
                        type="number"
                        value={item.estimate}
                        onChange={(v) =>
                          setItem({ ...item, estimate: number(v) })
                        }
                      />
                    )}
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Quando comprar?</span>
                      <select
                        value={momentOf(item, data.moveMonth)}
                        onChange={(e) => {
                          const moment = e.target.value as Moment;
                          const firstMonth =
                            moment === "Na mudança"
                              ? data.moveMonth
                              : moment === "Depois da mudança"
                                ? monthAfter(data.moveMonth)
                                : item.firstMonth;
                          setItem({
                            ...item,
                            moment,
                            priority: priorityOf(moment),
                            firstMonth,
                            options: item.options.map((o) =>
                              o.id === item.selected ? { ...o, firstMonth } : o,
                            ),
                          });
                        }}
                      >
                        {moments.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Mês da compra"
                      type="month"
                      value={
                        item.options.find((o) => o.id === item.selected)
                          ?.firstMonth || item.firstMonth
                      }
                      onChange={(firstMonth) => {
                        const moment =
                          item.priority === "Para a mudança" ||
                          item.priority === "Depois"
                            ? momentForMonth(firstMonth, data.moveMonth)
                            : momentOf(item, data.moveMonth);
                        setItem({
                          ...item,
                          firstMonth,
                          moment,
                          priority: priorityOf(moment),
                          options: item.options.map((o) =>
                            o.id === item.selected ? { ...o, firstMonth } : o,
                          ),
                        });
                      }}
                    />
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Pagamento</span>
                      <select
                        value={
                          item.options.find((o) => o.id === item.selected)
                            ?.payment || item.payment
                        }
                        onChange={(e) => {
                          const payment = e.target.value as Purchase["payment"];
                          setItem({
                            ...item,
                            payment,
                            options: item.options.map((o) =>
                              o.id === item.selected ? { ...o, payment } : o,
                            ),
                          });
                        }}
                      >
                        <option>À vista</option>
                        <option>Parcelado</option>
                      </select>
                    </label>
                    {(item.options.find((o) => o.id === item.selected)
                      ?.payment || item.payment) === "Parcelado" && (
                      <Input
                        label="Número de parcelas"
                        type="number"
                        value={
                          item.options.find((o) => o.id === item.selected)
                            ?.installments || item.installments
                        }
                        onChange={(v) => {
                          const installments = Number(v);
                          setItem({
                            ...item,
                            installments,
                            options: item.options.map((o) =>
                              o.id === item.selected
                                ? { ...o, installments }
                                : o,
                            ),
                          });
                        }}
                      />
                    )}
                  </div>

                  <h3>Modelos que estamos considerando</h3>
                  {item.options.length > 0 && (
                    <div className="option-compare">
                      {item.options.map((o, index) => (
                        <label
                          className={
                            item.selected === o.id
                              ? "option-choice selected"
                              : "option-choice"
                          }
                          key={o.id}
                        >
                          <input
                            type="radio"
                            name="chosen"
                            checked={item.selected === o.id}
                            onChange={() =>
                              setItem({ ...item, selected: o.id })
                            }
                          />
                          <span>
                            <strong>{o.name || `Modelo ${index + 1}`}</strong>
                            {o.model && <small>{o.model}</small>}
                            {o.notes && <small>{o.notes}</small>}
                          </span>
                          <b>
                            {o.price === null
                              ? "Preço pendente"
                              : money(o.price)}
                          </b>
                        </label>
                      ))}
                    </div>
                  )}
                  <label className="living-check">
                    <input
                      type="radio"
                      name="chosen"
                      checked={!item.selected}
                      onChange={() => setItem({ ...item, selected: null })}
                    />{" "}
                    Usar preço estimado
                  </label>
                  {item.options.map((o, index) => {
                    const update = (patch: Partial<typeof o>) =>
                      setItem({
                        ...item,
                        options: item.options.map((x) =>
                          x.id === o.id ? { ...x, ...patch } : x,
                        ),
                      });
                    return (
                      <details className="product-option-editor" key={o.id}>
                        <summary>
                          Editar {o.name || `modelo ${index + 1}`}
                        </summary>
                        <fieldset className="living-option">
                          <legend>Opção {index + 1}</legend>
                          <div className="form-grid">
                            <Input
                              required
                              label={`Modelo da opção ${index + 1}`}
                              value={o.name}
                              onChange={(name) => update({ name })}
                            />
                            <Input
                              label={`Preço no Pix da opção ${index + 1} (R$)`}
                              type="number"
                              value={o.pixPrice ?? o.price}
                              onChange={(v) =>
                                update({
                                  pixPrice: number(v),
                                  price: number(v),
                                })
                              }
                            />
                            <Input
                              label={`Preço no cartão da opção ${index + 1} (R$)`}
                              type="number"
                              value={o.cardPrice ?? o.price}
                              onChange={(v) => update({ cardPrice: number(v) })}
                            />
                          </div>
                          <div className="form-grid">
                            <Input
                              label={`Código do modelo ${index + 1}`}
                              value={o.model ?? ""}
                              onChange={(model) => update({ model })}
                            />
                            <label className="field">
                              <span>Características para comparar</span>
                              <textarea
                                value={o.notes ?? ""}
                                onChange={(e) =>
                                  update({ notes: e.target.value })
                                }
                              />
                            </label>
                          </div>
                          <details className="living-more">
                            <summary>Loja, link e foto</summary>
                            <div className="form-grid">
                              <Input
                                label={`Loja da opção ${index + 1}`}
                                value={o.store}
                                onChange={(store) => update({ store })}
                              />
                              <Input
                                label={`Link da opção ${index + 1}`}
                                type="url"
                                value={o.url}
                                onChange={(url) => update({ url })}
                              />
                            </div>
                            {o.url && /^https?:\/\//i.test(o.url) && (
                              <a
                                className="text-button"
                                href={o.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir produto <ExternalLink size={14} />
                              </a>
                            )}
                            <Photos
                              files={o.photos}
                              onChange={(photos) => update({ photos })}
                              {...photoProps}
                            />
                          </details>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              setItem({
                                ...item,
                                selected:
                                  item.selected === o.id ? null : item.selected,
                                options: item.options.filter(
                                  (x) => x.id !== o.id,
                                ),
                              })
                            }
                          >
                            Remover opção {index + 1}
                          </button>
                        </fieldset>
                      </details>
                    );
                  })}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setItem({
                        ...item,
                        options: [
                          ...item.options,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            store: "",
                            url: "",
                            price: null,
                            photos: [],
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} /> Adicionar opção
                  </button>
                  <label className="living-check">
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={(e) =>
                        setItem({ ...item, purchased: e.target.checked })
                      }
                    />{" "}
                    Já compramos este item
                  </label>
                  <details className="living-more">
                    <summary>Organização</summary>
                    <label className="field">
                      <span>Grupo do item</span>
                      <select
                        value={item.group}
                        onChange={(e) =>
                          setItem({
                            ...item,
                            group: e.target.value as Purchase["group"],
                          })
                        }
                      >
                        {groups.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Cômodo do item</span>
                      <select
                        value={item.room}
                        onChange={(e) =>
                          setItem({ ...item, room: e.target.value })
                        }
                      >
                        <option value="">Sem cômodo definido</option>
                        {rooms.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                  </details>
                  {(item.options.length === 0 || item.photos.length > 0) && (
                    <details className="living-more">
                      <summary>Foto do item</summary>
                      <Photos
                        files={item.photos}
                        onChange={(photos) => setItem({ ...item, photos })}
                        {...photoProps}
                      />
                    </details>
                  )}
                  {(item.options.length === 0 || item.notes) && (
                    <details className="living-more">
                      <summary>Observações</summary>
                      <label className="field">
                        <span>Observações do item</span>
                        <textarea
                          value={item.notes}
                          onChange={(e) =>
                            setItem({ ...item, notes: e.target.value })
                          }
                        />
                      </label>
                    </details>
                  )}
                </>
              )}
              {message && (
                <p role="alert" className="living-error">
                  {message}
                </p>
              )}
            </div>
            <div className="living-actions">
              {data.items.some((i) => i.id === item.id) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={saving || photoBusy}
                  onClick={() => {
                    if (
                      confirm(
                        "Excluir este item e suas opções? As inspirações serão mantidas sem vínculo.",
                      )
                    )
                      void run(
                        {
                          ...data,
                          items: data.items.filter((i) => i.id !== item.id),
                          inspirations: data.inspirations.map((r) =>
                            r.itemId === item.id ? { ...r, itemId: null } : r,
                          ),
                        },
                        () => setItem(null),
                      );
                  }}
                >
                  <Trash2 size={16} /> Excluir item
                </button>
              )}
              {!importOpen && (
                <button
                  className="primary"
                  disabled={saving || photoBusy || importing}
                >
                  {saving ? "Salvando…" : "Salvar item"}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
      {reference && (
        <Modal
          title="Guardar inspiração"
          description="Uma foto ou um link já bastam para começar."
          onClose={() => close(() => setReference(null))}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                {
                  ...data,
                  inspirations: data.inspirations.some(
                    (r) => r.id === reference.id,
                  )
                    ? data.inspirations.map((r) =>
                        r.id === reference.id ? reference : r,
                      )
                    : [...data.inspirations, reference],
                },
                () => setReference(null),
              );
            }}
          >
            <div className="dialog-body">
              <Photos
                files={reference.photos}
                onChange={(photos) => setReference({ ...reference, photos })}
                {...photoProps}
              />
              <Input
                label="Título da inspiração (opcional)"
                value={reference.title}
                onChange={(title) => setReference({ ...reference, title })}
              />
              <Input
                label="Link de referência ou Pinterest"
                type="url"
                value={reference.url}
                onChange={(url) => setReference({ ...reference, url })}
              />
              {reference.url && /^https?:\/\//i.test(reference.url) && (
                <a
                  className="text-button"
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir referência original <ExternalLink size={14} />
                </a>
              )}
              <PinterestReference key={reference.url} url={reference.url} />
              <p className="hint">
                O link original fica guardado. Para ver a referência na galeria,
                adicione uma foto; não extraímos imagens do Pinterest.
              </p>
              <label className="field">
                <span>Coleção</span>
                <select
                  value={reference.collectionId}
                  onChange={(e) =>
                    setReference({ ...reference, collectionId: e.target.value })
                  }
                >
                  {data.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Associar a um item de Mobília (opcional)</span>
                <select
                  value={reference.itemId ?? ""}
                  onChange={(e) =>
                    setReference({
                      ...reference,
                      itemId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Sem vínculo</option>
                  {data.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Observações da inspiração</span>
                <textarea
                  value={reference.notes}
                  onChange={(e) =>
                    setReference({ ...reference, notes: e.target.value })
                  }
                />
              </label>
              {message && (
                <p role="alert" className="living-error">
                  {message}
                </p>
              )}
            </div>
            <div className="living-actions">
              {data.inspirations.some((r) => r.id === reference.id) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={saving || photoBusy}
                  onClick={() => {
                    if (confirm("Excluir esta referência?"))
                      void run(
                        {
                          ...data,
                          inspirations: data.inspirations.filter(
                            (r) => r.id !== reference.id,
                          ),
                        },
                        () => setReference(null),
                      );
                  }}
                >
                  Excluir referência
                </button>
              )}
              <button className="primary" disabled={saving || photoBusy}>
                {saving ? "Salvando…" : "Salvar inspiração"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editingCollection && (
        <Modal
          title="Coleção de inspirações"
          description="Use um cômodo, uma cor ou qualquer tema que faça sentido para vocês."
          onClose={() => close(() => setEditingCollection(null))}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                {
                  ...data,
                  collections: data.collections.some(
                    (c) => c.id === editingCollection.id,
                  )
                    ? data.collections.map((c) =>
                        c.id === editingCollection.id ? editingCollection : c,
                      )
                    : [...data.collections, editingCollection],
                },
                () => {
                  setCollection(editingCollection.id);
                  setEditingCollection(null);
                },
              );
            }}
          >
            <div className="dialog-body">
              <Input
                required
                label="Nome da coleção"
                value={editingCollection.name}
                onChange={(name) =>
                  setEditingCollection({ ...editingCollection, name })
                }
              />
              {message && (
                <p role="alert" className="living-error">
                  {message}
                </p>
              )}
              <p className="hint">
                Para excluir uma coleção, mova ou remova suas referências
                primeiro.
              </p>
            </div>
            <div className="living-actions">
              {data.collections.some((c) => c.id === editingCollection.id) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    saving ||
                    data.inspirations.some(
                      (r) => r.collectionId === editingCollection.id,
                    )
                  }
                  onClick={() => {
                    if (confirm("Excluir esta coleção vazia?"))
                      void run(
                        {
                          ...data,
                          collections: data.collections.filter(
                            (c) => c.id !== editingCollection.id,
                          ),
                        },
                        () => {
                          setCollection("");
                          setEditingCollection(null);
                        },
                      );
                  }}
                >
                  Excluir coleção
                </button>
              )}
              <button className="primary" disabled={saving}>
                Salvar coleção
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

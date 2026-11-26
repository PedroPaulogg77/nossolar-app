"use client";
import { CurrencyInput } from "@/components/currency-input";
import { parseLocalizedNumber } from "@/lib/localized-number";
import { useEffect, useState } from "react";
import {
  Plus,
  Sofa,
  Images,
  Check,
  Search,
  ExternalLink,
  Trash2,
  RefreshCw,
  Heart,
  Folder,
  ArrowLeft,
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
  mergeDuplicatePurchase,
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
  {
    room: "Quarto",
    group: "Móveis e eletrodomésticos",
    items: [
      "Cama / base de casal",
      "Colchão de casal / queen",
      "Guarda-roupa de casal",
      "Ar-condicionado",
      "Camas de solteiro",
      "Colchões de solteiro",
    ],
  },
  {
    room: "Sala",
    group: "Móveis e eletrodomésticos",
    items: ["Mesa + 4 cadeiras", "Televisão", "Rack / painel da TV"],
  },
  {
    room: "Cozinha",
    group: "Eletrodomésticos",
    items: [
      "Geladeira Frost Free",
      "Fogão de piso com forno",
      "Cooktop",
      "Forno de embutir",
      "Armários de cozinha",
      "Purificador de água",
      "Panela de pressão elétrica",
    ],
  },
  {
    room: "Cozinha",
    group: "Utensílios",
    items: [
      "Kit utensílios de preparo",
      "Facas e tábua de corte",
      "Jogo de pratos e tigelas",
      "Jogo de copos",
      "Canecas / xícaras",
      "Escorredor de louças",
      "Lixeira de cozinha",
      "Panos de prato (kit)",
    ],
  },
  {
    room: "Quarto",
    group: "Enxoval",
    items: [
      "Jogos de lençóis do casal",
      "Edredom / cobertor",
      "Protetor do colchão",
      "Cabides (kit)",
    ],
  },
  {
    room: "Banheiro",
    group: "Enxoval",
    items: ["Toalhas", "Lixeira de banheiro", "Kit acessórios de banheiro"],
  },
  {
    room: "Lavanderia",
    group: "Eletrodomésticos",
    items: ["Máquina de lavar", "Lava e seca"],
  },
  {
    room: "Lavanderia",
    group: "Organização e limpeza",
    items: [
      "Varal de chão",
      "Cesto de roupas",
      "Vassoura + rodo + pá",
      "Balde + panos + escovas",
      "Pregadores (kit)",
    ],
  },
  {
    room: "Geral",
    group: "Organização e limpeza",
    items: [
      "Lâmpadas (se faltar)",
      "Extensões / filtro de linha",
      "Kit ferramentas básico",
    ],
  },
  {
    room: "Mercado inicial",
    group: "Supermercado",
    items: [
      "Alimentos básicos de despensa",
      "Carnes e proteínas",
      "Frutas, verduras e legumes",
      "Leite, café e itens de café da manhã",
      "Água / bebidas iniciais",
      "Produtos de limpeza iniciais",
      "Higiene pessoal inicial",
      "Sacos de lixo / esponjas",
      "Botijão / primeira carga de gás",
    ],
  },
  {
    room: "Serviços",
    group: "Serviços",
    items: [
      "Frete da mudança",
      "Fretes extras das lojas",
      "Montagem de móveis",
      "Instalação de eletros / fogão",
      "Instalação de ar-condicionado",
      "Instalação de box / acessórios",
      "Limpeza antes da entrada",
      "Instalação / ativação internet",
    ],
  },
];
const STARTER_ALIASES: Record<string, string> = {
  "Sala|Móveis e eletrodomésticos|Rack ou painel": "Rack / painel da TV",
  "Sala|Móveis e eletrodomésticos|TV": "Televisão",
  "Cozinha|Eletrodomésticos|Geladeira": "Geladeira Frost Free",
  "Cozinha|Eletrodomésticos|Fogão ou cooktop": "Fogão de piso com forno",
  "Cozinha|Eletrodomésticos|Forno": "Forno de embutir",
  "Cozinha|Utensílios|Facas": "Facas e tábua de corte",
  "Cozinha|Utensílios|Tábua de corte": "Facas e tábua de corte",
  "Cozinha|Utensílios|Pratos": "Jogo de pratos e tigelas",
  "Cozinha|Utensílios|Copos": "Jogo de copos",
  "Cozinha|Utensílios|Canecas": "Canecas / xícaras",
  "Cozinha|Utensílios|Escorredor de louça": "Escorredor de louças",
  "Quarto|Móveis e eletrodomésticos|Cama": "Cama / base de casal",
  "Quarto|Móveis e eletrodomésticos|Colchão": "Colchão de casal / queen",
  "Quarto|Móveis e eletrodomésticos|Guarda-roupa": "Guarda-roupa de casal",
  "Quarto|Enxoval|Jogo de lençol": "Jogos de lençóis do casal",
  "Quarto|Enxoval|Protetor de colchão": "Protetor do colchão",
  "Quarto|Enxoval|Edredom": "Edredom / cobertor",
  "Quarto|Enxoval|Cobertor": "Edredom / cobertor",
  "Quarto|Enxoval|Cabides": "Cabides (kit)",
  "Banheiro|Móveis e eletrodomésticos|Lixeira": "Lixeira de banheiro",
  "Banheiro|Enxoval|Toalhas de banho": "Toalhas",
  "Banheiro|Enxoval|Toalhas de rosto": "Toalhas",
  "Lavanderia|Eletrodomésticos|Varal": "Varal de chão",
  "Lavanderia|Organização e limpeza|Cesto de roupa": "Cesto de roupas",
  "Lavanderia|Organização e limpeza|Pregadores": "Pregadores (kit)",
  "Geral|Organização e limpeza|Lâmpadas extras": "Lâmpadas (se faltar)",
  "Geral|Organização e limpeza|Kit de ferramentas": "Kit ferramentas básico",
};
const canonicalStarterItem = (room: string, group: string, name: string) =>
  STARTER_ALIASES[`${room}|${group}|${name}`] ?? name;
const STARTER_CATALOG = STARTER_LIST.reduce<typeof STARTER_LIST>(
  (catalog, section) => {
    const names = section.items.map((name) =>
      canonicalStarterItem(section.room, section.group, name),
    );
    const existing = catalog.find(
      (entry) => entry.room === section.room && entry.group === section.group,
    );
    if (existing) {
      existing.items = [
        ...new Set([
          ...existing.items.map((name) =>
            canonicalStarterItem(section.room, section.group, name),
          ),
          ...names,
        ]),
      ];
    } else {
      catalog.push({ ...section, items: [...new Set(names)] });
    }
    return catalog;
  },
  [],
);
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
const number = (s: string) => parseLocalizedNumber(s) ?? null;
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
      {type === "currency" ? (
        <CurrencyInput
          value={
            typeof value === "number" ? value : number(String(value ?? ""))
          }
          onChange={(v) => onChange(v === null ? "" : String(v))}
          placeholder="0,00"
        />
      ) : (
        <input
          required={required}
          type={type}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "any" : undefined}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
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
  selectedPropertyId,
  mode,
  onChange,
  saving,
}: {
  data: Living;
  properties: Property[];
  selectedPropertyId: string;
  mode: "Simulação" | "Comprado";
  onChange: (patch: Partial<Living>) => void;
  saving: boolean;
}) {
  const [start, setStart] = useState(
    new Date().toLocaleDateString("sv-SE").slice(0, 7),
  );
  const [propertyId, setPropertyId] = useState(
    selectedPropertyId || (properties.length === 1 ? properties[0].id : ""),
  );
  useEffect(() => {
    if (!propertyId && (selectedPropertyId || properties.length === 1))
      setPropertyId(selectedPropertyId || properties[0].id);
  }, [propertyId, selectedPropertyId, properties]);
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
            <span>Imóvel no planejamento</span>
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
              <CurrencyInput
                value={number(limitDraft)}
                onChange={(v) => setLimitDraft(v === null ? "" : String(v))}
                onBlur={(v) => {
                  if (v !== data.monthlyLimit) onChange({ monthlyLimit: v });
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
  selectedPropertyId,
  onNavigate,
}: {
  area: "Mobília" | "Inspirações" | "Lista inicial";
  store: Store;
  properties: Property[];
  selectedPropertyId: string;
  onNavigate: (area: "Mobília" | "Lista inicial") => void;
}) {
  const { data, loading, error, saving, save, reload } = store;
  const [mode, setMode] = useState<"Simulação" | "Comprado">("Simulação");
  const [checklistRoom, setChecklistRoom] = useState("Todos");
  const [group, setGroup] = useState(""),
    [room, setRoom] = useState(""),
    [search, setSearch] = useState("");
  const [item, setItem] = useState<Purchase | null>(null),
    [reference, setReference] = useState<Inspiration | null>(null),
    [viewedReferenceId, setViewedReferenceId] = useState<string | null>(null),
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
                  payment: "À vista",
                  installments: 1,
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
  const selectedCollection = data.collections.find((c) => c.id === collection);
  const viewedReference = data.inspirations.find(
    (r) => r.id === viewedReferenceId,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {area === "Mobília"
              ? "Compras da casa"
              : area === "Lista inicial"
                ? "Lista para a casa nova"
                : "Inspirações"}
          </h1>
        </div>
        <div className="living-heading-actions">
          {area === "Mobília" && (
            <button
              className="text-button living-refresh"
              aria-label="Atualizar lista"
              title="Atualizar lista"
              disabled={loading || saving}
              onClick={() => void reload()}
            >
              <RefreshCw size={16} />
            </button>
          )}
          {area !== "Lista inicial" &&
            !(area === "Mobília" && data.items.length === 0) && (
              <button
                className="primary"
                disabled={loading || !!error}
                onClick={() => {
                  setMessage("");
                  if (area === "Mobília") newItem();
                  else if (!collection)
                    setEditingCollection({ id: crypto.randomUUID(), name: "" });
                  else
                    setReference({
                      id: crypto.randomUUID(),
                      collectionId: collection,
                      title: "",
                      url: "",
                      notes: "",
                      itemId: null,
                      photos: [],
                    });
                }}
              >
                <Plus size={18} />
                {area === "Mobília"
                  ? "Adicionar item"
                  : collection
                    ? "Guardar inspiração"
                    : "Nova coleção"}
              </button>
            )}
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
                {mode === "Comprado"
                  ? "Quando comprarmos algo, ele aparece aqui."
                  : group || room || search
                    ? "Não encontramos itens com esses filtros."
                    : "Comece com uma ideia ou crie um item da sua lista."}
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
              {!group && !room && !search && mode === "Comprado" && (
                <button
                  className="secondary"
                  onClick={() => setMode("Simulação")}
                >
                  Ver simulação
                </button>
              )}
              {!group && !room && !search && mode === "Simulação" && (
                <div className="empty-next-actions">
                  <button className="primary" onClick={newItem}>
                    Adicionar item
                  </button>
                  <button
                    className="secondary"
                    onClick={() => onNavigate("Lista inicial")}
                  >
                    Explorar lista inicial
                  </button>
                </div>
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
                    <label className="shopping-payment">
                      <span>Pagamento</span>
                      <select
                        aria-label={`Pagamento de ${i.name}`}
                        value={
                          (option?.payment || i.payment) === "Parcelado"
                            ? `installment-${option?.installments || i.installments}`
                            : "cash"
                        }
                        disabled={saving}
                        onChange={(e) => {
                          const installments = Number(
                            e.target.value.replace("installment-", ""),
                          );
                          const payment: Purchase["payment"] =
                            e.target.value === "cash" ? "À vista" : "Parcelado";
                          void run({
                            ...data,
                            items: data.items.map((x) =>
                              x.id === i.id
                                ? {
                                    ...x,
                                    payment,
                                    installments:
                                      payment === "Parcelado"
                                        ? installments
                                        : x.installments,
                                    options: x.options.map((o) =>
                                      o.id === x.selected
                                        ? {
                                            ...o,
                                            payment,
                                            installments:
                                              payment === "Parcelado"
                                                ? installments
                                                : o.installments,
                                          }
                                        : o,
                                    ),
                                  }
                                : x,
                            ),
                          });
                        }}
                      >
                        <option value="cash">À vista</option>
                        {Array.from({ length: 11 }, (_, n) => n + 2).map(
                          (n) => (
                            <option key={n} value={`installment-${n}`}>
                              {n}x no cartão
                            </option>
                          ),
                        )}
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
            selectedPropertyId={selectedPropertyId}
            mode={mode}
            saving={saving}
            onChange={(patch) => void run({ ...data, ...patch })}
          />
        </>
      ) : area === "Lista inicial" ? (
        <section className="starter-page">
          <header className="starter-intro">
            <div>
              <span className="eyebrow">GUIA DA CASA</span>
              <h2>Ideias para cada canto</h2>
              <p>
                Explore por ambiente e leve para o planejamento só o que fizer
                sentido para vocês.
              </p>
            </div>
            <label className="starter-search">
              <Search size={17} />
              <input
                aria-label="Buscar na lista para a casa nova"
                placeholder="Buscar item ou ambiente"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </header>
          <nav className="starter-filter" aria-label="Filtrar por ambiente">
            {[
              "Todos",
              ...new Set(STARTER_CATALOG.map((section) => section.room)),
            ].map((roomName) => (
              <button
                key={roomName}
                className={
                  checklistRoom === roomName ? "chip selected" : "chip"
                }
                onClick={() => setChecklistRoom(roomName)}
              >
                {roomName}
              </button>
            ))}
          </nav>
          <div className="starter-groups">
            {[...new Set(STARTER_CATALOG.map((section) => section.room))]
              .filter(
                (roomName) =>
                  checklistRoom === "Todos" || roomName === checklistRoom,
              )
              .map((roomName) => {
                const sections = STARTER_CATALOG.filter(
                  (section) => section.room === roomName,
                )
                  .map((section) => ({
                    ...section,
                    items: section.items.filter((name) =>
                      `${name} ${section.room} ${section.group}`
                        .toLocaleLowerCase()
                        .includes(search.toLocaleLowerCase()),
                    ),
                  }))
                  .filter((section) => section.items.length);
                if (!sections.length) return null;
                const itemCount = sections.reduce(
                  (count, section) => count + section.items.length,
                  0,
                );
                return (
                  <section className="starter-room" key={roomName}>
                    <div className="starter-room-heading">
                      <h2>{roomName}</h2>
                      <span>
                        {itemCount} {itemCount === 1 ? "ideia" : "ideias"}
                      </span>
                    </div>
                    {sections.map((section) => (
                      <div className="starter-subgroup" key={section.group}>
                        <h3>{section.group}</h3>
                        <div className="starter-items">
                          {section.items.map((name) => {
                            const included = data.items.some(
                              (purchase) =>
                                purchase.room === section.room &&
                                purchase.name.toLocaleLowerCase() ===
                                  name.toLocaleLowerCase(),
                            );
                            return (
                              <div
                                className="starter-item"
                                key={`${section.room}|${name}`}
                              >
                                <span>{name}</span>
                                {included ? (
                                  <button
                                    className="starter-added"
                                    onClick={() => onNavigate("Mobília")}
                                  >
                                    <Check size={14} /> Ver no planejamento
                                  </button>
                                ) : (
                                  <button
                                    className="starter-add"
                                    disabled={saving}
                                    onClick={() =>
                                      void run({
                                        ...data,
                                        items: [
                                          ...data.items,
                                          {
                                            ...newPurchase(),
                                            name,
                                            room: section.room,
                                            group: section.group,
                                            firstMonth: data.moveMonth,
                                          },
                                        ],
                                      })
                                    }
                                  >
                                    <Plus size={15} /> Adicionar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                );
              })}
          </div>
        </section>
      ) : (
        <>
          {!collection ? (
            <section className="collection-home">
              <header className="collection-home-heading">
                <div>
                  <span className="eyebrow">AMBIENTES E IDEIAS</span>
                  <h2>Suas coleções</h2>
                  <p>Pastas para guardar referências de cada canto da casa.</p>
                </div>
              </header>
              {data.collections.length ? (
                <div className="collection-folder-grid">
                  {data.collections.map((entry) => {
                    const saved = data.inspirations.filter(
                      (reference) => reference.collectionId === entry.id,
                    );
                    const cover = saved.find(
                      (reference) => reference.photos[0],
                    );
                    return (
                      <button
                        className="collection-folder"
                        key={entry.id}
                        onClick={() => setCollection(entry.id)}
                      >
                        <div className="collection-folder-cover">
                          {cover ? (
                            <AttachmentCover
                              file={cover.photos[0]}
                              name={cover.title || entry.name}
                              fallback={<Folder size={32} />}
                            />
                          ) : (
                            <Folder size={34} strokeWidth={1.5} />
                          )}
                          {saved.length > 0 && (
                            <span>
                              {saved.length}{" "}
                              {saved.length === 1 ? "salvo" : "salvos"}
                            </span>
                          )}
                        </div>
                        <div className="collection-folder-copy">
                          <strong>{entry.name}</strong>
                          <small>
                            {saved.length}{" "}
                            {saved.length === 1 ? "ideia" : "ideias"}
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="collection-empty collection-first">
                  <Folder size={34} strokeWidth={1.5} />
                  <h3>Crie a primeira pasta de ideias</h3>
                  <p>
                    Separe inspirações por ambiente, como Sala, Cozinha ou
                    Quarto.
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      setEditingCollection({
                        id: crypto.randomUUID(),
                        name: "",
                      })
                    }
                  >
                    <Plus size={16} /> Criar coleção
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="collection-detail">
              <header className="collection-detail-heading">
                <button
                  className="text-button collection-back"
                  onClick={() => setCollection("")}
                >
                  <ArrowLeft size={16} /> Coleções
                </button>
                <div>
                  <h2>{selectedCollection?.name}</h2>
                  <p>
                    {refs.length}{" "}
                    {refs.length === 1 ? "ideia salva" : "ideias salvas"}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    selectedCollection &&
                    setEditingCollection({ ...selectedCollection })
                  }
                >
                  Editar pasta
                </button>
              </header>
              {!refs.length ? (
                <div className="collection-empty collection-first">
                  <Images size={32} />
                  <h3>Esta pasta está pronta para receber ideias</h3>
                  <p>
                    Guarde uma foto, um link ou uma referência para este
                    ambiente.
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      setReference({
                        id: crypto.randomUUID(),
                        collectionId: collection,
                        title: "",
                        url: "",
                        notes: "",
                        itemId: null,
                        photos: [],
                      })
                    }
                  >
                    Guardar primeira ideia
                  </button>
                </div>
              ) : (
                <div className="living-grid inspirations-grid">
                  {refs.map((r) => (
                    <button
                      className="living-card"
                      key={r.id}
                      onClick={() => {
                        setMessage("");
                        setViewedReferenceId(r.id);
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
                        <h3>
                          {r.title ||
                            (r.url
                              ? new URL(r.url).hostname
                              : "Uma inspiração")}
                        </h3>
                        {r.itemId && (
                          <p>
                            {data.items.find((i) => i.id === r.itemId)?.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
      {viewedReference && (
        <Modal
          title={viewedReference.title || "Uma inspiração"}
          description={
            data.collections.find((c) => c.id === viewedReference.collectionId)
              ?.name || "Inspirações"
          }
          className="property-overview-dialog"
          onClose={() => setViewedReferenceId(null)}
        >
          <div className="property-overview-body">
            {viewedReference.photos[0] && (
              <div className="property-overview-hero">
                <AttachmentCover
                  file={viewedReference.photos[0]}
                  name={viewedReference.title || "Inspiração"}
                  fallback={<Images size={30} />}
                />
              </div>
            )}
            <div className="property-overview-content">
              {viewedReference.notes && (
                <section className="property-overview-section">
                  <h3>O que gostamos aqui</h3>
                  <p>{viewedReference.notes}</p>
                </section>
              )}
              {viewedReference.itemId && (
                <section className="property-overview-section">
                  <h3>Ligada à compra</h3>
                  <p>
                    {
                      data.items.find((i) => i.id === viewedReference.itemId)
                        ?.name
                    }
                  </p>
                </section>
              )}
              {viewedReference.url && (
                <a
                  className="primary"
                  href={viewedReference.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir referência original <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
          <div className="dialog-footer">
            <button
              className="secondary"
              onClick={() => {
                setViewedReferenceId(null);
                setReference(structuredClone(viewedReference));
              }}
            >
              Editar inspiração
            </button>
          </div>
        </Modal>
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
              const existing = data.items.find(
                (candidate) =>
                  !data.items.some((stored) => stored.id === item.id) &&
                  mergeDuplicatePurchase(candidate, item) !== null,
              );
              const savedItem = existing
                ? mergeDuplicatePurchase(existing, item)!
                : item;
              void run(
                {
                  ...data,
                  items: data.items.some((i) => i.id === item.id)
                    ? data.items.map((i) =>
                        i.id === item.id
                          ? item
                          : i.id === existing?.id
                            ? savedItem
                            : i,
                      )
                    : existing
                      ? data.items.map((i) =>
                          i.id === existing.id ? savedItem : i,
                        )
                      : [...data.items, item],
                },
                () => {
                  localStorage.removeItem(DRAFT_KEY);
                  setItem(null);
                  if (existing)
                    setMessage(
                      "Esse item já estava na lista. As novas opções foram reunidas nele.",
                    );
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
                  className="secondary"
                  onClick={() => setImportOpen(true)}
                >
                  <Plus size={16} /> Adicionar opção com IA
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
                        type="currency"
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
                            <label className="field">
                              <span>Forma de pagamento deste modelo</span>
                              <select
                                value={o.payment || item.payment}
                                onChange={(e) =>
                                  update({
                                    payment: e.target
                                      .value as Purchase["payment"],
                                  })
                                }
                              >
                                <option>À vista</option>
                                <option>Parcelado</option>
                              </select>
                            </label>
                            {(o.payment || item.payment) === "Parcelado" && (
                              <label className="field">
                                <span>Parcelas deste modelo</span>
                                <select
                                  value={o.installments || item.installments}
                                  onChange={(e) =>
                                    update({
                                      installments: Number(e.target.value),
                                    })
                                  }
                                >
                                  {Array.from(
                                    { length: 11 },
                                    (_, n) => n + 2,
                                  ).map((n) => (
                                    <option key={n} value={n}>
                                      {n}x sem juros
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>
                          <div className="form-grid">
                            <Input
                              required
                              label={`Modelo da opção ${index + 1}`}
                              value={o.name}
                              onChange={(name) => update({ name })}
                            />
                            <Input
                              label={`Preço no Pix da opção ${index + 1} (R$)`}
                              type="currency"
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
                              type="currency"
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
                            payment: "À vista",
                            installments: 1,
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

"use client";
import { useEffect, useRef, useState } from "react";
import { parseLocalizedNumber } from "@/lib/localized-number";
import { Field } from "@/components/property-field";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  Heart,
  House,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  Settings2,
  Wallet,
  Columns3,
  Sofa,
  Images,
  X,
  MoveUpRight,
  Upload,
  Trash2,
  ListChecks,
} from "lucide-react";
import { Modal } from "./dialog";
import { LivingPanel } from "./living-panel";
import { useLiving } from "@/lib/living-store";
import { purchasesFlow } from "@/lib/living";
import {
  Property,
  Preferences,
  Finance,
  defaults,
  newProperty,
  money,
  documentation,
  entry,
  entryParts,
  acquisitionGap,
  recurring,
  score,
  requirements,
  criteria,
  cashflow,
  cashLabels,
  backupSchema,
  preferencesSchema,
  validateFinance,
  propertySchema,
} from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import { AttachmentCover } from "./attachment-cover";
import { PropertyAttachments } from "./property-attachments";
import {
  propertyLocation,
  locationOptions,
  matchesLocation,
} from "@/lib/locations";
import { packFiles, putFile, restoreFiles, syncFiles } from "@/lib/attachments";
import { propertyFromAi, type AiPreview } from "@/lib/ai-import";
import { imageFromClipboard } from "@/lib/clipboard-image";
import {
  validateFile,
  MAX_TOTAL_SIZE,
  type Attachment,
} from "@/lib/attachment-types";
const STORAGE = "nosso-lar-v1";
const SYNC_KEY = "nosso-lar-shared-snapshot-v1";
const sharedSnapshot = (properties: Property[], preferences: Preferences) =>
  JSON.stringify({ version: 1, properties, preferences });
const aiGroups = [
  {
    title: "O imóvel",
    fields: [
      ["name", "Nome do imóvel"],
      ["type", "Estágio da obra"],
      ["price", "Preço anunciado (R$)"],
      ["area", "Área privativa (m²)"],
    ],
  },
  {
    title: "Onde fica",
    fields: [
      ["city", "Cidade"],
      ["neighborhood", "Bairro"],
      ["address", "Endereço"],
    ],
  },
  {
    title: "Planta e detalhes",
    fields: [
      ["rooms", "Quartos"],
      ["baths", "Banheiros"],
      ["suites", "Suítes"],
      ["parking", "Vagas"],
      ["balcony", "Varanda"],
      ["elevator", "Elevador"],
      ["floor", "Andar"],
      ["sun", "Posição solar"],
    ],
  },
  {
    title: "Prazos e custos",
    fields: [
      ["delivery", "Previsão de entrega"],
      ["condo", "Condomínio (R$/mês)"],
      ["iptu", "IPTU (R$/mês)"],
      ["cashEntry", "Entrada à vista (R$)"],
      ["installmentTotal", "Parte parcelada da entrada (R$)"],
      ["installments", "Parcelas da entrada"],
      ["payment", "Prestação anunciada (R$/mês)"],
    ],
  },
  {
    title: "Outros detalhes do anúncio",
    fields: [["highlights", "Destaques encontrados"]],
  },
] as const;
const aiNumericKeys = new Set([
  "price",
  "area",
  "rooms",
  "baths",
  "suites",
  "parking",
  "condo",
  "iptu",
  "cashEntry",
  "installmentTotal",
  "installments",
  "payment",
]);
function Metric({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {help && <small>{help}</small>}
    </div>
  );
}
function Placeholder() {
  return (
    <div className="architecture" aria-hidden="true">
      <div className="arch-building">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="arch-line" />
      <span>AINDA SEM FOTO</span>
    </div>
  );
}
export default function Home({
  aiEnabled,
  aiProvider,
}: {
  aiEnabled: boolean;
  aiProvider: "Groq" | "Gemini";
}) {
  const living = useLiving();
  const [area, setArea] = useState<
    "Imóveis" | "Mobília" | "Inspirações" | "Lista inicial"
  >("Imóveis");
  const [properties, setProperties] = useState<Property[]>([]),
    [prefs, setPrefs] = useState(defaults),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState("Imóveis"),
    [filter, setFilter] = useState("Todos"),
    [stageFilter, setStageFilter] = useState("Todos"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("Favoritos"),
    [cityFilter, setCityFilter] = useState(""),
    [neighborhoodFilter, setNeighborhoodFilter] = useState(""),
    [draft, setDraft] = useState<Property | null>(null),
    [section, setSection] = useState("Visão geral"),
    [isNew, setIsNew] = useState(false),
    [settings, setSettings] = useState(false),
    [tempPrefs, setTempPrefs] = useState(defaults),
    [selected, setSelected] = useState<string[]>([]),
    [financialId, setFinancialId] = useState(""),
    [start, setStart] = useState(() =>
      new Date().toLocaleDateString("sv-SE").slice(0, 7),
    ),
    [month, setMonth] = useState(0),
    [period, setPeriod] = useState(0),
    [notice, setNotice] = useState(""),
    [email, setEmail] = useState(""),
    [user, setUser] = useState(""),
    [busy, setBusy] = useState(false),
    [aiOpen, setAiOpen] = useState(false),
    [aiText, setAiText] = useState(""),
    [aiUrl, setAiUrl] = useState(""),
    [aiImage, setAiImage] = useState<File | null>(null),
    [aiImageUrl, setAiImageUrl] = useState(""),
    [aiPreview, setAiPreview] = useState<AiPreview | null>(null),
    [welcomeOpen, setWelcomeOpen] = useState(false);
  const cloudBaseline = useRef<string | null>(null);
  const cloudEnabled = useRef(false);
  const latestLocal = useRef<string | null>(null);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!aiImage) return;
    const url = URL.createObjectURL(aiImage);
    setAiImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [aiImage]);
  useEffect(() => {
    if (user && ready)
      setWelcomeOpen(
        localStorage.getItem(`nosso-lar-intro-${user.toLowerCase()}`) !==
          "seen",
      );
  }, [user, ready]);
  const dismissWelcome = () => {
    if (user)
      localStorage.setItem(`nosso-lar-intro-${user.toLowerCase()}`, "seen");
    setWelcomeOpen(false);
  };
  useEffect(() => {
    let active = true;
    let localData: { properties: Property[]; preferences: Preferences } | null =
      null;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const data = backupSchema.parse(JSON.parse(raw));
        localData = data;
        latestLocal.current = sharedSnapshot(data.properties, data.preferences);
        setProperties(data.properties);
        setPrefs(data.preferences);
      } else setProperties([]);
    } catch {
      setNotice(
        "Não foi possível ler os dados locais. Importe um backup; o arquivo original foi preservado.",
      );
    }
    async function openSharedSpace() {
      try {
        if (!supabase) return;
        const { data: session } = await supabase.auth.getUser();
        if (!active || !session.user) return;
        setUser(session.user.email ?? "");
        const { data, error } = await supabase.rpc("load_household");
        if (error) throw error;
        if (!active) return;
        const remote = data ? backupSchema.parse(data) : null;
        const remoteSnapshot = remote
          ? sharedSnapshot(remote.properties, remote.preferences)
          : null;
        const localSnapshot = localData
          ? sharedSnapshot(localData.properties, localData.preferences)
          : null;
        cloudBaseline.current = remoteSnapshot;
        const remembered = localStorage.getItem(SYNC_KEY);
        if (remote && !localData) {
          localStorage.setItem(STORAGE, remoteSnapshot!);
          localStorage.setItem(SYNC_KEY, remoteSnapshot!);
          latestLocal.current = remoteSnapshot;
          setProperties(remote.properties);
          setPrefs(remote.preferences);
          cloudEnabled.current = true;
        } else if (remote && localData && remoteSnapshot !== localSnapshot) {
          if (remembered === localSnapshot) {
            localStorage.setItem(STORAGE, remoteSnapshot!);
            localStorage.setItem(SYNC_KEY, remoteSnapshot!);
            latestLocal.current = remoteSnapshot;
            setProperties(remote.properties);
            setPrefs(remote.preferences);
            cloudEnabled.current = true;
          } else if (remembered === remoteSnapshot) {
            cloudEnabled.current = true;
            enqueueShared(localData.properties, localData.preferences);
          } else {
            setNotice(
              "Há versões diferentes dos imóveis neste aparelho e na conta. Abra Preferências para escolher qual guardar.",
            );
          }
        } else {
          cloudEnabled.current = true;
          if (remoteSnapshot) localStorage.setItem(SYNC_KEY, remoteSnapshot);
          if (!remote && localData)
            enqueueShared(localData.properties, localData.preferences);
        }
      } catch {
        if (active)
          setNotice(
            "Não conseguimos atualizar os imóveis da conta agora. A cópia deste aparelho está preservada.",
          );
      } finally {
        if (active) setReady(true);
      }
    }
    void openSharedSpace();
    const sub = supabase?.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user.email ?? ""),
    );
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);
  async function syncShared(ps: Property[], pr: Preferences) {
    if (!supabase || !cloudEnabled.current) return;
    const { data: current, error: loadError } =
      await supabase.rpc("load_household");
    if (loadError) throw loadError;
    const parsed = current ? backupSchema.parse(current) : null;
    const actual = parsed
      ? sharedSnapshot(parsed.properties, parsed.preferences)
      : null;
    if (actual !== cloudBaseline.current) {
      cloudEnabled.current = false;
      setNotice(
        "Os imóveis mudaram em outro aparelho. Abra Preferências para atualizar antes de salvar novamente na conta.",
      );
      return;
    }
    const { data: householdId, error: accessError } =
      await supabase.rpc("ensure_household");
    if (accessError || !householdId)
      throw Error("Não conseguimos compartilhar os imóveis agora.");
    const synced = await syncFiles(ps, householdId);
    const { error } = await supabase.rpc("save_household", {
      payload: { version: 1, properties: synced, preferences: pr },
    });
    if (error) throw error;
    cloudBaseline.current = sharedSnapshot(synced, pr);
    localStorage.setItem(SYNC_KEY, cloudBaseline.current);
    if (latestLocal.current === sharedSnapshot(ps, pr)) {
      localStorage.setItem(STORAGE, cloudBaseline.current);
      latestLocal.current = cloudBaseline.current;
      setProperties(synced);
    }
  }
  function enqueueShared(ps: Property[], pr: Preferences) {
    syncQueue.current = syncQueue.current
      .catch(() => {})
      .then(() => syncShared(ps, pr))
      .catch(() => {
        setNotice(
          "Os imóveis ficaram salvos neste aparelho, mas não conseguimos compartilhá-los agora. Tente novamente em Preferências.",
        );
      });
  }
  useEffect(() => {
    let refreshing = false;
    async function refreshShared() {
      if (
        refreshing ||
        document.visibilityState !== "visible" ||
        !supabase ||
        !cloudEnabled.current
      )
        return;
      refreshing = true;
      try {
        await syncQueue.current;
        const { data, error } = await supabase.rpc("load_household");
        if (error || !data) return;
        const remote = backupSchema.parse(data);
        const snapshot = sharedSnapshot(remote.properties, remote.preferences);
        if (snapshot !== cloudBaseline.current) {
          if (latestLocal.current !== cloudBaseline.current) {
            cloudEnabled.current = false;
            setNotice(
              "Os imóveis mudaram em outro aparelho enquanto você editava. Abra Preferências para escolher a versão.",
            );
            return;
          }
          localStorage.setItem(STORAGE, snapshot);
          localStorage.setItem(SYNC_KEY, snapshot);
          latestLocal.current = snapshot;
          cloudBaseline.current = snapshot;
          setProperties(remote.properties);
          setPrefs(remote.preferences);
        }
      } catch {
        // Keep the local copy available while the connection recovers.
      } finally {
        refreshing = false;
      }
    }
    window.addEventListener("focus", refreshShared);
    document.addEventListener("visibilitychange", refreshShared);
    return () => {
      window.removeEventListener("focus", refreshShared);
      document.removeEventListener("visibilitychange", refreshShared);
    };
  }, []);
  const persist = (ps: Property[], pr = prefs) => {
    try {
      const snapshot = sharedSnapshot(ps, pr);
      localStorage.setItem(STORAGE, snapshot);
      latestLocal.current = snapshot;
      setProperties(ps);
      setPrefs(pr);
      if (cloudEnabled.current) enqueueShared(ps, pr);
      return true;
    } catch {
      setNotice(
        "Sem espaço ou acesso ao armazenamento. Exporte seus dados antes de sair.",
      );
      return false;
    }
  };
  const open = (p: Property, fresh = false, s = "Visão geral") => {
    setDraft(structuredClone(p));
    setIsNew(fresh);
    setSection(s);
  };
  const save = () => {
    if (!draft) return;
    const parsed = propertySchema.safeParse(draft);
    const err = validateFinance(draft);
    if (!parsed.success || err) {
      setNotice(
        err ??
          "Confira os campos. Informe pelo menos um nome e use valores válidos.",
      );
      return;
    }
    if (
      persist(
        isNew
          ? [...properties, draft]
          : properties.map((p) => (p.id === draft.id ? draft : p)),
      )
    ) {
      setDraft(null);
      setNotice("Pronto, guardamos este imóvel.");
    }
  };
  const update = (key: keyof Property, value: unknown) =>
    setDraft((p) => (p ? { ...p, [key]: value } : p));
  const fin = (key: keyof Finance, value: unknown) =>
    setDraft((p) =>
      p ? { ...p, finance: { ...p.finance, [key]: value } } : p,
    );
  const number = (v: string) => parseLocalizedNumber(v) ?? null;
  const exportData = async () => {
    try {
      const files = await packFiles(properties);
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { version: 1, properties, preferences: prefs, files },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "nosso-lar-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Cópia completa salva, incluindo os anexos.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Não foi possível criar a cópia.",
      );
    }
  };
  const cloud = async (direction: "push" | "pull") => {
    if (!supabase) return;
    setBusy(true);
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) throw Error("Entre por e-mail primeiro.");
      if (direction === "push") {
        const { data: householdId, error: accessError } =
          await supabase.rpc("ensure_household");
        if (accessError || !householdId)
          throw Error(
            "Não conseguimos abrir nosso espaço. Confira a configuração da conta.",
          );
        const synced = await syncFiles(properties, householdId);
        const { error } = await supabase.rpc("save_household", {
          payload: { version: 1, properties: synced, preferences: prefs },
        });
        if (error) throw error;
        const snapshot = sharedSnapshot(synced, prefs);
        localStorage.setItem(STORAGE, snapshot);
        latestLocal.current = snapshot;
        cloudBaseline.current = snapshot;
        localStorage.setItem(SYNC_KEY, snapshot);
        cloudEnabled.current = true;
        setProperties(synced);
        setNotice("Cópia salva na sua conta.");
      } else {
        const { data, error } = await supabase.rpc("load_household");
        if (error) throw error;
        if (!data) throw Error("Ainda não há uma cópia na nuvem.");
        const parsed = backupSchema.parse(data);
        if (
          confirm(
            "Trazer os imóveis e preferências que guardamos na conta? Isso substitui a versão deste aparelho.",
          )
        ) {
          const snapshot = sharedSnapshot(
            parsed.properties,
            parsed.preferences,
          );
          localStorage.setItem(STORAGE, snapshot);
          latestLocal.current = snapshot;
          cloudBaseline.current = snapshot;
          localStorage.setItem(SYNC_KEY, snapshot);
          cloudEnabled.current = true;
          setProperties(parsed.properties);
          setPrefs(parsed.preferences);
          setNotice("Cópia da nuvem carregada.");
        }
      }
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Nuvem indisponível. Seus dados locais estão preservados.",
      );
    } finally {
      setBusy(false);
    }
  };
  const visible = properties
    .filter(
      (p) =>
        (p.name + " " + propertyLocation(p))
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        matchesLocation(p, cityFilter, neighborhoodFilter) &&
        (stageFilter === "Todos" ||
          (stageFilter === "A confirmar"
            ? p.type === null
            : p.type === stageFilter)) &&
        (filter === "Todos" ||
          (filter === "Favoritos" && p.favorite) ||
          (filter === "Visitados" && p.status === "Visitado") ||
          (filter === "Em avaliação" && p.status === "Em avaliação")),
    )
    .sort((a, b) => {
      if (sort === "Favoritos") return Number(b.favorite) - Number(a.favorite);
      const val = (p: Property) =>
        sort === "Menor preço"
          ? p.price
          : sort === "Menor entrada"
            ? entry(p)
            : sort === "Menor mensalidade"
              ? recurring(p)
              : score(p, prefs).value;
      const av = val(a),
        bv = val(b);
      return av === null
        ? 1
        : bv === null
          ? -1
          : sort === "Melhor nota"
            ? bv - av
            : av - bv;
    });
  const cityOptions = locationOptions(properties, "city");
  const neighborhoodOptions = locationOptions(
    properties,
    "neighborhood",
    cityFilter,
  );
  const locationFilters =
    cityOptions.length || neighborhoodOptions.length ? (
      <div className="location-filters">
        <label>
          Cidade
          <select
            aria-label="Filtrar por cidade"
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setNeighborhoodFilter("");
            }}
          >
            <option value="">Todas as cidades</option>
            {cityOptions.map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bairro
          <select
            aria-label="Filtrar por bairro"
            value={neighborhoodFilter}
            onChange={(e) => setNeighborhoodFilter(e.target.value)}
          >
            <option value="">Todos os bairros</option>
            {neighborhoodOptions.map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(cityFilter || neighborhoodFilter) && (
          <button
            className="text-button"
            onClick={() => {
              setCityFilter("");
              setNeighborhoodFilter("");
            }}
          >
            Limpar localização <X size={14} />
          </button>
        )}
      </div>
    ) : null;
  const current = properties.find((p) => p.id === financialId) ?? properties[0];
  const flowMonths = 36;
  const propertyFlow = current ? cashflow(current, start, flowMonths) : null;
  const shoppingFlow = purchasesFlow(living.data.items, start, flowMonths);
  const flow = propertyFlow
    ? {
        pending: [
          ...propertyFlow.pending,
          ...(living.error
            ? ["Compras indisponíveis"]
            : living.loading
              ? ["Compras carregando"]
              : shoppingFlow.pending.map((name) => `Compra: ${name}`)),
        ],
        months: propertyFlow.months.map((m, i) => ({
          ...m,
          values: [...m.values, shoppingFlow.months[i].total],
          total: m.total + shoppingFlow.months[i].total,
        })),
      }
    : null;
  const flowLabels = [...cashLabels, "Mobília da mudança"];
  const toggle = (id: string) =>
    setSelected((v) =>
      v.includes(id)
        ? v.filter((x) => x !== id)
        : v.length < 3
          ? [...v, id]
          : v,
    );
  const comparison = properties.filter((p) => selected.includes(p.id));
  const safeLink = (s: string) => /^https?:\/\//i.test(s);
  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <House size={22} />
          </span>
          nosso lar<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Navegação principal">
          {[
            { name: "Imóveis", icon: LayoutGrid },
            { name: "Mobília", icon: Sofa },
            { name: "Lista inicial", icon: ListChecks },
            { name: "Inspirações", icon: Images },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              aria-current={area === name ? "page" : undefined}
              className={area === name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setArea(name as typeof area);
                if (name === "Imóveis") setTab("Imóveis");
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Imóveis" && <small>{properties.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => {
              setTempPrefs(structuredClone(prefs));
              setSettings(true);
            }}
          >
            <Settings2 size={18} />
            Preferências
          </button>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span>nosso lar.</span>
          <span>
            <span className="status-dot" /> Espaço privado
            <button
              className="icon-button mobile-settings"
              aria-label="Preferências"
              onClick={() => {
                setTempPrefs(structuredClone(prefs));
                setSettings(true);
              }}
            >
              <Settings2 size={18} />
            </button>
          </span>
        </div>
        <div className="page">
          {area === "Imóveis" ? (
            <>
              <nav
                className="living-tabs property-tabs"
                aria-label="Planejamento do imóvel"
              >
                {["Imóveis", "Comparar", "Finanças"].map((name) => (
                  <button
                    key={name}
                    className={tab === name ? "chip selected" : "chip"}
                    aria-pressed={tab === name}
                    onClick={() => setTab(name)}
                  >
                    {name === "Imóveis" ? "Nossa lista" : name}
                  </button>
                ))}
              </nav>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {tab === "Imóveis"
                      ? "NOSSA BUSCA"
                      : tab === "Comparar"
                        ? "LADO A LADO"
                        : "NOSSOS PLANOS"}
                  </div>
                  <h1>
                    {tab === "Imóveis"
                      ? "Nossos imóveis"
                      : tab === "Comparar"
                        ? "Qual combina mais com a gente?"
                        : "Como fica no nosso bolso?"}
                  </h1>
                  <p>
                    {tab === "Imóveis"
                      ? "As opções que estamos considerando para morar juntos."
                      : tab === "Comparar"
                        ? "Vamos olhar com calma o que muda de um lugar para o outro."
                        : "A entrada, as parcelas e o que precisamos reservar."}
                  </p>
                </div>
                {tab === "Imóveis" && properties.length > 0 && (
                  <button
                    className="primary"
                    onClick={() => open(newProperty(), true)}
                  >
                    <Plus size={18} />
                    Adicionar imóvel
                  </button>
                )}
              </div>
              {!ready ? (
                <div className="skeleton">Preparando seu espaço…</div>
              ) : (
                <>
                  {tab === "Imóveis" && (
                    <>
                      {welcomeOpen && (
                        <section
                          className="welcome-panel"
                          aria-label="Comece por aqui"
                        >
                          <div>
                            <span className="eyebrow">COMECE POR AQUI</span>
                            <h2>
                              {properties.length
                                ? "Conheça o que já guardamos"
                                : "Vamos começar nossa lista"}
                            </h2>
                            <p>
                              {properties.length
                                ? "Abra um imóvel para ver a proposta, as fotos e o que anotamos."
                                : "Guarde um imóvel ou explore as ideias de compras para a casa."}
                            </p>
                          </div>
                          <div className="welcome-actions">
                            <button
                              className="primary"
                              onClick={() => {
                                dismissWelcome();
                                open(
                                  properties.length
                                    ? (properties.find((p) => p.favorite) ??
                                        properties[0])
                                    : newProperty(),
                                  !properties.length,
                                );
                              }}
                            >
                              {properties.length
                                ? "Ver um imóvel"
                                : "Adicionar imóvel"}
                            </button>
                            <button
                              className="secondary"
                              onClick={() => {
                                dismissWelcome();
                                setArea(
                                  properties.length
                                    ? "Mobília"
                                    : "Lista inicial",
                                );
                              }}
                            >
                              {properties.length
                                ? "Ver compras da casa"
                                : "Explorar lista da casa"}
                            </button>
                            <button
                              className="text-button"
                              onClick={dismissWelcome}
                              aria-label="Fechar orientação"
                            >
                              Fechar
                            </button>
                          </div>
                        </section>
                      )}
                      <div className="collection-title">
                        <h2>
                          Nossa lista{" "}
                          <span>
                            {properties.length.toString().padStart(2, "0")}
                          </span>
                        </h2>
                        {aiEnabled && (
                          <button
                            className="text-button"
                            onClick={() => setAiOpen(true)}
                          >
                            Importar anúncio com IA <ArrowUpRight size={16} />
                          </button>
                        )}
                      </div>
                      {properties.length > 0 && (
                        <div className="toolbar">
                          <div className="filters">
                            {[
                              "Todos",
                              "Favoritos",
                              "Em avaliação",
                              "Visitados",
                            ].map((f) => (
                              <button
                                className={
                                  filter === f ? "chip selected" : "chip"
                                }
                                key={f}
                                onClick={() => setFilter(f)}
                              >
                                {f === "Favoritos" && <Heart size={13} />} {f}
                              </button>
                            ))}
                          </div>
                          <div className="search-sort">
                            <label className="search">
                              <Search size={16} />
                              <input
                                aria-label="Buscar imóvel"
                                placeholder="Buscar imóvel"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </label>
                            <select
                              aria-label="Ordenar imóveis"
                              value={sort}
                              onChange={(e) => setSort(e.target.value)}
                            >
                              {[
                                "Favoritos",
                                "Menor preço",
                                "Melhor nota",
                                "Menor entrada",
                                "Menor mensalidade",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      {properties.length > 0 && (
                        <div className="stage-filter">
                          <span>Fase do imóvel</span>
                          <div
                            className="stage-options"
                            role="group"
                            aria-label="Filtrar por fase do imóvel"
                          >
                            {[
                              "Todos",
                              "Pronto",
                              "Em obra",
                              "Na planta",
                              "A confirmar",
                            ].map((stage) => (
                              <button
                                key={stage}
                                className={
                                  stageFilter === stage
                                    ? "chip selected"
                                    : "chip"
                                }
                                aria-pressed={stageFilter === stage}
                                onClick={() => setStageFilter(stage)}
                              >
                                {stage}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {properties.length > 0 && locationFilters}
                      <div className="property-grid">
                        {visible.map((p) => (
                          <article className="property-card" key={p.id}>
                            <div className="photo">
                              {p.photo && safeLink(p.photo) ? (
                                <img src={p.photo} alt={p.name} />
                              ) : (
                                <AttachmentCover
                                  file={p.attachments.find((f) =>
                                    f.mime.startsWith("image/"),
                                  )}
                                  name={p.name}
                                  fallback={<Placeholder />}
                                />
                              )}
                              <span
                                className={`badge photo-badge stage-${p.type === "Pronto" ? "ready" : p.type === "Em obra" ? "building" : p.type === "Na planta" ? "planned" : "unknown"}`}
                              >
                                {p.type ?? "Tipo a confirmar"}
                              </span>
                              <button
                                className={
                                  "favorite " + (p.favorite ? "favorited" : "")
                                }
                                aria-label={
                                  p.favorite
                                    ? "Remover favorito"
                                    : "Favoritar imóvel"
                                }
                                onClick={() =>
                                  persist(
                                    properties.map((x) =>
                                      x.id === p.id
                                        ? { ...x, favorite: !x.favorite }
                                        : x,
                                    ),
                                  )
                                }
                              >
                                <Heart
                                  size={17}
                                  fill={p.favorite ? "currentColor" : "none"}
                                />
                              </button>
                            </div>
                            <button
                              className="card-main"
                              onClick={() => open(p)}
                            >
                              <div className="card-status">
                                <span className="status-dot" />
                                {p.status}
                                <ArrowUpRight size={17} />
                              </div>
                              <h3>{p.name}</h3>
                              <p className="location">
                                <MapPin size={14} />
                                {propertyLocation(p)}
                              </p>
                              <strong className="price">
                                {money(p.price)}
                              </strong>
                              <div className="specs">
                                <span>
                                  {p.area !== null
                                    ? `${p.area} m²`
                                    : "Área pendente"}
                                </span>
                                <span>
                                  {p.rooms !== null
                                    ? `${p.rooms} quartos`
                                    : "Quartos pendentes"}
                                </span>
                                <span>
                                  {p.parking !== null
                                    ? `${p.parking} vagas`
                                    : "Vagas pendentes"}
                                </span>
                              </div>
                              <div className="card-footer">
                                <span>
                                  {score(p, prefs).complete
                                    ? `Nota ${score(p, prefs).value?.toFixed(0)}/100`
                                    : "Ainda temos coisas para conhecer"}
                                </span>
                                <span>
                                  Ver imóvel <ArrowRight size={14} />
                                </span>
                              </div>
                            </button>
                            {safeLink(p.url) && (
                              <a
                                className="card-source-link"
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir anúncio <ArrowUpRight size={14} />
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
                      {!visible.length && (
                        <div className="collection-empty">
                          <House size={24} />
                          <h3>
                            {properties.length
                              ? "Nenhum imóvel encontrado"
                              : "Nossa lista começa aqui"}
                          </h3>
                          <p>
                            {properties.length
                              ? "Tente outra busca ou limpe os filtros para ver todos os imóveis."
                              : "Guarde o primeiro imóvel para começar a comparar com calma."}
                          </p>
                          {properties.length ? (
                            <button
                              className="secondary"
                              onClick={() => {
                                setFilter("Todos");
                                setStageFilter("Todos");
                                setSearch("");
                                setCityFilter("");
                                setNeighborhoodFilter("");
                              }}
                            >
                              Limpar busca e filtros
                            </button>
                          ) : (
                            <button
                              className="secondary"
                              onClick={() => open(newProperty(), true)}
                            >
                              <Plus size={16} /> Adicionar primeiro imóvel
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {tab === "Comparar" && (
                    <>
                      <div className="section-label">
                        SELECIONE DE 2 A 3 IMÓVEIS{" "}
                        <span>{selected.length}/3 selecionados</span>
                      </div>
                      {locationFilters}
                      <p className="selection-context">
                        Os filtros ajudam a encontrar opções; os imóveis já
                        selecionados continuam na comparação.
                      </p>
                      <div className="selection-row">
                        {properties
                          .filter((p) =>
                            matchesLocation(p, cityFilter, neighborhoodFilter),
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              className={
                                "select-card " +
                                (selected.includes(p.id) ? "chosen" : "")
                              }
                              onClick={() => toggle(p.id)}
                              disabled={
                                selected.length === 3 &&
                                !selected.includes(p.id)
                              }
                            >
                              <Building2 size={22} />
                              <div>
                                <strong>{p.name}</strong>
                                <small>{money(p.price)}</small>
                              </div>
                              <span className="checkbox">
                                {selected.includes(p.id) && <Check size={14} />}
                              </span>
                            </button>
                          ))}
                      </div>
                      {comparison.length < 2 ? (
                        <div className="empty">
                          <Columns3 size={36} />
                          <h2>Uma escolha merece perspectiva.</h2>
                          <p>
                            Selecione dois imóveis para comparar custos, espaços
                            e avaliações.
                          </p>
                          <button
                            className="secondary"
                            onClick={() => {
                              setTab("Imóveis");
                              open(newProperty(), true);
                            }}
                          >
                            <Plus size={16} />
                            Adicionar outra opção
                          </button>
                        </div>
                      ) : (
                        <div className="comparison-grid">
                          {comparison.map((p) => {
                            const s = score(p, prefs);
                            const allComplete = comparison.every(
                              (x) => score(x, prefs).complete,
                            );
                            const best = allComplete
                              ? Math.max(
                                  ...comparison.map(
                                    (x) => score(x, prefs).value!,
                                  ),
                                )
                              : null;
                            return (
                              <article className="compare-card" key={p.id}>
                                <span className="eyebrow">
                                  {p.type ?? "TIPO PENDENTE"}
                                </span>
                                <h2>{p.name}</h2>
                                {best !== null && s.value === best && (
                                  <span className="badge">
                                    {comparison.filter(
                                      (x) => score(x, prefs).value === best,
                                    ).length > 1
                                      ? "Empate na avaliação"
                                      : "Melhor avaliado"}
                                  </span>
                                )}
                                <p className="muted">
                                  {requirements(p, prefs)}
                                </p>
                                {[
                                  ["Preço", money(p.price)],
                                  [
                                    "Área privativa",
                                    p.area === null
                                      ? "Não informado"
                                      : `${p.area} m²`,
                                  ],
                                  [
                                    "Preço por m²",
                                    p.price && p.area
                                      ? money(p.price / p.area)
                                      : "Não informado",
                                  ],
                                  [
                                    "Quartos / banheiros / suítes / vagas",
                                    [p.rooms, p.baths, p.suites, p.parking]
                                      .map((v) => v ?? "—")
                                      .join(" / "),
                                  ],
                                  [
                                    "Disponibilidade",
                                    p.delivery || "Não informado",
                                  ],
                                  ["Entrada em dinheiro", money(entry(p))],
                                  ["Mensal recorrente", money(recurring(p))],
                                  [
                                    "Avaliação",
                                    s.complete
                                      ? `${s.value?.toFixed(1)} / 100`
                                      : `Provisória · ${s.coverage}% completa`,
                                  ],
                                ].map(([l, v]) => (
                                  <div className="compare-line" key={l}>
                                    <span>{l}</span>
                                    <strong>{v}</strong>
                                  </div>
                                ))}
                                {[
                                  "Localização e conforto",
                                  "Condomínio",
                                  "Custos e obra",
                                  "Riscos e pendências",
                                ].map((name, i) => (
                                  <details key={name}>
                                    <summary>{name}</summary>
                                    <p>
                                      {i === 0
                                        ? propertyLocation(p)
                                        : i === 1
                                          ? `Condomínio: ${money(p.finance.condo)}`
                                          : i === 2
                                            ? `Documentação: ${money(documentation(p))}. Obra: ${money(p.finance.construction)}`
                                            : p.notes ||
                                              "Registre observações e confirme informações na visita."}
                                    </p>
                                  </details>
                                ))}
                                <p className="small muted">
                                  {s.complete
                                    ? "Nota ponderada pelas preferências de vocês; maior nota indica maior avaliação consensual."
                                    : "A nota final só aparece ao completar os critérios; informações ausentes não valem zero."}
                                </p>
                                <button
                                  className="text-button"
                                  onClick={() => open(p)}
                                >
                                  Abrir ficha <ArrowRight size={15} />
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {tab === "Finanças" &&
                    (current && flow ? (
                      <>
                        <div className="finance-selector">
                          <label>
                            Planejamento de
                            <select
                              aria-label="Imóvel do planejamento"
                              value={current.id}
                              onChange={(e) => setFinancialId(e.target.value)}
                            >
                              {properties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="secondary"
                            onClick={() => open(current, false, "Custos")}
                          >
                            <Settings2 size={16} />
                            Ajustar custos
                          </button>
                        </div>
                        <section className="savings-panel">
                          <div>
                            <span className="eyebrow">NOSSA RESERVA</span>
                            <h2>Quanto temos guardado hoje?</h2>
                            <p>
                              Atualize quando esse valor mudar. A reserva é
                              comparada com os pagamentos à vista da entrada, a
                              documentação e os gastos eventuais registrados.
                            </p>
                          </div>
                          <Field
                            label="Valor disponível hoje (R$)"
                            type="currency"
                            value={prefs.savings}
                            onChange={(v) => {
                              const updated = { ...prefs, savings: number(v) };
                              persist(properties, updated);
                            }}
                          />
                          <div className="savings-result">
                            <span>Falta para esses gastos</span>
                            <strong>
                              {money(acquisitionGap(current, prefs.savings))}
                            </strong>
                            <small>
                              {acquisitionGap(current, prefs.savings) === null
                                ? "Complete a reserva, a entrada e a documentação para calcular."
                                : "Soma os valores à vista de todos os meses. Veja as datas abaixo."}
                            </small>
                          </div>
                        </section>
                        <div className="metrics">
                          <Metric
                            label="Pagamentos à vista + documentação"
                            value={money(
                              entryParts(current).upfront === null ||
                                documentation(current) === null
                                ? null
                                : entryParts(current).upfront! +
                                    documentation(current)!,
                            )}
                            help="Veja a distribuição por mês abaixo"
                          />
                          <Metric
                            label="Prestação informada"
                            value={money(current.finance.payment)}
                            help="Da sua simulação de financiamento"
                          />
                          <Metric
                            label="Custo mensal recorrente"
                            value={money(recurring(current))}
                            help={
                              recurring(current) === null
                                ? "Prestação + condomínio + IPTU"
                                : `${((recurring(current)! / prefs.income) * 100).toFixed(1)}% da renda de referência`
                            }
                          />
                          <Metric
                            label="Documentação"
                            value={money(documentation(current))}
                            help={
                              current.finance.docMode === "estimate"
                                ? "Estimativa de 6% do preço"
                                : "Valor informado · substitui a estimativa"
                            }
                          />
                        </div>
                        <section className="chart-panel">
                          <div className="chart-heading">
                            <div>
                              <span className="eyebrow">
                                UM MÊS DE CADA VEZ
                              </span>
                              <h2>O que vamos reservar por mês</h2>
                            </div>
                            <Field
                              label="Início do planejamento"
                              type="month"
                              value={start}
                              onChange={(v) => {
                                if (v) setStart(v);
                              }}
                            />
                          </div>
                          {flow.pending.length > 0 && (
                            <details className="pending">
                              <summary>
                                Planejamento parcial · {flow.pending.length}{" "}
                                informações pendentes
                              </summary>
                              <p>
                                Confirme {flow.pending.join(", ").toLowerCase()}
                                . As barras mostram os valores com mês definido.
                              </p>
                            </details>
                          )}
                          <div className="chart-period">
                            <button
                              type="button"
                              className="text-button"
                              disabled={period === 0}
                              onClick={() => {
                                setPeriod(period - 1);
                                setMonth((period - 1) * 12);
                              }}
                            >
                              Anteriores
                            </button>
                            <span>
                              {flow.months[period * 12].label} –{" "}
                              {flow.months[period * 12 + 11].label}
                            </span>
                            <button
                              type="button"
                              className="text-button"
                              disabled={period >= flowMonths / 12 - 1}
                              onClick={() => {
                                setPeriod(period + 1);
                                setMonth((period + 1) * 12);
                              }}
                            >
                              Próximos
                            </button>
                          </div>
                          <div
                            className="chart"
                            aria-label={`Fluxo de caixa de ${flow.months[period * 12].label} a ${flow.months[period * 12 + 11].label}`}
                          >
                            {flow.months
                              .map((m, i) => ({ m, i }))
                              .filter(({ i }) => Math.floor(i / 12) === period)
                              .map(({ m, i }) => (
                                <button
                                  key={m.key}
                                  className={
                                    "chart-column " +
                                    (i === month ? "focused" : "")
                                  }
                                  onClick={() => setMonth(i)}
                                  aria-label={`${m.label}: ${money(m.total)} em valores conhecidos`}
                                >
                                  <span className="bar-track">
                                    <span
                                      className="bar"
                                      style={{
                                        height: `${m.total ? Math.max(3, (m.total / Math.max(...flow.months.map((x) => x.total), 1)) * 100) : 0}%`,
                                      }}
                                    >
                                      {m.values.map(
                                        (v, j) =>
                                          v > 0 && (
                                            <i
                                              key={j}
                                              style={{
                                                height: `${(v / m.total) * 100}%`,
                                                background: `var(--cash-${j})`,
                                              }}
                                            />
                                          ),
                                      )}
                                    </span>
                                  </span>
                                  <span className="month-label">
                                    {m.label.split("/")[0]}
                                    <small>{m.label.split("/")[1]}</small>
                                  </span>
                                </button>
                              ))}
                          </div>
                          <div className="legend">
                            {flowLabels.map((l, i) =>
                              flow.months.some((m) => m.values[i] > 0) ? (
                                <span key={l}>
                                  <i
                                    style={{ background: `var(--cash-${i})` }}
                                  />
                                  {l}
                                </span>
                              ) : null,
                            )}
                          </div>
                          <div className="month-detail">
                            <div>
                              <span className="eyebrow">
                                {flow.months[month].label}
                              </span>
                              <h3>
                                {flow.months[month].total === 0 &&
                                flow.pending.length
                                  ? "Pendente"
                                  : money(flow.months[month].total)}
                              </h3>
                              <small>
                                {flow.pending.length
                                  ? "Subtotal conhecido · há pendências"
                                  : "Total previsto"}
                              </small>
                            </div>
                            <div className="month-breakdown">
                              {flow.months[month].values.map(
                                (v, i) =>
                                  v > 0 && (
                                    <p key={i}>
                                      {flowLabels[i]}
                                      <strong>{money(v)}</strong>
                                    </p>
                                  ),
                              )}
                              {flow.months[month].total === 0 && (
                                <p>Nenhum pagamento informado para este mês.</p>
                              )}
                            </div>
                          </div>
                        </section>
                        <details className="finance-references">
                          <summary>Nossas referências para este plano</summary>
                          <p>
                            Renda de referência: {money(prefs.income)}. Teto do
                            imóvel: {money(prefs.ceiling)}.
                          </p>
                          <p>
                            Estes valores ajudam a organizar nossa escolha. A
                            carta de crédito de R$ 400 mil não define o
                            financiamento aprovado; a prestação vem da nossa
                            simulação real.
                          </p>
                        </details>
                      </>
                    ) : (
                      <div className="empty">
                        <Wallet size={36} />
                        <h2>Vamos escolher um imóvel primeiro.</h2>
                        <button
                          className="primary"
                          onClick={() => open(newProperty(), true)}
                        >
                          Adicionar imóvel
                        </button>
                      </div>
                    ))}
                </>
              )}
            </>
          ) : (
            <LivingPanel
              area={area}
              store={living}
              properties={properties}
              selectedPropertyId={financialId}
            />
          )}
          <footer className="page-footer">
            <span>nosso lar.</span>
            <span>Só nosso.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="Dispensar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {draft && (
        <Modal
          title={isNew ? "Mais um lugar para conhecer" : draft.name}
          description={
            isNew
              ? "Comece pelo que você sabe. Os detalhes podem vir depois."
              : "Tudo o que estamos guardando sobre este lugar."
          }
          onClose={() => {
            if (
              confirm(
                "Fechar a ficha? Alterações não salvas serão descartadas.",
              )
            )
              setDraft(null);
          }}
        >
          <div className="dialog-body">
            {!isNew && (
              <div className="tabs">
                {["Visão geral", "Avaliação", "Custos"].map((s) => (
                  <button
                    key={s}
                    className={section === s ? "selected" : ""}
                    onClick={() => setSection(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {section === "Visão geral" && (
              <>
                <div className="form-grid">
                  <Field
                    label="Nome ou apelido do imóvel"
                    value={draft.name}
                    onChange={(v) => update("name", v)}
                  />
                  <label className="field">
                    <span>Fase do imóvel</span>
                    <select
                      value={draft.type ?? ""}
                      onChange={(e) => update("type", e.target.value || null)}
                    >
                      <option value="">A confirmar</option>
                      {["Pronto", "Em obra", "Na planta"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Preço anunciado (R$)"
                    type="currency"
                    value={draft.price}
                    onChange={(v) => update("price", number(v))}
                  />
                  <Field
                    label="Área privativa (m²)"
                    type="number"
                    value={draft.area}
                    onChange={(v) => update("area", number(v))}
                  />
                  <Field
                    label="Cidade"
                    value={draft.city}
                    onChange={(v) => update("city", v)}
                  />
                  <Field
                    label="Bairro"
                    value={draft.neighborhood}
                    onChange={(v) => update("neighborhood", v)}
                  />
                  {draft.location && (
                    <p className="legacy-location">
                      Localização salva anteriormente: {draft.location}.
                      Complete cidade e bairro para usar os filtros.
                    </p>
                  )}
                  <div className="compact-fields">
                    {[
                      ["rooms", "Quartos"],
                      ["baths", "Banheiros"],
                      ["suites", "Suítes"],
                      ["parking", "Vagas"],
                    ].map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        type="number"
                        value={draft[key as "rooms"]}
                        onChange={(v) =>
                          update(key as keyof Property, number(v))
                        }
                      />
                    ))}
                    <label className="field">
                      <span>Varanda</span>
                      <select
                        value={
                          draft.balcony === null ? "" : String(draft.balcony)
                        }
                        onChange={(e) =>
                          update(
                            "balcony",
                            e.target.value === ""
                              ? null
                              : e.target.value === "true",
                          )
                        }
                      >
                        <option value="">A confirmar</option>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </label>
                  </div>
                </div>
                <Field
                  label="Link original do anúncio"
                  type="url"
                  value={draft.url}
                  onChange={(v) => update("url", v)}
                />
                {safeLink(draft.url) && (
                  <a
                    className="text-button"
                    href={draft.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir anúncio <ArrowUpRight size={14} />
                  </a>
                )}
                <label className="field">
                  <span>Destaques do anúncio</span>
                  <textarea
                    maxLength={2000}
                    value={draft.listingHighlights}
                    onChange={(e) =>
                      update("listingHighlights", e.target.value)
                    }
                    placeholder="Lazer, acabamentos, localização ou condições mencionadas no anúncio"
                  />
                </label>
                <details>
                  <summary>Outros detalhes opcionais</summary>
                  <div className="form-grid">
                    <Field
                      label="URL da foto real do anúncio"
                      type="url"
                      value={draft.photo}
                      onChange={(v) => update("photo", v)}
                    />
                    <Field
                      label="Endereço"
                      value={draft.address}
                      onChange={(v) => update("address", v)}
                    />
                    <Field
                      label="Andar"
                      value={draft.floor}
                      onChange={(v) => update("floor", v)}
                    />
                    <Field
                      label="Posição solar"
                      value={draft.sun}
                      onChange={(v) => update("sun", v)}
                    />
                    {draft.type !== "Pronto" && (
                      <Field
                        label="Previsão de entrega"
                        type="month"
                        value={draft.delivery}
                        onChange={(v) => update("delivery", v)}
                      />
                    )}
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(e) => update("status", e.target.value)}
                      >
                        {[
                          "Rascunho",
                          "Em avaliação",
                          "Visitado",
                          "Descartado",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    {(["elevator"] as const).map((k, i) => (
                      <label className="field" key={k}>
                        <span>Elevador</span>
                        <select
                          value={draft[k] === null ? "" : String(draft[k])}
                          onChange={(e) =>
                            update(
                              k,
                              e.target.value === ""
                                ? null
                                : e.target.value === "true",
                            )
                          }
                        >
                          <option value="">A confirmar</option>
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </details>
                {!isNew && (
                  <details>
                    <summary>Nossas anotações e a visita</summary>
                    <label className="field">
                      <span>
                        O que chamou a atenção? O que falta confirmar?
                      </span>
                      <textarea
                        value={draft.notes}
                        onChange={(e) => update("notes", e.target.value)}
                      />
                    </label>
                  </details>
                )}
                <PropertyAttachments
                  files={draft.attachments}
                  onChange={(files) => update("attachments", files)}
                  onNotice={setNotice}
                  otherBytes={properties
                    .filter((p) => p.id !== draft.id)
                    .reduce(
                      (total, p) =>
                        total + p.attachments.reduce((n, f) => n + f.size, 0),
                      0,
                    )}
                />
                <div className="hint">
                  {draft.price && draft.area
                    ? `${money(draft.price / draft.area)} / m²`
                    : "O preço por m² aparecerá quando a área for informada."}
                </div>
              </>
            )}
            {section === "Avaliação" && (
              <>
                <div className="assessment-intro">
                  <h3>O que achamos deste lugar?</h3>
                  <p>
                    Conversem e registrem uma única nota por critério. De 0 (não
                    atende) a 10 (atende totalmente); em riscos, 10 significa
                    menor risco percebido.
                  </p>
                  <span className="badge">
                    {score(draft, prefs).complete
                      ? `${score(draft, prefs).value?.toFixed(1)} / 100`
                      : `Provisória · ${score(draft, prefs).coverage}% completa`}
                  </span>
                </div>
                {criteria.map((c, i) => (
                  <div className="rating" key={c}>
                    <div>
                      <strong>{c}</strong>
                      <small>
                        Peso {prefs.weights[i]}%
                        {i === 0
                          ? " · Compare com seu orçamento e simulação real"
                          : ""}
                      </small>
                    </div>
                    <select
                      aria-label={`Nota de ${c}`}
                      value={draft.ratings[i] ?? ""}
                      onChange={(e) =>
                        update(
                          "ratings",
                          draft.ratings.map((r, j) =>
                            j === i ? number(e.target.value) : r,
                          ),
                        )
                      }
                    >
                      <option value="">Avaliar depois</option>
                      {Array.from({ length: 11 }, (_, j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <p className="hint">
                  A nota é a soma de cada avaliação × seu peso ÷ 10. Critérios
                  pendentes não recebem zero e não geram uma nota final.
                </p>
              </>
            )}
            {section === "Custos" && (
              <>
                <div className="hint">
                  Valores em reais. Deixe em branco o que não sabe; digite 0
                  apenas quando confirmar que não há cobrança ou uso.
                </div>
                <h3>Entrada e financiamento</h3>
                <div className="form-grid">
                  {(
                    [
                      ["financed", "Financiamento informado"],
                      ["payment", "Prestação da simulação"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      type="currency"
                      value={draft.finance[key]}
                      onChange={(v) => fin(key, number(v))}
                    />
                  ))}
                  <Field
                    label="Início da prestação"
                    type="month"
                    value={draft.finance.paymentMonth}
                    onChange={(v) => fin("paymentMonth", v)}
                  />
                </div>
                <div className="entry-heading">
                  <h3>Como vamos pagar a entrada?</h3>
                  <strong>{money(entry(draft))}</strong>
                </div>
                {draft.finance.entrySchedule.length === 0 ? (
                  <>
                    <div className="form-grid">
                      <Field
                        label="Entrada em dinheiro (R$)"
                        type="currency"
                        value={draft.finance.cashEntry}
                        onChange={(v) => fin("cashEntry", number(v))}
                      />
                      <Field
                        label="Mês da entrada / sinal"
                        type="month"
                        value={draft.finance.entryMonth}
                        onChange={(v) => fin("entryMonth", v)}
                      />
                    </div>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={draft.finance.split}
                        onChange={(e) => fin("split", e.target.checked)}
                      />
                      Parcelar parte da entrada
                    </label>
                    {draft.finance.split && (
                      <div className="form-grid">
                        <Field
                          label="Parte da entrada a parcelar"
                          type="currency"
                          value={draft.finance.installmentTotal}
                          onChange={(v) => fin("installmentTotal", number(v))}
                        />
                        <div className="inline-total">
                          Parte à vista
                          <strong>{money(entryParts(draft).upfront)}</strong>
                        </div>
                        <Field
                          label="Início das parcelas (se diferente do sinal)"
                          type="month"
                          value={draft.finance.installmentMonth}
                          onChange={(v) => fin("installmentMonth", v)}
                        />
                        <Field
                          label="Número de parcelas dessa parte"
                          type="number"
                          value={draft.finance.installments}
                          onChange={(v) => fin("installments", Number(v))}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const parts = entryParts(draft);
                        const steps: Finance["entrySchedule"] = [];
                        if (parts.upfront !== null && parts.upfront > 0)
                          steps.push({
                            id: crypto.randomUUID(),
                            amount: parts.upfront,
                            month: draft.finance.entryMonth,
                            installments: 1,
                          });
                        if (
                          parts.installments !== null &&
                          parts.installments > 0
                        )
                          steps.push({
                            id: crypto.randomUUID(),
                            amount: parts.installments,
                            month:
                              draft.finance.installmentMonth ||
                              draft.finance.entryMonth,
                            installments: draft.finance.installments,
                          });
                        fin(
                          "entrySchedule",
                          steps.length
                            ? steps
                            : [
                                {
                                  id: crypto.randomUUID(),
                                  amount: null,
                                  month: "",
                                  installments: 1,
                                },
                              ],
                        );
                      }}
                    >
                      <Plus size={16} /> Detalhar entrada em etapas
                    </button>
                  </>
                ) : (
                  <div className="entry-schedule">
                    {draft.finance.entrySchedule.map((payment, index) => (
                      <div className="entry-step" key={payment.id}>
                        <div className="entry-step-head">
                          <strong>Pagamento {index + 1}</strong>
                          <button
                            type="button"
                            className="text-button"
                            aria-label={`Remover pagamento ${index + 1}`}
                            onClick={() =>
                              fin(
                                "entrySchedule",
                                draft.finance.entrySchedule.filter(
                                  (step) => step.id !== payment.id,
                                ),
                              )
                            }
                          >
                            <Trash2 size={16} /> Remover
                          </button>
                        </div>
                        <div className="form-grid">
                          <Field
                            label={`Valor do pagamento ${index + 1} (R$)`}
                            type="currency"
                            value={payment.amount}
                            onChange={(v) =>
                              fin(
                                "entrySchedule",
                                draft.finance.entrySchedule.map((step) =>
                                  step.id === payment.id
                                    ? { ...step, amount: number(v) }
                                    : step,
                                ),
                              )
                            }
                          />
                          <Field
                            label={`Mês do pagamento ${index + 1}`}
                            type="month"
                            value={payment.month}
                            onChange={(v) =>
                              fin(
                                "entrySchedule",
                                draft.finance.entrySchedule.map((step) =>
                                  step.id === payment.id
                                    ? { ...step, month: v }
                                    : step,
                                ),
                              )
                            }
                          />
                          <label className="field">
                            <span>Como pagar</span>
                            <select
                              aria-label={`Parcelas do pagamento ${index + 1}`}
                              value={payment.installments}
                              onChange={(e) =>
                                fin(
                                  "entrySchedule",
                                  draft.finance.entrySchedule.map((step) =>
                                    step.id === payment.id
                                      ? {
                                          ...step,
                                          installments: Number(e.target.value),
                                        }
                                      : step,
                                  ),
                                )
                              }
                            >
                              <option value={1}>À vista</option>
                              {Array.from({ length: 35 }, (_, n) => n + 2).map(
                                (n) => (
                                  <option key={n} value={n}>
                                    {n} vezes
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>
                        {payment.amount !== null &&
                          payment.installments > 1 && (
                            <small>
                              {money(payment.amount / payment.installments)} por
                              mês
                            </small>
                          )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        fin("entrySchedule", [
                          ...draft.finance.entrySchedule,
                          {
                            id: crypto.randomUUID(),
                            amount: null,
                            month: "",
                            installments: 1,
                          },
                        ])
                      }
                    >
                      <Plus size={16} /> Adicionar pagamento
                    </button>
                  </div>
                )}
                <h3>Documentação</h3>
                <label className="field">
                  <span>Como calcular</span>
                  <select
                    value={draft.finance.docMode}
                    onChange={(e) => fin("docMode", e.target.value)}
                  >
                    <option value="estimate">Estimativa · 6% do preço</option>
                    <option value="detailed">Valores detalhados</option>
                    <option value="total">Valor total informado</option>
                  </select>
                </label>
                {draft.finance.docMode === "detailed" && (
                  <div className="form-grid">
                    {(
                      [
                        ["itbi", "ITBI (0 se isento)"],
                        ["registry", "Registro (0 se isento)"],
                        ["fees", "Taxas de cartório / banco"],
                        ["other", "Outras despesas"],
                      ] as const
                    ).map(([k, l]) => (
                      <Field
                        key={k}
                        label={l}
                        type="currency"
                        value={draft.finance[k]}
                        onChange={(v) => fin(k, number(v))}
                      />
                    ))}
                  </div>
                )}
                {draft.finance.docMode === "total" && (
                  <Field
                    label="Total da documentação"
                    type="currency"
                    value={draft.finance.docTotal}
                    onChange={(v) => fin("docTotal", number(v))}
                  />
                )}
                <Field
                  label="Mês do pagamento da documentação"
                  type="month"
                  value={draft.finance.docMonth}
                  onChange={(v) => fin("docMonth", v)}
                />
                <div className="inline-total">
                  Preço + documentação
                  <strong>
                    {money(
                      draft.price === null || documentation(draft) === null
                        ? null
                        : draft.price + documentation(draft)!,
                    )}
                  </strong>
                </div>
                <p className="small muted">
                  Antes de juros, reforma e outras despesas. Não equivale ao
                  desembolso inicial.
                </p>
                <details>
                  <summary>Custos recorrentes e cronograma</summary>
                  <div className="form-grid">
                    <Field
                      label="Condomínio mensal"
                      type="currency"
                      value={draft.finance.condo}
                      onChange={(v) => fin("condo", number(v))}
                    />
                    <Field
                      label="IPTU anual (dividido por 12 no planejamento)"
                      type="currency"
                      value={draft.finance.iptu}
                      onChange={(v) => fin("iptu", number(v))}
                    />
                    <Field
                      label="Início do condomínio"
                      type="month"
                      value={draft.finance.condoMonth}
                      onChange={(v) => fin("condoMonth", v)}
                    />
                    <Field
                      label="Início do IPTU (se diferente do condomínio)"
                      type="month"
                      value={draft.finance.iptuMonth}
                      onChange={(v) => fin("iptuMonth", v)}
                    />
                  </div>
                </details>
                {draft.type !== null && draft.type !== "Pronto" && (
                  <details>
                    <summary>
                      Evolução de obra · valor mensal fixo informado
                    </summary>
                    <p className="small muted">
                      Informe os meses efetivos. Sobreposição com prestação só
                      ocorrerá nas datas que você definir.
                    </p>
                    <div className="form-grid">
                      <Field
                        label="Valor mensal informado"
                        type="currency"
                        value={draft.finance.construction}
                        onChange={(v) => fin("construction", number(v))}
                      />
                      <Field
                        label="Início da cobrança"
                        type="month"
                        value={draft.finance.constructionStart}
                        onChange={(v) => fin("constructionStart", v)}
                      />
                      <Field
                        label="Último mês da cobrança"
                        type="month"
                        value={draft.finance.constructionEnd}
                        onChange={(v) => fin("constructionEnd", v)}
                      />
                    </div>
                  </details>
                )}
                <details>
                  <summary>Gastos eventuais: mudança, reforma e outros</summary>
                  {draft.finance.extras.map((x, i) => (
                    <div className="extra-row" key={x.id}>
                      <Field
                        label="Descrição"
                        value={x.label}
                        onChange={(v) =>
                          fin(
                            "extras",
                            draft.finance.extras.map((a, j) =>
                              j === i ? { ...a, label: v } : a,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Valor"
                        type="currency"
                        value={x.value}
                        onChange={(v) =>
                          fin(
                            "extras",
                            draft.finance.extras.map((a, j) =>
                              j === i ? { ...a, value: number(v) ?? 0 } : a,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Mês"
                        type="month"
                        value={x.month}
                        onChange={(v) =>
                          fin(
                            "extras",
                            draft.finance.extras.map((a, j) =>
                              j === i ? { ...a, month: v } : a,
                            ),
                          )
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label="Remover gasto"
                        onClick={() =>
                          fin(
                            "extras",
                            draft.finance.extras.filter((a) => a.id !== x.id),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="secondary"
                    onClick={() =>
                      fin("extras", [
                        ...draft.finance.extras,
                        {
                          id: crypto.randomUUID(),
                          label: "Gasto eventual",
                          value: 0,
                          month: start,
                        },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Adicionar gasto
                  </button>
                </details>
              </>
            )}
          </div>
          <div className="dialog-footer">
            {!isNew && (
              <button
                className="danger text-button"
                onClick={() => {
                  if (
                    confirm(
                      "Excluir este imóvel? Exporte um backup se quiser preservá-lo.",
                    )
                  ) {
                    persist(properties.filter((p) => p.id !== draft.id));
                    setDraft(null);
                    setSelected(selected.filter((id) => id !== draft.id));
                  }
                }}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            )}
            <button className="primary" onClick={save}>
              <Check size={16} />
              {isNew ? "Salvar e avaliar depois" : "Salvar alterações"}
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal
          title="Nossas preferências"
          description="O que importa para nós e o que cabe no nosso bolso."
          onClose={() => setSettings(false)}
        >
          <div className="dialog-body">
            <h3>O que estamos planejando</h3>
            <div className="form-grid">
              <Field
                label="Renda familiar bruta mensal"
                type="currency"
                value={tempPrefs.income}
                onChange={(v) =>
                  setTempPrefs({ ...tempPrefs, income: number(v) ?? 0 })
                }
              />
              <Field
                label="Teto do preço do imóvel"
                type="currency"
                value={tempPrefs.ceiling}
                onChange={(v) =>
                  setTempPrefs({ ...tempPrefs, ceiling: number(v) ?? 0 })
                }
              />
              <Field
                label="Quartos mínimos"
                type="number"
                value={tempPrefs.minRooms}
                onChange={(v) =>
                  setTempPrefs({ ...tempPrefs, minRooms: number(v) })
                }
              />
              <Field
                label="Vagas mínimas"
                type="number"
                value={tempPrefs.minParking}
                onChange={(v) =>
                  setTempPrefs({ ...tempPrefs, minParking: number(v) })
                }
              />
            </div>
            <details>
              <summary>
                Pesos da avaliação · total{" "}
                {tempPrefs.weights.reduce((a, b) => a + b, 0)}%
              </summary>
              <p className="small muted">
                Distribua 100% conforme a importância de cada critério para
                vocês.
              </p>
              {criteria.map((c, i) => (
                <Field
                  key={c}
                  label={`${c} (%)`}
                  type="number"
                  value={tempPrefs.weights[i]}
                  onChange={(v) =>
                    setTempPrefs({
                      ...tempPrefs,
                      weights: tempPrefs.weights.map((w, j) =>
                        i === j ? Number(v) : w,
                      ),
                    })
                  }
                />
              ))}
            </details>
            <details>
              <summary>Guardar ou recuperar uma cópia</summary>
              <p className="small muted">
                O backup contém seus dados pessoais. Guarde em um local privado.
              </p>
              <button className="secondary" onClick={exportData}>
                <ArrowDownToLine size={16} />
                Baixar cópia com anexos
              </button>
              <label className="file-input">
                Recuperar uma cópia
                <input
                  type="file"
                  accept="application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 150 * 1024 * 1024) {
                      setNotice(
                        "A cópia precisa ter até 150 MB, incluindo os anexos.",
                      );
                      return;
                    }
                    try {
                      const d = backupSchema.parse(
                        JSON.parse(await file.text()),
                      );
                      if (
                        confirm(
                          "Substituir os imóveis e preferências por esta cópia?",
                        )
                      ) {
                        await restoreFiles(d.properties, d.files);
                        persist(d.properties, d.preferences);
                        setTempPrefs(d.preferences);
                        setNotice("Backup restaurado.");
                      }
                    } catch {
                      setNotice("Backup inválido. Nenhum dado foi alterado.");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </details>
            <details>
              <summary>Nossa conta e outros aparelhos</summary>
              {supabase ? (
                <>
                  {user ? (
                    <>
                      <p>Conectado como {user}</p>
                      <div className="button-row">
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => cloud("push")}
                        >
                          Guardar na nossa conta
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => cloud("pull")}
                        >
                          Trazer da nossa conta
                        </button>
                        <button
                          className="text-button"
                          onClick={() => supabase?.auth.signOut()}
                        >
                          Sair
                        </button>
                      </div>
                      <p className="small muted">
                        Ao trocar de aparelho, traga a versão da nossa conta
                        antes de editar. Depois, guarde suas mudanças para nós
                        dois.
                      </p>
                    </>
                  ) : (
                    <>
                      <Field
                        label="Seu e-mail"
                        type="email"
                        value={email}
                        onChange={setEmail}
                      />
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const result = await supabase!.auth.signInWithOtp({
                              email,
                              options: {
                                shouldCreateUser: false,
                                emailRedirectTo: window.location.origin,
                              },
                            });
                            setNotice(
                              result.error
                                ? "Não foi possível enviar o link. Confira o e-mail e tente novamente."
                                : "Link de acesso enviado. Confira seu e-mail.",
                            );
                          } catch {
                            setNotice(
                              "Sem conexão com a nuvem. Tente novamente.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Receber link de acesso
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p className="muted">
                  Disponível após configurar o Supabase Free. O aplicativo já
                  salva neste dispositivo e permite exportar backups.
                </p>
              )}
            </details>
          </div>
          <div className="dialog-footer">
            <button
              className="primary"
              onClick={() => {
                const parsed = preferencesSchema.safeParse(tempPrefs);
                if (!parsed.success) {
                  setNotice(
                    "Informe renda e teto positivos. Os pesos precisam somar 100%.",
                  );
                  return;
                }
                if (persist(properties, tempPrefs)) {
                  setSettings(false);
                  setNotice("Preferências salvas.");
                }
              }}
            >
              Salvar preferências
            </button>
          </div>
        </Modal>
      )}
      {aiOpen && (
        <Modal
          title="Importar anúncio com IA"
          description="Use apenas texto público de anúncio. Não inclua informações financeiras privadas."
          onClose={() => setAiOpen(false)}
        >
          <div className="dialog-body">
            <label className="field">
              <span>Link do anúncio para ler e guardar</span>
              <input
                type="url"
                placeholder="https://..."
                value={aiUrl}
                onChange={(e) => setAiUrl(e.target.value)}
              />
            </label>
            <div
              className="attachment-paste"
              tabIndex={0}
              onPaste={(event) => {
                try {
                  const image = imageFromClipboard(event.clipboardData);
                  if (!image) return;
                  event.preventDefault();
                  setAiImage(image);
                  setNotice("Foto pronta para acompanhar este imóvel.");
                } catch (error) {
                  setNotice(
                    error instanceof Error ? error.message : "Imagem inválida.",
                  );
                }
              }}
            >
              Clique aqui e cole uma foto com Ctrl+V. A imagem ficará na ficha
              do imóvel.
            </div>
            {aiImage && (
              <div className="pasted-photo-preview">
                {aiImageUrl && (
                  <img src={aiImageUrl} alt="Foto colada para este imóvel" />
                )}
                <span>Foto pronta</span>
                <button
                  className="text-button"
                  onClick={() => {
                    setAiImage(null);
                    setAiImageUrl("");
                  }}
                >
                  Remover
                </button>
              </div>
            )}
            {!aiPreview && (
              <>
                <p className="hint">
                  Cole o link e a IA tentará ler a página pública. Se o portal
                  bloquear, cole o texto da página abaixo. Ao extrair, você
                  autoriza o envio do texto encontrado ao {aiProvider}.{" "}
                  {aiProvider === "Gemini"
                    ? "No Free Tier, o provedor pode usar os dados para melhorar seus produtos."
                    : "O Groq não retém solicitações de inferência por padrão; consulte os controles de dados da sua conta."}
                  Revise todos os campos antes de salvar. O link também ficará
                  guardado na ficha.
                </p>
                <label className="field">
                  <span>
                    Texto da página do anúncio, se preferir colar (até 50.000
                    caracteres)
                  </span>
                  <textarea
                    maxLength={50000}
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  disabled={busy || (!aiText.trim() && !aiUrl.trim())}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const session = await supabase?.auth.getSession();
                      const response = await fetch("/api/import", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session?.data.session?.access_token ?? ""}`,
                        },
                        body: JSON.stringify({
                          text: aiText,
                          url: aiUrl.trim(),
                          consent: true,
                        }),
                      });
                      const result = await response.json();
                      if (!response.ok) throw Error(result.error);
                      setAiPreview(result.fields);
                    } catch (e) {
                      setNotice(
                        e instanceof Error
                          ? e.message
                          : "Falha na extração. Continue manualmente.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Lendo anúncio..." : "Ler anúncio com IA"}
                </button>
              </>
            )}
            {aiPreview && (
              <>
                <h3>O que encontramos no anúncio</h3>
                <p className="muted">
                  Confira os dados antes de abrir o cadastro. O que não apareceu
                  no anúncio poderá ser preenchido depois.
                </p>
                <button
                  className="text-button"
                  onClick={() => setAiPreview(null)}
                >
                  Colar outro anúncio
                </button>
                {aiGroups.map((group) => {
                  const found = group.fields.filter(([key]) => {
                    const value = aiPreview[key]?.valor;
                    return (
                      value !== null && value !== undefined && value !== ""
                    );
                  });
                  if (!found.length) return null;
                  return (
                    <section key={group.title} className="ai-preview-section">
                      <h4>{group.title}</h4>
                      <div className="form-grid">
                        {found.map(([key, label]) => {
                          const field = aiPreview[key];
                          return (
                            <div key={key}>
                              {key === "highlights" ? (
                                <label className="field">
                                  <span>{label}</span>
                                  <textarea
                                    value={String(field.valor ?? "")}
                                    onChange={(event) =>
                                      setAiPreview({
                                        ...aiPreview,
                                        [key]: {
                                          ...field,
                                          valor: event.target.value,
                                        },
                                      })
                                    }
                                  />
                                </label>
                              ) : (
                                <Field
                                  label={label}
                                  type={
                                    aiNumericKeys.has(key) ? "number" : "text"
                                  }
                                  value={
                                    typeof field.valor === "boolean"
                                      ? field.valor
                                        ? "Sim"
                                        : "Não"
                                      : String(field.valor ?? "")
                                  }
                                  onChange={(value) =>
                                    setAiPreview({
                                      ...aiPreview,
                                      [key]: { ...field, valor: value },
                                    })
                                  }
                                />
                              )}
                              <small className="muted">
                                Fonte: {field.origem}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={async () => {
                    if (aiUrl.trim() && !safeLink(aiUrl.trim())) {
                      setNotice(
                        "Cole um link que comece com https:// ou http://.",
                      );
                      return;
                    }
                    setBusy(true);
                    try {
                      const property = propertyFromAi(aiPreview);
                      property.url = aiUrl.trim();
                      if (aiImage) {
                        const otherBytes = properties.reduce(
                          (total, item) =>
                            total +
                            item.attachments.reduce(
                              (sum, file) => sum + file.size,
                              0,
                            ),
                          0,
                        );
                        if (otherBytes + aiImage.size > MAX_TOTAL_SIZE)
                          throw Error(
                            "O limite de 100 MB de anexos foi atingido.",
                          );
                        const mime = await validateFile(aiImage, aiImage.name);
                        const photo: Attachment = {
                          id: crypto.randomUUID(),
                          name: aiImage.name,
                          size: aiImage.size,
                          mime,
                          category: "Foto",
                          createdAt: new Date().toISOString(),
                        };
                        await putFile(photo.id, aiImage);
                        property.attachments = [photo];
                      }
                      setAiOpen(false);
                      setAiImage(null);
                      setAiImageUrl("");
                      setAiUrl("");
                      open(property, true);
                    } catch (error) {
                      setNotice(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível guardar a foto.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Revisar no cadastro
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

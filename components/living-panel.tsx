"use client";
import { useState } from "react";
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
  type Purchase,
  type Inspiration,
  type Living,
} from "@/lib/living";
import {
  saveLivingPhoto,
  useLiving,
  discardLivingPhotos,
} from "@/lib/living-store";
import { money } from "@/lib/domain";
import type { Attachment } from "@/lib/attachment-types";
type Store = ReturnType<typeof useLiving>;
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
    <div className="living-photos">
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
      <small>
        JPG, PNG ou WebP, até 10 MB por foto. Compactamos antes de guardar.
      </small>
    </div>
  );
}
function Budget({
  items,
  reserve,
  onReserve,
  saving,
}: {
  items: Purchase[];
  reserve: number | null;
  onReserve: (value: number | null) => void;
  saving: boolean;
}) {
  const [reserveDraft, setReserveDraft] = useState<string>(
    String(reserve ?? ""),
  );
  const b = budget(items),
    [start, setStart] = useState(
      new Date().toLocaleDateString("sv-SE").slice(0, 7),
    );
  const flow = purchasesFlow(items, start);
  const cards = [
    ["Para a mudança", b.planned],
    ["Já comprado", b.bought],
    ["Falta comprar", b.remaining],
    ["Planejado para depois", b.future],
    ["Pagamentos à vista", b.upfront],
  ] as const;
  return (
    <details className="living-budget">
      <summary>
        Orçamento das compras · {money(b.planned.known)}
        {b.planned.pending ? ` + ${b.planned.pending} sem preço` : ""}
      </summary>
      <div className="living-totals">
        {cards.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{money(value.known)}</strong>
            {value.pending > 0 && (
              <small>{value.pending} com preço pendente</small>
            )}
          </div>
        ))}
      </div>
      <p className="hint">
        Desejos, itens que já temos e itens marcados “Não comprar” ficam fora
        destes valores. “Depois” é uma previsão separada, não um saldo bancário
        reservado.
      </p>
      <div className="living-reserve">
        <Input
          label="Dinheiro reservado para compras futuras (R$)"
          type="number"
          value={reserveDraft}
          onChange={setReserveDraft}
        />
        <button
          className="secondary"
          disabled={saving}
          onClick={() => onReserve(number(reserveDraft))}
        >
          Salvar reserva
        </button>
        <small>
          Reserva informada: {money(reserve)}. Separada do orçamento imediato.
        </small>
      </div>
      <Input
        label="Compras nos próximos 12 meses a partir de"
        type="month"
        value={start}
        onChange={(v) => {
          if (v) setStart(v);
        }}
      />
      <div className="living-months">
        {flow.months.map((m) => (
          <div key={m.key}>
            <span>
              {m.key.slice(5)}/{m.key.slice(0, 4)}
            </span>
            <strong>{money(m.total)}</strong>
          </div>
        ))}
      </div>
      {flow.pending.length > 0 && (
        <p className="hint">
          Faltam preço ou mês de cobrança para: {flow.pending.join(", ")}. O
          cronograma mostra apenas pagamentos informados.
        </p>
      )}
    </details>
  );
}
export function LivingPanel({
  area,
  store,
}: {
  area: "Mobília" | "Inspirações";
  store: Store;
}) {
  const { data, loading, error, saving, save, reload } = store;
  const [view, setView] = useState<string>("Para a mudança"),
    [group, setGroup] = useState(""),
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
    if (!saving && !photoBusy && confirm("Fechar sem salvar esta edição?")) {
      fn();
      void discardLivingPhotos();
      setMessage("");
    }
  };
  const photoProps = { onBusy: setPhotoBusy, onError: setMessage };
  const visible = data.items.filter(
    (i) =>
      (view === "Todos" || i.priority === view) &&
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
          <span className="eyebrow">NOSSA CASA, DO NOSSO JEITO</span>
          <h1>
            {area === "Mobília"
              ? "O que vai fazer parte do lar"
              : "Ideias para o nosso lar"}
          </h1>
          <p>
            {area === "Mobília"
              ? "Uma lista para escolher com calma e comprar no nosso tempo."
              : "Referências que queremos guardar, por ambiente."}
          </p>
        </div>
        <button
          className="primary"
          disabled={loading || !!error}
          onClick={() => {
            setMessage("");
            if (area === "Mobília")
              setItem({
                ...newPurchase(),
                priority: view === "Desejo" ? "Desejo" : "Para a mudança",
              });
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
      <div className="living-sync">
        <span>
          {saving
            ? "Salvando…"
            : "As alterações são guardadas ao salvar cada ficha."}
        </span>
        <button
          className="text-button"
          disabled={loading || saving}
          onClick={() => void reload()}
        >
          <RefreshCw size={14} /> Atualizar lista
        </button>
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
          <div
            className="living-tabs"
            role="group"
            aria-label="Organização das compras"
          >
            {[...priorities, "Todos"].map((v) => (
              <button
                key={v}
                className={view === v ? "chip selected" : "chip"}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v === "Desejo" ? "Desejos" : v}
              </button>
            ))}
          </div>
          <div className="living-filters">
            <Input label="Buscar item" value={search} onChange={setSearch} />
            <label className="field">
              <span>Grupo</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
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
          {view !== "Desejo" && (
            <Budget
              key={`budget-${data.revision}`}
              items={data.items}
              reserve={data.futureReserve}
              saving={saving}
              onReserve={(futureReserve) =>
                void run({ ...data, futureReserve })
              }
            />
          )}
          {!visible.length ? (
            <div className="collection-empty">
              <Sofa />
              <h3>
                {view === "Desejo"
                  ? "Um lugar para nossos desejos"
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
            <div className="living-grid">
              {visible.map((i) => {
                const option = i.options.find((o) => o.id === i.selected);
                return (
                  <button
                    className="living-card"
                    key={i.id}
                    onClick={() => {
                      setMessage("");
                      setItem(structuredClone(i));
                    }}
                  >
                    <div className="living-cover">
                      <AttachmentCover
                        file={option?.photos[0] || i.photos[0]}
                        name={i.name}
                        fallback={
                          i.priority === "Desejo" ? (
                            <Heart size={32} />
                          ) : (
                            <Sofa size={32} />
                          )
                        }
                      />
                    </div>
                    <div className="living-card-body">
                      <small>
                        {i.room || i.group} {i.purchased ? "· Comprado" : ""}
                      </small>
                      <h3>{i.name}</h3>
                      <strong>
                        {itemTotal(i) === null
                          ? "Preço pendente"
                          : money(itemTotal(i))}
                      </strong>
                      <p>
                        {i.quantity} {i.quantity === 1 ? "unidade" : "unidades"}{" "}
                        · {option ? option.name : "Estimativa manual"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
          description="Guarde as opções e escolha a que entra no planejamento."
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
                () => setItem(null),
              );
            }}
          >
            <div className="dialog-body">
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
                  onChange={(v) => setItem({ ...item, quantity: Number(v) })}
                />
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
                    onChange={(e) => setItem({ ...item, room: e.target.value })}
                  >
                    <option value="">Sem cômodo definido</option>
                    {rooms.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Quando queremos comprar</span>
                  <select
                    value={item.priority}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        priority: e.target.value as Purchase["priority"],
                      })
                    }
                  >
                    {priorities.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Estimativa por unidade (R$)"
                  type="number"
                  value={item.estimate}
                  onChange={(v) => setItem({ ...item, estimate: number(v) })}
                />
              </div>
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
              <Photos
                files={item.photos}
                onChange={(photos) => setItem({ ...item, photos })}
                {...photoProps}
              />
              <h3>Opções de compra</h3>
              <p className="hint">
                Preços por unidade. Só a opção escolhida entra nas contas.
              </p>
              <label className="living-check">
                <input
                  type="radio"
                  name="chosen"
                  checked={!item.selected}
                  onChange={() => setItem({ ...item, selected: null })}
                />{" "}
                Usar estimativa manual
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
                  <fieldset className="living-option" key={o.id}>
                    <legend>Opção {index + 1}</legend>
                    <label className="living-check">
                      <input
                        type="radio"
                        name="chosen"
                        checked={item.selected === o.id}
                        onChange={() => setItem({ ...item, selected: o.id })}
                      />{" "}
                      Escolher esta opção
                    </label>
                    <div className="form-grid">
                      <Input
                        required
                        label={`Modelo da opção ${index + 1}`}
                        value={o.name}
                        onChange={(name) => update({ name })}
                      />
                      <Input
                        label={`Loja da opção ${index + 1}`}
                        value={o.store}
                        onChange={(store) => update({ store })}
                      />
                      <Input
                        label={`Preço da opção ${index + 1} (R$)`}
                        type="number"
                        value={o.price}
                        onChange={(v) => update({ price: number(v) })}
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
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setItem({
                          ...item,
                          selected:
                            item.selected === o.id ? null : item.selected,
                          options: item.options.filter((x) => x.id !== o.id),
                        })
                      }
                    >
                      Remover opção {index + 1}
                    </button>
                  </fieldset>
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
              <label className="field">
                <span>Observações do item</span>
                <textarea
                  value={item.notes}
                  onChange={(e) => setItem({ ...item, notes: e.target.value })}
                />
              </label>
              <details>
                <summary>Pagamento e parcelas (opcional)</summary>
                <div className="form-grid">
                  <label className="field">
                    <span>Forma de pagamento</span>
                    <select
                      value={item.payment}
                      onChange={(e) =>
                        setItem({
                          ...item,
                          payment: e.target.value as Purchase["payment"],
                        })
                      }
                    >
                      <option>À vista</option>
                      <option>Parcelado</option>
                    </select>
                  </label>
                  {item.payment === "Parcelado" && (
                    <Input
                      label="Número de parcelas"
                      type="number"
                      value={item.installments}
                      onChange={(v) =>
                        setItem({ ...item, installments: Number(v) })
                      }
                    />
                  )}
                  <Input
                    label="Primeiro mês de cobrança"
                    type="month"
                    value={item.firstMonth}
                    onChange={(firstMonth) => setItem({ ...item, firstMonth })}
                  />
                </div>
              </details>
              <p>
                Total considerado:{" "}
                <strong>
                  {itemTotal(item) === null
                    ? "Preço pendente"
                    : money(itemTotal(item))}
                </strong>
              </p>
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
              <button className="primary" disabled={saving || photoBusy}>
                {saving ? "Salvando…" : "Salvar item"}
              </button>
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

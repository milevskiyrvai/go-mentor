import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Crumbs } from "@/components/Crumbs";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/Button";
import { Drawer } from "@/components/Drawer";
import {
  listBlocks,
  getBlock,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  reorderMaterials,
  fetchPreview,
  type CreateMaterialBody,
} from "@/api/roadmap";
import type {
  BlockDetailResponse,
  ContentType,
  MaterialKind,
  RoadmapBlock,
  RoadmapMaterial,
} from "@/api/types";

/* ------------------------------------------------------------------ */
/*  Static maps (mirror mockup)                                        */
/* ------------------------------------------------------------------ */

const SECTIONS: { value: MaterialKind; label: string }[] = [
  { value: "theory", label: "Теория" },
  { value: "questions", label: "Вопросы" },
  { value: "practice", label: "Практика" },
  { value: "homework", label: "Домашка" },
];

const SECTION_LABEL: Record<MaterialKind, string> = {
  theory: "Теория",
  questions: "Вопросы",
  practice: "Практика",
  homework: "Домашка",
};

interface CTypeMeta {
  thumb: string;
  tag: string;
  ic: string;
  field: "url" | "text" | "file";
  nm: string;
}

const CTYPE: Record<ContentType, CTypeMeta> = {
  url: { thumb: "url", tag: "↗ URL", ic: "↗ URL", field: "url", nm: "Ссылка" },
  youtube: { thumb: "yt", tag: "▶ YOUTUBE", ic: "▶ YouTube", field: "url", nm: "Видео" },
  github: { thumb: "gh", tag: "◍ GITHUB", ic: "◍ GitHub", field: "url", nm: "Репозиторий" },
  article: { thumb: "art", tag: "¶ СТАТЬЯ", ic: "¶ Статья", field: "url", nm: "Веб-статья" },
  text: { thumb: "txt", tag: "¶ ТЕКСТ", ic: "¶ Текст", field: "text", nm: "Свой текст" },
  file: { thumb: "file", tag: "▤ ФАЙЛ", ic: "▤ Файл", field: "file", nm: "Загрузка" },
};

const CTYPE_ORDER: ContentType[] = ["url", "youtube", "github", "article", "text", "file"];

const Grip = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" />
  </svg>
);
const Pencil = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M4 20h4L18 10l-4-4L4 16v4Z" strokeLinejoin="round" /><path d="M14 6l4 4" />
  </svg>
);
const Trash = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = ({ s = 15 }: { s?: number }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={2.1}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function RoadmapPage() {
  const qc = useQueryClient();
  const blocksQ = useQuery({
    queryKey: ["admin", "roadmap", "blocks"],
    queryFn: () => listBlocks(true),
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockDrawer, setBlockDrawer] = useState<"create" | RoadmapBlock | null>(null);
  const [matDrawer, setMatDrawer] = useState<
    | { mode: "create"; section: MaterialKind }
    | { mode: "edit"; material: RoadmapMaterial }
    | null
  >(null);

  // default-select first block
  useEffect(() => {
    if (!selectedBlockId && blocksQ.data && blocksQ.data.length > 0) {
      setSelectedBlockId(blocksQ.data[0].id);
    }
  }, [blocksQ.data, selectedBlockId]);

  const detailQ = useQuery({
    queryKey: ["admin", "roadmap", "block", selectedBlockId],
    queryFn: () => getBlock(selectedBlockId!, true),
    enabled: !!selectedBlockId,
  });

  const reorderBlocksMut = useMutation({
    mutationFn: (ids: string[]) => reorderBlocks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roadmap", "blocks"] }),
  });

  const reorderMaterialsMut = useMutation({
    mutationFn: ({ blockId, ids }: { blockId: string; ids: string[] }) =>
      reorderMaterials(blockId, ids),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] }),
  });

  const deleteBlockMut = useMutation({
    mutationFn: (id: string) => deleteBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "roadmap"] });
      setSelectedBlockId(null);
    },
  });

  const deleteMaterialMut = useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const blocks = blocksQ.data ?? [];
  const detail = detailQ.data;

  /* group materials by section, preserving sort order inside each group */
  const grouped = useMemo(() => {
    const map: Record<MaterialKind, RoadmapMaterial[]> = {
      theory: [],
      questions: [],
      practice: [],
      homework: [],
    };
    (detail?.materials ?? []).forEach((m) => {
      // Guard against an unexpected `type` from the backend so the editor
      // never crashes on detail render / refetch (null-bug class).
      const bucket = map[m.type];
      if (bucket) bucket.push(m);
    });
    return map;
  }, [detail]);

  /* ---- block dnd ---- */
  const onBlocksDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const ids = blocks.map((b) => b.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(ids, from, to);
    qc.setQueryData<RoadmapBlock[]>(["admin", "roadmap", "blocks"], (prev) =>
      prev
        ? next
            .map((id) => prev.find((b) => b.id === id)!)
            .filter(Boolean)
            .map((b, idx) => ({ ...b, sort_order: idx }))
        : prev
    );
    reorderBlocksMut.mutate(next);
  };

  /* ---- material dnd (within a section group) ---- */
  const onMaterialsDragEnd = (section: MaterialKind) => (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id || !detail) return;
    const sectionIds = grouped[section].map((m) => m.id);
    const from = sectionIds.indexOf(String(e.active.id));
    const to = sectionIds.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(sectionIds, from, to);

    // rebuild the full flat order: replace this section's slice in place
    const reorderedSet = new Set(reordered);
    let cursor = 0;
    const fullOrder = detail.materials.map((m) =>
      m.type === section && reorderedSet.has(m.id) ? reordered[cursor++] : m.id
    );

    qc.setQueryData<BlockDetailResponse>(
      ["admin", "roadmap", "block", selectedBlockId],
      (prev) =>
        prev
          ? {
              ...prev,
              materials: fullOrder
                .map((id) => prev.materials.find((m) => m.id === id)!)
                .filter(Boolean),
            }
          : prev
    );
    reorderMaterialsMut.mutate({ blockId: selectedBlockId!, ids: fullOrder });
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <>
      <Crumbs
        segments={[
          { label: "GO_MENTOR", to: "/admin/dashboard" },
          { label: "ADMIN", to: "/admin/dashboard" },
        ]}
        liveSegment="ROADMAP"
      />
      <PageHead
        eyebrow="ADMIN · ROADMAP"
        title="Roadmap-менеджер"
        description={
          <>
            {blocksQ.isLoading ? (
              "Загрузка программы…"
            ) : (
              <>
                <b>{blocks.length}</b>{" "}
                {plural(blocks.length, "блок", "блока", "блоков")} ·{" "}
                <b>{blocks.filter((b) => b.is_active).length}</b> активных
              </>
            )}
          </>
        }
        right={
          <Button variant="warn" arrow onClick={() => setBlockDrawer("create")}>
            + Блок
          </Button>
        }
      />

      {blocksQ.isError && (
        <div className="card-base p-5 mt-4" style={{ color: "var(--danger)" }}>
          Не удалось загрузить блоки. Обнови страницу.
        </div>
      )}

      <div className="cols c-roadmap mt-5 items-start">
        {/* ----------- LEFT: blocks rail ----------- */}
        <div className="flex flex-col gap-2.5">
          {blocksQ.isLoading &&
            [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="block"
                style={{ height: 74, opacity: 0.45 }}
              />
            ))}

          {!blocksQ.isLoading && blocks.length === 0 && (
            <div className="block" style={{ cursor: "default", alignItems: "center", gap: 8 }}>
              <div className="text-[13px]" style={{ color: "var(--ink-2)" }}>
                Блоков пока нет.
              </div>
              <Button size="sm" variant="warn" onClick={() => setBlockDrawer("create")}>
                Создать первый блок
              </Button>
            </div>
          )}

          {!blocksQ.isLoading && blocks.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onBlocksDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((b, idx) => (
                  <BlockRailCard
                    key={b.id}
                    block={b}
                    index={idx}
                    selected={selectedBlockId === b.id}
                    count={selectedBlockId === b.id ? detail?.materials.length : undefined}
                    onSelect={() => setSelectedBlockId(b.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* ----------- RIGHT: block editor ----------- */}
        <div className="card-base" style={{ padding: 18 }}>
          {!selectedBlockId && (
            <div
              className="text-center py-16 text-[13px]"
              style={{ color: "var(--ink-3)" }}
            >
              Выбери блок слева, чтобы управлять материалами.
            </div>
          )}

          {selectedBlockId && detailQ.isLoading && (
            <div className="text-[13px] py-10 text-center" style={{ color: "var(--ink-3)" }}>
              Загрузка материалов…
            </div>
          )}

          {selectedBlockId && detailQ.isError && (
            <div className="text-[13px] py-10 text-center" style={{ color: "var(--danger)" }}>
              Ошибка загрузки блока.
            </div>
          )}

          {selectedBlockId && detail && (
            <>
              {/* head */}
              <div
                className="flex items-center gap-2 pb-3 mb-1"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="blk-admin block-title" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={detail.block.title}
                    readOnly
                    aria-label="название блока"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => selectedBlock && setBlockDrawer(selectedBlock)}
                >
                  Редактировать блок
                </Button>
                <Button
                  size="sm"
                  variant="danger-ghost"
                  onClick={() => {
                    if (
                      selectedBlock &&
                      confirm(`Удалить блок «${selectedBlock.title}»? (soft-delete)`)
                    ) {
                      deleteBlockMut.mutate(selectedBlock.id);
                    }
                  }}
                >
                  Удалить блок
                </Button>
              </div>

              {(detail.materials ?? []).length === 0 && (
                <div
                  className="text-center text-[13px] py-6"
                  style={{ color: "var(--ink-3)" }}
                >
                  В блоке ещё нет материалов — добавь первый в любую секцию ниже.
                </div>
              )}

              {/* sections */}
              {SECTIONS.map(({ value: section, label }) => (
                <div key={section} style={{ marginTop: 14 }}>
                  <div className="matgrp-head">
                    <span className="gt">{label}</span>
                    <span className="ln" />
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onMaterialsDragEnd(section)}
                  >
                    <SortableContext
                      items={grouped[section].map((m) => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="matlist">
                        {grouped[section].map((m) => (
                          <MaterialRow
                            key={m.id}
                            material={m}
                            onEdit={() => setMatDrawer({ mode: "edit", material: m })}
                            onDelete={() => {
                              if (confirm(`Удалить материал «${m.title}»? (soft-delete)`)) {
                                deleteMaterialMut.mutate(m.id);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button
                    type="button"
                    className="add-row"
                    onClick={() => setMatDrawer({ mode: "create", section })}
                  >
                    <Plus />
                    Добавить материал в «{label}»
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* drawers */}
      {blockDrawer && (
        <BlockDrawer
          mode={blockDrawer === "create" ? "create" : "edit"}
          block={blockDrawer === "create" ? undefined : blockDrawer}
          onClose={() => setBlockDrawer(null)}
          onSaved={(b) => {
            setBlockDrawer(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap"] });
            if (b) setSelectedBlockId(b.id);
          }}
          onDeleted={() => {
            setBlockDrawer(null);
            setSelectedBlockId(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap"] });
          }}
        />
      )}

      {matDrawer && selectedBlockId && (
        <MaterialDrawer
          key={matDrawer.mode === "edit" ? matDrawer.material.id : `new-${matDrawer.section}`}
          mode={matDrawer.mode}
          blockId={selectedBlockId}
          material={matDrawer.mode === "edit" ? matDrawer.material : undefined}
          defaultSection={matDrawer.mode === "create" ? matDrawer.section : undefined}
          onClose={() => setMatDrawer(null)}
          onSaved={() => {
            setMatDrawer(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] });
          }}
          onDeleted={() => {
            setMatDrawer(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] });
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Block rail card (sortable)                                         */
/* ------------------------------------------------------------------ */

function BlockRailCard({
  block,
  index,
  selected,
  count,
  onSelect,
}: {
  block: RoadmapBlock;
  index: number;
  selected: boolean;
  count?: number;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "pointer",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("block blk-admin", selected && "sel", isDragging && "dragging")}
      data-s={selected ? "in_progress" : undefined}
      onClick={onSelect}
    >
      <div className="block-head">
        <span
          className="handle"
          style={{ alignSelf: "center", touchAction: "none" }}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="перетащить блок"
        >
          <Grip />
        </span>
        <div className="block-num">{String(index + 1).padStart(2, "0")}</div>
        <div className="block-title">
          <h4>{block.title}</h4>
          <small>
            {count !== undefined ? `${count} ${plural(count, "материал", "материала", "материалов")}` : block.description || "—"}
            {!block.is_active && " · черновик"}
          </small>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Material row (sortable)                                            */
/* ------------------------------------------------------------------ */

function MaterialRow({
  material,
  onEdit,
  onDelete,
}: {
  material: RoadmapMaterial;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: material.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const ct = CTYPE[material.content_type] ?? CTYPE.url;
  const source = material.source || material.url || ct.nm;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("mat adm", !material.is_active && "inactive", isDragging && "dragging")}
    >
      <span
        className="handle"
        style={{ touchAction: "none" }}
        {...attributes}
        {...listeners}
        aria-label="перетащить материал"
      >
        <Grip />
      </span>
      <div className={clsx("mat-thumb", ct.thumb)}>
        <span className="tg">{ct.tag}</span>
      </div>
      <div className="mat-body">
        <div className="mat-meta">
          <span className={clsx("tag-mini", material.is_required ? "req" : "opt")}>
            {material.is_required ? "Обязательно" : "Опционально"}
          </span>
          <span>
            {source}
            {!material.is_active && " · выкл"}
          </span>
        </div>
        <div className="mat-title">{material.title}</div>
      </div>
      <div className="mrow-acts">
        <button className="iconbtn" type="button" aria-label="изменить" onClick={onEdit}>
          <Pencil />
        </button>
        <button
          className="iconbtn danger"
          type="button"
          aria-label="удалить"
          onClick={onDelete}
        >
          <Trash />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block drawer (create / edit)                                       */
/* ------------------------------------------------------------------ */

function BlockDrawer({
  mode,
  block,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  block?: RoadmapBlock;
  onClose: () => void;
  onSaved: (b?: RoadmapBlock) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(block?.title ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const [status, setStatus] = useState<"active" | "draft">(
    block && !block.is_active ? "draft" : "active"
  );

  const saveMut = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createBlock({ title: title.trim(), description: description.trim() || undefined })
        : updateBlock(block!.id, {
            title: title.trim(),
            description: description.trim() || undefined,
            is_active: status === "active",
          }),
    onSuccess: (b) => onSaved(b),
  });

  const delMut = useMutation({
    mutationFn: () => deleteBlock(block!.id),
    onSuccess: () => onDeleted(),
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "create" ? "Новый блок" : "Редактирование блока"}
      footer={
        <>
          {mode === "edit" && (
            <button
              type="button"
              className="del"
              onClick={() => {
                if (confirm(`Удалить блок «${block!.title}»? (soft-delete)`)) delMut.mutate();
              }}
            >
              Удалить блок
            </button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="warn"
            onClick={() => saveMut.mutate()}
            disabled={!title.trim() || saveMut.isPending}
          >
            {saveMut.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </>
      }
    >
      <div className="field">
        <label>Название блока</label>
        <input
          className="input"
          type="text"
          placeholder="например, Concurrency"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Описание</label>
        <textarea
          className="textarea"
          rows={3}
          placeholder="О чём блок и какие навыки даёт"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Статус</label>
        <div className="select" style={{ display: "block" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "draft")}>
            <option value="active">Активен</option>
            <option value="draft">Черновик</option>
          </select>
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/*  Material drawer (create / edit) — ALL fields per §6.6 / §20        */
/* ------------------------------------------------------------------ */

function MaterialDrawer({
  mode,
  blockId,
  material,
  defaultSection,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  blockId: string;
  material?: RoadmapMaterial;
  defaultSection?: MaterialKind;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [section, setSection] = useState<MaterialKind>(
    material?.type ?? defaultSection ?? "theory"
  );
  const [contentType, setContentType] = useState<ContentType>(material?.content_type ?? "url");
  const [url, setUrl] = useState(material?.url ?? "");
  const [content, setContent] = useState(material?.content ?? "");
  const [source, setSource] = useState(material?.source ?? "");
  const [previewTitle, setPreviewTitle] = useState(material?.preview_title ?? "");
  const [previewDescription, setPreviewDescription] = useState(
    material?.preview_description ?? ""
  );
  const [previewImage, setPreviewImage] = useState(material?.preview_image ?? "");
  const [isRequired, setIsRequired] = useState(material?.is_required ?? true);
  const [isActive, setIsActive] = useState(material?.is_active ?? true);
  const [fetching, setFetching] = useState(false);

  const ct = CTYPE[contentType];

  const handleFetchPreview = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const p = await fetchPreview(url.trim());
      if (p.title) setPreviewTitle(p.title);
      if (p.description) setPreviewDescription(p.description);
      if (p.image) setPreviewImage(p.image);
      if (p.source) setSource(p.source);
    } catch {
      /* ignore */
    } finally {
      setFetching(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const body: CreateMaterialBody = {
        block_id: blockId,
        title: title.trim(),
        description: description.trim() || undefined,
        type: section,
        content_type: contentType,
        url: ct.field !== "text" ? url.trim() || undefined : undefined,
        content: ct.field === "text" ? content : undefined,
        preview_title: previewTitle.trim() || undefined,
        preview_description: previewDescription.trim() || undefined,
        preview_image: previewImage.trim() || undefined,
        source: source.trim() || undefined,
        is_required: isRequired,
      };
      return mode === "create"
        ? createMaterial(body)
        : updateMaterial(material!.id, {
            title: body.title,
            description: body.description,
            type: body.type,
            content_type: body.content_type,
            url: body.url,
            content: body.content,
            preview_title: body.preview_title,
            preview_description: body.preview_description,
            preview_image: body.preview_image,
            source: body.source,
            is_required: body.is_required,
            is_active: isActive,
          });
    },
    onSuccess: onSaved,
  });

  const delMut = useMutation({
    mutationFn: () => deleteMaterial(material!.id),
    onSuccess: onDeleted,
  });

  const pvTitle = previewTitle || title || "Заголовок материала";
  const pvSrc = source || "источник";
  const pvDesc = previewDescription || description || "Описание превью";

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={mode === "create" ? "Новый материал" : "Редактирование материала"}
      footer={
        <>
          {mode === "edit" && (
            <button
              type="button"
              className="del"
              onClick={() => {
                if (confirm(`Удалить материал «${material!.title}»? (soft-delete)`)) {
                  delMut.mutate();
                }
              }}
            >
              Удалить материал
            </button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="warn"
            onClick={() => saveMut.mutate()}
            disabled={!title.trim() || saveMut.isPending}
          >
            {saveMut.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </>
      }
    >
      {/* basics */}
      <div className="field">
        <label>Заголовок</label>
        <input
          className="input"
          type="text"
          placeholder="например, Горутины и каналы"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Описание</label>
        <textarea
          className="textarea"
          rows={2}
          placeholder="Короткое описание для студента"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Тип секции</label>
        <div className="select" style={{ display: "block" }}>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as MaterialKind)}
          >
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="divider" />
      <div className="divider-lbl">Контент</div>

      <div className="field">
        <label>Тип контента</label>
        <div className="ctype">
          {CTYPE_ORDER.map((value) => {
            const meta = CTYPE[value];
            return (
              <label key={value}>
                <input
                  type="radio"
                  name="md-ct"
                  value={value}
                  checked={contentType === value}
                  onChange={() => setContentType(value)}
                />
                <span className="ic">{meta.ic}</span>
                <span className="nm">{meta.nm}</span>
              </label>
            );
          })}
        </div>
      </div>

      {ct.field === "url" && (
        <div className="field">
          <label className="flex items-center justify-between">
            <span>URL</span>
            <button
              type="button"
              onClick={handleFetchPreview}
              disabled={!url.trim() || fetching}
              style={{
                background: "var(--primary-soft)",
                color: "var(--primary-ink)",
                border: 0,
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                cursor: url.trim() ? "pointer" : "not-allowed",
                textTransform: "none",
              }}
            >
              {fetching ? "…" : "получить превью"}
            </button>
          </label>
          <input
            className="input"
            type="text"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      )}

      {ct.field === "text" && (
        <div className="field">
          <label>Текст материала</label>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Markdown / обычный текст"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      )}

      {ct.field === "file" && (
        <div className="field">
          <label>Файл (URL)</label>
          <input
            className="input"
            type="text"
            placeholder="ссылка на загруженный файл · pdf, zip, до 25 MB"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="imgslot" style={{ marginTop: 8 }}>
            <span className="t">перетащите файл сюда · pdf, zip, до 25 MB</span>
          </div>
        </div>
      )}

      <div className="field">
        <label>Источник</label>
        <input
          className="input"
          type="text"
          placeholder="например, youtube.com · 28 мин"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <div className="divider" />
      <div className="divider-lbl">Превью</div>

      <div className="row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Заголовок превью</label>
          <input
            className="input"
            type="text"
            placeholder="как в карточке"
            value={previewTitle}
            onChange={(e) => setPreviewTitle(e.target.value)}
          />
        </div>
        {ct.field !== "text" && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Картинка (URL)</label>
            <input
              className="input"
              type="text"
              placeholder="https:// · 16:10"
              value={previewImage}
              onChange={(e) => setPreviewImage(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="field" style={{ marginTop: 13 }}>
        <label>Описание превью</label>
        <input
          className="input"
          type="text"
          placeholder="одна строка под заголовком"
          value={previewDescription}
          onChange={(e) => setPreviewDescription(e.target.value)}
        />
      </div>

      {/* live preview */}
      <div className="preview-wrap" style={{ marginBottom: 6 }}>
        <div className="pv-cap">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--primary)",
              display: "inline-block",
            }}
          />
          Как увидит студент
        </div>
        <div className="mat" style={{ gridTemplateColumns: "96px 1fr" }}>
          <div className={clsx("mat-thumb", ct.thumb)}>
            <span className="tg">{ct.tag}</span>
          </div>
          <div className="mat-body">
            <div className="mat-meta">
              <span className={clsx("tag-mini", isRequired ? "req" : "opt")}>
                {isRequired ? "Обязательно" : "Опционально"}
              </span>
              <span>{pvSrc}</span>
            </div>
            <div className="mat-title">{pvTitle}</div>
            <div className="mat-desc">{pvDesc}</div>
          </div>
        </div>
      </div>

      <div className="divider" />
      <div className="divider-lbl">Настройки</div>

      <div className="setrow">
        <div>
          <div className="lbl">Обязательный материал</div>
          <div className="sub">Влияет на закрытие блока (§6.9). Выкл = опциональный.</div>
        </div>
        <button
          type="button"
          className={clsx("switch", isRequired && "on")}
          aria-pressed={isRequired}
          onClick={() => setIsRequired((v) => !v)}
        >
          <span className="track" />
        </button>
      </div>
      <div className="setrow">
        <div>
          <div className="lbl">Активен</div>
          <div className="sub">Выключенный материал скрыт у студентов, но виден админу.</div>
        </div>
        <button
          type="button"
          className={clsx("switch", isActive && "on")}
          aria-pressed={isActive}
          onClick={() => setIsActive((v) => !v)}
        >
          <span className="track" />
        </button>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/*  utils                                                              */
/* ------------------------------------------------------------------ */

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

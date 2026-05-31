import { useEffect, useState } from "react";
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
import { TextField } from "@/components/TextField";
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
  ContentType,
  MaterialKind,
  RoadmapBlock,
  RoadmapMaterial,
} from "@/api/types";

const KIND_LABEL: Record<MaterialKind, string> = {
  theory: "Теория",
  questions: "Вопросы",
  practice: "Практика",
  homework: "Домашка",
};

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "url", label: "URL" },
  { value: "youtube", label: "YouTube" },
  { value: "github", label: "GitHub" },
  { value: "article", label: "Статья" },
  { value: "text", label: "Текст" },
  { value: "file", label: "Файл" },
];

export function RoadmapPage() {
  const qc = useQueryClient();
  const blocksQ = useQuery({ queryKey: ["admin", "roadmap", "blocks"], queryFn: () => listBlocks(true) });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<RoadmapBlock | null>(null);
  const [createMaterialOpen, setCreateMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RoadmapMaterial | null>(null);

  // Default-select first block once loaded
  useEffect(() => {
    if (!selectedBlockId && blocksQ.data && blocksQ.data.length > 0) {
      setSelectedBlockId(blocksQ.data[0].id);
    }
  }, [blocksQ.data, selectedBlockId]);

  const blockDetailQ = useQuery({
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

  const toggleBlockActiveMut = useMutation({
    mutationFn: (b: RoadmapBlock) => updateBlock(b.id, { is_active: !b.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roadmap"] }),
  });

  const toggleMaterialActiveMut = useMutation({
    mutationFn: (m: RoadmapMaterial) => updateMaterial(m.id, { is_active: !m.is_active }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onBlocksDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const ids = (blocksQ.data ?? []).map((b) => b.id);
    const fromIdx = ids.indexOf(String(e.active.id));
    const toIdx = ids.indexOf(String(e.over.id));
    if (fromIdx < 0 || toIdx < 0) return;
    const newOrder = arrayMove(ids, fromIdx, toIdx);
    // optimistic
    qc.setQueryData<RoadmapBlock[]>(["admin", "roadmap", "blocks"], (prev) =>
      prev
        ? newOrder
            .map((id) => prev.find((b) => b.id === id)!)
            .filter(Boolean)
            .map((b, idx) => ({ ...b, sort_order: idx }))
        : prev
    );
    reorderBlocksMut.mutate(newOrder);
  };

  const onMaterialsDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id || !blockDetailQ.data) return;
    const ids = blockDetailQ.data.materials.map((m) => m.id);
    const fromIdx = ids.indexOf(String(e.active.id));
    const toIdx = ids.indexOf(String(e.over.id));
    if (fromIdx < 0 || toIdx < 0) return;
    const newOrder = arrayMove(ids, fromIdx, toIdx);
    qc.setQueryData(["admin", "roadmap", "block", selectedBlockId], (prev: any) =>
      prev
        ? {
            ...prev,
            materials: newOrder.map((id) => prev.materials.find((m: RoadmapMaterial) => m.id === id)!).filter(Boolean),
          }
        : prev
    );
    reorderMaterialsMut.mutate({ blockId: selectedBlockId!, ids: newOrder });
  };

  return (
    <>
      <Crumbs segments={[{ label: "GO_MENTOR", to: "/admin/dashboard" }, { label: "ADMIN", to: "/admin/dashboard" }]} liveSegment="ROADMAP" />
      <PageHead
        eyebrow="ADMIN · ROADMAP"
        title="Roadmap"
        right={
          <Button variant="warn" arrow onClick={() => setCreateBlockOpen(true)}>
            + Новый блок
          </Button>
        }
      />

      <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        {/* Blocks column */}
        <section
          className="card-base p-4 flex flex-col gap-3"
          style={{ background: "var(--surface)" }}
        >
          <div className="caption">Блоки · {blocksQ.data?.length ?? 0}</div>
          {blocksQ.isLoading && (
            <div className="text-text-3 text-[12px] py-4">Загрузка...</div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBlocksDragEnd}>
            <SortableContext
              items={(blocksQ.data ?? []).map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {(blocksQ.data ?? []).map((b, idx) => (
                  <SortableBlockCard
                    key={b.id}
                    block={b}
                    index={idx}
                    selected={selectedBlockId === b.id}
                    onSelect={() => setSelectedBlockId(b.id)}
                    onEdit={() => setEditingBlock(b)}
                    onToggleActive={() => toggleBlockActiveMut.mutate(b)}
                    onDelete={() => {
                      if (confirm(`Удалить блок «${b.title}»? (soft-delete)`)) {
                        deleteBlockMut.mutate(b.id);
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* Materials column */}
        <section
          className="card-base p-5 flex flex-col gap-4"
          style={{ background: "var(--surface)" }}
        >
          {!selectedBlockId && (
            <div className="text-center text-text-3 py-12 caption">
              Выбери блок слева, чтобы управлять материалами
            </div>
          )}
          {selectedBlockId && blockDetailQ.isLoading && (
            <div className="text-text-3 text-[12px]">Загрузка...</div>
          )}
          {selectedBlockId && blockDetailQ.data && (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="caption mb-1">МАТЕРИАЛЫ БЛОКА</div>
                  <h2 className="m-0 text-[22px] font-semibold tracking-tight">
                    {blockDetailQ.data.block.title}
                  </h2>
                  {blockDetailQ.data.block.description && (
                    <p className="m-0 mt-2 text-text-2 text-[13px] leading-relaxed max-w-[60ch]">
                      {blockDetailQ.data.block.description}
                    </p>
                  )}
                </div>
                <Button variant="warn" arrow onClick={() => setCreateMaterialOpen(true)}>
                  + Материал
                </Button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onMaterialsDragEnd}
              >
                <SortableContext
                  items={blockDetailQ.data.materials.map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {blockDetailQ.data.materials.length === 0 && (
                      <div className="text-center text-text-3 py-8 caption">
                        Материалов пока нет
                      </div>
                    )}
                    {blockDetailQ.data.materials.map((m) => (
                      <SortableMaterialCard
                        key={m.id}
                        material={m}
                        onEdit={() => setEditingMaterial(m)}
                        onToggleActive={() => toggleMaterialActiveMut.mutate(m)}
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
            </>
          )}
        </section>
      </div>

      {createBlockOpen && (
        <BlockDrawer
          mode="create"
          onClose={() => setCreateBlockOpen(false)}
          onSaved={(b) => {
            setCreateBlockOpen(false);
            setSelectedBlockId(b.id);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap"] });
          }}
        />
      )}
      {editingBlock && (
        <BlockDrawer
          mode="edit"
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSaved={() => {
            setEditingBlock(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap"] });
          }}
        />
      )}
      {createMaterialOpen && selectedBlockId && (
        <MaterialDrawer
          mode="create"
          blockId={selectedBlockId}
          onClose={() => setCreateMaterialOpen(false)}
          onSaved={() => {
            setCreateMaterialOpen(false);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] });
          }}
        />
      )}
      {editingMaterial && (
        <MaterialDrawer
          mode="edit"
          blockId={editingMaterial.block_id}
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSaved={() => {
            setEditingMaterial(null);
            qc.invalidateQueries({ queryKey: ["admin", "roadmap", "block", selectedBlockId] });
          }}
        />
      )}
    </>
  );
}

function SortableBlockCard({
  block,
  index,
  selected,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  block: RoadmapBlock;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-md p-3 cursor-pointer transition-colors",
        selected ? "" : "hover:border-border-bright"
      )}
      onClick={onSelect}
      // selected styling via inline style
    >
      <div
        className="flex items-center gap-3 p-3 rounded-md"
        style={
          selected
            ? {
                background: "rgba(169,132,47,0.08)",
                border: "1px solid rgba(169,132,47,0.4)",
                boxShadow: "0 0 14px -8px var(--warning)",
              }
            : {
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }
        }
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing select-none px-1 text-text-3 hover:text-text-2"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag handle"
        >
          ⋮⋮
        </button>
        <span
          className="font-mono font-bold text-[10px] uppercase tracking-wider"
          style={{ color: selected ? "var(--warning)" : "var(--text-3)" }}
        >
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{block.title}</div>
          {block.description && (
            <div className="text-[11.5px] text-text-3 truncate mt-0.5">{block.description}</div>
          )}
        </div>
        {!block.is_active && (
          <span
            className="font-mono uppercase px-1.5 py-0.5 rounded"
            style={{
              fontSize: "9.5px",
              color: "var(--danger)",
              border: "1px solid rgba(175,88,64,0.3)",
              background: "rgba(175,88,64,0.08)",
            }}
          >
            off
          </span>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1 px-3 mt-1.5">
        <SmallAction onClick={(e) => { e.stopPropagation(); onEdit(); }}>ред.</SmallAction>
        <SmallAction onClick={(e) => { e.stopPropagation(); onToggleActive(); }}>
          {block.is_active ? "скрыть" : "включить"}
        </SmallAction>
        <SmallAction danger onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          удал.
        </SmallAction>
      </div>
    </div>
  );
}

function SortableMaterialCard({
  material,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  material: RoadmapMaterial;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: material.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md p-3 flex items-center gap-3"
      // background depends on active state
    >
      <div
        className="flex items-center gap-3 p-3 rounded-md w-full"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing select-none px-1 text-text-3 hover:text-text-2"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
          aria-label="Drag handle"
        >
          ⋮⋮
        </button>
        <span
          className="font-mono px-2 py-1 rounded uppercase font-bold"
          style={{
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {KIND_LABEL[material.type]}
        </span>
        <span
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: "10px", color: "var(--text-3)" }}
        >
          {material.content_type}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{material.title}</div>
          {material.url && (
            <div className="text-[11px] font-mono text-text-3 truncate mt-0.5">
              {material.url}
            </div>
          )}
        </div>
        {material.is_required ? (
          <span
            className="font-mono uppercase px-2 py-1 rounded"
            style={{
              fontSize: "9.5px",
              color: "var(--warning)",
              border: "1px solid rgba(169,132,47,0.4)",
              background: "rgba(169,132,47,0.08)",
            }}
          >
            обязательный
          </span>
        ) : (
          <span
            className="font-mono uppercase px-2 py-1 rounded"
            style={{
              fontSize: "9.5px",
              color: "var(--text-3)",
              border: "1px solid var(--border)",
            }}
          >
            опционально
          </span>
        )}
        {!material.is_active && (
          <span
            className="font-mono uppercase px-1.5 py-0.5 rounded"
            style={{
              fontSize: "9.5px",
              color: "var(--danger)",
              border: "1px solid rgba(175,88,64,0.3)",
              background: "rgba(175,88,64,0.08)",
            }}
          >
            скрыт
          </span>
        )}
        <div className="flex items-center gap-1">
          <SmallAction onClick={onEdit}>ред.</SmallAction>
          <SmallAction onClick={onToggleActive}>
            {material.is_active ? "скрыть" : "включить"}
          </SmallAction>
          <SmallAction danger onClick={onDelete}>
            удал.
          </SmallAction>
        </div>
      </div>
    </div>
  );
}

function SmallAction({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-6 px-2 rounded font-mono cursor-pointer transition-colors"
      style={{
        fontSize: "10.5px",
        letterSpacing: "0.06em",
        color: danger ? "var(--danger)" : "var(--text-2)",
        border: "1px solid var(--border)",
        background: "transparent",
      }}
    >
      {children}
    </button>
  );
}

/* =========== BLOCK DRAWER =========== */

function BlockDrawer({
  mode,
  block,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  block?: RoadmapBlock;
  onClose: () => void;
  onSaved: (b: RoadmapBlock) => void;
}) {
  const [title, setTitle] = useState(block?.title ?? "");
  const [description, setDescription] = useState(block?.description ?? "");

  const mut = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createBlock({ title: title.trim(), description: description.trim() })
        : updateBlock(block!.id, { title: title.trim(), description: description.trim() }),
    onSuccess: onSaved,
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "create" ? "Новый блок" : "Редактирование блока"}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => mut.mutate()}
            disabled={!title || mut.isPending}
          >
            {mut.isPending ? "Сохранение..." : mode === "create" ? "Создать" : "Сохранить"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Блок 1 · Основы Go"
        />
        <div className="flex flex-col">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-2"
            style={{ fontSize: "10px", color: "var(--text-2)" }}
          >
            Описание
          </div>
          <textarea
            className="input-base"
            style={{
              minHeight: "120px",
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--sans)",
              fontSize: "13.5px",
            }}
            placeholder="Что в этом блоке"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Drawer>
  );
}

/* =========== MATERIAL DRAWER =========== */

function MaterialDrawer({
  mode,
  blockId,
  material,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  blockId: string;
  material?: RoadmapMaterial;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [type, setType] = useState<MaterialKind>(material?.type ?? "theory");
  const [contentType, setContentType] = useState<ContentType>(material?.content_type ?? "url");
  const [url, setUrl] = useState(material?.url ?? "");
  const [content, setContent] = useState(material?.content ?? "");
  const [previewTitle, setPreviewTitle] = useState(material?.preview_title ?? "");
  const [previewDescription, setPreviewDescription] = useState(material?.preview_description ?? "");
  const [previewImage, setPreviewImage] = useState(material?.preview_image ?? "");
  const [source, setSource] = useState(material?.source ?? "");
  const [isRequired, setIsRequired] = useState(material?.is_required ?? true);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const isText = contentType === "text";

  const handleFetchPreview = async () => {
    if (!url) return;
    setFetchingPreview(true);
    try {
      const p = await fetchPreview(url);
      if (p.title) setPreviewTitle(p.title);
      if (p.description) setPreviewDescription(p.description);
      if (p.image) setPreviewImage(p.image);
      if (p.source) setSource(p.source);
    } catch {
      /* ignore */
    } finally {
      setFetchingPreview(false);
    }
  };

  const mut = useMutation({
    mutationFn: () => {
      const body: CreateMaterialBody = {
        block_id: blockId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        content_type: contentType,
        url: !isText ? url.trim() || undefined : undefined,
        content: isText ? content : undefined,
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
          });
    },
    onSuccess: onSaved,
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === "create" ? "Новый материал" : "Редактирование материала"}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="warn"
            className="flex-1"
            onClick={() => mut.mutate()}
            disabled={!title || mut.isPending}
          >
            {mut.isPending ? "Сохранение..." : mode === "create" ? "Создать" : "Сохранить"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Заголовок"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <div className="caption mb-2">Тип</div>
            <select
              className="input-base"
              value={type}
              onChange={(e) => setType(e.target.value as MaterialKind)}
            >
              {Object.entries(KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <div className="caption mb-2">Тип контента</div>
            <select
              className="input-base"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isText && (
          <div className="flex flex-col">
            <div
              className="font-mono uppercase tracking-[0.14em] flex items-center gap-2 mb-2"
              style={{ fontSize: "10px", color: "var(--text-2)" }}
            >
              <span>URL</span>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={!url || fetchingPreview}
                className="ml-auto font-mono cursor-pointer px-2 py-0.5 rounded normal-case lowercase"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  color: "var(--warning)",
                  border: "1px solid rgba(169,132,47,0.4)",
                  background: "rgba(169,132,47,0.06)",
                }}
              >
                {fetchingPreview ? "..." : "fetch preview"}
              </button>
            </div>
            <div className="input-base">
              <input
                className="flex-1 bg-transparent border-0 outline-none text-text text-[13.5px] font-mono"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {isText && (
          <div className="flex flex-col">
            <div className="caption mb-2">Контент</div>
            <textarea
              className="input-base"
              style={{
                minHeight: "120px",
                padding: "12px 14px",
                alignItems: "flex-start",
                height: "auto",
                fontFamily: "var(--sans)",
                fontSize: "13.5px",
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col">
          <div className="caption mb-2">Описание (опционально)</div>
          <textarea
            className="input-base"
            style={{
              minHeight: "60px",
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--sans)",
              fontSize: "13.5px",
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Заголовок превью"
            value={previewTitle}
            onChange={(e) => setPreviewTitle(e.target.value)}
          />
          <TextField
            label="Источник"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <TextField
          label="Картинка превью (URL)"
          value={previewImage}
          onChange={(e) => setPreviewImage(e.target.value)}
        />

        <div className="flex flex-col">
          <div className="caption mb-2">Описание превью</div>
          <textarea
            className="input-base"
            style={{
              minHeight: "60px",
              padding: "12px 14px",
              alignItems: "flex-start",
              height: "auto",
              fontFamily: "var(--sans)",
              fontSize: "13.5px",
            }}
            value={previewDescription}
            onChange={(e) => setPreviewDescription(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer mt-2 select-none">
          <span
            className="w-5 h-5 rounded grid place-items-center font-mono font-bold transition-colors"
            style={
              isRequired
                ? {
                    fontSize: "11px",
                    background: "var(--warning)",
                    color: "#1e1700",
                    border: "1px solid var(--warning)",
                  }
                : {
                    fontSize: "11px",
                    border: "1px solid var(--border-bright)",
                    background: "var(--surface)",
                    color: "transparent",
                  }
            }
            onClick={() => setIsRequired(!isRequired)}
          >
            ✓
          </span>
          <span className="text-[13px]">
            Обязательный материал{" "}
            <span className="text-text-3 text-[11.5px]">— нужен для закрытия блока</span>
          </span>
        </label>
      </div>
    </Drawer>
  );
}

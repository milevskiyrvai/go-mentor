import clsx from "clsx";
import type { RoadmapMaterial } from "@/api/types";

interface Props {
  material: RoadmapMaterial;
  viewed: boolean;
  onToggle?: () => void;
  readonly?: boolean;
}

export function MaterialCard({ material, viewed, onToggle, readonly }: Props) {
  const thumbKind = thumbForContent(material.content_type);
  const url = material.url;

  return (
    <div
      className={clsx(
        "elevated grid items-center gap-4 p-3",
        "grid-cols-[96px_1fr_auto]",
        viewed && "opacity-95",
      )}
    >
      <a
        href={url || undefined}
        target="_blank"
        rel="noreferrer"
        className={clsx("mat-thumb", thumbKind)}
        style={{ width: 96, height: 58 }}
      >
        {material.preview_image ? (
          <img src={material.preview_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="tg">{thumbLabel(material.content_type)}</span>
        )}
      </a>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className={clsx("pill", material.is_required ? "required" : "optional")}
          >
            {material.is_required ? "Обязательно" : "Опционально"}
          </span>
          <span className="pill optional">{material.content_type}</span>
          {material.source && <span className="pill optional">{material.source}</span>}
        </div>
        <a
          href={url || undefined}
          target="_blank"
          rel="noreferrer"
          className="block text-[14px] font-semibold leading-snug hover:text-primary transition-colors"
        >
          {material.preview_title || material.title}
        </a>
        {(material.description || material.preview_description) && (
          <p className="text-[12px] text-text-2 mt-0.5 line-clamp-2 leading-snug">
            {material.preview_description ?? material.description}
          </p>
        )}
      </div>

      {!readonly && (
        <button
          onClick={onToggle}
          aria-label={viewed ? "Отменить отметку" : "Отметить как просмотрено"}
          className={clsx("check", viewed && "on")}
        >
          {viewed ? "✓" : ""}
        </button>
      )}
    </div>
  );
}

function thumbForContent(t: string): string {
  switch (t) {
    case "youtube":
      return "yt";
    case "github":
      return "gh";
    case "article":
      return "art";
    case "file":
      return "file";
    case "text":
      return "txt";
    default:
      return "url";
  }
}

function thumbLabel(t: string): string {
  switch (t) {
    case "youtube":
      return "YT";
    case "github":
      return "GH";
    case "article":
      return "ART";
    case "file":
      return "FILE";
    case "text":
      return "TXT";
    default:
      return "URL";
  }
}

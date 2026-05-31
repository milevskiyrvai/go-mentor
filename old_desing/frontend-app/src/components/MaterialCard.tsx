import clsx from "clsx";
import type { RoadmapMaterial } from "@/api/types";

interface Props {
  material: RoadmapMaterial;
  viewed: boolean;
  onToggle?: () => void;
  readonly?: boolean;
}

export function MaterialCard({ material, viewed, onToggle, readonly }: Props) {
  const thumbClass = thumbForContent(material.content_type);
  const url = material.url;

  return (
    <div
      className={clsx(
        "elevated grid items-center gap-4 p-3.5",
        "grid-cols-[120px_1fr_auto]",
        viewed && "opacity-90 border-success/30",
      )}
    >
      <a
        href={url || undefined}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "w-[120px] h-[72px] rounded-[7px] bg-bg border border-border relative overflow-hidden",
          thumbClass,
        )}
      >
        {material.preview_image ? (
          <img src={material.preview_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            data-icon={thumbLabel(material.content_type)}
            className="absolute inset-0 grid place-items-center font-mono text-[11px] text-text-2 tracking-widest font-bold"
          >
            {thumbLabel(material.content_type)}
          </span>
        )}
      </a>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={clsx("pill", material.is_required ? "required" : "optional")}>
            {material.is_required ? "Обязательно" : "Опционально"}
          </span>
          <span className="pill">{material.content_type}</span>
          {material.source && <span className="pill">{material.source}</span>}
        </div>
        <a
          href={url || undefined}
          target="_blank"
          rel="noreferrer"
          className="block text-[15px] font-semibold leading-snug hover:text-primary transition-colors"
        >
          {material.preview_title || material.title}
        </a>
        {(material.description || material.preview_description) && (
          <p className="text-[12px] text-text-2 mt-1 line-clamp-2 leading-snug">
            {material.preview_description ?? material.description}
          </p>
        )}
      </div>

      {!readonly && (
        <button
          onClick={onToggle}
          aria-label={viewed ? "Отменить отметку" : "Отметить как просмотрено"}
          className={clsx(
            "w-9 h-9 rounded-full grid place-items-center border transition-all shrink-0",
            viewed
              ? "bg-success/15 border-success text-success shadow-[0_0_18px_rgba(123,227,140,0.3)]"
              : "bg-bg border-border-bright text-text-2 hover:border-primary hover:text-primary",
          )}
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
      return "bg-[repeating-linear-gradient(135deg,#1a0f12_0_8px,#221015_8px_16px)]";
    case "github":
      return "bg-[repeating-linear-gradient(135deg,#0e1620_0_8px,#101926_8px_16px)]";
    case "article":
      return "bg-[repeating-linear-gradient(135deg,#0f1a1a_0_8px,#0f1f1d_8px_16px)]";
    case "file":
      return "bg-[repeating-linear-gradient(135deg,#171221_0_8px,#1a1326_8px_16px)]";
    default:
      return "";
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

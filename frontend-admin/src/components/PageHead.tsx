import type { ReactNode } from "react";

interface PageHeadProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
}

export function PageHead({ eyebrow, title, description, right }: PageHeadProps) {
  return (
    <header
      className="flex items-end justify-between gap-6 pb-[18px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div>
        <div
          className="inline-flex items-center gap-2.5 font-mono uppercase font-semibold mb-2"
          style={{ fontSize: "11px", color: "var(--warning)", letterSpacing: "0.18em" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }}
          />
          {eyebrow}
        </div>
        <h1
          className="m-0 text-text font-bold leading-none"
          style={{ fontSize: "30px", letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 mb-0 text-text-2 text-[13px] leading-[1.55] max-w-[64ch]">
            {description}
          </p>
        )}
      </div>
      {right && <div className="flex flex-col items-end gap-3 flex-shrink-0">{right}</div>}
    </header>
  );
}

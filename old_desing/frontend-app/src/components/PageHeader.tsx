import { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, right }: Props) {
  return (
    <header className="flex items-end justify-between gap-6 pb-6 mb-8 border-b border-border">
      <div>
        {eyebrow && <div className="caption mb-2">{eyebrow}</div>}
        <h1 className="text-[36px] font-bold -tracking-[0.02em] leading-tight">{title}</h1>
        {description && (
          <p className="text-text-2 mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {right && <div className="flex gap-3">{right}</div>}
    </header>
  );
}

import type { ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, title, children, footer, width = 520 }: DrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(5,6,8,0.7)" }}
      onClick={onClose}
    >
      <aside
        className="bg-surface border-l border-border h-full flex flex-col"
        style={{
          width,
          boxShadow: "-40px 0 80px -30px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3 className="m-0 text-[15px] font-bold flex-1">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md grid place-items-center cursor-pointer hover:bg-elevated text-text-2 hover:text-text transition-colors"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && (
          <div className="p-5" style={{ borderTop: "1px solid var(--border)" }}>
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

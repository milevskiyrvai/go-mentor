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
    <div className="drawer-bg" onClick={onClose}>
      <aside
        className="drawer"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h3>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="modal-x"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </div>
  );
}

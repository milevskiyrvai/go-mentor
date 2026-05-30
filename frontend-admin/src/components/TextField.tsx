import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, required, icon, error, className, ...props }, ref) => {
    return (
      <div className="field flex flex-col">
        {label && (
          <div
            className="font-mono uppercase tracking-[0.14em] text-text-2 flex items-center gap-2 mb-2"
            style={{ fontSize: "10px" }}
          >
            <span>{label}</span>
            {required && <span style={{ color: "var(--warning)" }}>*</span>}
            {hint && (
              <span
                className="ml-auto text-text-3 lowercase tracking-[0.08em] normal-case"
                style={{ fontSize: "10px" }}
              >
                {hint}
              </span>
            )}
          </div>
        )}
        <div className={clsx("input-base", className)}>
          {icon && <span className="text-text-3 grid place-items-center">{icon}</span>}
          <input
            ref={ref}
            className="flex-1 bg-transparent border-0 outline-none text-text text-[13.5px] min-w-0 font-sans"
            {...props}
          />
        </div>
        {error && (
          <div className="mt-1.5 text-[11px]" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";

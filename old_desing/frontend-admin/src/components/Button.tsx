import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "warn" | "primary" | "ghost" | "danger-ghost" | "default";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", arrow, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "btn-base",
          variant === "warn" && "btn-warn",
          variant === "primary" && "btn-primary-color",
          variant === "ghost" && "bg-transparent",
          variant === "danger-ghost" && "btn-danger-ghost",
          size === "sm" && "!h-[30px] !px-[11px] !text-[12px]",
          className
        )}
        {...props}
      >
        {children}
        {arrow && (
          <span className="font-mono font-bold" aria-hidden>
            →
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-sky disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-brand-teal text-white shadow-soft hover:bg-[#0a2f3f]",
        variant === "secondary" &&
          "border border-brand-sand bg-white/80 text-brand-teal hover:bg-white",
        variant === "ghost" && "text-brand-teal hover:bg-white/60",
        className,
      )}
      {...props}
    />
  );
}

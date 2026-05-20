import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-white/80 bg-white/[0.85] shadow-soft backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

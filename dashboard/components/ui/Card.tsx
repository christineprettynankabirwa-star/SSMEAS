import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

interface CardProps<T extends ElementType = "article"> {
  as?: T;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export default function Card<T extends ElementType = "article">({ as, children, className = "", interactive = false, ...props }: CardProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof CardProps<T>>) {
  const Component = as ?? "article";
  return <Component className={`rounded-2xl border border-white/10 bg-slate-900/80 shadow-[0_18px_45px_rgb(0_0_0/.28)] backdrop-blur-xl ${interactive ? "ui-interactive-card" : ""} ${className}`} {...props}>{children}</Component>;
}

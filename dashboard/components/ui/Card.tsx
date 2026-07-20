import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

interface CardProps<T extends ElementType = "article"> {
  as?: T;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export default function Card<T extends ElementType = "article">({ as, children, className = "", interactive = false, ...props }: CardProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof CardProps<T>>) {
  const Component = as ?? "article";
  return <Component className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${interactive ? "ui-interactive-card" : ""} ${className}`} {...props}>{children}</Component>;
}

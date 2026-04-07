import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-3">
        {eyebrow ? <span className="section-kicker">{eyebrow}</span> : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">{actions}</div> : null}
    </div>
  );
}

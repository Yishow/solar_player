import type { HTMLAttributes, PropsWithChildren } from "react";

type WorkspaceSurfaceTone = "base" | "accent" | "subtle" | "warning" | "danger" | "empty";

const toneClassMap: Record<WorkspaceSurfaceTone, string> = {
  accent: "border-[var(--workspace-surface-accent-border)] bg-[var(--workspace-surface-accent)]",
  base: "border-[var(--workspace-surface-border)] bg-[var(--workspace-surface-strong)]",
  danger: "border-[var(--workspace-surface-danger-border)] bg-[var(--workspace-surface-danger)] text-[var(--workspace-surface-danger-ink)]",
  empty: "border-dashed border-[var(--workspace-surface-border)] bg-[var(--workspace-surface-muted)]",
  subtle: "border-[var(--workspace-surface-border)] bg-[var(--workspace-surface-muted)]",
  warning: "border-[var(--workspace-surface-warning-border)] bg-[var(--workspace-surface-warning)] text-[var(--workspace-surface-warning-ink)]"
};

export function WorkspacePanel({
  children,
  className,
  surface,
  ...props
}: PropsWithChildren<{ className?: string; surface: string } & HTMLAttributes<HTMLElement>>) {
  return (
    <section
      data-shell-primitive="workspace-panel"
      data-workspace-surface={surface}
      className={[
        "rounded-[24px] border border-[var(--workspace-surface-border)] bg-[var(--workspace-surface)] p-5 shadow-[var(--workspace-surface-shadow)]",
        className ?? ""
      ].join(" ")}
      {...props}
    >
      {children}
    </section>
  );
}

export function WorkspaceBoard({
  children,
  className,
  surface,
  tone = "subtle",
  ...props
}: PropsWithChildren<{ className?: string; surface: string; tone?: WorkspaceSurfaceTone } & HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      data-shell-primitive="workspace-board"
      data-workspace-surface={surface}
      className={[
        "rounded-[18px] border px-4 py-3",
        toneClassMap[tone],
        className ?? ""
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceActionBar({
  children,
  className,
  surface = "sticky-actions",
  ...props
}: PropsWithChildren<{ className?: string; surface?: string } & HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      data-shell-primitive="workspace-action-bar"
      data-workspace-surface={surface}
      className={[
        "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--workspace-surface-border)] bg-[var(--workspace-surface-strong)] px-4 py-3 shadow-[var(--workspace-surface-shadow)] backdrop-blur",
        className ?? ""
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

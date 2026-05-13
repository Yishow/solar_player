import type { PropsWithChildren } from "react";

type ActionClusterProps = PropsWithChildren<{
  align?: "start" | "end" | "between";
  className?: string;
}>;

const alignClassMap = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between"
} as const;

export function ActionCluster({
  align = "start",
  className,
  children
}: ActionClusterProps) {
  return (
    <div
      data-shell-primitive="action-cluster"
      className={[
        "flex flex-wrap items-center gap-3",
        alignClassMap[align],
        className ?? ""
      ].join(" ")}
    >
      {children}
    </div>
  );
}

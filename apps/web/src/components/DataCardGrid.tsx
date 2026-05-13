import type { PropsWithChildren } from "react";

type DataCardGridProps = PropsWithChildren<{
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}>;

const columnClassMap = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5"
} as const;

export function DataCardGrid({
  columns = 3,
  className,
  children
}: DataCardGridProps) {
  return (
    <div
      className={[
        "grid gap-4",
        columnClassMap[columns],
        className ?? ""
      ].join(" ")}
    >
      {children}
    </div>
  );
}

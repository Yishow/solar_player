import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return <div className="h-full px-page-x py-page-y">{children}</div>;
}

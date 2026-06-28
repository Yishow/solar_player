import React from "react";
import type { PropsWithChildren } from "react";
import { routeMetaMap } from "../../app/routeMeta";
import { PageContainer } from "../../components/PageContainer";

type PageScaffoldProps = PropsWithChildren<{
  path: string;
  description: string;
}>;

export function PageScaffold({ path, description, children }: PageScaffoldProps) {
  const routeMeta = routeMetaMap.get(path);

  if (!routeMeta) {
    throw new Error(`Unknown page path: ${path}`);
  }

  return (
    <PageContainer
      density={routeMeta.shellDensity}
      shellPrimitive="management-scaffold"
      title={routeMeta.title}
      subtitle={routeMeta.subtitle}
      description={description}
    >
      {children}
    </PageContainer>
  );
}

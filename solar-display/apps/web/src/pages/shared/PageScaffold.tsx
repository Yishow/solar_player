import type { PropsWithChildren } from "react";
import { routeMetaList, routeMetaMap } from "../../app/routeMeta";
import { PageContainer } from "../../components/PageContainer";
import { PageNumberPill } from "../../components/PageNumberPill";

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
      title={routeMeta.title}
      subtitle={routeMeta.subtitle}
      description={description}
      aside={<PageNumberPill current={routeMeta.order} total={routeMetaList.length} />}
    >
      <div className="grid gap-6">{children}</div>
    </PageContainer>
  );
}

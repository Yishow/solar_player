import { useLocation } from "react-router-dom";

function getPageLabel(pathname: string) {
  const routeMap: Record<string, string> = {
    "/overview": "Overview",
    "/solar": "Solar",
    "/factory-circuit": "Factory Circuit",
    "/images": "Images",
    "/sustainability": "Sustainability"
  };

  return routeMap[pathname] ?? "Overview";
}

export function Index() {
  const { pathname } = useLocation();
  const pageLabel = getPageLabel(pathname);

  return (
    <section className="panel-surface flex min-h-[calc(100vh-var(--header-height)-var(--footer-height)-56px)] flex-col justify-between overflow-hidden p-10">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex rounded-full bg-brand-100 px-4 py-2 font-en text-sm font-semibold uppercase tracking-[0.2em] text-brand-800">
          {pageLabel}
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-bold leading-[1.1] text-brand-900">
            Phase 1 - 骨架完成
          </h2>
          <p className="max-w-2xl text-xl leading-9 text-neutral-700">
            前端 Router、LayoutShell、Header、Footer、Design Tokens 與全域樣式已完成初始化，後續
            Phase 可直接接續資料綁定、播放流程與設定頁實作。
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-brand-900 p-6 text-white shadow-card">
          <p className="font-en text-sm uppercase tracking-[0.18em] text-brand-100">Frontend</p>
          <p className="mt-4 text-2xl font-semibold">Vite + React + Router + Tailwind</p>
        </div>
        <div className="rounded-2xl bg-white p-6 text-neutral-900 shadow-card">
          <p className="font-en text-sm uppercase tracking-[0.18em] text-neutral-500">Backend</p>
          <p className="mt-4 text-2xl font-semibold">Fastify + Swagger UI + SQLite</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#fff6e4] to-[#fef0d8] p-6 text-neutral-900 shadow-card">
          <p className="font-en text-sm uppercase tracking-[0.18em] text-[#9f6315]">Shared</p>
          <p className="mt-4 text-2xl font-semibold">OpenAPI 3.1 + Shared Types Ready</p>
        </div>
      </div>
    </section>
  );
}

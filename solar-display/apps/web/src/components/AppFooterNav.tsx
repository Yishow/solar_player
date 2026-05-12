import { Link, useLocation } from "react-router-dom";
import { routeMetaList, routeMetaMap } from "../app/routeMeta";
import { LeafOrnament } from "./LeafOrnament";
import { PageNumberPill } from "./PageNumberPill";

export function AppFooterNav() {
  const { pathname } = useLocation();
  const currentRoute = routeMetaMap.get(pathname) ?? routeMetaList[0]!;
  const playbackTabs = routeMetaList.filter((route) => route.group === "playback");
  const managementTabs = routeMetaList.filter((route) => route.group === "management");

  return (
    <footer className="shrink-0 border-t border-white/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-[var(--footer-height)] max-w-[var(--screen-width)] items-center justify-between gap-6 px-page-x">
        <div className="flex items-center gap-4">
          <PageNumberPill current={currentRoute.order} total={routeMetaList.length} />
          <div>
            <p className="font-en text-xs uppercase tracking-[0.24em] text-neutral-500">Kiosk Navigation</p>
            <p className="text-sm text-neutral-600">
              第 {currentRoute.order} 頁，共 {routeMetaList.length} 頁
            </p>
          </div>
        </div>
        <nav className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            {playbackTabs.map((tab) => {
              const active = tab.path === pathname;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-brand-900 text-white shadow-card"
                      : "bg-white/90 text-neutral-700 hover:bg-brand-100 hover:text-brand-900"
                  ].join(" ")}
                >
                  {tab.navLabel}
                </Link>
              );
            })}
          </div>
          <div className="h-8 w-px bg-neutral-200" />
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <span className="rounded-full bg-brand-100 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-brand-800">
              設定
            </span>
            {managementTabs.map((tab) => {
              const active = tab.path === pathname;

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={[
                    "rounded-full px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand-900 text-white shadow-card"
                      : "bg-neutral-100 text-neutral-700 hover:bg-white"
                  ].join(" ")}
                >
                  {tab.navLabel}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex items-center gap-3">
          <LeafOrnament />
          <p className="text-right text-lg font-semibold tracking-[0.08em] text-brand-900">綠能永續．智慧展示</p>
        </div>
      </div>
    </footer>
  );
}

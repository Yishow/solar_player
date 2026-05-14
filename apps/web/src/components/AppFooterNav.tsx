import { Link, useLocation } from "react-router-dom";
import { routeMetaList, routeMetaMap, type RouteMeta } from "../app/routeMeta";
import { useBrandAssets } from "../hooks/useBrandAssets";
import { LeafOrnament } from "./LeafOrnament";
import { PageNumberPill } from "./PageNumberPill";

type FooterEntry = {
  key: string;
  label: string;
  path: string;
};

type FooterMode = "playback" | "management";

const SETTINGS_ENTRY_PATH = "/settings/playback";

function buildEntries(currentPath: string): {
  entries: FooterEntry[];
  mode: FooterMode;
  isActivePath: (path: string) => boolean;
} {
  const currentRoute = routeMetaMap.get(currentPath);
  const isPlayback = !currentRoute || currentRoute.group === "playback";

  if (isPlayback) {
    const playbackTabs: FooterEntry[] = routeMetaList
      .filter((route): route is RouteMeta => route.group === "playback")
      .map((route) => ({ key: route.path, label: route.navLabel, path: route.path }));

    playbackTabs.push({
      key: "settings-entry",
      label: "進入設定",
      path: SETTINGS_ENTRY_PATH
    });

    return {
      entries: playbackTabs,
      mode: "playback",
      isActivePath: (path) => path === currentPath
    };
  }

  const managementTabs: FooterEntry[] = routeMetaList
    .filter((route): route is RouteMeta => route.group === "management" && route.path !== "/offline")
    .map((route) => ({ key: route.path, label: route.navLabel, path: route.path }));

  const overviewEntry: FooterEntry = { key: "overview-return", label: "回總覽", path: "/overview" };

  return {
    entries: [overviewEntry, ...managementTabs],
    mode: "management",
    isActivePath: (path) => path === currentPath
  };
}

export function AppFooterNav() {
  const { pathname } = useLocation();
  const currentRoute = routeMetaMap.get(pathname) ?? routeMetaList[0]!;
  const { entries, mode, isActivePath } = buildEntries(pathname);
  const brand = useBrandAssets();

  // Settings nav has more entries; tighten typography & spacing so they fit.
  const navItemPaddingX = mode === "playback" ? 32 : 18;
  const navItemFontSize = mode === "playback" ? 16 : 14;
  const navItemTracking = mode === "playback" ? "0.04em" : "0.02em";

  return (
    <footer
      data-shell-primitive="footer-nav"
      className="shell-footer-bar relative flex h-[var(--footer-height)] w-full shrink-0 items-stretch"
    >
      <div className="flex w-full items-center pl-[32px] pr-[32px]">
        <PageNumberPill current={currentRoute.order} total={routeMetaList.length} />

        <div className="ml-[32px]">
          <LeafOrnament variant="footer-mini" />
        </div>

        <nav className="ml-[20px] flex h-[64px] flex-1 items-stretch overflow-hidden">
          {entries.map((entry) => {
            const active = isActivePath(entry.path);

            return (
              <Link
                key={entry.key}
                to={entry.path}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center font-en font-medium leading-none whitespace-nowrap transition-[color,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-nav-active-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shell-footer-bg)] rounded-sm ${
                  active ? "opacity-100" : "opacity-60 hover:opacity-100 hover:-translate-y-[1px]"
                }`}
                style={{
                  color: active
                    ? "var(--shell-nav-active-ink)"
                    : "var(--shell-nav-rest-ink)",
                  fontSize: `${navItemFontSize}px`,
                  letterSpacing: navItemTracking,
                  paddingLeft: `${navItemPaddingX}px`,
                  paddingRight: `${navItemPaddingX}px`
                }}
              >
                {entry.label}
                {/* Active Indicator: Subtle Glow Line */}
                <span
                  aria-hidden
                  className={`absolute bottom-[14px] left-1/2 h-[2px] -translate-x-1/2 rounded-full transition-[width,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    active ? "w-[12px] opacity-100" : "w-0 opacity-0"
                  }`}
                  style={{
                    background: "var(--shell-nav-underline)",
                    boxShadow: active ? "0 0 6px 0px var(--shell-nav-underline)" : "none"
                  }}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-[24px] flex items-center gap-[24px]">
          <div className="text-right">
            <div
              className="text-[17px] font-medium tracking-[0.42em]"
              style={{ color: "var(--shell-slogan-ink)", marginRight: "-0.42em" }}
            >
              {brand.sloganZh}
            </div>
            <div
              className="mt-[4px] font-en text-[11px] tracking-[0.04em]"
              style={{ color: "var(--shell-slogan-soft-ink)" }}
            >
              {brand.sloganEn}
            </div>
          </div>
          <FooterBranch />
        </div>
      </div>
    </footer>
  );
}

function FooterBranch() {
  const stroke = "var(--shell-branch-stroke)";

  return (
    <svg
      width="120"
      height="44"
      viewBox="0 0 120 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 opacity-90"
      aria-hidden="true"
    >
      {/* Main curved branch */}
      <path
        d="M 5 40 Q 60 40 115 5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Upper leaf */}
      <path
        d="M 75 22 Q 90 15 100 5"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Lower leaf */}
      <path
        d="M 40 33 Q 60 25 70 12"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

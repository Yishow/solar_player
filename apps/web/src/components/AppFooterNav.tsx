import { Fragment } from "react";
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

  const activeIndex = entries.findIndex((entry) => isActivePath(entry.path));

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

        <nav className="ml-[20px] flex h-[64px] flex-1 items-stretch overflow-hidden group">
          {entries.map((entry, index) => {
            const active = index === activeIndex;

            const baseClasses = "relative flex items-center font-en leading-none whitespace-nowrap transition-[color,opacity,transform,text-shadow,letter-spacing] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-nav-active-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shell-footer-bg)] rounded-sm";

            const playbackClasses = active
              ? "font-medium opacity-100"
              : "font-medium opacity-60 group-hover:opacity-40 hover:!opacity-100 hover:-translate-y-[1px] active:scale-[0.97]";

            const managementClasses = active
              ? "font-bold opacity-100"
              : "font-semibold opacity-70 hover:opacity-100";

            return (
              <Fragment key={entry.key}>
                {index > 0 && <NavArrow isNext={mode === "playback" && index === activeIndex + 1} />}
                <Link
                  to={entry.path}
                  aria-current={active ? "page" : undefined}
                  className={`${baseClasses} ${mode === "playback" ? playbackClasses : managementClasses}`}
                  style={{
                    color: active
                      ? "var(--shell-nav-active-ink)"
                      : "var(--shell-nav-rest-ink)",
                    textShadow: active && mode === "playback" ? "0 0 12px rgba(63, 122, 52, 0.4)" : "none",
                    fontSize: `${navItemFontSize}px`,
                    letterSpacing: active && mode === "management" ? "0.06em" : navItemTracking,
                    paddingLeft: `${navItemPaddingX}px`,
                    paddingRight: `${navItemPaddingX}px`
                  }}
                >
                  {entry.label}
                </Link>
              </Fragment>
            );
          })}
          {mode === "playback" && (
            <div
              aria-hidden="true"
              className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                activeIndex === entries.length - 1
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-[10px] pointer-events-none"
              }`}
            >
              <NavArrow isNext={activeIndex === entries.length - 1} />
              <span
                className="font-en font-medium leading-none whitespace-nowrap"
                style={{
                  color: "var(--shell-nav-rest-ink)",
                  fontSize: `${navItemFontSize}px`,
                  letterSpacing: navItemTracking,
                  opacity: 0.3,
                  paddingLeft: `${navItemPaddingX}px`,
                  paddingRight: `${navItemPaddingX}px`
                }}
              >
                {entries[0]?.label}
              </span>
            </div>
          )}
        </nav>

        <div className="ml-[24px] flex items-center gap-[24px]">
          <div className="text-right">
            <div
              className="text-[17px] font-semibold tracking-[0.42em]"
              style={{ color: "var(--shell-slogan-ink)", marginRight: "-0.42em" }}
            >
              {brand.sloganZh}
            </div>
            <div
              className="mt-[4px] font-en text-[11px] font-medium tracking-[0.12em]"
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
      className="shrink-0 opacity-90 animate-branch"
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

function NavArrow({ isNext }: { isNext?: boolean }) {
  if (isNext) {
    return (
      <div className="flex h-full items-center px-[4px] gap-[2px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="var(--shell-nav-active-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-arrow-wave"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center px-[8px]" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="var(--shell-divider-strong)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

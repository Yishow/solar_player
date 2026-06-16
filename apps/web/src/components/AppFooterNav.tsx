import React, { Fragment } from "react";
import type { ShellDecorationObject } from "@solar-display/shared";
import { Link, useLocation } from "react-router-dom";
import {
  getConfiguredHiddenManagementRoutePaths,
  isManagementRouteHidden
} from "../app/managementRouteVisibility";
import { routeMetaList, routeMetaMap, type PlaybackRouteNavIcon, type RouteMeta } from "../app/routeMeta";
import type { PlaybackFooterEntry, ResolvedPlaybackRouteMeta } from "../app/playbackRouteMeta";
import { defaultBrandView, type BrandView } from "../hooks/useBrandAssets";
import { LeafOrnament } from "./LeafOrnament";
import { SHELL_CHROME_CONTENT_Z_INDEX, ShellDecorationLayer } from "./ShellDecorationLayer";

type FooterEntry = {
  icon?: PlaybackRouteNavIcon;
  key: string;
  label: string;
  path: string;
};

type FooterMode = "playback" | "management";

const hiddenManagementFooterPaths = new Set([
  "/settings/assets",
  "/shell-decorations/editor"
]);

const managementFooterOrder = [
  "/settings/playback",
  "/settings/data-source",
  "/settings/mqtt",
  "/settings/images",
  "/settings/circuits",
  "/device-status",
  "/trends",
  "/history",
  "/brand",
  "/display-pages/editor",
  "/slideshow-preview"
] as const;

function buildEntries(
  currentPath: string,
  playbackNavigation?: {
    entries: PlaybackFooterEntry[];
    routeMeta: ResolvedPlaybackRouteMeta;
  }
): {
  entries: FooterEntry[];
  mode: FooterMode;
  isActivePath: (path: string) => boolean;
} {
  const currentRoute = routeMetaMap.get(currentPath);
  const isPlayback =
    playbackNavigation?.routeMeta.group === "playback" || !currentRoute || currentRoute.group === "playback";

  if (isPlayback) {
    const playbackTabs: FooterEntry[] =
      playbackNavigation?.entries.map((entry) => ({
        icon: entry.icon,
        key: entry.key,
        label: entry.label,
        path: entry.path
      })) ??
      routeMetaList
        .filter((route): route is RouteMeta => route.group === "playback")
        .map((route) => ({ icon: route.navIcon, key: route.path, label: route.navLabel, path: route.path }));

    return {
      entries: playbackTabs,
      mode: "playback",
      isActivePath: (path) => path === (playbackNavigation?.routeMeta.matchedPath ?? currentPath)
    };
  }

  const configuredHiddenManagementPaths = getConfiguredHiddenManagementRoutePaths();
  const managementTabs: FooterEntry[] = managementFooterOrder
    .map((path) => routeMetaMap.get(path))
    .filter((route): route is RouteMeta => {
      return route !== undefined &&
        !hiddenManagementFooterPaths.has(route.path) &&
        !isManagementRouteHidden(route.path, configuredHiddenManagementPaths);
    })
    .map((route) => ({ key: route.path, label: route.navLabel, path: route.path }));

  const overviewEntry: FooterEntry = { key: "overview-return", label: "回總覽", path: "/overview" };

  return {
    entries: [overviewEntry, ...managementTabs],
    mode: "management",
    isActivePath: (path) => path === currentPath
  };
}

export function AppFooterNav({
  brandView = defaultBrandView,
  decorationObjects,
  playbackEntries,
  resolvedPlaybackRouteMeta
}: {
  brandView?: BrandView;
  decorationObjects?: ShellDecorationObject[];
  playbackEntries?: PlaybackFooterEntry[];
  resolvedPlaybackRouteMeta?: ResolvedPlaybackRouteMeta;
}) {
  const { pathname } = useLocation();
  const { entries, mode, isActivePath } = buildEntries(
    pathname,
    playbackEntries && resolvedPlaybackRouteMeta
      ? {
          entries: playbackEntries,
          routeMeta: resolvedPlaybackRouteMeta
        }
      : undefined
  );
  const navItemPaddingX = mode === "playback" ? 26 : 12;
  const navItemFontSize = 15;
  const navItemTracking = mode === "playback" ? "0.04em" : "0.02em";
  const activeUnderlineInset = mode === "playback" ? 26 : 12;

  const activeIndex = entries.findIndex((entry) => isActivePath(entry.path));

  return (
    <footer
      data-shell-primitive="footer-nav"
      className="shell-footer-bar relative flex h-[var(--footer-height)] w-full shrink-0 items-stretch"
    >
      <ShellDecorationLayer mount="footer" objects={decorationObjects} plane="background" />
      <div
        data-shell-primitive="footer-nav-content"
        className="relative flex w-full items-center pl-[32px] pr-[32px]"
        style={{ zIndex: SHELL_CHROME_CONTENT_Z_INDEX }}
      >
        <div>
          <LeafOrnament variant="footer-mini" />
        </div>

        <nav
          className={[
            "flex h-[64px] flex-1 items-stretch overflow-hidden",
            mode === "playback" ? "ml-[88px] justify-center" : "ml-[44px] justify-center"
          ].join(" ")}
        >
          {entries.map((entry, index) => {
            const active = index === activeIndex;

            const baseClasses = "relative flex items-center gap-[7px] font-en leading-none whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-nav-active-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shell-footer-bg)] rounded-sm";

            const playbackClasses = active
              ? "font-semibold opacity-100"
              : "font-medium opacity-[0.58] hover:opacity-100 active:scale-[0.98]";

            const managementClasses = active
              ? "font-semibold opacity-100"
              : "font-medium opacity-[0.62] hover:opacity-100 active:scale-[0.98]";

            return (
              <Fragment key={entry.key}>
                {index > 0 && <NavDivider compact={mode === "management"} />}
                <Link
                  to={entry.path}
                  aria-current={active ? "page" : undefined}
                  className={`${baseClasses} ${mode === "playback" ? playbackClasses : managementClasses}`}
                  style={{
                    color: active
                      ? "var(--shell-nav-active-ink)"
                      : "var(--shell-nav-rest-ink)",
                    textShadow: "none",
                    fontSize: `${navItemFontSize}px`,
                    letterSpacing: active && mode === "management" ? "0.06em" : navItemTracking,
                    paddingLeft: `${navItemPaddingX}px`,
                    paddingRight: `${navItemPaddingX}px`
                  }}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[12px] h-[2px] rounded-full bg-[var(--shell-nav-active-ink)]"
                      style={{
                        left: `${activeUnderlineInset}px`,
                        right: `${activeUnderlineInset}px`
                      }}
                    />
                  )}
                  {mode === "playback" && entry.icon && (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-[15px] w-[15px] items-center justify-center"
                      data-shell-nav-icon={entry.icon}
                    >
                      <PlaybackNavIcon icon={entry.icon} />
                    </span>
                  )}
                  <span>{entry.label}</span>
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div className="ml-[24px] flex items-center gap-[24px]">
          <div className="text-right">
            <div
              className="text-[17px] font-semibold tracking-[0.42em]"
              style={{ 
                color: "var(--shell-slogan-ink)", 
                marginRight: "-0.42em",
                textShadow: "0 1px 1px rgba(255, 255, 255, 0.8), 0 -1px 1px rgba(0, 0, 0, 0.05)"
              }}
            >
              {brandView.sloganZh}
            </div>
            <div
              className="mt-[4px] font-en text-[11px] font-medium tracking-[0.12em]"
              style={{ color: "var(--shell-slogan-soft-ink)" }}
            >
              {brandView.sloganEn}
            </div>
          </div>
          <FooterBranch />
        </div>
      </div>
      <ShellDecorationLayer mount="footer" objects={decorationObjects} plane="foreground" />
    </footer>
  );
}

function PlaybackNavIcon({ icon }: { icon: PlaybackRouteNavIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.65
  } as const;

  switch (icon) {
    case "solar":
      return (
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 18 18">
          <circle {...common} cx="9" cy="9" r="3.1" />
          <path {...common} d="M9 1.7v2.1M9 14.2v2.1M1.7 9h2.1M14.2 9h2.1M3.8 3.8l1.5 1.5M12.7 12.7l1.5 1.5M14.2 3.8l-1.5 1.5M5.3 12.7l-1.5 1.5" />
        </svg>
      );
    case "factory-circuit":
      return (
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 18 18">
          <path {...common} d="M2.5 13.5h13M4 13.5V7.8l3.4 2.1V7.8l3.4 2.1V5.1h3.2v8.4" />
          <path {...common} d="M4.4 13.5V16M8.9 13.5V16M13.4 13.5V16" />
        </svg>
      );
    case "images":
      return (
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 18 18">
          <rect {...common} height="11.5" rx="1.7" width="13.5" x="2.25" y="3.25" />
          <path {...common} d="M4.2 12.7l3.1-3.1 2.1 2.1 1.4-1.4 3 2.4" />
          <circle {...common} cx="12.4" cy="6.4" r="1" />
        </svg>
      );
    case "sustainability":
      return (
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 18 18">
          <path {...common} d="M9.1 15.6c.2-3.2 1.3-5.7 3.7-7.7" />
          <path {...common} d="M4.1 13.6c6.3.2 9.6-3.1 9.8-9.8-6.8.2-10 3.5-9.8 9.8Z" />
        </svg>
      );
    case "overview":
      return (
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 18 18">
          <rect {...common} height="4.7" rx="1.1" width="4.7" x="2.8" y="3" />
          <rect {...common} height="4.7" rx="1.1" width="4.7" x="10.5" y="3" />
          <rect {...common} height="4.7" rx="1.1" width="4.7" x="2.8" y="10.3" />
          <rect {...common} height="4.7" rx="1.1" width="4.7" x="10.5" y="10.3" />
        </svg>
      );
  }
}

function FooterBranch() {
  return (
    <svg
      width="176"
      height="72"
      viewBox="0 0 176 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 opacity-90 relative z-10 animate-branch"
      style={{ transform: "translateY(-4px)", filter: "drop-shadow(0 2px 4px rgba(104, 130, 66, 0.2)) drop-shadow(0 1px 1px rgba(255, 255, 255, 0.5))" }}
      stroke="var(--shell-branch-stroke, #9aa05e)"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 61C55 76 119 49 166 7" />
      <path d="M55 54C49 33 60 17 80 7C84 31 76 47 55 54Z" fill="#fffdf7" fillOpacity=".26" />
      <path d="M106 37C101 18 112 4 133 1C134 22 125 34 106 37Z" fill="#fffdf7" fillOpacity=".22" />
      <path d="M135 25C138 9 152 2 172 1C167 18 154 26 135 25Z" fill="#fffdf7" fillOpacity=".2" />
      <path d="M70 45C84 39 98 31 111 21 M119 34C132 28 144 20 154 10" />
    </svg>
  );
}

function NavDivider({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`flex h-full items-center ${compact ? "px-[6px]" : "px-[10px]"}`} aria-hidden="true">
      <span className="h-[18px] w-px bg-[var(--shell-divider-strong)] opacity-45" />
    </span>
  );
}

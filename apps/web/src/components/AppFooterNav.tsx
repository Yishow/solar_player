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
  const [brand] = useBrandAssets();

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
          {entries.map((entry, index) => {
            const active = isActivePath(entry.path);

            return (
              <Link
                key={entry.key}
                to={entry.path}
                aria-current={active ? "page" : undefined}
                className="relative flex items-center font-en font-medium leading-none transition-colors duration-150"
                style={{
                  color: active
                    ? "var(--shell-nav-active-ink)"
                    : "var(--shell-nav-rest-ink)",
                  fontSize: `${navItemFontSize}px`,
                  letterSpacing: navItemTracking,
                  paddingLeft: `${navItemPaddingX}px`,
                  paddingRight: `${navItemPaddingX}px`,
                  whiteSpace: "nowrap"
                }}
              >
                {index === 0 ? null : (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-[26px] w-px -translate-y-1/2"
                    style={{ background: "var(--shell-divider)" }}
                  />
                )}
                {entry.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute h-[3px] rounded-full"
                    style={{
                      background: "var(--shell-nav-underline)",
                      bottom: "10px",
                      left: `${navItemPaddingX}px`,
                      right: `${navItemPaddingX}px`
                    }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-[24px] flex items-center gap-[24px]">
          <div className="text-right">
            <div
              className="text-[17px] font-medium tracking-[0.42em]"
              style={{ color: "var(--shell-slogan-ink)" }}
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
    <span
      aria-hidden
      className="relative inline-block shrink-0"
      style={{
        width: "120px",
        height: "44px",
        borderBottom: `2px solid ${stroke}`,
        borderRadius: "50%",
        transform: "skewX(-28deg)",
        opacity: 0.9
      }}
    >
      <span
        className="absolute"
        style={{
          width: "36px",
          height: "20px",
          right: "16px",
          bottom: "26px",
          border: `1.6px solid ${stroke}`,
          borderRadius: "75% 0 75% 0",
          transform: "rotate(-38deg)"
        }}
      />
      <span
        className="absolute"
        style={{
          width: "38px",
          height: "22px",
          right: "60px",
          bottom: "12px",
          border: `1.6px solid ${stroke}`,
          borderRadius: "75% 0 75% 0",
          transform: "rotate(-42deg)"
        }}
      />
    </span>
  );
}

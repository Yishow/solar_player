import { Link, useLocation } from "react-router-dom";

const tabs = [
  { label: "Overview", path: "/overview" },
  { label: "Solar", path: "/solar" },
  { label: "Factory Circuit", path: "/factory-circuit" },
  { label: "Images", path: "/images" },
  { label: "Sustainability", path: "/sustainability" }
];

export function AppFooterNav() {
  const { pathname } = useLocation();
  const currentIndex = Math.max(
    tabs.findIndex((tab) => tab.path === pathname),
    0
  );

  return (
    <footer className="flex h-[var(--footer-height)] items-center justify-between border-t border-white/70 bg-white/75 px-page-x backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-brand-900 px-4 py-2 font-en text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Page {currentIndex + 1}
        </div>
        <span className="text-sm uppercase tracking-[0.18em] text-neutral-600">
          Tabs Placeholder
        </span>
      </div>
      <nav className="flex items-center gap-3">
        {tabs.map((tab) => {
          const active = tab.path === pathname;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-900 text-white shadow-card"
                  : "bg-white/80 text-neutral-700 hover:bg-brand-100 hover:text-brand-900"
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}

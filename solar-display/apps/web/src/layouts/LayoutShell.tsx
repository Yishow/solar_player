import { Outlet } from "react-router-dom";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { PageContainer } from "../components/PageContainer";

export function LayoutShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,248,241,0.98)_38%,_rgba(234,241,229,1)_100%)] text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-[var(--screen-width)] flex-col">
        <AppHeader />
        <main className="flex-1">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
        <AppFooterNav />
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { BarChart3, Building2, LogOut, Users } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { endSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import InstallAppButton from "@/components/layout/InstallAppButton";
import NotificationsButton from "@/components/layout/NotificationsButton";

interface Props {
  children: (me: User) => ReactNode;
  adminOnly?: boolean;
}

function NavItem({ to, icon, label, testId }: { to: string; icon: ReactNode; label: string; testId: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      data-testid={testId}
      className={({ isActive }) =>
        cn(
          "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-xs font-semibold transition-colors duration-150 md:flex-none md:flex-row md:gap-2 md:text-sm",
          isActive ? "bg-sky-50 text-brand md:bg-sky-100" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export default function AppShell({ children, adminOnly }: Props) {
  const { data: me, isPending, isError } = useMe();
  const location = useLocation();

  if (isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && me && me.role !== "admin") return <Navigate to="/" replace />;

  const isAdmin = me?.role === "admin";

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3" data-testid="brand-home-link">
            <img src="/logo-fermy.png" alt="Fermy" className="h-7 w-auto shrink-0 md:h-8" data-testid="company-logo" />
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <span className="hidden font-heading text-base font-bold tracking-tight text-slate-900 sm:inline">
              Portero<span className="text-orange">Control</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex" data-testid="desktop-nav">
            <NavItem to="/" icon={<Building2 className="size-4" />} label="Comunidades" testId="nav-communities" />
            <NavItem to="/reports" icon={<BarChart3 className="size-4" />} label="Informes" testId="nav-reports" />
            {isAdmin && <NavItem to="/users" icon={<Users className="size-4" />} label="Usuarios" testId="nav-users" />}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {me && <NotificationsButton />}
            <InstallAppButton />
            {me && (
              <div className="hidden text-right sm:block" data-testid="current-user-info">
                <div className="text-sm font-semibold text-slate-900" data-testid="current-user-name">{me.name}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-orange" data-testid="current-user-role">
                  {ROLE_LABELS[me.role]}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => void endSession()}
              data-testid="logout-button"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:border-orange hover:text-orange"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {isPending || !me ? (
          <div className="space-y-3" data-testid="page-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : (
          children(me)
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-slate-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden"
        data-testid="mobile-bottom-nav"
      >
        <NavItem to="/" icon={<Building2 className="size-5" />} label="Comunidades" testId="mobile-nav-communities" />
        <NavItem to="/reports" icon={<BarChart3 className="size-5" />} label="Informes" testId="mobile-nav-reports" />
        {isAdmin && <NavItem to="/users" icon={<Users className="size-5" />} label="Usuarios" testId="mobile-nav-users" />}
      </nav>
    </div>
  );
}

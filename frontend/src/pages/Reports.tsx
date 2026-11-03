import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarRange, MonitorSmartphone, Phone, Trophy } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { apiGet } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ReportListItem, WeeklyReport } from "@/lib/types";
import { DEVICE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const CURRENT = "actual";

const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function Stat({ label, value, tone, testId }: { label: string; value: number; tone: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-heading text-3xl font-bold ${tone}`} data-testid={testId}>{value}</div>
    </div>
  );
}

function ReportBody({ r }: { r: WeeklyReport }) {
  const maxTech = Math.max(1, ...r.by_technician.map((t) => t.total));
  return (
    <div className="space-y-6" data-testid="report-body">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Instalados" value={r.total_installed} tone="text-green-600" testId="report-total" />
        <Stat label="Teléfonos" value={r.total_telefono} tone="text-slate-900" testId="report-phones" />
        <Stat label="Monitores" value={r.total_monitor} tone="text-slate-900" testId="report-monitors" />
        <Stat label="Pendientes ahora" value={r.pending_now} tone="text-orange" testId="report-pending" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">Por técnico</h2>
        {r.by_technician.length === 0 ? (
          <p className="text-sm text-slate-500">Sin instalaciones esta semana.</p>
        ) : (
          <ul className="space-y-3" data-testid="report-by-technician">
            {r.by_technician.map((t, i) => (
              <li key={t.user_name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {i === 0 && <Trophy className="size-4 text-orange" />} {t.user_name}
                  </span>
                  <span className="text-slate-600">
                    <b className="text-slate-900">{t.total}</b> · {t.telefono} tel. · {t.monitor} mon.
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(t.total / maxTech) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">Por comunidad</h2>
        {r.by_community.length === 0 ? (
          <p className="text-sm text-slate-500">Sin instalaciones esta semana.</p>
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="report-by-community">
            {r.by_community.map((c) => (
              <li key={c.community_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link to={`/communities/${c.community_id}`} className="min-w-0 truncate font-semibold text-slate-900 hover:text-brand">{c.name}</Link>
                <span className="shrink-0 text-slate-600">
                  <b className="text-green-700">{c.installed}</b> instalados · <span className="text-orange-700">{c.pending_now} pendientes</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {r.items.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">Detalle</h2>
          <ul className="space-y-2" data-testid="report-items">
            {r.items.map((it) => {
              const Icon = it.device_type === "monitor" ? MonitorSmartphone : Phone;
              const place = it.street ? `${it.street} ${it.unit}` : it.unit;
              const device = DEVICE_LABELS[it.device_type as keyof typeof DEVICE_LABELS] ?? it.device_type;
              return (
                <li key={`${it.installed_at}-${it.community_name}-${place}-${it.neighbor_name}`} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">
                      {it.community_name} · {place} · {it.neighbor_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {device} · {it.installed_by_name} · {formatDateTime(it.installed_at)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReportsView() {
  const { id = CURRENT } = useParams();
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ["reports"], queryFn: () => apiGet<ReportListItem[]>("/reports") });
  const report = useQuery({
    queryKey: ["reports", id],
    queryFn: () => apiGet<WeeklyReport>(id === CURRENT ? "/reports/current" : `/reports/${id}`),
  });
  const weeks = list.isError ? [] : (list.data ?? []);
  const r = report.isError ? undefined : report.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-orange">Cada lunes a las 9:00</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Informes semanales</h1>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" data-testid="report-week-tabs">
        <div className="flex w-max gap-2 pb-1">
          {[{ id: CURRENT, label: "Semana en curso" }, ...weeks.map((w) => ({ id: w.id, label: `${dmy(w.week_start).slice(0, 5)} – ${dmy(w.week_end).slice(0, 5)}` }))].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.id === CURRENT ? "/reports" : `/reports/${t.id}`)}
              data-testid={`report-tab-${t.id}`}
              className={cn(
                "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-150",
                id === t.id ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand",
              )}
            >
              <CalendarRange className="size-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {r && (
        <p className="text-sm text-slate-600" data-testid="report-range">
          Del <b>{dmy(r.week_start)}</b> al <b>{dmy(r.week_end)}</b>
          {r.is_partial ? " · datos hasta ahora" : ` · generado ${formatDateTime(r.generated_at)}`}
        </p>
      )}
      {report.isPending ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />)}</div>
      ) : r ? (
        <ReportBody r={r} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="report-empty">
          No se pudo cargar el informe.
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  return <AppShell>{() => <ReportsView />}</AppShell>;
}

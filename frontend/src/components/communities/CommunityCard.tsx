import { Link } from "react-router-dom";
import { ChevronRight, MapPin, MonitorSmartphone, Phone } from "lucide-react";
import type { Community } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default function CommunityCard({ community, index }: { community: Community; index: number }) {
  const pct = community.total ? Math.round((community.installed / community.total) * 100) : 0;
  const done = community.total > 0 && community.pending === 0;
  return (
    <Link
      to={`/communities/${community.id}`}
      data-testid={`community-card-${community.id}`}
      style={{ animationDelay: `${index * 40}ms` }}
      className="group animate-rise-in relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${done ? "bg-green-500" : "bg-orange"}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-lg font-bold tracking-tight text-slate-900" data-testid="community-card-name">
            {community.name}
          </h3>
          {community.address && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="size-3.5 shrink-0" /> {community.address}
            </p>
          )}
        </div>
        <ChevronRight className="size-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-slate-700" data-testid="community-card-progress">
            {community.installed}/{community.total} instalados
          </span>
          <span className="font-mono text-xs font-bold text-brand">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${done ? "bg-green-500" : "bg-brand"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {done ? (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700">Todo instalado</span>
        ) : (
          <>
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700" data-testid="community-card-pending-phones">
              <Phone className="size-3.5" /> {community.pending_telefono} teléfonos
            </span>
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700" data-testid="community-card-pending-monitors">
              <MonitorSmartphone className="size-3.5" /> {community.pending_monitor} monitores
            </span>
          </>
        )}
      </div>
      {community.last_activity_at && (
        <p className="text-xs text-slate-500">
          Último cambio: {formatDateTime(community.last_activity_at)} · {community.last_activity_by}
        </p>
      )}
    </Link>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import CommunityCard from "@/components/communities/CommunityCard";
import CommunityFormDialog from "@/components/communities/CommunityFormDialog";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import type { Community, User } from "@/lib/types";

function Stat({ label, value, tone, testId }: { label: string; value: number; tone: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-heading text-3xl font-bold ${tone}`} data-testid={testId}>{value}</div>
    </div>
  );
}

function CommunitiesView({ me }: { me: User }) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError } = useQuery({
    queryKey: ["communities"],
    queryFn: () => apiGet<Community[]>("/communities"),
    refetchInterval: 20_000,
  });
  const list = useMemo(() => (isError ? [] : (data ?? [])), [data, isError]);
  const filtered = useMemo(
    () => list.filter((c) => `${c.name} ${c.address}`.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );
  const totals = list.reduce(
    (a, c) => ({ pending: a.pending + c.pending, installed: a.installed + c.installed, tel: a.tel + c.pending_telefono, mon: a.mon + c.pending_monitor }),
    { pending: 0, installed: 0, tel: 0, mon: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange">Hola, {me.name.split(" ")[0]}</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Comunidades</h1>
        </div>
        {me.role === "admin" && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            data-testid="new-community-button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange px-5 font-bold text-white shadow-sm transition-colors duration-150 hover:bg-orange-hover"
          >
            <Plus className="size-5" /> Nueva comunidad
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        <Stat label="Pendientes" value={totals.pending} tone="text-orange" testId="stat-pending" />
        <Stat label="Instalados" value={totals.installed} tone="text-green-600" testId="stat-installed" />
        <Stat label="Teléfonos pend." value={totals.tel} tone="text-slate-900" testId="stat-pending-phones" />
        <Stat label="Monitores pend." value={totals.mon} tone="text-slate-900" testId="stat-pending-monitors" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comunidad o dirección..." className="h-12 rounded-xl bg-white pl-12 text-base" data-testid="community-search-input" />
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200/60" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="communities-empty">
          {isError ? "No se pudieron cargar las comunidades." : q ? "Ninguna comunidad coincide con la búsqueda." : "Todavía no hay comunidades."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3" data-testid="communities-grid">
          {filtered.map((c, i) => <CommunityCard key={c.id} community={c} index={i} />)}
        </div>
      )}

      {me.role === "admin" && <CommunityFormDialog open={creating} onOpenChange={setCreating} />}
    </div>
  );
}

export default function Communities() {
  return <AppShell>{(me) => <CommunitiesView me={me} />}</AppShell>;
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Camera, Plus, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import NeighborCard from "@/components/neighbors/NeighborCard";
import NeighborFormDialog from "@/components/neighbors/NeighborFormDialog";
import HistorySheet from "@/components/neighbors/HistorySheet";
import PhotosSheet, { communityTarget, neighborTarget } from "@/components/neighbors/PhotosSheet";
import type { PhotoTarget } from "@/components/neighbors/PhotosSheet";
import CommunityFormDialog from "@/components/communities/CommunityFormDialog";
import CommunityHeader from "@/components/communities/CommunityHeader";
import StreetTabs, { ALL_STREETS, NO_STREET } from "@/components/communities/StreetTabs";
import { Input } from "@/components/ui/input";
import { apiBlob, apiDelete, apiGet, apiPatch } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Community, Neighbor, Photo, Status, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "todos" | Status;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pendiente", label: "Pendientes" },
  { key: "instalado", label: "Instalados" },
  { key: "todos", label: "Todos" },
];

function DetailView({ me, id }: { me: User; id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = me.role === "admin";
  const [filter, setFilter] = useState<Filter>("pendiente");
  const [q, setQ] = useState("");
  const [street, setStreet] = useState<string>(ALL_STREETS);
  const [editing, setEditing] = useState<Neighbor | "new" | null>(null);
  const [historyFor, setHistoryFor] = useState<Neighbor | null>(null);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [editCommunity, setEditCommunity] = useState(false);

  const community = useQuery({
    queryKey: ["communities", id],
    queryFn: () => apiGet<Community>(`/communities/${id}`),
    refetchInterval: 20_000,
  });
  const neighbors = useQuery({
    queryKey: ["neighbors", id],
    queryFn: () => apiGet<Neighbor[]>(`/communities/${id}/neighbors`),
    refetchInterval: 20_000,
  });

  const communityPhotos = useQuery({
    queryKey: ["community-photos", id],
    queryFn: () => apiGet<Photo[]>(`/communities/${id}/photos`),
  });
  const photoCount = (street: string) =>
    (communityPhotos.isError ? [] : (communityPhotos.data ?? [])).filter((p) => (p.street ?? "") === street).length;

  const toggle = useMutation({
    mutationFn: (n: Neighbor) =>
      apiPatch<Neighbor>(`/neighbors/${n.id}`, { status: n.status === "instalado" ? "pendiente" : "instalado" }),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["neighbors", id] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["history", n.id] });
      if (n.status === "instalado") {
        toast.success(`${n.unit} marcado como instalado`, {
          action: { label: "Añadir foto", onClick: () => setPhotoTarget(neighborTarget(n)) },
          duration: 6000,
        });
      } else {
        toast.success(`${n.unit} vuelve a pendiente`);
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const exportExcel = useMutation({
    mutationFn: () => apiBlob(`/communities/${id}/export`),
    onSuccess: async ({ blob, filename }) => {
      const file = new File([blob], filename, { type: blob.type });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Excel descargado");
    },
    onError: (e) => toast.error(errorMessage(e, "No se pudo generar el Excel")),
  });

  const removeCommunity = useMutation({
    mutationFn: () => apiDelete(`/communities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      toast.success("Comunidad eliminada");
      navigate("/");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const c = community.isError ? undefined : community.data;
  const all = neighbors.isError ? [] : (neighbors.data ?? []);
  const streets = Array.from(new Set(all.map((n) => n.street).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
  const hasNoStreet = all.some((n) => !n.street);
  const activeStreet = street === ALL_STREETS || street === NO_STREET || streets.includes(street) ? street : ALL_STREETS;
  const inStreet = (n: Neighbor) =>
    activeStreet === ALL_STREETS || (activeStreet === NO_STREET ? !n.street : n.street === activeStreet);
  const streetPending = (s: string) =>
    all.filter((n) => n.status === "pendiente" && (s === ALL_STREETS || (s === NO_STREET ? !n.street : n.street === s))).length;
  const base = all.filter(inStreet);
  const visible = base
    .filter((n) => filter === "todos" || n.status === filter)
    .filter((n) => `${n.name} ${n.unit} ${n.street}`.toLowerCase().includes(q.toLowerCase()));
  const counts: Record<Filter, number> = {
    todos: base.length,
    pendiente: base.filter((n) => n.status === "pendiente").length,
    instalado: base.filter((n) => n.status === "instalado").length,
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand" data-testid="back-to-communities-link">
        <ArrowLeft className="size-4" /> Comunidades
      </Link>

      <CommunityHeader
        community={c}
        isAdmin={isAdmin}
        exporting={exportExcel.isPending}
        onExport={() => exportExcel.mutate()}
        onEdit={() => setEditCommunity(true)}
        onDelete={() => removeCommunity.mutate()}
        photoCount={photoCount("")}
        onPhotos={() => c && setPhotoTarget(communityTarget(id, c.name))}
      />

      <StreetTabs streets={streets} hasNoStreet={hasNoStreet} active={activeStreet} onChange={setStreet} pendingFor={streetPending} />
      {c && streets.includes(activeStreet) && (
        <button
          type="button"
          onClick={() => setPhotoTarget(communityTarget(id, c.name, activeStreet))}
          data-testid="street-photos-button"
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left transition-colors duration-150 hover:border-brand md:w-auto md:justify-start"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Camera className="size-4 text-brand" /> Fotos de la instalación en {activeStreet}
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800" data-testid="street-photos-count">{photoCount(activeStreet)}</span>
        </button>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" data-testid="neighbor-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-${f.key}`}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 md:flex-none",
                filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-xs", f.key === "pendiente" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600")}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar vecino, calle o piso..." className="h-12 rounded-xl bg-white pl-10" data-testid="neighbor-search-input" />
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setEditing("new")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-bold text-white transition-colors duration-150 hover:bg-sky-700" data-testid="add-neighbor-button">
            <Plus className="size-5" /> Añadir vecino
          </button>
        )}
      </div>

      {neighbors.isPending ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />)}</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500" data-testid="neighbors-empty">
          {neighbors.isError
            ? "No se pudieron cargar los vecinos."
            : filter === "pendiente" && base.length > 0 && !q
              ? activeStreet === ALL_STREETS ? "¡No queda nada pendiente en esta comunidad!" : "¡No queda nada pendiente en esta calle!"
              : "No hay vecinos que mostrar."}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4" data-testid="neighbors-list">
          {visible.map((n) => (
            <NeighborCard
              key={n.id}
              neighbor={n}
              busy={toggle.isPending && toggle.variables?.id === n.id}
              onToggle={() => toggle.mutate(n)}
              onEdit={() => setEditing(n)}
              onHistory={() => setHistoryFor(n)}
              onPhotos={() => setPhotoTarget(neighborTarget(n))}
            />
          ))}
        </div>
      )}

      {editing && (
        <NeighborFormDialog
          key={editing === "new" ? "new" : editing.id}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          communityId={id}
          neighbor={editing === "new" ? undefined : editing}
          isAdmin={isAdmin}
          streets={streets}
        />
      )}
      <HistorySheet neighbor={historyFor} onOpenChange={(o) => !o && setHistoryFor(null)} />
      <PhotosSheet target={photoTarget} me={me} onOpenChange={(o) => !o && setPhotoTarget(null)} />
      {isAdmin && c && editCommunity && (
        <CommunityFormDialog open={editCommunity} onOpenChange={setEditCommunity} community={c} />
      )}
    </div>
  );
}

export default function CommunityDetail() {
  const { id = "" } = useParams();
  return <AppShell>{(me) => <DetailView me={me} id={id} />}</AppShell>;
}

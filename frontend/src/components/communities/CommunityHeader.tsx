import { Camera, FileSpreadsheet, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Community } from "@/lib/types";

interface Props {
  community: Community | undefined;
  isAdmin: boolean;
  exporting: boolean;
  onExport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  photoCount: number;
  onPhotos: () => void;
}

const ACTION_BTN =
  "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150";

export default function CommunityHeader({ community: c, isAdmin, exporting, onExport, onEdit, onDelete, photoCount, onPhotos }: Props) {
  const pct = c && c.total ? Math.round((c.installed / c.total) * 100) : 0;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 text-white md:p-8">
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-brand/40 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-4xl" data-testid="community-detail-name">
            {c?.name ?? "Comunidad"}
          </h1>
          {c?.address && (
            <p className="mt-1 flex items-center gap-1.5 text-slate-300"><MapPin className="size-4" /> {c.address}</p>
          )}
          {c && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={onExport}
                className={`${ACTION_BTN} bg-orange text-white hover:bg-orange-hover disabled:opacity-60`}
                data-testid="export-excel-button"
              >
                <FileSpreadsheet className="size-4" /> {exporting ? "Generando..." : "Excel"}
              </button>
              <button type="button" onClick={onPhotos} className={`${ACTION_BTN} bg-white/10 hover:bg-white/20`} data-testid="community-photos-button">
                <Camera className="size-4" /> Fotos
                <span className="rounded-full bg-white/20 px-1.5 text-xs" data-testid="community-photos-count">{photoCount}</span>
              </button>
              {isAdmin && (
                <>
                  <button type="button" onClick={onEdit} className={`${ACTION_BTN} bg-white/10 hover:bg-white/20`} data-testid="edit-community-button">
                    <Pencil className="size-4" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${c.name}" y todos sus vecinos?`)) onDelete();
                    }}
                    className={`${ACTION_BTN} bg-white/10 hover:bg-red-500/80`}
                    data-testid="delete-community-button"
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="w-full md:w-72">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-slate-300" data-testid="community-detail-progress">{c?.installed ?? 0} de {c?.total ?? 0} instalados</span>
            <span className="font-mono text-2xl font-bold text-orange">{pct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-orange transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

import { motion } from "motion/react";
import { Camera, CheckCircle2, History, MapPin, MonitorSmartphone, Pencil, Phone, RotateCcw, StickyNote } from "lucide-react";
import type { Neighbor } from "@/lib/types";
import { DEVICE_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  neighbor: Neighbor;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onPhotos: () => void;
}

export default function NeighborCard({ neighbor: n, busy, onToggle, onEdit, onHistory, onPhotos }: Props) {
  const installed = n.status === "instalado";
  const DeviceIcon = n.device_type === "monitor" ? MonitorSmartphone : Phone;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      data-testid={`neighbor-card-${n.id}`}
      className={cn(
        "rounded-2xl border p-4 shadow-sm transition-colors duration-300 md:p-5",
        installed ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50/60",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {n.street && (
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500" data-testid="neighbor-street">
              <MapPin className="size-3.5" /> {n.street}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-sky-100 px-2 py-0.5 font-mono text-sm font-bold tracking-tight text-sky-900" data-testid="neighbor-unit">
              {n.unit}
            </span>
            <span className="truncate font-heading text-lg font-semibold text-slate-900" data-testid="neighbor-name">
              {n.name}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700" data-testid="neighbor-device-type">
              <DeviceIcon className="size-3.5 text-brand" /> {DEVICE_LABELS[n.device_type]}
            </span>
            <span
              data-testid="neighbor-status-badge"
              className={cn(
                "rounded-full px-2.5 py-1",
                installed ? "bg-green-100 text-green-700" : "bg-orange text-white",
              )}
            >
              {installed ? "Instalado" : "Pendiente"}
            </span>
            {n.phone && (
              <a href={`tel:${n.phone}`} className="flex items-center gap-1 rounded-full px-2 py-1 text-brand underline-offset-2 hover:underline" data-testid="neighbor-phone-link">
                <Phone className="size-3.5" /> {n.phone}
              </a>
            )}
          </div>
          {n.notes && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600" data-testid="neighbor-notes">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" /> {n.notes}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500" data-testid="neighbor-last-modified">
            {installed && n.installed_at
              ? `Instalado por ${n.installed_by_name} · ${formatDateTime(n.installed_at)}`
              : `Últ. modificación: ${n.updated_by_name} · ${formatDateTime(n.updated_at)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPhotos}
            data-testid="neighbor-photos-button"
            aria-label="Fotos"
            className="relative grid size-11 shrink-0 place-items-center md:size-12 rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            <Camera className="size-5" />
            {n.photo_count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white" data-testid="neighbor-photo-count">
                {n.photo_count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onHistory}
            data-testid="neighbor-history-button"
            aria-label="Ver historial"
            className="grid size-11 shrink-0 place-items-center rounded-xl border md:size-12 border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            <History className="size-5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            data-testid="neighbor-edit-button"
            aria-label="Editar"
            className="grid size-11 shrink-0 place-items-center rounded-xl border md:size-12 border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            <Pencil className="size-5" />
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={busy}
            onClick={onToggle}
            data-testid="neighbor-toggle-status-button"
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-bold md:h-12 md:px-4 transition-colors duration-150 disabled:opacity-60 md:flex-none",
              installed
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "animate-pulse-ring bg-orange text-white shadow-sm hover:bg-orange-hover",
            )}
          >
            {installed ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-5" />}
            {installed ? "Marcar pendiente" : "Marcar instalado"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

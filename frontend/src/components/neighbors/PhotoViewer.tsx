import { Trash2, X } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { Photo } from "@/lib/types";

export function PhotoGrid({ photos, onOpen }: { photos: Photo[]; onOpen: (p: Photo) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="photos-grid">
      {photos.map((p) => (
        <button key={p.id} type="button" onClick={() => onOpen(p)} data-testid={`photo-thumb-${p.id}`}
          className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          <img src={`/api/photos/${p.id}`} alt="Foto de instalación" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-[11px] font-semibold text-white">
            {p.uploaded_by_name}<br />{formatDateTime(p.created_at)}
          </span>
        </button>
      ))}
    </div>
  );
}

interface ViewerProps {
  photo: Photo;
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export function PhotoViewer({ photo, canDelete, onDelete, onClose }: ViewerProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" data-testid="photo-viewer">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">{photo.uploaded_by_name} · {formatDateTime(photo.created_at)}</span>
        <div className="flex gap-2">
          {canDelete && (
            <button type="button" onClick={() => { if (window.confirm("¿Eliminar esta foto?")) onDelete(); }}
              className="grid size-11 place-items-center rounded-xl bg-white/10 hover:bg-red-500/80" data-testid="photo-viewer-delete-button" aria-label="Eliminar foto">
              <Trash2 className="size-5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            data-testid="photo-viewer-close-button" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
      </div>
      <img src={`/api/photos/${photo.id}`} alt="Foto de instalación" className="min-h-0 flex-1 object-contain" />
    </div>
  );
}

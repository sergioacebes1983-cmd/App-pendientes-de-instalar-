import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiGet } from "@/lib/api";
import { formatDateTime, prettyValue } from "@/lib/format";
import type { HistoryEntry, Neighbor } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<HistoryEntry["action"], string> = {
  creado: "Vecino creado",
  modificado: "Datos modificados",
  instalado: "Marcado como instalado",
  pendiente: "Marcado como pendiente",
  foto: "Fotos añadidas",
  foto_borrada: "Foto eliminada",
};

const ACTION_DOT: Record<HistoryEntry["action"], string> = {
  creado: "bg-slate-400",
  modificado: "bg-brand",
  instalado: "bg-green-500",
  pendiente: "bg-orange",
  foto: "bg-sky-400",
  foto_borrada: "bg-red-400",
};

interface Props {
  neighbor: Neighbor | null;
  onOpenChange: (open: boolean) => void;
}

export default function HistorySheet({ neighbor, onOpenChange }: Props) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["history", neighbor?.id],
    queryFn: () => apiGet<HistoryEntry[]>(`/neighbors/${neighbor!.id}/history`),
    enabled: !!neighbor,
  });

  return (
    <Sheet open={!!neighbor} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" data-testid="history-sheet">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">Historial de cambios</SheetTitle>
          <SheetDescription data-testid="history-sheet-neighbor">
            {neighbor ? [neighbor.street, neighbor.unit, "·", neighbor.name].filter(Boolean).join(" ") : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          {isPending && <p className="text-sm text-slate-500">Cargando...</p>}
          {isError && <p className="text-sm text-slate-500">No se pudo cargar el historial.</p>}
          {data && data.length === 0 && <p className="text-sm text-slate-500" data-testid="history-empty">Sin cambios registrados.</p>}
          <ol className="relative space-y-5 border-l-2 border-slate-200 pl-5" data-testid="history-list">
            {data?.map((h) => (
              <li key={h.id} className="relative" data-testid={`history-entry-${h.id}`}>
                <span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-white", ACTION_DOT[h.action])} />
                <p className="text-sm font-semibold text-slate-900">{ACTION_LABELS[h.action]}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700" data-testid="history-entry-user">{h.user_name}</span> ·{" "}
                  <span data-testid="history-entry-time">{formatDateTime(h.timestamp)}</span>
                </p>
                {h.changes.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2.5 text-xs">
                    {h.changes.map((c) => (
                      <li key={`${h.id}-${c.field}`} className="text-slate-600">
                        <span className="font-semibold text-slate-800">{c.field}:</span>{" "}
                        <span className="line-through decoration-slate-400">{prettyValue(c.old)}</span> →{" "}
                        <span className="font-semibold text-slate-900">{prettyValue(c.new)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}

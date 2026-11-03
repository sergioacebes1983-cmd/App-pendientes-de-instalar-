import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { DEVICE_LABELS, STATUS_LABELS } from "@/lib/types";
import type { DeviceType, Neighbor, NeighborCreate, Status } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  neighbor?: Neighbor;
  isAdmin: boolean;
  streets: string[];
}

export default function NeighborFormDialog({ open, onOpenChange, communityId, neighbor, isAdmin, streets }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<NeighborCreate>({
    name: neighbor?.name ?? "",
    street: neighbor?.street ?? "",
    unit: neighbor?.unit ?? "",
    phone: neighbor?.phone ?? "",
    device_type: neighbor?.device_type ?? "telefono",
    status: neighbor?.status ?? "pendiente",
    notes: neighbor?.notes ?? "",
  });
  const set = <K extends keyof NeighborCreate>(k: K, v: NeighborCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const lockDetails = !isAdmin;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["neighbors", communityId] });
    qc.invalidateQueries({ queryKey: ["communities"] });
    qc.invalidateQueries({ queryKey: ["history"] });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!neighbor) return apiPost<Neighbor>(`/communities/${communityId}/neighbors`, form);
      const body = isAdmin ? form : { status: form.status, notes: form.notes };
      return apiPatch<Neighbor>(`/neighbors/${neighbor.id}`, body);
    },
    onSuccess: () => {
      invalidate();
      toast.success(neighbor ? "Cambios guardados" : "Vecino añadido");
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => apiDelete(`/neighbors/${neighbor!.id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Vecino eliminado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" data-testid="neighbor-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{neighbor ? "Editar vecino" : "Nuevo vecino"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          {lockDetails && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800" data-testid="neighbor-form-worker-hint">
              Como trabajador puedes cambiar el estado y las notas.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="n-street">Calle / portal (opcional)</Label>
            <Input id="n-street" list="street-options" className="h-12" disabled={lockDetails} value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Ej. C/ Mayor 12" data-testid="neighbor-form-street-input" />
            <datalist id="street-options">
              {streets.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1.5">
              <Label htmlFor="n-unit">Piso/Puerta</Label>
              <Input id="n-unit" className="h-12 font-mono" required disabled={lockDetails} value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="2º B" data-testid="neighbor-form-unit-input" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="n-name">Nombre</Label>
              <Input id="n-name" className="h-12" required disabled={lockDetails} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre del vecino" data-testid="neighbor-form-name-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-phone">Teléfono de contacto</Label>
            <Input id="n-phone" type="tel" className="h-12" disabled={lockDetails} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="600 000 000" data-testid="neighbor-form-phone-input" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Falta instalar</Label>
              <Select value={form.device_type} onValueChange={(v: string) => set("device_type", v as DeviceType)} disabled={lockDetails}>
                <SelectTrigger className="h-12 w-full" data-testid="neighbor-form-device-select">
                  <SelectValue>{(v) => DEVICE_LABELS[v as DeviceType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telefono" data-testid="device-option-telefono">Teléfono portero</SelectItem>
                  <SelectItem value="monitor" data-testid="device-option-monitor">Monitor videoportero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v: string) => set("status", v as Status)}>
                <SelectTrigger className="h-12 w-full" data-testid="neighbor-form-status-select">
                  <SelectValue>{(v) => STATUS_LABELS[v as Status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente" data-testid="status-option-pendiente">Pendiente</SelectItem>
                  <SelectItem value="instalado" data-testid="status-option-instalado">Instalado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-notes">Notas</Label>
            <Textarea id="n-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ej. no estaba en casa, volver por la tarde" data-testid="neighbor-form-notes-input" />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {neighbor && isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                className="h-12 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`¿Eliminar a ${neighbor.name} (${neighbor.unit})?`)) remove.mutate();
                }}
                data-testid="neighbor-form-delete-button"
              >
                Eliminar vecino
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" className="h-12 bg-orange text-white hover:bg-orange-hover" disabled={save.isPending} data-testid="neighbor-form-submit-button">
              {save.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

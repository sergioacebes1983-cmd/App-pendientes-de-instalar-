import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost, apiPut } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Community, CommunityCreate } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community?: Community;
}

export default function CommunityFormDialog({ open, onOpenChange, community }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(community?.name ?? "");
  const [address, setAddress] = useState(community?.address ?? "");

  const mutation = useMutation({
    mutationFn: (body: CommunityCreate) =>
      community ? apiPut<Community>(`/communities/${community.id}`, body) : apiPost<Community>("/communities", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      toast.success(community ? "Comunidad actualizada" : "Comunidad creada");
      onOpenChange(false);
      if (!community) {
        setName("");
        setAddress("");
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="community-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{community ? "Editar comunidad" : "Nueva comunidad"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ name, address });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nombre de la comunidad</Label>
            <Input id="c-name" className="h-12" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Comunidad Los Olivos 14" data-testid="community-form-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-addr">Dirección (opcional)</Label>
            <Input id="c-addr" className="h-12" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, ciudad" data-testid="community-form-address-input" />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-12 w-full bg-orange text-white hover:bg-orange-hover sm:w-auto" disabled={mutation.isPending} data-testid="community-form-submit-button">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

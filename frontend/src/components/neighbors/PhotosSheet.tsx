import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, ImagePlus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiDelete, apiGet, apiUpload } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { PhotoGrid, PhotoViewer } from "@/components/neighbors/PhotoViewer";
import type { Neighbor, Photo, User } from "@/lib/types";

/** Where photos are attached: one neighbor, the whole community, or one street of it. */
export interface PhotoTarget {
  key: string;
  title: string;
  subtitle: string;
  listPath: string;
  uploadPath: string;
  form?: Record<string, string>;
  invalidate: string[][];
}

export function neighborTarget(n: Neighbor): PhotoTarget {
  return {
    key: `n-${n.id}`,
    title: "Fotos de instalación",
    subtitle: [n.street, n.unit, "·", n.name].filter(Boolean).join(" "),
    listPath: `/neighbors/${n.id}/photos`,
    uploadPath: `/neighbors/${n.id}/photos`,
    invalidate: [["neighbors", n.community_id], ["history", n.id]],
  };
}

export function communityTarget(communityId: string, communityName: string, street = ""): PhotoTarget {
  return {
    key: `c-${communityId}-${street}`,
    title: street ? "Fotos de la calle" : "Fotos de la comunidad",
    subtitle: street ? `${street} · ${communityName}` : `${communityName} · fotos generales`,
    listPath: `/communities/${communityId}/photos?street=${encodeURIComponent(street)}`,
    uploadPath: `/communities/${communityId}/photos`,
    form: { street },
    invalidate: [["community-photos", communityId]],
  };
}

// Downscale to max 1600px JPEG before upload — phone photos are 3–10 MB otherwise.
async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

interface Props {
  target: PhotoTarget | null;
  me: User;
  onOpenChange: (open: boolean) => void;
}

export default function PhotosSheet({ target, me, onOpenChange }: Props) {
  const qc = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);

  const photos = useQuery({
    queryKey: ["photos", target?.key],
    queryFn: () => apiGet<Photo[]>(target!.listPath),
    enabled: !!target,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["photos", target?.key] });
    for (const key of target?.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
  };

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      for (const f of files) {
        const blob = await compress(f);
        const name = blob === f ? f.name : f.name.replace(/\.[^.]+$/, "") + ".jpg";
        form.append("files", blob, name);
      }
      for (const [k, v] of Object.entries(target!.form ?? {})) form.append(k, v);
      return apiUpload<Photo[]>(target!.uploadPath, form);
    },
    onSuccess: (p) => {
      invalidate();
      toast.success(p.length === 1 ? "Foto añadida" : `${p.length} fotos añadidas`);
    },
    onError: (e) => toast.error(errorMessage(e, "No se pudo subir la foto")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/photos/${id}`),
    onSuccess: () => {
      invalidate();
      setViewing(null);
      toast.success("Foto eliminada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, 10);
    if (files.length) upload.mutate(files);
  };

  const list = photos.isError ? [] : (photos.data ?? []);

  return (
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) setViewing(null); onOpenChange(o); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" data-testid="photos-sheet">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl" data-testid="photos-sheet-title">{target?.title ?? "Fotos"}</SheetTitle>
          <SheetDescription data-testid="photos-sheet-neighbor">{target?.subtitle ?? ""}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={upload.isPending}
              onClick={() => cameraRef.current?.click()}
              data-testid="photos-take-button"
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-orange font-bold text-white transition-colors duration-150 hover:bg-orange-hover disabled:opacity-60"
            >
              <Camera className="size-5" /> Hacer foto
            </button>
            <button
              type="button"
              disabled={upload.isPending}
              onClick={() => galleryRef.current?.click()}
              data-testid="photos-gallery-button"
              className="flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 transition-colors duration-150 hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <ImagePlus className="size-5" /> Galería
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" data-testid="photos-camera-input"
              onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" data-testid="photos-file-input"
              onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          </div>
          {upload.isPending && <p className="text-sm font-semibold text-brand" data-testid="photos-uploading">Subiendo fotos...</p>}

          {photos.isPending ? (
            <div className="grid grid-cols-2 gap-2">{[0, 1].map((i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200" />)}</div>
          ) : list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500" data-testid="photos-empty">
              Aún no hay fotos. Puedes añadir las que quieras como comprobante.
            </p>
          ) : (
            <PhotoGrid photos={list} onOpen={setViewing} />
          )}
        </div>

        {viewing && (
          <PhotoViewer
            photo={viewing}
            canDelete={me.role === "admin" || viewing.uploaded_by_id === me.id}
            onDelete={() => remove.mutate(viewing.id)}
            onClose={() => setViewing(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

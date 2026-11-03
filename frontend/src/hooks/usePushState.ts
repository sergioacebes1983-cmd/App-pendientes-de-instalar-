import { useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, getPushState } from "@/lib/push";
import type { PushState } from "@/lib/push";

const MESSAGES = {
  needsInstall: "En iPhone, primero instala la app (Compartir → Añadir a pantalla de inicio) y ábrela desde el icono para activar los avisos.",
  blocked: "Los avisos están bloqueados. Actívalos en los ajustes del navegador para este sitio.",
  off: "Avisos desactivados en este dispositivo",
  on: "Avisos activados: te llegará una notificación cuando un compañero instale algo",
};

/** Push-notification state for this device plus a toggle that handles every edge case. */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  const switchPush = async (current: PushState) => {
    setBusy(true);
    try {
      if (current === "on") {
        await disablePush();
        setState("off");
        toast.success(MESSAGES.off);
      } else {
        await enablePush();
        setState("on");
        toast.success(MESSAGES.on);
      }
    } catch {
      const s = await getPushState().catch(() => "off" as PushState);
      setState(s);
      toast.error(s === "denied" ? "Has bloqueado los avisos en este navegador" : "No se pudieron activar los avisos");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    if (state === "needs-install") return void toast.info(MESSAGES.needsInstall, { duration: 8000 });
    if (state === "denied") return void toast.error(MESSAGES.blocked, { duration: 8000 });
    if (state) await switchPush(state);
  };

  return { state, busy, toggle };
}

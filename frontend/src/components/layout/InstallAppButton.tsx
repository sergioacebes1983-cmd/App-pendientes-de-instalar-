import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        data-testid="install-app-button"
        className="flex min-h-11 items-center gap-2 rounded-xl bg-sky-50 px-3 text-sm font-semibold text-brand transition-colors duration-150 hover:bg-sky-100"
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Instalar app</span>
      </button>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent data-testid="install-help-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Instalar como aplicación</DialogTitle>
            <DialogDescription>Tendrás el icono en la pantalla de inicio y se abrirá a pantalla completa, como una app.</DialogDescription>
          </DialogHeader>
          {isIOS() ? (
            <ol className="space-y-3 text-sm text-slate-700" data-testid="install-help-ios">
              <li className="flex items-center gap-2"><span className="font-bold text-orange">1.</span> Abre esta página en <b>Safari</b>.</li>
              <li className="flex items-center gap-2"><span className="font-bold text-orange">2.</span> Pulsa <Share className="size-4 text-brand" /> <b>Compartir</b> (abajo).</li>
              <li className="flex items-center gap-2"><span className="font-bold text-orange">3.</span> Elige <SquarePlus className="size-4 text-brand" /> <b>Añadir a pantalla de inicio</b>.</li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-slate-700" data-testid="install-help-other">
              <li><span className="font-bold text-orange">Android (Chrome):</span> menú <b>⋮</b> → <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</li>
              <li><span className="font-bold text-orange">PC (Chrome / Edge):</span> icono de instalar <Download className="inline size-4 text-brand" /> en la barra de direcciones, o menú → <b>Instalar PorteroControl</b>.</li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

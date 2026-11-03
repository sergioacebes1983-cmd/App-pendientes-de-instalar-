import { Bell, BellOff, BellRing } from "lucide-react";
import { usePushState } from "@/hooks/usePushState";
import { cn } from "@/lib/utils";

export default function NotificationsButton() {
  const { state, busy, toggle } = usePushState();
  if (state === null || state === "unsupported") return null;

  const on = state === "on";
  const Icon = on ? BellRing : state === "denied" ? BellOff : Bell;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      data-testid="notifications-toggle-button"
      data-state={state}
      aria-label={on ? "Desactivar avisos" : "Activar avisos"}
      className={cn(
        "relative flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 disabled:opacity-60",
        on ? "bg-orange-50 text-orange hover:bg-orange-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      )}
    >
      <Icon className="size-4" />
      <span className="hidden lg:inline">{on ? "Avisos activos" : "Activar avisos"}</span>
      {state === "off" && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-orange" />}
    </button>
  );
}

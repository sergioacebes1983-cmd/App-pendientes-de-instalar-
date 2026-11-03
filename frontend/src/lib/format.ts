import { ApiError } from "./api";

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return fmt.format(new Date(iso));
}

const STATUS_VALUES: Record<string, string> = {
  telefono: "Teléfono portero",
  monitor: "Monitor videoportero",
  pendiente: "Pendiente",
  instalado: "Instalado",
};

export function prettyValue(v: string | null): string {
  if (!v) return "(vacío)";
  return STATUS_VALUES[v] ?? v;
}

export function errorMessage(err: unknown, fallback = "Ha ocurrido un error"): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    if (err.status === 422) return "Revisa los datos del formulario";
  }
  return fallback;
}

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const ALL_STREETS = "__all__";
export const NO_STREET = "__none__";

interface Props {
  streets: string[];
  hasNoStreet: boolean;
  active: string;
  onChange: (key: string) => void;
  pendingFor: (key: string) => number;
}

export default function StreetTabs({ streets, hasNoStreet, active, onChange, pendingFor }: Props) {
  if (streets.length === 0) return null;
  const tabs = [
    { key: ALL_STREETS, label: "Todas las calles" },
    ...streets.map((s) => ({ key: s, label: s })),
    ...(hasNoStreet ? [{ key: NO_STREET, label: "Sin calle" }] : []),
  ];
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" data-testid="street-filter-tabs">
      <div className="flex w-max gap-2 pb-1">
        {tabs.map((t, i) => {
          const isActive = active === t.key;
          const pend = pendingFor(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              aria-pressed={isActive}
              data-testid={`street-tab-${i}`}
              className={cn(
                "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-150",
                isActive ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand",
              )}
            >
              <MapPin className="size-3.5" />
              {t.label}
              {pend > 0 ? (
                <span className={cn("rounded-full px-1.5 text-xs", isActive ? "bg-orange text-white" : "bg-orange-100 text-orange-700")}>{pend}</span>
              ) : (
                <span className={cn("rounded-full px-1.5 text-xs", isActive ? "bg-white/20" : "bg-green-100 text-green-700")}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

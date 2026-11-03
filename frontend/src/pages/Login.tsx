import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, MonitorSmartphone, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { errorMessage } from "@/lib/format";
import type { LoginRequest, User } from "@/lib/types";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: (body: LoginRequest) => apiPost<User>("/auth/login", body),
    onSuccess: () => {
      beginSession();
      navigate("/", { replace: true });
    },
    onError: (e) => setError(errorMessage(e, "No se pudo iniciar sesión")),
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="absolute -bottom-32 left-10 size-80 rounded-full bg-orange/25 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="rounded-2xl bg-white px-4 py-3 shadow-lg"><img src="/logo-fermy.png" alt="Fermy" className="h-9 w-auto" data-testid="login-company-logo" /></span>
          <span className="font-heading text-2xl font-bold">Portero<span className="text-orange">Control</span></span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight">
            Cada portero instalado, <span className="text-orange">visible al momento</span> para todo el equipo.
          </h1>
          <ul className="mt-8 space-y-3 text-slate-300">
            <li className="flex items-center gap-3"><Phone className="size-5 text-sky-400" /> Teléfonos de portero pendientes</li>
            <li className="flex items-center gap-3"><MonitorSmartphone className="size-5 text-sky-400" /> Monitores de videoportero</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-orange" /> Quién lo instaló y cuándo</li>
          </ul>
        </div>
        <p className="relative text-sm text-slate-400">Fermy · Instalaciones de telecomunicaciones · Valladolid</p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <img src="/logo-fermy.png" alt="Fermy" className="h-10 w-auto" data-testid="login-company-logo-mobile" />
            <p className="mt-2 font-heading text-sm font-bold tracking-tight text-slate-600">Portero<span className="text-orange">Control</span></p>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mt-2 text-slate-600">Accede con la cuenta que te ha dado el administrador.</p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              login.mutate({ email: email.trim(), password });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.es" data-testid="login-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" required className="h-12 text-base" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="login-error-message">
                {error}
              </p>
            )}
            <Button type="submit" disabled={login.isPending} className="h-12 w-full bg-orange text-base font-bold text-white hover:bg-orange-hover" data-testid="login-submit-button">
              {login.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

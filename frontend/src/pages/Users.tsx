import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { errorMessage, formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User, UserCreate, UserUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const empty: UserCreate = { name: "", email: "", password: "", role: "trabajador" };
  const [form, setForm] = useState<UserCreate>(empty);
  const create = useMutation({
    mutationFn: () => apiPost<User>("/users", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado");
      setForm(empty);
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-user-dialog">
        <DialogHeader><DialogTitle className="font-heading text-xl">Nuevo usuario</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Nombre</Label>
            <Input id="u-name" className="h-12" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-form-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" className="h-12" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-form-email-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">Contraseña (mín. 6 caracteres)</Label>
            <Input id="u-pass" type="text" minLength={6} className="h-12" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-form-password-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={form.role} onValueChange={(v: string) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger className="h-12 w-full" data-testid="user-form-role-select">
                <SelectValue>{(v) => ROLE_LABELS[v as Role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trabajador" data-testid="role-option-trabajador">Trabajador</SelectItem>
                <SelectItem value="admin" data-testid="role-option-admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending} className="h-12 w-full bg-orange text-white hover:bg-orange-hover sm:w-auto" data-testid="user-form-submit-button">
              {create.isPending ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersView({ me }: { me: User }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/users") });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserUpdate }) => apiPatch<User>(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const users = isError ? [] : (data ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange">Administración</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Usuarios</h1>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange px-5 font-bold text-white transition-colors duration-150 hover:bg-orange-hover" data-testid="new-user-button">
          <Plus className="size-5" /> Nuevo usuario
        </button>
      </div>

      {isPending ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : (
        <div className="space-y-3" data-testid="users-list">
          {users.map((u) => {
            const self = u.id === me.id;
            return (
              <div key={u.id} data-testid={`user-row-${u.id}`} className={cn("flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center", !u.active && "opacity-60")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-full font-heading font-bold text-white", u.role === "admin" ? "bg-orange" : "bg-brand")}>
                    {u.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900" data-testid="user-row-name">
                      {u.name} {self && <span className="text-xs font-normal text-slate-500">(tú)</span>}
                    </div>
                    <div className="truncate text-sm text-slate-500" data-testid="user-row-email">{u.email}</div>
                    <div className="text-xs text-slate-400">Alta: {formatDateTime(u.created_at)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={u.role} disabled={self} onValueChange={(v: string) => update.mutate({ id: u.id, body: { role: v as Role } })}>
                    <SelectTrigger className="h-11 w-44" data-testid="user-row-role-select">
                      <SelectValue>{(v) => ROLE_LABELS[v as Role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trabajador">Trabajador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => {
                      const pw = window.prompt(`Nueva contraseña para ${u.name} (mín. 6 caracteres):`);
                      if (pw) update.mutate({ id: u.id, body: { password: pw } });
                    }}
                    className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:border-brand hover:text-brand"
                    data-testid="user-row-reset-password-button"
                  >
                    <KeyRound className="size-4" /> Contraseña
                  </button>
                  <button
                    type="button"
                    disabled={self}
                    onClick={() => update.mutate({ id: u.id, body: { active: !u.active } })}
                    className={cn(
                      "flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                      u.active ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-green-200 text-green-700 hover:bg-green-50",
                    )}
                    data-testid="user-row-toggle-active-button"
                  >
                    {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                    {u.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <CreateUserDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

export default function Users() {
  return <AppShell adminOnly>{(me) => <UsersView me={me} />}</AppShell>;
}

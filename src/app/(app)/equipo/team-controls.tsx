"use client";

import { Copy, Send, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_INFO, type UserRole } from "@/lib/constants";
import { changeRole, inviteMember, removeMember, revokeInvitation } from "./actions";

function RoleOptions() {
  return (
    <>
      {(Object.keys(ROLE_INFO) as UserRole[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_INFO[r].label}
        </option>
      ))}
    </>
  );
}

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mb-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await inviteMember(email, role);
          if (res.error) return void toast.error(res.error);
          toast.success("Invitación creada. Comparte el enlace de registro con esa persona.");
          setEmail("");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">Invitar por correo</Label>
        <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@agencia.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="invite-role">Rol</Label>
        <NativeSelect id="invite-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <RoleOptions />
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending}>
        <Send /> Invitar
      </Button>
    </form>
  );
}

export function MemberRoleControl({ userId, role }: { userId: string; role: UserRole }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="Rol"
        className="w-40"
        defaultValue={role}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const res = await changeRole(userId, e.target.value);
            if (res.error) toast.error(res.error);
            else toast.success("Rol actualizado");
            router.refresh();
          })
        }
      >
        <RoleOptions />
      </NativeSelect>
      <ConfirmButton
        trigger={
          <Button variant="ghost" size="icon" aria-label="Quitar del equipo">
            <UserMinus />
          </Button>
        }
        title="¿Quitar a esta persona del equipo?"
        description="Perderá el acceso de inmediato. Su contenido se conserva."
        confirmLabel="Quitar"
        onConfirm={async () => {
          const res = await removeMember(userId);
          if (res.error) toast.error(res.error);
          else toast.success("Miembro eliminado");
          router.refresh();
        }}
      />
    </div>
  );
}

export function InvitationRow({
  invitation,
  registerUrl,
  canManage,
}: {
  invitation: { id: string; email: string; role: UserRole };
  registerUrl: string;
  canManage: boolean;
}) {
  const router = useRouter();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">{ROLE_INFO[invitation.role].label} · debe registrarse con este correo</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(registerUrl);
            toast.success("Enlace copiado. Envíalo por WhatsApp o correo.");
          }}
        >
          <Copy /> Copiar enlace
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const res = await revokeInvitation(invitation.id);
              if (res.error) toast.error(res.error);
              router.refresh();
            }}
          >
            <X /> Cancelar
          </Button>
        )}
      </div>
    </li>
  );
}

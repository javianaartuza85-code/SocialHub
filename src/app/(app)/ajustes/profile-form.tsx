"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

export function ProfileForm({ fullName }: { fullName: string }) {
  const [name, setName] = useState(fullName);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProfile(name);
          if (r.error) toast.error(r.error);
          else toast.success("Nombre actualizado");
        });
      }}
    >
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="full-name">Nombre</Label>
        <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" disabled={pending || name === fullName}>
        Guardar
      </Button>
    </form>
  );
}

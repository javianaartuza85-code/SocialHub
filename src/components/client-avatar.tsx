import { cn } from "@/lib/utils";

export function ClientAvatar({
  client,
  className,
}: {
  client: { name: string; logo_url?: string | null; color_primary?: string | null };
  className?: string;
}) {
  if (client.logo_url) {
    return <img src={client.logo_url} alt="" className={cn("size-9 shrink-0 rounded-lg object-cover", className)} />;
  }
  const initials = client.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white", className)}
      style={{ backgroundColor: client.color_primary ?? "#6366f1" }}
    >
      {initials}
    </span>
  );
}

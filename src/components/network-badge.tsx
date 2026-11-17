import { NETWORK_INFO, type Network } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SHORT: Record<Network, string> = { instagram: "IG", facebook: "f", tiktok: "TT", linkedin: "in", x: "X" };

/** Distintivo compacto de cada red (sin usar logotipos de marca). */
export function NetworkBadge({ network, size = "sm", className }: { network: Network; size?: "xs" | "sm" | "md"; className?: string }) {
  const info = NETWORK_INFO[network];
  return (
    <span
      title={info.label}
      aria-label={info.label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold text-white dark:ring-1 dark:ring-white/25",
        size === "xs" && "size-4 text-[8px]",
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-7 text-[11px]",
        network === "instagram" && "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
        className,
      )}
      style={network === "instagram" ? undefined : { backgroundColor: info.color }}
    >
      {SHORT[network]}
    </span>
  );
}

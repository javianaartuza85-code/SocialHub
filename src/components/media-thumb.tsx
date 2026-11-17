import { Play } from "lucide-react";
import { formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";

export function MediaThumb({
  url,
  kind,
  duration,
  alt = "",
  className,
}: {
  url: string;
  kind: "image" | "video";
  duration?: number | null;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {kind === "image" ? (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <>
          {/* #t=0.1 hace que el navegador muestre el primer cuadro como miniatura */}
          <video src={url ? `${url}#t=0.1` : undefined} preload="metadata" muted playsInline className="size-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Play className="size-2.5 fill-current" />
            {formatDuration(duration)}
          </span>
        </>
      )}
    </div>
  );
}

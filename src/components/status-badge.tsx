import { STATUS_INFO, type PostStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const info = STATUS_INFO[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", info.className, className)}>
      <span className={cn("size-1.5 rounded-full", info.dot)} />
      {info.label}
    </span>
  );
}

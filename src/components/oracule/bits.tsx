import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials, roleLabel, type Profile, type RequestStatus } from "@/lib/data";

export function PersonAvatar({ p, size = 44 }: { p: Pick<Profile, "full_name" | "avatar_url">; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-brand p-[1.5px]"
      style={{ width: size, height: size }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-card font-display text-sm font-semibold text-foreground">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span style={{ fontSize: size * 0.34 }}>{initials(p.full_name || "?")}</span>
        )}
      </div>
    </div>
  );
}

export function Glass({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function PersonRow({ p, right, uni }: { p: Profile; right?: ReactNode; uni?: string | undefined }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass"
    >
      <Link to="/alumni/$id" params={{ id: p.id }} className="flex min-w-0 items-center gap-3">
        <PersonAvatar p={p} />
        <div className="min-w-0">
          <div className="truncate font-medium">{p.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {p.headline ?? roleLabel(p)}
            {uni ? ` · ${uni}` : ""}
          </div>
        </div>
      </Link>
      <div className="shrink-0">{right}</div>
    </motion.div>
  );
}

const statusStyle: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  info_requested: "bg-cyan/15 text-cyan",
  cancelled: "bg-muted text-muted-foreground",
};
const statusText: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  info_requested: "Needs info",
  cancelled: "Cancelled",
};
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle[status])}>
      {statusText[status]}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="font-display text-base font-semibold">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

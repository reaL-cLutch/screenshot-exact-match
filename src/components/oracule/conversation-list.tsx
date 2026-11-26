import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { conversationsQuery } from "@/lib/data";
import { EmptyState, PersonAvatar } from "./bits";
import { cn } from "@/lib/utils";

export function ConversationList({ me, active }: { me: string; active?: string }) {
  const { data = [], isLoading } = useQuery(conversationsQuery(me));
  if (isLoading) return <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-glass" />)}</div>;
  if (data.length === 0) return <div className="p-3"><EmptyState title="No chats yet" body="Start one from a profile or your mentors list." /></div>;
  return (
    <div className="space-y-1 p-2">
      {data.map((c) => (
        <Link key={c.id} to="/messages/$id" params={{ id: c.id }} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", c.id === active ? "bg-primary/10" : "hover:bg-glass")}>
          {c.other && <PersonAvatar p={c.other} size={40} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.other?.full_name ?? "Conversation"}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">{c.last?.body ?? "No messages yet"}</span>
              {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

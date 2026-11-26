import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, FileText, Plus, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { conversationsQuery, messagesQuery, myMentorsQuery, requestsQuery, useMe, REQUEST_CATEGORIES } from "@/lib/data";
import { ConversationList } from "@/components/oracule/conversation-list";
import { PersonAvatar } from "@/components/oracule/bits";
import { RequestCard } from "@/components/oracule/request-card";
import { NewRequestDialog } from "@/components/oracule/request-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({ meta: [{ title: "Chat — Oracule" }, { name: "description", content: "Conversation on Oracule." }, { property: "og:title", content: "Chat — Oracule" }, { property: "og:description", content: "Conversation on Oracule." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Chat,
});

function Chat() {
  const { id } = Route.useParams();
  const me = useMe()!;
  const myId = me.profile.id;
  const qc = useQueryClient();
  const { data: convs = [] } = useQuery(conversationsQuery(myId));
  const { data: msgs = [], isLoading } = useQuery(messagesQuery(id));
  const { data: requests = [] } = useQuery(requestsQuery);
  const { data: mentorIds = [] } = useQuery(myMentorsQuery(myId));
  const conv = convs.find((c) => c.id === id);
  const other = conv?.other;
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [cat, setCat] = useState<string | undefined>();
  const bottom = useRef<HTMLDivElement>(null);
  const canRequest = !!other && mentorIds.includes(other.id);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("profile_id", myId)
      .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
  }, [msgs.length, id, myId, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: myId, body });
      if (error) throw new Error(error.message);
    },
    onMutate: () => setText(""),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const shownReq = new Set<string>();

  return (
    <div className="glass grid h-[calc(100vh-10rem)] overflow-hidden rounded-3xl md:grid-cols-[320px_1fr]">
      <div className="hidden overflow-y-auto border-r border-border md:block">
        <div className="px-5 pt-5 font-display text-xl font-bold">Messages</div>
        <ConversationList me={myId} active={id} />
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link to="/messages" className="md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          {other && <PersonAvatar p={other} size={38} />}
          <div className="min-w-0">
            <div className="truncate font-semibold">{other?.full_name ?? "…"}</div>
            <div className="truncate text-xs text-muted-foreground">{other?.headline}{canRequest ? " · Your mentor" : ""}</div>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {isLoading && <div className="h-10 w-1/2 animate-pulse rounded-xl bg-glass" />}
          {!isLoading && msgs.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Say hello to {other?.full_name.split(" ")[0]} 👋</div>}
          {msgs.map((m) => {
            const mine = m.sender_id === myId;
            const req = m.request_id ? requests.find((r) => r.id === m.request_id) : undefined;
            if (req && !shownReq.has(req.id)) {
              shownReq.add(req.id);
              return (
                <div key={m.id} className={cn("max-w-md", mine ? "ml-auto" : "")}>
                  <RequestCard r={req} me={myId} />
                </div>
              );
            }
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", mine ? "rounded-br-md bg-brand text-primary-foreground" : "rounded-bl-md border border-border bg-card", m.request_id && "italic")}>
                  {m.body}
                  <div className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form
          className="relative flex items-center gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send.mutate(text.trim());
          }}
        >
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="glass-strong absolute bottom-16 left-3 z-20 w-64 rounded-2xl p-2">
                {canRequest ? (
                  REQUEST_CATEGORIES.slice(0, 5).map((c) => (
                    <button type="button" key={c} onClick={() => { setCat(c); setReqOpen(true); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-glass">
                      <FileText className="h-4 w-4 text-primary" /> {c}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Requests can only be sent to your assigned mentors.</div>
                )}
                {other && (
                  <Link to="/alumni/$id" params={{ id: other.id }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-glass">
                    <User className="h-4 w-4 text-accent" /> View profile
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button type="button" aria-label="More actions" onClick={() => setMenu(!menu)} className={cn("rounded-full p-2.5 transition-transform", menu ? "rotate-45 bg-primary/15 text-primary" : "text-muted-foreground hover:bg-glass")}>
            <Plus className="h-5 w-5" />
          </button>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-hidden focus:border-primary" />
          <button type="submit" aria-label="Send" disabled={!text.trim()} className="rounded-full bg-brand p-3 text-primary-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      {other && canRequest && (
        <NewRequestDialog key={cat} open={reqOpen} onOpenChange={setReqOpen} mentorId={other.id} mentorName={other.full_name} {...(cat ? { defaultCategory: cat } : {})} />
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RequestRow, RequestStatus } from "@/lib/data";
import { StatusBadge } from "./bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RequestCard({ r, me, otherName }: { r: RequestRow; me: string; otherName?: string | undefined }) {
  const qc = useQueryClient();
  const isMentor = r.mentor_id === me;
  const isStudent = r.student_id === me;
  const open = r.status === "pending" || r.status === "info_requested";
  const [note, setNote] = useState("");
  const [desc, setDesc] = useState(r.description);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["requests"] });
    qc.invalidateQueries({ queryKey: ["messages"] });
  };

  const respond = useMutation({
    mutationFn: async (status: RequestStatus) => {
      const { error } = await supabase.rpc("respond_request", { _id: r.id, _status: status, _note: note.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Response sent");
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_request", { _id: r.id, _description: desc });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Request updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cancel_request", { _id: r.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-primary">{r.category}</div>
          <div className="mt-0.5 font-display font-semibold">{r.title}</div>
          {otherName && <div className="text-xs text-muted-foreground">{isMentor ? "From" : "To"} {otherName}</div>}
        </div>
        <StatusBadge status={r.status} />
      </div>
      {r.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>}
      {(r.start_date || r.end_date) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {r.start_date ?? "—"} → {r.end_date ?? "—"}
        </div>
      )}
      {r.mentor_note && (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-2.5 text-sm">
          <span className="text-xs text-muted-foreground">Mentor note: </span>
          {r.mentor_note}
        </div>
      )}
      {isMentor && open && (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to reject or ask for info)" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-success text-primary-foreground hover:bg-success/90" disabled={respond.isPending} onClick={() => respond.mutate("approved")}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={respond.isPending} onClick={() => respond.mutate("rejected")}>
              Reject
            </Button>
            <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate("info_requested")}>
              Ask for info
            </Button>
          </div>
        </div>
      )}
      {isStudent && r.status === "info_requested" && (
        <div className="mt-3 space-y-2">
          <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending}>
            Resubmit with details
          </Button>
        </div>
      )}
      {isStudent && open && (
        <button className="mt-3 text-xs text-muted-foreground hover:text-destructive" onClick={() => cancel.mutate()}>
          Cancel request
        </button>
      )}
    </div>
  );
}

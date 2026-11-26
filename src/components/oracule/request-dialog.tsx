import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REQUEST_CATEGORIES } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function NewRequestDialog({
  open,
  onOpenChange,
  mentorId,
  mentorName,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mentorId: string;
  mentorName: string;
  defaultCategory?: string | undefined;
}) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>(defaultCategory ?? REQUEST_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_request", {
        _mentor: mentorId,
        _category: category,
        _title: title.trim(),
        _description: description.trim(),
        ...(start ? { _start: start } : {}),
        ...(end ? { _end: end } : {}),
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(`Request sent to ${mentorName}`);
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">New request</DialogTitle>
          <DialogDescription>Sent to {mentorName}. They can approve, reject or ask for more info.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <div className="flex flex-wrap gap-2">
            {REQUEST_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (c === category ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")
                }
              >
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rq-title">Title</Label>
            <Input id="rq-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leave for hackathon finals" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rq-desc">Details</Label>
            <Textarea id="rq-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain what you need and why." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rq-start">Start date</Label>
              <Input id="rq-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rq-end">End date</Label>
              <Input id="rq-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full bg-brand text-primary-foreground glow" disabled={m.isPending}>
            {m.isPending ? "Sending…" : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

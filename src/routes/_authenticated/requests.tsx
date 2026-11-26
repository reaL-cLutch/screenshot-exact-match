import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { myMentorsQuery, peopleQuery, requestsQuery, useMe, type RequestStatus } from "@/lib/data";
import { EmptyState } from "@/components/oracule/bits";
import { RequestCard } from "@/components/oracule/request-card";
import { NewRequestDialog } from "@/components/oracule/request-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Requests — Oracule" }, { name: "description", content: "Track your requests." }, { property: "og:title", content: "Requests — Oracule" }, { property: "og:description", content: "Track your requests." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Requests,
});

const FILTERS: { v: RequestStatus | "all"; label: string }[] = [
  { v: "all", label: "All" },
  { v: "pending", label: "Pending" },
  { v: "info_requested", label: "Needs info" },
  { v: "approved", label: "Approved" },
  { v: "rejected", label: "Rejected" },
];

function Requests() {
  const me = useMe()!;
  const myId = me.profile.id;
  const { data: reqs = [], isLoading } = useQuery(requestsQuery);
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: mentorIds = [] } = useQuery(myMentorsQuery(myId));
  const [box, setBox] = useState<"sent" | "received">(me.profile.is_mentor && !me.profile.is_student ? "received" : "sent");
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [mentor, setMentor] = useState<string>("");
  const name = (id: string) => people.find((p) => p.id === id)?.full_name;
  const list = reqs.filter((r) => (box === "sent" ? r.student_id === myId : r.mentor_id === myId)).filter((r) => filter === "all" || r.status === filter);
  const mentors = people.filter((p) => mentorIds.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Requests</h1>
          <p className="text-muted-foreground">Formal permissions and approvals with your mentors.</p>
        </div>
        {mentors.length > 0 && (
          <div className="flex gap-2">
            <select aria-label="Mentor" value={mentor} onChange={(e) => setMentor(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Choose a mentor…</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <Button disabled={!mentor} className="bg-brand text-primary-foreground" onClick={() => document.getElementById("open-req")?.click()}>New request</Button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {me.profile.is_mentor && (
          <div className="mr-2 flex gap-1 rounded-full border border-border p-1">
            {(["sent", "received"] as const).map((b) => (
              <button key={b} onClick={() => setBox(b)} className={cn("rounded-full px-3 py-1 text-xs capitalize", box === b ? "bg-primary/15 text-primary" : "text-muted-foreground")}>{b}</button>
            ))}
          </div>
        )}
        {FILTERS.map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={cn("rounded-full border px-3 py-1 text-xs", filter === f.v ? "border-primary text-primary" : "border-border text-muted-foreground")}>{f.label}</button>
        ))}
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-glass" />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing here" body={box === "sent" ? "Send a request to one of your mentors from a chat or above." : "Requests from your mentees will appear here."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r) => <RequestCard key={r.id} r={r} me={myId} otherName={name(box === "sent" ? r.mentor_id : r.student_id)} />)}
        </div>
      )}
      {mentor && <MentorRequest mentorId={mentor} mentorName={name(mentor) ?? ""} />}
    </div>
  );
}

function MentorRequest({ mentorId, mentorName }: { mentorId: string; mentorName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="open-req" hidden onClick={() => setOpen(true)} />
      <NewRequestDialog open={open} onOpenChange={setOpen} mentorId={mentorId} mentorName={mentorName} />
    </>
  );
}

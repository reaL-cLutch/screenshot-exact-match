import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { myMenteesQuery, peopleQuery, requestsQuery, universitiesQuery, useMe } from "@/lib/data";
import { EmptyState, Glass, PersonRow, SectionTitle } from "@/components/oracule/bits";
import { RequestCard } from "@/components/oracule/request-card";
import { useStartChat } from "@/hooks/use-oracule";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "Mentor dashboard — Oracule" }, { name: "description", content: "Your mentees and pending requests." }, { property: "og:title", content: "Mentor — Oracule" }, { property: "og:description", content: "Mentor dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Mentor,
});

function Mentor() {
  const me = useMe()!;
  const myId = me.profile.id;
  const { data: menteeIds = [] } = useQuery(myMenteesQuery(myId));
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: unis = [] } = useQuery(universitiesQuery);
  const { data: reqs = [] } = useQuery(requestsQuery);
  const chat = useStartChat();
  const mentees = people.filter((p) => menteeIds.includes(p.id));
  const pending = reqs.filter((r) => r.mentor_id === myId && (r.status === "pending" || r.status === "info_requested"));
  const decided = reqs.filter((r) => r.mentor_id === myId && (r.status === "approved" || r.status === "rejected"));
  const name = (id: string) => people.find((p) => p.id === id)?.full_name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Mentor dashboard</h1>
        <p className="text-muted-foreground">Guide your mentees and handle their requests.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ k: "Mentees", v: mentees.length }, { k: "Pending", v: pending.length }, { k: "Decided", v: decided.length }].map((s) => (
          <Glass key={s.k} className="p-4"><div className="font-display text-3xl font-bold">{s.v}</div><div className="text-xs text-muted-foreground">{s.k}</div></Glass>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Glass className="p-5">
          <SectionTitle title="My mentees" />
          {mentees.length === 0 ? (
            <EmptyState title="No mentees yet" body="Students who add you as a mentor, or whom your university assigns, show up here." />
          ) : (
            mentees.map((m) => (
              <PersonRow key={m.id} p={m} uni={unis.find((u) => u.id === m.university_id)?.short_name} right={
                <button aria-label={`Message ${m.full_name}`} onClick={() => chat.mutate(m.id)} className="rounded-full p-2 text-muted-foreground hover:text-primary"><MessageCircle className="h-4 w-4" /></button>
              } />
            ))
          )}
        </Glass>
        <div className="space-y-3">
          <SectionTitle title="Awaiting your decision" action={<Link to="/requests" className="text-xs text-primary">History</Link>} />
          {pending.length === 0 ? <EmptyState title="All clear" body="No requests waiting on you." /> : pending.map((r) => <RequestCard key={r.id} r={r} me={myId} otherName={name(r.student_id)} />)}
        </div>
      </div>
    </div>
  );
}

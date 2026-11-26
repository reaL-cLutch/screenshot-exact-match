import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MapPin, MessageCircle, Plus, UserPlus, UserCheck } from "lucide-react";
import { conversationsQuery, eventsQuery, followsQuery, myMentorsQuery, peopleQuery, requestsQuery, universitiesQuery, useMe } from "@/lib/data";
import { EmptyState, Glass, PersonRow, SectionTitle, StatusBadge } from "@/components/oracule/bits";
import { useAddMentor, useStartChat, useToggleFollow } from "@/hooks/use-oracule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Oracule" }, { name: "description", content: "Your mentors, alumni network and activity." }, { property: "og:title", content: "Oracule" }, { property: "og:description", content: "Your Oracule home." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { v: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-full border border-border p-1">
      {items.map((i) => (
        <button key={i.v} onClick={() => onChange(i.v)} className={cn("rounded-full px-3 py-1 text-xs transition-colors", value === i.v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Dashboard() {
  const me = useMe()!;
  const p = me.profile;
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: unis = [] } = useQuery(universitiesQuery);
  const { data: follows = [] } = useQuery(followsQuery(p.id));
  const { data: mentorIds = [] } = useQuery(myMentorsQuery(p.id));
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: convs = [] } = useQuery(conversationsQuery(p.id));
  const { data: requests = [] } = useQuery(requestsQuery);
  const chat = useStartChat();
  const follow = useToggleFollow(p.id);
  const addMentor = useAddMentor(p.id);
  const [mTab, setMTab] = useState<"mine" | "discover">("mine");
  const [aTab, setATab] = useState<"following" | "all">("following");
  const uniName = (id: string | null) => unis.find((u) => u.id === id)?.short_name;

  const others = people.filter((x) => x.id !== p.id);
  const mentors = others.filter((x) => x.is_mentor);
  const myMentors = mentors.filter((x) => mentorIds.includes(x.id));
  const discoverMentors = mentors.filter((x) => !mentorIds.includes(x.id));
  const alumni = others.filter((x) => x.is_alumni);
  const following = alumni.filter((x) => follows.includes(x.id));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const openReq = requests.filter((r) => r.status === "pending" || r.status === "info_requested");

  return (
    <div className="space-y-8">
      <section>
        <div className="text-sm text-muted-foreground">{greet}</div>
        <h1 className="mt-1 text-4xl font-bold md:text-5xl">
          {p.full_name.split(" ")[0]}, <span className="text-gradient">your network awaits.</span>
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { k: "Mentors", v: myMentors.length },
            { k: "Following", v: following.length },
            { k: "Open requests", v: openReq.length },
            { k: "Upcoming events", v: events.length },
          ].map((s) => (
            <Glass key={s.k} className="p-4">
              <div className="font-display text-3xl font-bold">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.k}</div>
            </Glass>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5">
          <SectionTitle title="Mentors" action={<Tabs value={mTab} onChange={setMTab} items={[{ v: "mine", label: "My mentors" }, { v: "discover", label: "Discover" }]} />} />
          <div className="space-y-1">
            {mTab === "mine" && myMentors.length === 0 && (
              <EmptyState title="No mentors yet" body="Add a mentor from Discover to start sending requests and booking guidance." action={<button className="text-sm text-primary" onClick={() => setMTab("discover")}>Discover mentors →</button>} />
            )}
            {(mTab === "mine" ? myMentors : discoverMentors).slice(0, 6).map((m) => (
              <PersonRow
                key={m.id}
                p={m}
                uni={uniName(m.university_id)}
                right={
                  mTab === "mine" ? (
                    <button aria-label={`Message ${m.full_name}`} onClick={() => chat.mutate(m.id)} className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => addMentor.mutate(m.id)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">
                      <Plus className="h-3 w-3" /> Add mentor
                    </button>
                  )
                }
              />
            ))}
          </div>
        </Glass>

        <Glass className="p-5">
          <SectionTitle title="Alumni network" action={<Tabs value={aTab} onChange={setATab} items={[{ v: "following", label: "Following" }, { v: "all", label: "All alumni" }]} />} />
          <div className="space-y-1">
            {aTab === "following" && following.length === 0 && (
              <EmptyState title="Follow alumni" body="Follow alumni to keep them close and see them here." action={<button className="text-sm text-primary" onClick={() => setATab("all")}>Browse alumni →</button>} />
            )}
            {(aTab === "following" ? following : alumni).slice(0, 6).map((a) => {
              const f = follows.includes(a.id);
              return (
                <PersonRow
                  key={a.id}
                  p={a}
                  uni={uniName(a.university_id)}
                  right={
                    <button aria-label={f ? "Unfollow" : "Follow"} onClick={() => follow.mutate({ id: a.id, following: f })} className={cn("rounded-full p-2 hover:bg-primary/10", f ? "text-primary" : "text-muted-foreground hover:text-primary")}>
                      {f ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    </button>
                  }
                />
              );
            })}
          </div>
          <Link to="/alumni" className="mt-3 block px-3 text-sm text-primary">See everyone →</Link>
        </Glass>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Glass className="p-5">
          <SectionTitle title="Upcoming events" />
          <div className="space-y-3">
            {events.slice(0, 4).map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-3">
                <div className="text-xs text-primary">{e.category}</div>
                <div className="font-medium">{e.title}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>
                </div>
              </div>
            ))}
          </div>
        </Glass>
        <Glass className="p-5">
          <SectionTitle title="Recent conversations" action={<Link to="/messages" className="text-xs text-primary">All</Link>} />
          {convs.length === 0 ? (
            <EmptyState title="No conversations" body="Message a mentor or alumnus to start." />
          ) : (
            <div className="space-y-1">
              {convs.slice(0, 4).map((c) => (
                <Link key={c.id} to="/messages/$id" params={{ id: c.id }} className="block rounded-xl px-3 py-2 hover:bg-glass">
                  <div className="flex items-center gap-2 font-medium">{c.other?.full_name}{c.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.last?.body ?? "Say hello"}</div>
                </Link>
              ))}
            </div>
          )}
        </Glass>
        <Glass className="p-5">
          <SectionTitle title="My requests" action={<Link to="/requests" className="text-xs text-primary">All</Link>} />
          {requests.length === 0 ? (
            <EmptyState title="No requests" body="Send formal requests to your mentors from any chat." />
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <div className="min-w-0 truncate text-sm">{r.title}</div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}

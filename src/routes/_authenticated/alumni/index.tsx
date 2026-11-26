import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { followsQuery, peopleQuery, universitiesQuery, useMe } from "@/lib/data";
import { EmptyState, Glass, PersonRow } from "@/components/oracule/bits";
import { useStartChat, useToggleFollow } from "@/hooks/use-oracule";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type S = { q?: string | undefined; uni?: string | undefined; industry?: string | undefined; type?: string | undefined };

export const Route = createFileRoute("/_authenticated/alumni/")({
  validateSearch: (s: Record<string, unknown>): S => {
    const out: S = {};
    for (const k of ["q", "uni", "industry", "type"] as const) {
      const v = s[k];
      if (typeof v === "string" && v) out[k] = v;
    }
    return out;
  },
  head: () => ({ meta: [{ title: "Discover alumni — Oracule" }, { name: "description", content: "Find alumni and mentors across universities." }, { property: "og:title", content: "Discover — Oracule" }, { property: "og:description", content: "Find alumni and mentors." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Discover,
});

function Discover() {
  const me = useMe()!;
  const s = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: unis = [] } = useQuery(universitiesQuery);
  const { data: follows = [] } = useQuery(followsQuery(me.profile.id));
  const chat = useStartChat();
  const follow = useToggleFollow(me.profile.id);
  const set = (patch: Partial<S>) => navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }), replace: true });

  const pool = people.filter((p) => p.id !== me.profile.id && (p.is_alumni || p.is_mentor));
  const industries = [...new Set(pool.map((p) => p.industry).filter(Boolean))] as string[];
  const q = (s.q ?? "").toLowerCase();
  const list = pool.filter((p) => {
    if (s.uni && p.university_id !== s.uni) return false;
    if (s.industry && p.industry !== s.industry) return false;
    if (s.type === "mentors" && !p.is_mentor) return false;
    if (s.type === "referrals" && !p.offers_referrals) return false;
    if (!q) return true;
    return [p.full_name, p.company, p.job_title, p.headline, p.location, p.department, ...(p.skills ?? [])].some((v) => v?.toLowerCase().includes(q));
  });
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Discover</h1>
        <p className="text-muted-foreground">Alumni and mentors across every Oracule university.</p>
      </div>
      <Glass className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="Search by name, company, skill or city" value={s.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(!s.type)} onClick={() => set({ type: undefined })}>Everyone</button>
          <button className={chip(s.type === "mentors")} onClick={() => set({ type: "mentors" })}>Mentors</button>
          <button className={chip(s.type === "referrals")} onClick={() => set({ type: "referrals" })}>Offers referrals</button>
          <span className="mx-1 w-px bg-border" />
          <select aria-label="University" value={s.uni ?? ""} onChange={(e) => set({ uni: e.target.value || undefined })} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
            <option value="">All universities</option>
            {unis.map((u) => <option key={u.id} value={u.id}>{u.short_name}</option>)}
          </select>
          <select aria-label="Industry" value={s.industry ?? ""} onChange={(e) => set({ industry: e.target.value || undefined })} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </Glass>
      {list.length === 0 ? (
        <EmptyState title="No one matches" body="Try a different search or clear filters." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const f = follows.includes(p.id);
            return (
              <Glass key={p.id} className="p-2">
                <PersonRow
                  p={p}
                  uni={unis.find((u) => u.id === p.university_id)?.short_name}
                  right={
                    <div className="flex gap-1.5">
                      <button onClick={() => follow.mutate({ id: p.id, following: f })} className={cn("rounded-full border px-3 py-1 text-xs", f ? "border-primary text-primary" : "border-border hover:text-primary")}>
                        {f ? "Following" : "Follow"}
                      </button>
                      <button onClick={() => chat.mutate(p.id)} className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary hover:bg-primary/25">Message</button>
                    </div>
                  }
                />
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}

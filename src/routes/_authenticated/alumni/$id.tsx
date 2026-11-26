import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, GraduationCap, MapPin } from "lucide-react";
import { followsQuery, myMentorsQuery, profileQuery, roleLabel, universitiesQuery, useMe } from "@/lib/data";
import { EmptyState, Glass, PersonAvatar } from "@/components/oracule/bits";
import { useAddMentor, useStartChat, useToggleFollow } from "@/hooks/use-oracule";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/alumni/$id")({
  head: () => ({ meta: [{ title: "Profile — Oracule" }, { name: "description", content: "Oracule member profile." }, { property: "og:title", content: "Profile — Oracule" }, { property: "og:description", content: "Oracule member profile." }, { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const me = useMe()!;
  const { data: p, isLoading } = useQuery(profileQuery(id));
  const { data: unis = [] } = useQuery(universitiesQuery);
  const { data: follows = [] } = useQuery(followsQuery(me.profile.id));
  const { data: mentors = [] } = useQuery(myMentorsQuery(me.profile.id));
  const chat = useStartChat();
  const follow = useToggleFollow(me.profile.id);
  const addMentor = useAddMentor(me.profile.id);
  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-glass" />;
  if (!p) return <EmptyState title="Profile not found" body="This person may have left Oracule." action={<Link to="/alumni" className="text-primary">Back to Discover</Link>} />;
  const f = follows.includes(p.id);
  const isSelf = p.id === me.profile.id;
  const uni = unis.find((u) => u.id === p.university_id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Glass className="relative overflow-hidden p-8">
        <div className="absolute inset-x-0 top-0 h-24 bg-brand opacity-20" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
          <PersonAvatar p={p} size={96} />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-primary">{roleLabel(p)}</div>
            <h1 className="text-3xl font-bold">{p.full_name}</h1>
            <p className="text-muted-foreground">{p.headline}</p>
          </div>
          {!isSelf && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => follow.mutate({ id: p.id, following: f })}>{f ? "Following" : "Follow"}</Button>
              {p.is_mentor && !mentors.includes(p.id) && <Button variant="outline" onClick={() => addMentor.mutate(p.id)}>Add as mentor</Button>}
              <Button className="bg-brand text-primary-foreground glow" onClick={() => chat.mutate(p.id)}>Message</Button>
            </div>
          )}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {p.company && <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{p.job_title} · {p.company}</span>}
          {uni && <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-4 w-4" />{uni.name}{p.graduation_year ? ` '${String(p.graduation_year).slice(2)}` : ""}</span>}
          {p.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{p.location}</span>}
        </div>
      </Glass>
      {p.bio && <Glass className="p-6"><h2 className="mb-2 font-semibold">About</h2><p className="text-muted-foreground">{p.bio}</p></Glass>}
      {p.skills.length > 0 && (
        <Glass className="p-6">
          <h2 className="mb-3 font-semibold">Expertise</h2>
          <div className="flex flex-wrap gap-2">{p.skills.map((s) => <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">{s}</span>)}</div>
        </Glass>
      )}
      {(p.open_to_mentor || p.offers_referrals) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {p.open_to_mentor && <span className="rounded-full bg-accent/15 px-3 py-1 text-accent">Open to mentoring</span>}
          {p.offers_referrals && <span className="rounded-full bg-success/15 px-3 py-1 text-success">Offers referrals</span>}
        </div>
      )}
    </div>
  );
}

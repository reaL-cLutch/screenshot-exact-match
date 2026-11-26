import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, universitiesQuery, useMe } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — Oracule" }, { name: "description", content: "Tell Oracule who you are." }, { property: "og:title", content: "Oracule" }, { property: "og:description", content: "Set up your profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Onboarding,
});

const ROLES = [
  { key: "student", label: "Student", body: "I'm currently studying" },
  { key: "alumni", label: "Alumni", body: "I've graduated" },
  { key: "mentor", label: "Mentor", body: "I guide students" },
] as const;

function Onboarding() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: unis = [] } = useQuery(universitiesQuery);
  const p = me?.profile;
  const [roles, setRoles] = useState<string[]>(["student"]);
  const [f, setF] = useState({
    full_name: p?.full_name ?? "",
    university_id: p?.university_id ?? "",
    department: "",
    graduation_year: "",
    headline: "",
    company: "",
    job_title: "",
    location: "",
    bio: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.university_id) { toast.error("Pick your university"); return; }
    if (roles.length === 0) { toast.error("Pick at least one role"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name,
        university_id: f.university_id,
        department: f.department || null,
        graduation_year: f.graduation_year ? Number(f.graduation_year) : null,
        headline: f.headline || null,
        company: f.company || null,
        job_title: f.job_title || null,
        location: f.location || null,
        bio: f.bio || null,
        is_student: roles.includes("student"),
        is_alumni: roles.includes("alumni"),
        is_mentor: roles.includes("mentor"),
        open_to_mentor: roles.includes("mentor"),
        onboarded: true,
      })
      .eq("user_id", u.user?.id ?? "");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: meQuery.queryKey });
    await qc.fetchQuery(meQuery);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="ambient" />
      <form onSubmit={save} className="glass-strong relative z-10 w-full max-w-2xl space-y-6 rounded-3xl p-8">
        <div>
          <h1 className="text-3xl font-bold">Let's set you up</h1>
          <p className="text-sm text-muted-foreground">This shapes who you meet on Oracule.</p>
        </div>
        <div className="space-y-2">
          <Label>I am a… (pick any)</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => {
              const on = roles.includes(r.key);
              return (
                <button type="button" key={r.key} onClick={() => setRoles(on ? roles.filter((x) => x !== r.key) : [...roles, r.key])} className={cn("rounded-xl border p-3 text-left transition-colors", on ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30")}>
                  <div className="font-display font-semibold">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.body}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ob-name">Full name</Label>
            <Input id="ob-name" required value={f.full_name} onChange={set("full_name")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ob-uni">University</Label>
            <select id="ob-uni" required value={f.university_id} onChange={(e) => setF({ ...f, university_id: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select your university</option>
              {unis.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ob-dep">Department</Label><Input id="ob-dep" value={f.department} onChange={set("department")} /></div>
          <div className="space-y-1.5"><Label htmlFor="ob-year">Graduation year</Label><Input id="ob-year" type="number" value={f.graduation_year} onChange={set("graduation_year")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ob-head">Headline</Label><Input id="ob-head" placeholder="e.g. CS undergrad into backend systems" value={f.headline} onChange={set("headline")} /></div>
          {(roles.includes("alumni") || roles.includes("mentor")) && (
            <>
              <div className="space-y-1.5"><Label htmlFor="ob-co">Company</Label><Input id="ob-co" value={f.company} onChange={set("company")} /></div>
              <div className="space-y-1.5"><Label htmlFor="ob-job">Job title</Label><Input id="ob-job" value={f.job_title} onChange={set("job_title")} /></div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ob-loc">Location</Label><Input id="ob-loc" value={f.location} onChange={set("location")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ob-bio">About you</Label><Textarea id="ob-bio" rows={3} value={f.bio} onChange={set("bio")} /></div>
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full bg-brand font-semibold text-primary-foreground glow">
          {busy ? "Saving…" : "Enter Oracule"}
        </Button>
      </form>
    </div>
  );
}

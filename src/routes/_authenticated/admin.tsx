import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, peopleQuery, roleLabel, universitiesQuery, useMe } from "@/lib/data";
import { Glass, PersonAvatar, SectionTitle } from "@/components/oracule/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me || !(me.roles.includes("uni_admin") || me.roles.includes("super_admin"))) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "University admin — Oracule" }, { name: "description", content: "Manage members and mentor assignments." }, { property: "og:title", content: "Admin — Oracule" }, { property: "og:description", content: "University administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Admin,
});

function Admin() {
  const me = useMe()!;
  const qc = useQueryClient();
  const isSuper = me.roles.includes("super_admin");
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: unis = [] } = useQuery(universitiesQuery);
  const [uni, setUni] = useState(me.profile.university_id ?? "");
  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_assignments").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const [student, setStudent] = useState("");
  const [mentor, setMentor] = useState("");
  const members = people.filter((p) => p.university_id === uni);
  const students = members.filter((p) => p.is_student);
  const mentors = people.filter((p) => p.is_mentor);
  const name = (id: string) => people.find((p) => p.id === id)?.full_name ?? "—";

  const assign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mentor_assignments").insert({ student_id: student, mentor_id: mentor });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Mentor assigned"); qc.invalidateQueries({ queryKey: ["assignments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentor_assignments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">University admin</h1>
          <p className="text-muted-foreground">{unis.find((u) => u.id === uni)?.name}</p>
        </div>
        {isSuper && (
          <select aria-label="University" value={uni} onChange={(e) => setUni(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {unis.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ k: "Students", v: students.length }, { k: "Alumni", v: members.filter((p) => p.is_alumni).length }, { k: "Mentors", v: members.filter((p) => p.is_mentor).length }].map((s) => (
          <Glass key={s.k} className="p-4"><div className="font-display text-3xl font-bold">{s.v}</div><div className="text-xs text-muted-foreground">{s.k}</div></Glass>
        ))}
      </div>
      <Glass className="p-5">
        <SectionTitle title="Assign a mentor" />
        <div className="flex flex-wrap gap-2">
          <select aria-label="Student" value={student} onChange={(e) => setStudent(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select aria-label="Mentor" value={mentor} onChange={(e) => setMentor(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Mentor…</option>
            {mentors.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <Button disabled={!student || !mentor || assign.isPending} onClick={() => assign.mutate()} className="bg-brand text-primary-foreground">Assign</Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {assignments.filter((a) => students.some((s) => s.id === a.student_id)).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>{name(a.student_id)} <span className="text-muted-foreground">→</span> {name(a.mentor_id)}</span>
              <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(a.id)}>Remove</button>
            </div>
          ))}
        </div>
      </Glass>
      <Glass className="p-5">
        <SectionTitle title="Members" />
        <div className="grid gap-2 md:grid-cols-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <PersonAvatar p={m} size={36} />
              <div className="min-w-0"><div className="truncate text-sm font-medium">{m.full_name}</div><div className="text-xs text-muted-foreground">{roleLabel(m)}</div></div>
            </div>
          ))}
        </div>
      </Glass>
    </div>
  );
}

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type University = Database["public"]["Tables"]["universities"]["Row"];
export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type Me = { profile: Profile; roles: string[] };

function must<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R["data"]> {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as NonNullable<R["data"]>;
}
async function maybe<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const profile = await maybe<Profile>(supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle());
    if (!profile) return null;
    const roles = must(await supabase.from("user_roles").select("role").eq("user_id", u.user.id));
    return { profile, roles: roles.map((r) => r.role) };
  },
});

export function useMe() {
  const { data } = useQuery(meQuery);
  return data ?? null;
}

export const universitiesQuery = queryOptions({
  queryKey: ["universities"],
  queryFn: async () => must(await supabase.from("universities").select("*").order("name")),
  staleTime: 5 * 60_000,
});

export const peopleQuery = queryOptions({
  queryKey: ["people"],
  queryFn: async () =>
    must(await supabase.from("profiles").select("*").eq("onboarded", true).order("full_name")),
});

export const profileQuery = (id: string) =>
  queryOptions({
    queryKey: ["profile", id],
    queryFn: async (): Promise<Profile | null> => maybe<Profile>(supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
  });

export const followsQuery = (me: string) =>
  queryOptions({
    queryKey: ["follows", me],
    queryFn: async () =>
      must(await supabase.from("follows").select("followee_id").eq("follower_id", me)).map((f) => f.followee_id),
  });

export const myMentorsQuery = (me: string) =>
  queryOptions({
    queryKey: ["assignments", "mentors", me],
    queryFn: async () =>
      must(await supabase.from("mentor_assignments").select("mentor_id").eq("student_id", me)).map((a) => a.mentor_id),
  });

export const myMenteesQuery = (me: string) =>
  queryOptions({
    queryKey: ["assignments", "mentees", me],
    queryFn: async () =>
      must(await supabase.from("mentor_assignments").select("student_id").eq("mentor_id", me)).map((a) => a.student_id),
  });

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () =>
    must(await supabase.from("events").select("*").gte("starts_at", new Date().toISOString()).order("starts_at")),
});

export const requestsQuery = queryOptions({
  queryKey: ["requests"],
  queryFn: async () => must(await supabase.from("requests").select("*").order("created_at", { ascending: false })),
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () =>
    must(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30)),
});

export type ConversationSummary = {
  id: string;
  last_message_at: string;
  other: Profile | null;
  last: Message | null;
  unread: boolean;
};

export const conversationsQuery = (me: string) =>
  queryOptions({
    queryKey: ["conversations", me],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const parts = must(await supabase.from("conversation_participants").select("*"));
      const convIds = [...new Set(parts.map((p) => p.conversation_id))];
      if (convIds.length === 0) return [];
      const convs = must(await supabase.from("conversations").select("*").in("id", convIds).order("last_message_at", { ascending: false }));
      const otherIds = parts.filter((p) => p.profile_id !== me).map((p) => p.profile_id);
      const profiles = otherIds.length ? must(await supabase.from("profiles").select("*").in("id", otherIds)) : [];
      const msgs = must(await supabase.from("messages").select("*").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(200));
      return convs.map((c) => {
        const otherPart = parts.find((p) => p.conversation_id === c.id && p.profile_id !== me);
        const mine = parts.find((p) => p.conversation_id === c.id && p.profile_id === me);
        const last = msgs.find((m) => m.conversation_id === c.id) ?? null;
        return {
          id: c.id,
          last_message_at: c.last_message_at,
          other: profiles.find((p) => p.id === otherPart?.profile_id) ?? null,
          last,
          unread: !!last && !!mine && last.sender_id !== me && last.created_at > mine.last_read_at,
        };
      });
    },
  });

export const messagesQuery = (conv: string) =>
  queryOptions({
    queryKey: ["messages", conv],
    queryFn: async () =>
      must(await supabase.from("messages").select("*").eq("conversation_id", conv).order("created_at")),
  });

/** Subscribes to live changes for the signed-in user and refreshes the affected lists. */
export function useLiveUpdates(me: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!me) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const bump = (keys: string[][]) => {
      clearTimeout(t);
      t = setTimeout(() => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })), 150);
    };
    const ch = supabase
      .channel(`live-${me}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const conv = (p.new as Message).conversation_id;
        bump([["messages", conv], ["conversations"]]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => bump([["requests"]]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${me}` }, () =>
        bump([["notifications"]]),
      )
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [me, qc]);
}

export const REQUEST_CATEGORIES = [
  "Leave request",
  "Recommendation letter",
  "Project approval",
  "Internship approval",
  "Event participation",
  "Research guidance",
  "Other",
] as const;

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function roleLabel(p: Profile) {
  if (p.is_mentor && p.is_alumni) return "Alumni · Mentor";
  if (p.is_mentor) return "Mentor";
  if (p.is_alumni) return "Alumni";
  return "Student";
}

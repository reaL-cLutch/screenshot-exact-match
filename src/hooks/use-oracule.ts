import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useStartChat() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (other: string) => {
      const { data, error } = await supabase.rpc("start_conversation", { _other: other });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (id) => navigate({ to: "/messages/$id", params: { id } }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleFollow(me: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, following }: { id: string; following: boolean }) => {
      const res = following
        ? await supabase.from("follows").delete().eq("follower_id", me).eq("followee_id", id)
        : await supabase.from("follows").insert({ follower_id: me, followee_id: id });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follows", me] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddMentor(me: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mentor: string) => {
      const { error } = await supabase.from("mentor_assignments").insert({ mentor_id: mentor, student_id: me });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Mentor added");
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

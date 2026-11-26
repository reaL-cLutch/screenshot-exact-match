drop policy "follows readable" on public.follows;
create policy "see own follows" on public.follows for select to authenticated
  using (follower_id = public.current_profile_id() or followee_id = public.current_profile_id());
drop policy "profiles readable" on public.profiles;
create policy "see member profiles" on public.profiles for select to authenticated
  using (onboarded = true or user_id = auth.uid());

create type public.app_role as enum ('uni_admin','super_admin');
create type public.request_status as enum ('pending','approved','rejected','info_requested','cancelled');

create table public.universities(
  id uuid primary key default gen_random_uuid(),
  name text not null, short_name text not null, city text, country text,
  verified boolean not null default true, created_at timestamptz not null default now()
);
grant select on public.universities to anon, authenticated;
grant all on public.universities to service_role;
alter table public.universities enable row level security;
create policy "universities readable" on public.universities for select to anon, authenticated using (true);

create table public.profiles(
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  university_id uuid references public.universities(id),
  full_name text not null default '',
  headline text, bio text, avatar_url text,
  company text, job_title text, industry text, location text, department text,
  graduation_year int, skills text[] not null default '{}',
  is_student boolean not null default false,
  is_alumni boolean not null default false,
  is_mentor boolean not null default false,
  open_to_mentor boolean not null default false,
  offers_referrals boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  university_id uuid references public.universities(id),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() $$;

create or replace function public.is_uni_admin_of(_uni uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'super_admin') or exists(
    select 1 from public.user_roles r join public.profiles p on p.user_id=r.user_id
    where r.user_id=auth.uid() and r.role='uni_admin' and coalesce(r.university_id,p.university_id)=_uni) $$;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.follows(
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, followee_id)
);
grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select to authenticated using (true);
create policy "follow as self" on public.follows for insert to authenticated with check (follower_id = public.current_profile_id());
create policy "unfollow as self" on public.follows for delete to authenticated using (follower_id = public.current_profile_id());

create table public.mentor_assignments(
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(mentor_id, student_id)
);
grant select, insert, delete on public.mentor_assignments to authenticated;
grant all on public.mentor_assignments to service_role;
alter table public.mentor_assignments enable row level security;
create policy "see own or admin" on public.mentor_assignments for select to authenticated using (
  student_id = public.current_profile_id() or mentor_id = public.current_profile_id()
  or public.is_uni_admin_of((select university_id from public.profiles where id = student_id)));
create policy "student adds mentor or admin assigns" on public.mentor_assignments for insert to authenticated with check (
  (student_id = public.current_profile_id() and exists(select 1 from public.profiles m where m.id = mentor_id and m.is_mentor))
  or public.is_uni_admin_of((select university_id from public.profiles where id = student_id)));
create policy "admin removes" on public.mentor_assignments for delete to authenticated using (
  student_id = public.current_profile_id()
  or public.is_uni_admin_of((select university_id from public.profiles where id = student_id)));

create table public.conversations(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create table public.conversation_participants(
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(conversation_id, profile_id)
);
create or replace function public.is_participant(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_participants where conversation_id=_conv and profile_id=public.current_profile_id()) $$;

grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "participants see conv" on public.conversations for select to authenticated using (public.is_participant(id));

grant select, update on public.conversation_participants to authenticated;
grant all on public.conversation_participants to service_role;
alter table public.conversation_participants enable row level security;
create policy "participants see members" on public.conversation_participants for select to authenticated using (public.is_participant(conversation_id));
create policy "update own read" on public.conversation_participants for update to authenticated using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create table public.requests(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  category text not null, title text not null, description text not null default '',
  start_date date, end_date date,
  status public.request_status not null default 'pending',
  mentor_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;
create policy "parties see request" on public.requests for select to authenticated using (
  student_id = public.current_profile_id() or mentor_id = public.current_profile_id());

create table public.messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  request_id uuid references public.requests(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read msgs" on public.messages for select to authenticated using (public.is_participant(conversation_id));
create policy "participants send msgs" on public.messages for insert to authenticated with check (
  public.is_participant(conversation_id) and sender_id = public.current_profile_id() and request_id is null);

create or replace function public.touch_conversation() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.conversations set last_message_at = new.created_at where id = new.conversation_id; return new; end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

create table public.notifications(
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text, link text, read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifs" on public.notifications for select to authenticated using (profile_id = public.current_profile_id());
create policy "mark own notifs" on public.notifications for update to authenticated using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create table public.events(
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id),
  title text not null, description text, category text not null default 'Workshop',
  starts_at timestamptz not null, location text, is_online boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "events readable" on public.events for select to authenticated using (true);

-- RPCs
create or replace function public.start_conversation(_other uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare me uuid := public.current_profile_id(); cid uuid;
begin
  if me is null then raise exception 'No profile'; end if;
  if me = _other then raise exception 'Cannot message yourself'; end if;
  select a.conversation_id into cid from public.conversation_participants a
    join public.conversation_participants b on a.conversation_id=b.conversation_id
    where a.profile_id=me and b.profile_id=_other limit 1;
  if cid is not null then return cid; end if;
  insert into public.conversations default values returning id into cid;
  insert into public.conversation_participants(conversation_id, profile_id) values (cid, me), (cid, _other);
  return cid;
end $$;

create or replace function public.create_request(_mentor uuid, _category text, _title text, _description text, _start date, _end date)
returns uuid language plpgsql security definer set search_path=public as $$
declare me uuid := public.current_profile_id(); rid uuid; cid uuid; myname text;
begin
  if me is null then raise exception 'No profile'; end if;
  if not exists(select 1 from public.mentor_assignments where mentor_id=_mentor and student_id=me) then
    raise exception 'You can only send requests to your assigned mentors'; end if;
  if length(coalesce(_title,'')) = 0 then raise exception 'Title is required'; end if;
  if _start is not null and _end is not null and _end < _start then raise exception 'End date must be after start date'; end if;
  cid := public.start_conversation(_mentor);
  insert into public.requests(conversation_id, student_id, mentor_id, category, title, description, start_date, end_date)
    values (cid, me, _mentor, _category, _title, coalesce(_description,''), _start, _end) returning id into rid;
  insert into public.messages(conversation_id, sender_id, body, request_id) values (cid, me, 'Sent a request: '||_title, rid);
  select full_name into myname from public.profiles where id=me;
  insert into public.notifications(profile_id, title, body, link) values (_mentor, 'New request from '||myname, _title, '/requests');
  return rid;
end $$;

create or replace function public.respond_request(_id uuid, _status public.request_status, _note text)
returns void language plpgsql security definer set search_path=public as $$
declare me uuid := public.current_profile_id(); r public.requests;
begin
  select * into r from public.requests where id=_id;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.mentor_id <> me then raise exception 'Only the assigned mentor can respond'; end if;
  if _status not in ('approved','rejected','info_requested') then raise exception 'Invalid status'; end if;
  if r.status not in ('pending','info_requested') then raise exception 'This request is already closed'; end if;
  if _status in ('rejected','info_requested') and length(coalesce(_note,''))=0 then raise exception 'Please add a note'; end if;
  update public.requests set status=_status, mentor_note=_note, updated_at=now() where id=_id;
  if r.conversation_id is not null then
    insert into public.messages(conversation_id, sender_id, body, request_id)
      values (r.conversation_id, me, case _status when 'approved' then 'Approved: ' when 'rejected' then 'Rejected: ' else 'More info needed: ' end || r.title || coalesce(' — '||_note,''), _id);
  end if;
  insert into public.notifications(profile_id, title, body, link)
    values (r.student_id, 'Request '||replace(_status::text,'_',' '), r.title, '/requests');
end $$;

create or replace function public.update_request(_id uuid, _description text)
returns void language plpgsql security definer set search_path=public as $$
declare me uuid := public.current_profile_id(); r public.requests;
begin
  select * into r from public.requests where id=_id;
  if r.student_id is distinct from me then raise exception 'Not your request'; end if;
  if r.status <> 'info_requested' then raise exception 'Request is not awaiting info'; end if;
  update public.requests set description=_description, status='pending', updated_at=now() where id=_id;
  insert into public.notifications(profile_id, title, body, link) values (r.mentor_id, 'Request updated', r.title, '/requests');
end $$;

create or replace function public.cancel_request(_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.requests set status='cancelled', updated_at=now()
   where id=_id and student_id=public.current_profile_id() and status in ('pending','info_requested');
  if not found then raise exception 'Cannot cancel this request'; end if;
end $$;

revoke execute on function public.start_conversation(uuid), public.create_request(uuid,text,text,text,date,date), public.respond_request(uuid,public.request_status,text), public.update_request(uuid,text), public.cancel_request(uuid) from public, anon;
grant execute on function public.start_conversation(uuid), public.create_request(uuid,text,text,text,date,date), public.respond_request(uuid,public.request_status,text), public.update_request(uuid,text), public.cancel_request(uuid) to authenticated;

-- signup trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(user_id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.notifications;

-- seed
insert into public.universities(id,name,short_name,city,country) values
 ('11111111-0000-0000-0000-000000000001','Northbridge Institute of Technology','NIT','Bengaluru','India'),
 ('11111111-0000-0000-0000-000000000002','Halcyon University','Halcyon','Mumbai','India'),
 ('11111111-0000-0000-0000-000000000003','Vantage School of Business','Vantage','Delhi','India');

insert into public.profiles(university_id, full_name, headline, company, job_title, industry, location, department, graduation_year, skills, is_alumni, is_mentor, open_to_mentor, offers_referrals, onboarded, bio) values
 ('11111111-0000-0000-0000-000000000001','Aarav Mehta','Staff Engineer at Stripe','Stripe','Staff Engineer','Fintech','Bengaluru','Computer Science',2014,'{Distributed Systems,Go,Payments}',true,true,true,true,true,'Building payment rails. Happy to talk systems design and careers in fintech.'),
 ('11111111-0000-0000-0000-000000000001','Priya Raman','Product Lead at Google','Google','Product Lead','Technology','Hyderabad','Electronics',2016,'{Product Strategy,AI,Growth}',true,true,true,false,true,'PM for AI products. I mentor students moving from engineering into product.'),
 ('11111111-0000-0000-0000-000000000001','Dr. Kavya Iyer','Professor & Faculty Mentor','NIT','Associate Professor','Education','Bengaluru','Computer Science',2008,'{Machine Learning,Research}',false,true,true,false,true,'Faculty mentor for CS undergraduates. Research in applied ML.'),
 ('11111111-0000-0000-0000-000000000002','Rohan Kapoor','Design Director at Figma','Figma','Design Director','Design','San Francisco','Design',2012,'{Product Design,Design Systems}',true,true,true,true,true,'Design leader. Portfolio reviews on Fridays.'),
 ('11111111-0000-0000-0000-000000000002','Ananya Singh','Investment Associate at Sequoia','Sequoia','Investment Associate','Venture Capital','Mumbai','Economics',2019,'{Venture,Startups,Finance}',true,false,false,true,true,'Investing in early-stage Indian startups.'),
 ('11111111-0000-0000-0000-000000000002','Vikram Joshi','ML Engineer at OpenAI','OpenAI','ML Engineer','AI','San Francisco','Computer Science',2018,'{LLMs,Python,Research}',true,true,true,true,true,'Working on model training infrastructure.'),
 ('11111111-0000-0000-0000-000000000003','Meera Nair','Consultant at McKinsey','McKinsey','Engagement Manager','Consulting','Delhi','MBA',2017,'{Strategy,Case Interviews}',true,true,true,false,true,'Consulting prep and case practice.'),
 ('11111111-0000-0000-0000-000000000003','Kabir Sethi','Founder at Lumen Labs','Lumen Labs','Founder & CEO','Startups','Bengaluru','MBA',2015,'{Fundraising,Leadership}',true,false,false,true,true,'Second-time founder, climate tech.'),
 ('11111111-0000-0000-0000-000000000001','Ishita Banerjee','SDE II at Amazon','Amazon','SDE II','E-commerce','Seattle','Computer Science',2020,'{Java,AWS,Backend}',true,false,false,true,true,'Can refer for Amazon SDE roles.'),
 ('11111111-0000-0000-0000-000000000003','Arjun Rao','VP Marketing at Zomato','Zomato','VP Marketing','Consumer','Gurugram','MBA',2011,'{Brand,Marketing}',true,true,true,false,true,'Brand and growth marketing.');

insert into public.events(university_id,title,description,category,starts_at,location,is_online) values
 ('11111111-0000-0000-0000-000000000001','Alumni Tech Night','Panel with alumni from Stripe, Google and Amazon.','Networking', now() + interval '6 days','Main Auditorium',false),
 ('11111111-0000-0000-0000-000000000002','Portfolio Review Sprint','Bring your design work for live critique.','Workshop', now() + interval '10 days','Online',true),
 ('11111111-0000-0000-0000-000000000003','Case Interview Bootcamp','Two-hour consulting case practice.','Career', now() + interval '14 days','Room 204',false),
 (null,'Oracule Global Founders Summit','Cross-university founders meetup.','Summit', now() + interval '21 days','Online',true);

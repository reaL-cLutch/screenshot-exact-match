# Oracule — Build Plan

The spec covers 10 phases. This plan delivers a working first release (Phases 1–3 plus the core of 4–6), then later phases build on it in follow-up rounds.

## Release 1 scope

1. Brand and look
   - Black-first cinematic theme with Liquid Glass panels, pink/violet accents, Space Grotesk + Manrope.
   - Smooth page and tab transitions, reduced-motion support.
   - Landing page with tagline "Where Experience Meets Ambition."

2. Accounts and universities
   - Email sign-up and sign-in, onboarding that picks university, role (student, alumni, mentor) and profile basics.
   - Multiple universities seeded (3 demo universities); users belong to one home university.
   - Roles stored separately; a user can hold several and switch between them.

3. Student home dashboard
   - Welcome section, My Mentors / Discover Mentors panel, Following / All Alumni panel.
   - Upcoming events, recent conversations, notifications preview.

4. Discover Alumni
   - Listing with search and filters (university, company, industry, graduation year, location).
   - Profile detail page with follow and message actions.

5. Messaging
   - Live one-to-one chat, conversation list, unread markers.
   - Plus-menu in chat to create a Smart Request.

6. Smart Requests
   - Request categories (leave, recommendation letter, project approval, etc.), form, card shown inside the chat.
   - Mentor can accept, reject or ask for more info; status tracking page; notifications.

7. Mentor dashboard (basic)
   - My mentees, pending requests, quick actions.

8. University admin (basic)
   - Manage students/alumni/mentors list and assign mentors to students.

## Later releases
Session booking, events module, opportunities and referrals marketplace, full notifications center, moderation, super-admin console, analytics.

## Technical details
- Lovable Cloud: auth, database, realtime for messages/requests/notifications, storage for avatars and request attachments.
- Tables: universities, profiles, user_roles (app_role enum: student, alumni, mentor, uni_admin, super_admin), mentor_assignments, follows, conversations, conversation_participants, messages, requests, request_events, notifications, events.
- RLS: data scoped to the user's university for admin actions; cross-university read of public profiles; messages visible only to participants; requests visible to requester and assigned mentor; has_role() security-definer checks.
- Routes: /, /auth, /onboarding, /app (dashboard), /app/alumni, /app/alumni/$id, /app/messages, /app/messages/$id, /app/requests, /app/mentor, /app/admin.
- Framer Motion for transitions; seeded demo alumni/mentors so screens aren't empty.

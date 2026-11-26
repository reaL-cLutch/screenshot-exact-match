<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Oracule architecture
- Signed-in pages live under `src/routes/_authenticated/` (ssr:false); the layout gates on session and sends un-onboarded users to /onboarding. Why: session is browser-held.
- Data is read/written from the browser via the Supabase client under RLS; multi-table or privileged actions (start chat, create/respond/update/cancel request) are SECURITY DEFINER RPCs. Why: keeps permission rules in the database.
- Profiles have nullable `user_id` so seeded demo members exist without accounts. Privilege roles (uni_admin, super_admin) live only in `user_roles`; student/alumni/mentor are profile identity flags.
- Only assigned mentors (mentor_assignments) can receive and decide requests; enforced in RPCs.
- Live updates: one channel per session in `useLiveUpdates` (src/lib/data.ts) invalidating query keys.
- Theme is black-first Liquid Glass: tokens in src/styles.css, `glass`/`glass-strong`/`bg-brand`/`text-gradient` utilities.

import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Compass, Home, Inbox, LogOut, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, notificationsQuery, useLiveUpdates, useMe } from "@/lib/data";
import { PersonAvatar } from "@/components/oracule/bits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const me = await context.queryClient.ensureQueryData(meQuery);
    if ((!me || !me.profile.onboarded) && location.pathname !== "/onboarding") throw redirect({ to: "/onboarding" });
  },
  component: Shell,
});

function Shell() {
  const me = useMe();
  const loc = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useLiveUpdates(me?.profile.id);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") {
        qc.clear();
        navigate({ to: "/auth" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, qc]);

  if (loc.pathname === "/onboarding" || !me) return <Outlet />;
  const p = me.profile;
  const isAdmin = me.roles.includes("uni_admin") || me.roles.includes("super_admin");

  const nav = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/alumni", label: "Discover", icon: Compass },
    { to: "/messages", label: "Messages", icon: MessagesSquare },
    { to: "/requests", label: "Requests", icon: Inbox },
    ...(p.is_mentor ? [{ to: "/mentor", label: "Mentor", icon: Sparkles }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div className="relative min-h-screen">
      <div className="ambient" />
      <header className="glass-strong sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link to="/dashboard" className="font-display text-lg font-bold">
            ORACULE<span className="text-primary">.</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={cn("relative rounded-full px-4 py-2 text-sm transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {active && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-primary/30 bg-primary/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <PersonAvatar p={p} size={36} />
            <button aria-label="Sign out" onClick={() => supabase.auth.signOut()} className="rounded-full p-2 text-muted-foreground hover:bg-glass hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-28 pt-8 md:px-6 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname.split("/")[1]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="glass-strong fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl py-2 md:hidden">
        {nav.map((n) => {
          const active = loc.pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-0.5 px-2 text-[11px]", active ? "text-primary" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NotificationsBell() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(notificationsQuery);
  const unread = data.filter((n) => !n.read).length;
  async function markAll() {
    const ids = data.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) await supabase.from("notifications").update({ read: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <Popover onOpenChange={(o) => !o && unread && markAll()}>
      <PopoverTrigger aria-label="Notifications" className="relative rounded-full p-2 text-muted-foreground hover:bg-glass hover:text-foreground">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-strong w-80 border-border p-2">
        <div className="px-2 py-1.5 font-display text-sm font-semibold">Notifications</div>
        {data.length === 0 && <div className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
        <div className="max-h-96 overflow-y-auto">
          {data.map((n) => (
            <Link key={n.id} to={(n.link as "/requests") ?? "/dashboard"} className="block rounded-lg px-2 py-2 hover:bg-glass">
              <div className="flex items-center gap-2 text-sm font-medium">
                {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                {n.title}
              </div>
              {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

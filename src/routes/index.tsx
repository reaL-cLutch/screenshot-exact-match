import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, MessagesSquare, ShieldCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oracule — Where Experience Meets Ambition" },
      { name: "description", content: "Meet alumni, get mentored and grow your career across universities on Oracule." },
      { property: "og:title", content: "Oracule — Where Experience Meets Ambition" },
      { property: "og:description", content: "Alumni networking and mentorship across universities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, title: "Alumni across campuses", body: "Discover graduates at the companies you want to join, from every partner university." },
  { icon: Sparkles, title: "Real mentorship", body: "Your assigned mentors guide you, review your requests and share opportunities." },
  { icon: MessagesSquare, title: "Live messaging", body: "Chat instantly and send formal requests straight from the conversation." },
  { icon: ShieldCheck, title: "Verified network", body: "Every university is verified, and your data stays with your institution." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="ambient" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-bold tracking-tight">
          ORACULE<span className="text-primary">.</span>
        </span>
        <Link to="/auth" className="glass rounded-full px-5 py-2 text-sm font-medium hover:text-primary">
          Sign in
        </Link>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
        <motion.div initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Multi-university mentorship network
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.02] md:text-7xl">
            Where experience <br />
            <span className="text-gradient">meets ambition.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Oracule connects students with alumni and mentors who have walked the path — so your next move is never a guess.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth" className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-primary-foreground glow">
              Join Oracule <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/auth" className="glass inline-flex items-center rounded-full px-7 py-3.5 font-medium">
              I already have an account
            </Link>
          </div>
        </motion.div>
        <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ y: 12 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="glass rounded-2xl p-6"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-4 font-display font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

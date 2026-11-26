import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { useMe } from "@/lib/data";
import { ConversationList } from "@/components/oracule/conversation-list";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Oracule" }, { name: "description", content: "Your conversations." }, { property: "og:title", content: "Messages — Oracule" }, { property: "og:description", content: "Your conversations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => {
    const me = useMe()!;
    return (
      <div className="glass grid h-[calc(100vh-10rem)] overflow-hidden rounded-3xl md:grid-cols-[320px_1fr]">
        <div className="overflow-y-auto border-r border-border">
          <div className="px-5 pt-5 font-display text-xl font-bold">Messages</div>
          <ConversationList me={me.profile.id} />
        </div>
        <div className="hidden flex-col items-center justify-center text-center text-muted-foreground md:flex">
          <MessagesSquare className="h-10 w-10 text-primary" />
          <p className="mt-3">Pick a conversation to start chatting.</p>
        </div>
      </div>
    );
  },
});

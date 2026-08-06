// apps/hub-central/app/messages/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { ChatRoom } from "../../../../components/chat/ChatRoom";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  const userSlug = (session?.user as any)?.slug || (session?.user as any)?.uid;

  if (!userSlug) {
    redirect("/auth/signin");
  }

  // Salon par défaut de la canopée
  const defaultConversationSlug = "canopee-generale";

  return (
    <main className="flex h-screen w-full bg-zinc-950 p-4 md:p-6">
      <div className="w-full max-w-5xl mx-auto h-full">
        <ChatRoom 
          conversationSlug={defaultConversationSlug} 
          currentUserSlug={userSlug} 
        />
      </div>
    </main>
  );
}
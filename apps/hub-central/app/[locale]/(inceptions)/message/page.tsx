// apps/hub-central/app/messages/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat/ChatRoom";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  
  // 🛡️ Gardien de l'Îlot : Si pas de session, retour au SAS
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Extraction du slug/uid de manière sécurisée
  const user = session.user as any;
  const userSlug = user?.slug || user?.uid;

  // Salon par défaut de la canopée
  const defaultConversationSlug = "canopee-generale";

  return (
    <div className="h-full w-full p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-5xl mx-auto h-full rounded-3xl overflow-hidden border border-white/5 bg-black/20 backdrop-blur-xl shadow-2xl">
        <ChatRoom 
          conversationSlug={defaultConversationSlug} 
          currentUserSlug={userSlug} 
        />
      </div>
    </div>
  );
}
// apps/hub-central/components/chat/ChatRoom.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { IRawAttachmentPointer } from '@ilot/types';
import { AttachmentPicker } from './AttachmentPicker';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface ChatRoomProps {
  conversationSlug: string;
  currentUserSlug: string;
}

// Connexion globale ou instanciée du client socket (pointe vers ton serveur de jeux / socket)
let socket: Socket;

export function ChatRoom({ conversationSlug, currentUserSlug }: ChatRoomProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [rawAttachments, setRawAttachments] = useState<IRawAttachmentPointer[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Charger l'historique des messages au montage
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages?conversationSlug=${conversationSlug}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
      } catch (err) {
        console.error("Erreur de lecture du salon", err);
      }
    }
    fetchMessages();
  }, [conversationSlug]);

  // 2. Initialiser et écouter les web-sockets en temps réel
  useEffect(() => {
    // Connexion au serveur socket (adapter l'URL si nécessaire, ex: port 3002)
    socket = io({
      path: '/socket.io',
    });

    // Rejoindre le salon de discussion spécifique basé sur le slug
    socket.emit('room:join', { roomId: conversationSlug, username: currentUserSlug });

    // Écouter les nouveaux messages diffusés en direct
    socket.on('chat:message', (incomingMessage: any) => {
      setMessages(prev => {
        // Évite d'ajouter deux fois le même message si on est l'expéditeur
        if (prev.some(m => m.slug === incomingMessage.slug)) return prev;
        return [...prev, incomingMessage];
      });
    });

    return () => {
      socket.emit('room:leave', { roomId: conversationSlug });
      socket.disconnect();
    };
  }, [conversationSlug, currentUserSlug]);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message (via API REST pour persistance Silice, qui déclenchera le socket)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && rawAttachments.length === 0) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationSlug,
          content,
          rawAttachments
        })
      });

      const data = await res.json();

      // 🛡️ DOUANE VIBRATOIRE : Gestion du refus d'accès pour les profils indésirables ou bannis
      if (res.status === 403) {
        toast.error(data.error || "Souveraineté restreinte : Le salon vous est fermé.");
        return;
      }

      if (res.ok && data.success) {
        // Optionnel : Ajout immédiat local ou diffusion manuelle par socket si l'API ne le fait pas déjà
        setMessages(prev => {
          if (prev.some(m => m.slug === data.message.slug)) return prev;
          return [...prev, data.message];
        });

        // Propagation en temps réel aux autres pairs connectés dans le salon
        socket.emit('chat:send-message', {
          ...data.message,
          roomId: conversationSlug
        });

        setContent('');
        setRawAttachments([]);
      } else {
        toast.error(data.error || "Impossible de propager le message.");
      }
    } catch (err) {
      console.error("Erreur d'envoi du message", err);
      toast.error("La tempête a étouffé votre message.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white rounded-2xl border border-zinc-800 overflow-hidden">
      
      {/* 📜 Fil de discussion */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderSlug === currentUserSlug;
          return (
            <div key={msg.slug} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-md rounded-2xl p-4 ${isMe ? 'bg-indigo-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-200'}`}>
                
                {/* Texte du message */}
                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}

                {/* 🌟 Affichage des attachements résolus (Letr'In, Shop, etc.) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.targetRoute}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 hover:bg-black/50 transition-colors border border-white/10 group"
                      >
                        {att.thumbnailUrl && (
                          <img src={att.thumbnailUrl} alt={att.title} className="w-12 h-12 object-cover rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">{att.sourceType}</span>
                          <p className="text-sm font-medium text-white truncate group-hover:underline">{att.title}</p>
                          {att.subtitle && <p className="text-xs text-zinc-400 truncate">{att.subtitle}</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ✍️ Zone de saisie */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 relative">
        
        {/* Aperçu des attachements en cours d'envoi */}
        {rawAttachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {rawAttachments.map((att, idx) => (
              <span key={idx} className="bg-indigo-900/60 border border-indigo-500 text-indigo-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-2">
                📎 {att.sourceType} : {att.entitySlug}
                <button 
                  onClick={() => setRawAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tiroir d'attachements conditionnel */}
        {isPickerOpen && (
          <AttachmentPicker 
            onSelect={(pointer) => setRawAttachments(prev => [...prev, pointer])}
            onClose={() => setIsPickerOpen(false)}
          />
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Ajouter une création"
          >
            ➕
          </button>
          
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chanter un message dans le salon..."
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm transition-colors"
          >
            Envoyer
          </button>
        </form>
      </div>

    </div>
  );
}
"use client";

import { useChat } from "../../context/ChatContext";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Définition locale de l'interface ChatMessage
export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderUsername: string;
    text: string;
    timestamp: number;
}

const MOCK_USER = { id: `user-${Math.floor(Math.random()*1000)}`, username: "Oiseau_Curieux" };
const CURRENT_ROOM_ID = "agora-publique"; 

export function GlobalChatWidget() {
    const { isOpen, closeChat, toggleChat } = useChat();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3002";
        socketRef.current = io(SERVER_URL);

        socketRef.current.emit("room:join", { roomId: CURRENT_ROOM_ID, username: MOCK_USER.username });

        socketRef.current.on("chat:message", (incomingMsg: ChatMessage) => {
            setMessages((prev) => [...prev, incomingMsg]);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !socketRef.current) return;

        const newMsg: ChatMessage = {
            id: Date.now().toString(),
            roomId: CURRENT_ROOM_ID,
            senderId: MOCK_USER.id,
            senderUsername: MOCK_USER.username,
            text: message,
            timestamp: Date.now(),
        };

        socketRef.current.emit("chat:send-message", newMsg);
        setMessage("");
    };

    const handleArchive = async () => {
        if (messages.length === 0) return;
        if (confirm("Voulez-vous graver cette conversation dans les archives de l'Îlot ?")) {
            console.log("Données à archiver :", messages);
            alert("💾 La conversation a été archivée avec succès.");
        }
    };

    return (
        <>
            {/* BOUTON FLOTTANT */}
            <button 
                onClick={toggleChat}
                className={`fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-all duration-300 ease-in-out transform z-50 flex items-center justify-center 
                ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-110 hover:rotate-12'}`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>

            {/* FENÊTRE DE CHAT */}
            <div 
                className={`fixed bottom-6 right-6 w-80 sm:w-96 h-[30rem] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden transition-all duration-300 ease-out origin-bottom-right 
                ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700 shadow-sm">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                        Canal: {CURRENT_ROOM_ID === 'agora-publique' ? 'L\'Agora' : CURRENT_ROOM_ID}
                    </h3>
                    <div className="flex gap-3">
                        <button onClick={handleArchive} title="Graver la conversation" className="text-gray-400 hover:text-blue-400 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                        </button>
                        <button onClick={closeChat} className="text-gray-400 hover:text-red-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto bg-[#0a0c10] text-sm space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-gray-600 text-xs italic">Le silence règne sur le réseau...</span>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === MOCK_USER.id;
                            return (
                                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-gray-500 text-[10px] mb-1 font-mono uppercase tracking-wider">{msg.senderUsername}</span>
                                    <span className={`px-3 py-2 rounded-lg max-w-[85%] break-words shadow-sm ${
                                        isMe 
                                        ? 'bg-purple-600 text-white rounded-tr-none' 
                                        : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
                    <input 
                        type="text" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Transmettre..." 
                        className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-500"
                    />
                    <button 
                        type="submit" 
                        disabled={!message.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-bold transition-all shadow-md"
                    >
                        ➤
                    </button>
                </form>
            </div>
        </>
    );
}
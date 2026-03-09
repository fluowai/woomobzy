
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Send, Search, User, MoreVertical, Paperclip, Phone, Video, Smile } from 'lucide-react';

interface Chat {
  jid: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  remote_jid: string;
  content: string;
  from_me: boolean;
  timestamp: string;
  status?: string;
}

const Messages: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Polling interval ref to clear on unmount
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // 1. Fetch Chats List
    const fetchChats = async () => {
        try {
            const { data } = await axios.get('/api/evolution/chats');
            if (data.success) {
                setChats(data.chats);
            }
        } catch (error) {
            console.error('Erro ao buscar chats:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Messages for Active Chat
    const fetchMessages = async (jid: string) => {
        try {
            setLoadingMessages(true);
            const { data } = await axios.get(`/api/evolution/messages/${jid}`);
            if (data.success) {
                setMessages(data.messages);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Initial Load
    useEffect(() => {
        fetchChats();
        
        // Poll for new chats every 10s
        const interval = setInterval(fetchChats, 10000);
        return () => clearInterval(interval);
    }, []);

    // When active chat changes, load its messages
    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat.jid);
            
            // Poll for new messages in active chat every 3s
            if (pollInterval.current) clearInterval(pollInterval.current);
            pollInterval.current = setInterval(() => {
                // Background update (no loading spinner)
                axios.get(`/api/evolution/messages/${activeChat.jid}`)
                    .then(res => {
                        if (res.data.success) {
                            // Only update if count changed to avoid flicks (simple check)
                            setMessages(prev => {
                                if (res.data.messages.length !== prev.length) {
                                    scrollToBottom();
                                    return res.data.messages;
                                }
                                return prev;
                            });
                        }
                    });
            }, 3000);
        }
        
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [activeChat]);


    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const tempMsg: Message = {
            id: 'temp-' + Date.now(),
            remote_jid: activeChat.jid,
            content: newMessage,
            from_me: true,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Optimistic UI update
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');
        scrollToBottom();

        try {
            await axios.post('/api/evolution/messages/send', {
                remoteJid: activeChat.jid,
                text: tempMsg.content
            });
            // Refresh logic will pick up the real message eventually
        } catch (error) {
            console.error('Erro ao enviar:', error);
            alert('Erro ao enviar mensagem');
        }
    };


    // Helper to format time
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };


    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            
            {/* Sidebar (Chat List) */}
            <div className="w-80 md:w-96 border-r border-gray-200 flex flex-col bg-gray-50">
                {/* Header Side */}
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                             {user?.email?.charAt(0).toUpperCase()}
                         </div>
                         <h2 className="font-semibold text-gray-800">Mensagens</h2>
                    </div>
                </div>
                
                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar conversa..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                    ) : chats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>Nenhuma conversa.</p>
                            <p className="text-xs mt-2">Novas mensagens aparecerão aqui.</p>
                        </div>
                    ) : (
                        chats.map(chat => (
                            <div 
                                key={chat.jid}
                                onClick={() => setActiveChat(chat)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${activeChat?.jid === chat.jid ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-800 truncate">{chat.name}</span>
                                    <span className="text-xs text-gray-500">{formatTime(chat.timestamp)}</span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                {/* Chat Background Pattern */}
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                {activeChat ? (
                    <>
                        {/* Header */}
                        <div className="bg-white p-3 border-b border-gray-200 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{activeChat.name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Online via WhatsApp
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-500">
                                <Search size={20} className="cursor-pointer hover:text-gray-700" />
                                <Phone size={20} className="cursor-pointer hover:text-gray-700" />
                                <MoreVertical size={20} className="cursor-pointer hover:text-gray-700" />
                            </div>
                        </div>

                        {/* Messages Feed */}
                        <div className="flex-1 overflow-y-auto p-4 z-10 flex flex-col gap-2">
                            {messages.map((msg, idx) => (
                                <div 
                                    key={msg.id || idx} 
                                    className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative ${
                                            msg.from_me 
                                                ? 'bg-[#d9fdd3] rounded-tr-none' 
                                                : 'bg-white rounded-tl-none'
                                        }`}
                                    >
                                        <p className="text-sm text-gray-800 break-words">{msg.content}</p>
                                        <div className="text-[10px] text-gray-500 text-right mt-1 flex items-center justify-end gap-1">
                                            {formatTime(msg.timestamp)}
                                            {msg.from_me && (
                                                <span className="text-blue-500">✓✓</span> 
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="bg-white p-3 border-t border-gray-200 z-10 flex items-center gap-2">
                             <div className="flex gap-2 text-gray-500">
                                <Smile size={24} className="cursor-pointer hover:text-gray-700" />
                                <Paperclip size={24} className="cursor-pointer hover:text-gray-700" />
                             </div>
                             
                             <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Digite uma mensagem"
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-gray-50"
                             />
                             
                             <button 
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                             >
                                <Send size={20} />
                             </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 z-10">
                        <div className="w-64 h-64 bg-gray-200 rounded-full mb-6 flex items-center justify-center">
                            <span className="text-6xl">📱</span>
                        </div>
                        <h2 className="text-2xl font-light mb-2">ImobiSaaS WhatsApp</h2>
                        <p className="text-sm">Selecione uma conversa para começar a enviar mensagens.</p>
                        <div className="mt-8 text-xs text-gray-400 flex items-center gap-1">
                            🔒 Protegido com criptografia de ponta a ponta
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;

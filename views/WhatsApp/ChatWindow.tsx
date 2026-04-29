import React, { useState, useRef, useEffect } from 'react';
import { type Chat, type Message } from './hooks/api';
import MessageBubble from './MessageBubble';
import { Send, Paperclip, Smile, ArrowDown, Users, Phone, MoreVertical, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (content: string) => void;
  loading: boolean;
  instanceName: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  onSendMessage,
  loading,
  instanceName,
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.msgs.push(msg);
    } else {
      acc.push({ date, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <main className="wa-chat-window" id="chat-window">
      {/* Chat Header */}
      <header className="wa-chat-header">
        <div className="wa-chat-header-info">
          <div className="wa-chat-header-avatar">
            {chat.is_group ? (
              <Users size={20} />
            ) : (
              <span>{chat.name?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>
          <div>
            <h2 className="wa-chat-header-name">{chat.name}</h2>
            <span className="wa-chat-header-sub">
              {chat.is_group ? 'Grupo' : chat.chat_jid?.split('@')[0] || ''}
              {instanceName && ` · ${instanceName}`}
            </span>
          </div>
        </div>
        <div className="wa-chat-header-actions">
          <button className="wa-icon-btn" title="Ligar">
            <Phone size={18} />
          </button>
          <button className="wa-icon-btn" title="Mais opções">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div
        className="wa-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        id="messages-container"
      >
        {loading ? (
          <div className="wa-messages-loading">
            <Loader2 size={24} className="animate-spin" />
            <span>Carregando mensagens...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="wa-messages-empty">
            <p>Nenhuma mensagem nesta conversa</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="wa-date-divider">
                <span>{group.date}</span>
              </div>
              {group.msgs.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isGroup={chat.is_group} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll Down Button */}
      {showScrollDown && (
        <button className="wa-scroll-down" onClick={scrollToBottom}>
          <ArrowDown size={18} />
        </button>
      )}

      {/* Input Area */}
      <form className="wa-input-area" onSubmit={handleSubmit} id="message-input-form">
        <button type="button" className="wa-icon-btn" title="Emoji">
          <Smile size={22} />
        </button>
        <button type="button" className="wa-icon-btn" title="Anexar">
          <Paperclip size={22} />
        </button>
        <div className="wa-input-wrapper">
          <textarea
            className="wa-message-input"
            placeholder="Digite uma mensagem..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            id="message-input"
          />
        </div>
        <button
          type="submit"
          className={`wa-send-btn ${inputText.trim() ? 'active' : ''}`}
          disabled={!inputText.trim()}
          title="Enviar"
        >
          <Send size={20} />
        </button>
      </form>
    </main>
  );
};

export default ChatWindow;

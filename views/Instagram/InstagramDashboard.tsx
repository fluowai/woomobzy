import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import {
  instagramApi,
  type InstagramAccount,
  type InstagramConversation,
  type InstagramMessage,
  type InstagramContact,
} from './hooks/api';
import { useInstagramWebSocket } from './hooks/useWebSocket';
import {
  Instagram,
  MessageSquare,
  Users,
  Send,
  FileText,
  Radio,
  Settings,
  WifiOff,
  Loader2,
  Plus,
  Search,
  ArrowLeft,
  UserCheck,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

type View = 'inbox' | 'contacts' | 'templates' | 'broadcasts' | 'settings';

const InstagramDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InstagramAccount | null>(null);
  const [activeView, setActiveView] = useState<View>('inbox');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<InstagramConversation[]>(
    []
  );
  const [selectedConversation, setSelectedConversation] =
    useState<InstagramConversation | null>(null);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<InstagramContact[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectUsername, setConnectUsername] = useState('');

  const handleWSEvent = useCallback(
    (event: { type: string; [key: string]: unknown }) => {
      switch (event.type) {
        case 'message:incoming':
        case 'message:new':
          if (event.conversationId === selectedConversation?.id) {
            setMessages((prev) => [...prev, event.message as InstagramMessage]);
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === event.conversationId
                ? {
                    ...c,
                    unread_count: c.unread_count + 1,
                    last_message_at: new Date().toISOString(),
                  }
                : c
            )
          );
          break;
        case 'account:status':
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === event.accountId
                ? { ...a, status: event.status as InstagramAccount['status'] }
                : a
            )
          );
          break;
        case 'account:session_expired':
          toast.error('Instagram session expired. Please reconnect.');
          break;
      }
    },
    [selectedConversation?.id]
  );

  useInstagramWebSocket(companyId, handleWSEvent);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadConversations(selectedAccount.id);
      setCompanyId(selectedAccount.company_id);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await instagramApi.accounts.list();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0]);
    } catch (err) {
      toast.error('Failed to load Instagram accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (accountId: string) => {
    try {
      const { data } = await instagramApi.conversations.list({
        status: 'open',
      });
      setConversations(data);
    } catch (err) {
      logger.error('Failed to load conversations', err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await instagramApi.messages.list(conversationId);
      setMessages(data);
      await instagramApi.messages.markRead(conversationId);
    } catch (err) {
      logger.error('Failed to load messages', err);
    }
  };

  const handleConversationClick = (conv: InstagramConversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    setSending(true);
    try {
      const { data } = await instagramApi.messages.send({
        conversation_id: selectedConversation.id,
        content: messageInput.trim(),
      });
      setMessages((prev) => [...prev, data]);
      setMessageInput('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleConnectAccount = async () => {
    if (!connectUsername.trim()) return;
    try {
      const { qr } = await instagramApi.accounts.connect(
        connectUsername.trim()
      );
      toast.success('QR code generated. Scan with Instagram app.');
      setShowConnectModal(false);
      setConnectUsername('');
      loadAccounts();
    } catch (err) {
      toast.error('Failed to connect account');
    }
  };

  const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: 'inbox', icon: <MessageSquare size={20} />, label: 'Inbox' },
    { id: 'contacts', icon: <Users size={20} />, label: 'Contacts' },
    { id: 'templates', icon: <FileText size={20} />, label: 'Templates' },
    { id: 'broadcasts', icon: <Radio size={20} />, label: 'Broadcasts' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Nav */}
      <div className="w-16 bg-white dark:bg-gray-800 border-r flex flex-col items-center py-4 gap-4">
        <div className="text-orange-500 font-bold mb-4">
          <Instagram size={28} />
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`p-3 rounded-lg transition-colors ${
              activeView === item.id
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {activeView === 'inbox' && (
          <>
            {/* Conversations List */}
            <div className="w-80 border-r bg-white dark:bg-gray-800 flex flex-col">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedAccount?.username || 'No account'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedAccount?.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {selectedAccount?.status}
                  </span>
                </div>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations
                  .filter(
                    (c) =>
                      !searchQuery ||
                      c.contact?.username
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      c.contact?.full_name
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleConversationClick(conv)}
                      className={`w-full text-left p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                          {conv.contact?.profile_picture_url ? (
                            <img
                              src={conv.contact.profile_picture_url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <UserCheck size={18} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {conv.contact?.full_name ||
                                conv.contact?.username ||
                                'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {conv.last_message_at
                                ? formatTime(conv.last_message_at)
                                : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {conv.last_message_preview || 'No messages yet'}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b bg-white dark:bg-gray-800 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="text-gray-400 hover:text-gray-600 md:hidden"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                      {selectedConversation.contact?.profile_picture_url ? (
                        <img
                          src={selectedConversation.contact.profile_picture_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UserCheck size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {selectedConversation.contact?.full_name ||
                          selectedConversation.contact?.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        @{selectedConversation.contact?.username}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                            msg.direction === 'outbound'
                              ? 'bg-orange-500 text-white rounded-br-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                          <p
                            className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-orange-100' : 'text-gray-400'}`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          handleSendMessage()
                        }
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 text-sm border rounded-full bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={sending}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sending || !messageInput.trim()}
                        className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {sending ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare
                      size={48}
                      className="mx-auto mb-3 opacity-30"
                    />
                    <p className="text-sm">
                      Select a conversation to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeView === 'contacts' && (
          <div className="flex-1 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Instagram Contacts
            </h2>
            {/* Contacts list placeholder - full implementation would go here */}
            <p className="text-gray-500">Contact management view</p>
          </div>
        )}

        {activeView === 'templates' && (
          <div className="flex-1 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Message Templates
            </h2>
            <p className="text-gray-500">Template management view</p>
          </div>
        )}

        {activeView === 'broadcasts' && (
          <div className="flex-1 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Broadcast Campaigns
            </h2>
            <p className="text-gray-500">Broadcast management view</p>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Instagram Settings
            </h2>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        {account.profile_picture_url ? (
                          <img
                            src={account.profile_picture_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Instagram size={18} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          @{account.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {account.followers_count} followers
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        account.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : account.status === 'login_required'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus size={16} />
                Connect Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connect Instagram Account
            </h3>
            <input
              type="text"
              value={connectUsername}
              onChange={(e) => setConnectUsername(e.target.value)}
              placeholder="Instagram username"
              className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectAccount}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export default InstagramDashboard;

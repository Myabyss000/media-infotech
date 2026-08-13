'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  MessageSquare,
  Hash,
  Send,
  Paperclip,
  Smile,
  Search,
  Users,
  MoreVertical,
  Info,
  FileText,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  text: string;
  attachment?: { type: 'image' | 'file'; url: string; name: string };
  reactions?: Record<string, number>;
  timestamp: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  description?: string;
  unreadCount?: number;
  isOnline?: boolean;
  role?: string;
  avatar?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Channels & DM Contacts
  const [channels] = useState<ChatChannel[]>([
    { id: 'general', name: 'general-announcements', type: 'channel', description: 'Company-wide updates and announcements', unreadCount: 2 },
    { id: 'support-team', name: 'support-desk-team', type: 'channel', description: 'Real-time support ticket resolution & group updates', unreadCount: 0 },
    { id: 'tech-ops', name: 'field-operations', type: 'channel', description: 'Surveillance & networking installation updates', unreadCount: 1 },
    { id: 'hr-desk', name: 'hr-and-payroll', type: 'channel', description: 'Leave queries & HR announcements', unreadCount: 0 },
  ]);

  const [dmContacts] = useState<ChatChannel[]>([
    { id: 'user-admin', name: 'System Admin', type: 'dm', isOnline: true, role: 'Support Manager / Admin', avatar: 'A' },
    { id: 'user-tech', name: 'Vikram Singh', type: 'dm', isOnline: true, role: 'Lead Field Technician', avatar: 'V' },
    { id: 'user-hr', name: 'Priya Sharma', type: 'dm', isOnline: false, role: 'HR Manager', avatar: 'P' },
    { id: 'user-acc', name: 'Rohan Mehta', type: 'dm', isOnline: true, role: 'Accounts Lead', avatar: 'R' },
  ]);

  const [activeChat, setActiveChat] = useState<ChatChannel>(channels[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Simulated Chat Histories state (persisted per conversation)
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({
    general: [
      {
        id: '1',
        senderId: 'user-admin',
        senderName: 'System Admin',
        senderRole: 'Admin',
        text: 'Welcome to NetTech Operations Internal Chat! Feel free to communicate with field teams and support managers here.',
        timestamp: '10:15 AM',
      },
      {
        id: '2',
        senderId: 'user-hr',
        senderName: 'Priya Sharma',
        senderRole: 'HR Manager',
        text: 'Reminder: Check the new Holiday Calendar for official August observances! 🗓️',
        timestamp: '10:30 AM',
      },
    ],
    'support-team': [
      {
        id: '3',
        senderId: 'user-tech',
        senderName: 'Vikram Singh',
        senderRole: 'Technician',
        text: 'Ticket #TCK-2026-0004 for CCTV Installation at Client Site 62 has been assigned to Surveillance Team.',
        timestamp: '11:00 AM',
      },
    ],
    'user-tech': [
      {
        id: '4',
        senderId: 'user-tech',
        senderName: 'Vikram Singh',
        senderRole: 'Lead Field Technician',
        text: 'Hey! I scanned the barcode for the new 4K Dome Camera on site. Stock amount updated.',
        timestamp: '11:20 AM',
      },
    ],
  });

  // Auto-scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, activeChat]);

  const currentMessages = chatHistories[activeChat.id] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedAttachment) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || 'current-user',
      senderName: `${user?.firstName || 'Current'} ${user?.lastName || 'User'}`,
      senderRole: user?.role || 'EMPLOYEE',
      text: inputText.trim(),
      attachment: selectedAttachment,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistories((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMessage],
    }));

    setInputText('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    // Simulate auto-reply from colleague after 1.2s for direct messages or channels
    setTimeout(() => {
      simulateColleagueReply(activeChat);
    }, 1200);
  };

  const simulateColleagueReply = (chat: ChatChannel) => {
    const replies: Record<string, string[]> = {
      'user-tech': [
        'Got it! Checking the installation now.',
        'Sounds good. I will update the ticket details shortly.',
        'Acknowledged. GPS location verified.',
      ],
      'user-admin': [
        'Confirmed. System permissions updated.',
        'Thanks for the update!',
      ],
      default: [
        'Message received! Working on the updates.',
        'Understood. Thanks for sharing.',
      ],
    };

    const replyPool = replies[chat.id] || replies.default;
    const randomReply = replyPool[Math.floor(Math.random() * replyPool.length)];

    const autoReplyMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      senderId: chat.id,
      senderName: chat.name,
      senderRole: chat.role || 'Team Member',
      text: randomReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistories((prev) => ({
      ...prev,
      [chat.id]: [...(prev[chat.id] || []), autoReplyMessage],
    }));
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleMockAttachment = () => {
    const mockFiles = [
      { type: 'image' as const, url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400', name: 'CCTV_Site_Snapshot.jpg' },
      { type: 'file' as const, url: '#', name: 'Service_Report_Aug2026.pdf' },
    ];
    const chosen = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setSelectedAttachment(chosen);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Left Conversations Sidebar */}
      <div className="w-80 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <MessageSquare size={18} className="text-emerald-400" />
              <span>Internal Team Chat</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Live
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels or team..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Channels & Contacts List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Channels Section */}
          <div>
            <p className="px-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              Group Channels
            </p>
            <div className="space-y-1">
              {channels
                .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((c) => {
                  const isActive = activeChat.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChat(c)}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Hash size={16} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                        <span className="truncate">{c.name}</span>
                      </div>

                      {c.unreadCount && c.unreadCount > 0 ? (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-extrabold text-[9px] flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <p className="px-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              Direct Messages
            </p>
            <div className="space-y-1">
              {dmContacts
                .filter((dm) => dm.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((dm) => {
                  const isActive = activeChat.id === dm.id;
                  return (
                    <button
                      key={dm.id}
                      onClick={() => setActiveChat(dm)}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-[11px]">
                            {dm.avatar}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-950 ${
                              dm.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate text-white text-xs">{dm.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{dm.role}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Center Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Active Chat Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            {activeChat.type === 'channel' ? (
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <Hash size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                {activeChat.avatar || 'U'}
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>{activeChat.name}</span>
                {activeChat.isOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeChat.description || activeChat.role || 'Active conversation'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Toggle Conversation Info"
            >
              <Info size={18} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <MessageSquare size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-white">This is the start of #{activeChat.name}</p>
              <p className="text-[11px] text-slate-500">Send a message to kick off the conversation with your team.</p>
            </div>
          ) : (
            currentMessages.map((m) => {
              const isMe = m.senderId === user?.id || m.senderName.includes(user?.firstName || '____');
              return (
                <div
                  key={m.id}
                  className={`flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {m.senderName.charAt(0)}
                  </div>

                  <div className={`space-y-1 max-w-md ${isMe ? 'items-end text-right' : ''}`}>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="font-bold text-white">{m.senderName}</span>
                      <span className="text-[10px] text-blue-400 font-mono">[{m.senderRole}]</span>
                      <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 shadow-md ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none'
                      }`}
                    >
                      {m.text && <p>{m.text}</p>}

                      {/* Attached File/Image Preview */}
                      {m.attachment && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          {m.attachment.type === 'image' ? (
                            <img
                              src={m.attachment.url}
                              alt={m.attachment.name}
                              className="rounded-xl max-h-48 w-full object-cover border border-slate-800"
                            />
                          ) : (
                            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2 text-[11px]">
                              <FileText size={16} className="text-blue-400" />
                              <span className="font-mono text-white truncate">{m.attachment.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 relative space-y-2">
          {/* Attachment Pill Preview if selected */}
          {selectedAttachment && (
            <div className="p-2 rounded-xl bg-slate-900 border border-blue-500/40 flex items-center justify-between text-xs text-blue-400">
              <span className="flex items-center space-x-2 font-mono">
                <Paperclip size={14} />
                <span>Attached: {selectedAttachment.name}</span>
              </span>
              <button onClick={() => setSelectedAttachment(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
          )}

          {/* Emoji Picker Row */}
          {showEmojiPicker && (
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-2 text-base">
              {['😊', '👍', '🚀', '🔥', '✅', '🎉', '👏', '❤️'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => addEmoji(e)}
                  className="hover:scale-125 transition p-1"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleMockAttachment}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Attach File/Snapshot"
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Add Emoji"
            >
              <Smile size={18} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${activeChat.name}...`}
              className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-500/20"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Information & Roster Panel */}
      {showInfoPanel && (
        <div className="w-72 border-l border-slate-800 bg-slate-950/60 p-4 space-y-4 shrink-0 text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">About #{activeChat.name}</h3>
            <p className="text-slate-400 text-[11px] mt-1">
              {activeChat.description || 'Internal team channel'}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
              Channel Members ({dmContacts.length + 1})
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {user?.firstName?.charAt(0)}
                </div>
                <span>{user?.firstName} {user?.lastName} (You)</span>
              </div>
              {dmContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                      {c.avatar}
                    </div>
                    <span>{c.name}</span>
                  </div>
                  {c.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

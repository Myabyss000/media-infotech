'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api, getApiBaseUrl } from '@/lib/api';
import { getSocket } from '@/lib/socket';
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
  Plus,
  Lock,
  Globe,
  Radio,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Download,
  X,
  Reply,
  Trash2,
  Edit2,
  Shield,
  User as UserIcon,
  ChevronRight,
  Maximize2,
  Circle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Sender {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  avatar?: string | null;
  designation?: string | null;
  department?: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  sender: Sender;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'LOCATION';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  fileMime?: string | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
  } | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions: Reaction[];
  createdAt: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'CHANNEL' | 'DIRECT' | 'GROUP_LINKED';
  description?: string | null;
  isPrivate: boolean;
  avatar?: string | null;
  unreadCount: number;
  memberCount: number;
  isMuted?: boolean;
  lastMessageAt?: string;
  linkedGroup?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  otherUser?: (Sender & { isOnline?: boolean }) | null;
  lastMessage?: {
    id: string;
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
}

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string | null;
  department?: string | null;
  designation?: string | null;
  isOnline: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '✅', '👏', '🎉'];
const EMOJI_CATEGORIES = {
  Reactions: ['👍', '👎', '❤️', '🔥', '🚀', '👀', '✅', '🎉', '👏', '🙌', '💯', '⭐'],
  Smilies: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '😍', '🤩', '😘', '😋', '😎', '🥳', '🤔', '🤐', '😴'],
  WorkTech: ['💻', '📱', '🖥️', '📡', '🛰️', '⚙️', '🛠️', '🔧', '📦', '🏷️', '📝', '📊', '📈', '🔒', '🔑', '🚨', '⚠️', '💡', '🎯', '🏆'],
};

export default function ChatPage() {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Main State
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Input & Messaging State
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    fileUrl: string;
    fileName: string;
    fileSize: string;
    fileMime: string;
    type: 'IMAGE' | 'FILE';
  } | null>(null);

  // Search & Filter State
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // userId -> name
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modals
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [newDirectModalOpen, setNewDirectModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState<string[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Active Channel Object
  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || null;
  }, [channels, activeChannelId]);

  // --------------------------------------------------------------------------
  // 1. INITIAL LOAD & WEBSOCKET SETUP
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchChannels();
    fetchUsers();

    const socket = getSocket();
    if (!socket) return;

    // Presence & Online status
    socket.on('online_users_list', (ids: string[]) => {
      setOnlineUserIds(new Set(ids));
    });

    socket.on('user_presence_change', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    // Real-time Messages
    socket.on('new_message', (newMsg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        if (newMsg.channelId === activeChannelId) {
          return [...prev, newMsg];
        }
        return prev;
      });

      // Update sidebar channels
      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id === newMsg.channelId) {
            const isCurrentActive = ch.id === activeChannelId;
            return {
              ...ch,
              lastMessageAt: newMsg.createdAt,
              unreadCount: isCurrentActive ? 0 : (ch.unreadCount || 0) + (newMsg.senderId !== user?.id ? 1 : 0),
              lastMessage: {
                id: newMsg.id,
                content: newMsg.content || (newMsg.fileName ? `📎 ${newMsg.fileName}` : ''),
                senderName: `${newMsg.sender.firstName} ${newMsg.sender.lastName}`,
                createdAt: newMsg.createdAt,
              },
            };
          }
          return ch;
        })
      );
    });

    // Typing Indicators
    socket.on('user_typing', ({ channelId, user: typingUser, isTyping }: any) => {
      if (channelId === activeChannelId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) next.set(typingUser.id, typingUser.name);
          else next.delete(typingUser.id);
          return next;
        });
      }
    });

    // Reactions
    socket.on('reaction_updated', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    // Delete / Edit
    socket.on('message_deleted', ({ messageId, deletedMessage }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...deletedMessage, isDeleted: true } : m))
      );
    });

    socket.on('message_edited', (editedMsg: ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === editedMsg.id ? editedMsg : m))
      );
    });

    // Channel creation event
    socket.on('new_channel_created', (newChan: ChatChannel) => {
      setChannels((prev) => {
        if (prev.some((c) => c.id === newChan.id)) return prev;
        return [newChan, ...prev];
      });
    });

    return () => {
      socket.off('online_users_list');
      socket.off('user_presence_change');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('reaction_updated');
      socket.off('message_deleted');
      socket.off('message_edited');
      socket.off('new_channel_created');
    };
  }, [activeChannelId, user?.id]);

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Join Socket Room on Active Channel Switch
  useEffect(() => {
    if (!activeChannelId) return;

    fetchMessages(activeChannelId);

    const socket = getSocket();
    if (socket) {
      socket.emit('join_channel', { channelId: activeChannelId });
      socket.emit('mark_read', { channelId: activeChannelId });
    }

    // Reset unread count locally
    setChannels((prev) =>
      prev.map((c) => (c.id === activeChannelId ? { ...c, unreadCount: 0 } : c))
    );
    setTypingUsers(new Map());
    setReplyingTo(null);
  }, [activeChannelId]);

  // --------------------------------------------------------------------------
  // 2. DATA FETCHING
  // --------------------------------------------------------------------------
  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await api.get('/api/chat/channels');
      const list: ChatChannel[] = res.data.data || [];
      setChannels(list);

      if (list.length > 0 && !activeChannelId) {
        // Pick first channel with unread or default to first
        const firstUnread = list.find((c) => c.unreadCount > 0);
        setActiveChannelId(firstUnread ? firstUnread.id : list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch chat channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/chat/channels/${channelId}/messages?limit=60`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/chat/users');
      setAllUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch chat users:', err);
    }
  };

  // --------------------------------------------------------------------------
  // 3. SEND MESSAGE & COMPOSER ACTIONS
  // --------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChannelId) return;
    if (!inputText.trim() && !attachedFile) return;

    const content = inputText.trim();
    const payload = {
      channelId: activeChannelId,
      content,
      messageType: attachedFile?.type || 'TEXT',
      fileUrl: attachedFile?.fileUrl || null,
      fileName: attachedFile?.fileName || null,
      fileSize: attachedFile?.fileSize || null,
      fileMime: attachedFile?.fileMime || null,
      replyToId: replyingTo?.id || null,
    };

    // Emit via Socket.IO
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', payload);
      socket.emit('typing_stop', { channelId: activeChannelId });
    } else {
      // Fallback REST API
      try {
        await api.post(`/api/chat/channels/${activeChannelId}/messages`, payload);
      } catch (err) {
        console.error('Failed to send message via REST:', err);
      }
    }

    setInputText('');
    setAttachedFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Typing debounce
    const socket = getSocket();
    if (socket && activeChannelId) {
      socket.emit('typing_start', { channelId: activeChannelId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { channelId: activeChannelId });
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File Upload Handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      const isImg = file.type.startsWith('image/');
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      setAttachedFile({
        fileUrl: data.fileUrl || data.url,
        fileName: file.name,
        fileSize: formatSize(file.size),
        fileMime: file.type,
        type: isImg ? 'IMAGE' : 'FILE',
      });
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('toggle_reaction', { messageId, emoji });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('delete_message', { messageId });
    }
  };

  // --------------------------------------------------------------------------
  // 4. CHANNEL & DIRECT MESSAGE CREATION
  // --------------------------------------------------------------------------
  const handleStartDirectChat = async (targetUser: ChatUser) => {
    try {
      const res = await api.post('/api/chat/direct', { targetUserId: targetUser.id });
      const channel = res.data.data;

      setChannels((prev) => {
        if (prev.some((c) => c.id === channel.id)) return prev;
        return [channel, ...prev];
      });

      setActiveChannelId(channel.id);
      setNewDirectModalOpen(false);
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setCreatingChannel(true);
    try {
      const res = await api.post('/api/chat/channels', {
        name: newChannelName.trim(),
        description: newChannelDesc.trim() || undefined,
        isPrivate: newChannelPrivate,
        memberUserIds: selectedInviteUserIds,
      });

      const newChan = res.data.data;
      setChannels((prev) => [newChan, ...prev]);
      setActiveChannelId(newChan.id);

      setNewChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelPrivate(false);
      setSelectedInviteUserIds([]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. FILTERED LISTS
  // --------------------------------------------------------------------------
  const publicChannels = useMemo(() => {
    return channels.filter(
      (c) =>
        c.type === 'CHANNEL' &&
        c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [channels, sidebarSearch]);

  const teamChannels = useMemo(() => {
    return channels.filter(
      (c) =>
        c.type === 'GROUP_LINKED' &&
        c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [channels, sidebarSearch]);

  const directMessages = useMemo(() => {
    return channels.filter((c) => {
      if (c.type !== 'DIRECT') return false;
      const targetName = c.name || '';
      return targetName.toLowerCase().includes(sidebarSearch.toLowerCase());
    });
  }, [channels, sidebarSearch]);

  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return messages;
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.sender.firstName.toLowerCase().includes(messageSearch.toLowerCase()) ||
        (m.fileName && m.fileName.toLowerCase().includes(messageSearch.toLowerCase()))
    );
  }, [messages, messageSearch]);

  // Shared Media & Files from conversation
  const sharedMedia = useMemo(() => {
    return messages.filter((m) => m.fileUrl && !m.isDeleted);
  }, [messages]);

  return (
    <div className="h-[calc(100vh-6.5rem)] flex bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* ==================================================================== */}
      {/* 1. LEFT SIDEBAR: CHANNELS & DIRECT MESSAGES */}
      {/* ==================================================================== */}
      <div className="w-80 border-r border-slate-800 bg-slate-950/70 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
                <MessageSquare size={17} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white leading-tight">Team Hub</h2>
                <p className="text-[10px] text-slate-400 font-mono">Real-time Workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNewDirectModalOpen(true)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition shadow-sm"
                title="Start Direct Message"
              >
                <UserIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setNewChannelModalOpen(true)}
                className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition shadow-sm"
                title="Create New Channel"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Filter channels or colleagues..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Scrollable Channels & Contacts Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          {loadingChannels ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Connecting channels...</p>
            </div>
          ) : (
            <>
              {/* Corporate Public Channels */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Globe size={11} className="text-emerald-400" />
                    <span>Company Channels</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({publicChannels.length})</span>
                </div>
                <div className="space-y-0.5">
                  {publicChannels.map((c) => {
                    const isActive = activeChannelId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveChannelId(c.id)}
                        className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-semibold transition group ${
                          isActive
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-500'}`}>
                            {c.isPrivate ? <Lock size={12} /> : <Hash size={13} />}
                          </div>
                          <span className="truncate">{c.name}</span>
                        </div>

                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] shadow-md animate-pulse">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group-Linked Team Channels */}
              {teamChannels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <Users size={11} className="text-blue-400" />
                      <span>Team Workspaces</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({teamChannels.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {teamChannels.map((c) => {
                      const isActive = activeChannelId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveChannelId(c.id)}
                          className={`w-full p-2 rounded-xl flex items-center justify-between text-xs font-semibold transition group ${
                            isActive
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <div
                              className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow"
                              style={{ backgroundColor: c.linkedGroup?.color || '#3b82f6' }}
                            >
                              {c.linkedGroup?.name?.[0] || 'T'}
                            </div>
                            <span className="truncate">{c.name}</span>
                          </div>

                          {c.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-black text-[10px] shadow">
                              {c.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1-on-1 Direct Messages */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Radio size={11} className="text-teal-400" />
                    <span>Direct Messages</span>
                  </span>
                  <button
                    onClick={() => setNewDirectModalOpen(true)}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    + New
                  </button>
                </div>

                <div className="space-y-1">
                  {directMessages.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-[11px] text-slate-500">
                      No direct conversations yet. Click + New to chat!
                    </div>
                  ) : (
                    directMessages.map((c) => {
                      const isActive = activeChannelId === c.id;
                      const other = c.otherUser;
                      const isOnline = other ? onlineUserIds.has(other.id) : false;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveChannelId(c.id)}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition group ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 text-white border border-emerald-500/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            {/* Avatar with live online beacon */}
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                                {other?.avatar ? (
                                  <img src={other.avatar} alt={c.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{c.name?.[0] || 'U'}</span>
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                                  isOnline ? 'bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse' : 'bg-slate-600'
                                }`}
                              />
                            </div>

                            <div className="text-left truncate">
                              <p className="truncate font-bold text-white text-xs">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {other?.designation || other?.role || 'Team Member'}
                              </p>
                            </div>
                          </div>

                          {c.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] shadow animate-bounce">
                              {c.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN CHAT AREA */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col bg-slate-900/80 min-w-0">
        {activeChannel ? (
          <>
            {/* Main Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0">
                  {activeChannel.type === 'DIRECT' ? (
                    <UserIcon size={18} className="text-emerald-400" />
                  ) : activeChannel.isPrivate ? (
                    <Lock size={18} className="text-amber-400" />
                  ) : (
                    <Hash size={18} className="text-emerald-400" />
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-sm truncate">{activeChannel.name}</h3>
                    {activeChannel.type === 'DIRECT' && activeChannel.otherUser && (
                      <span
                        className={`text-[9px] px-2 py-0.2 rounded-full font-bold border flex items-center gap-1 ${
                          onlineUserIds.has(activeChannel.otherUser.id)
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Circle size={6} fill="currentColor" />
                        <span>{onlineUserIds.has(activeChannel.otherUser.id) ? 'Online' : 'Offline'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {activeChannel.description ||
                      (activeChannel.otherUser
                        ? `${activeChannel.otherUser.department || 'Operations'} • ${activeChannel.otherUser.email || ''}`
                        : 'Channel Workspace')}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {/* Search within Conversation */}
                <div className="relative hidden md:block">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Search in chat..."
                    className="w-36 pl-7 pr-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:w-52 transition-all"
                  />
                  {messageSearch && (
                    <button
                      onClick={() => setMessageSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-xl border transition ${
                    showInfoPanel
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                  }`}
                  title="Channel Information & Shared Media"
                >
                  <Info size={15} />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loadingMessages ? (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Loading secure message history...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                  <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
                    <Sparkles size={24} />
                  </div>
                  <h4 className="font-bold text-white text-sm">Welcome to #{activeChannel.name}</h4>
                  <p className="text-xs max-w-sm">
                    This is the start of your secure conversation. Send a message or share files to collaborate in real-time.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  const isDeleted = msg.isDeleted;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex items-start gap-3 relative transition-all ${
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow overflow-hidden">
                        {msg.sender.avatar ? (
                          <img src={msg.sender.avatar} alt={msg.sender.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{msg.sender.firstName?.[0] || 'U'}</span>
                        )}
                      </div>

                      {/* Bubble Content */}
                      <div className={`max-w-[75%] md:max-w-[65%] space-y-1 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                        {/* Sender Info Bar */}
                        <div className={`flex items-center gap-2 text-[10px] text-slate-400 font-mono ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-bold text-slate-200">
                            {isMe ? 'You' : `${msg.sender.firstName} ${msg.sender.lastName}`}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-950 border border-slate-800 text-[9px] font-semibold text-emerald-400">
                            {msg.sender.role}
                          </span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.isEdited && <span className="text-slate-500">(edited)</span>}
                        </div>

                        {/* Reply-To Preview context */}
                        {msg.replyTo && (
                          <div
                            className={`p-2 rounded-xl text-xs bg-slate-950/80 border border-slate-800/80 border-l-4 border-l-emerald-500 text-slate-400 mb-1 max-w-md truncate ${
                              isMe ? 'ml-auto' : 'mr-auto'
                            }`}
                          >
                            <span className="font-bold text-emerald-400 block text-[10px]">
                              ↩ Replying to {msg.replyTo.sender.firstName}:
                            </span>
                            <span className="truncate block">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Message Box */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs shadow-md leading-relaxed relative ${
                            isDeleted
                              ? 'bg-slate-950/40 border border-slate-800 text-slate-500 italic'
                              : isMe
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none'
                              : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none'
                          }`}
                        >
                          {/* Attached Image Preview */}
                          {msg.fileUrl && msg.messageType === 'IMAGE' && !isDeleted && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                              <img
                                src={msg.fileUrl}
                                alt={msg.fileName || 'Attachment'}
                                onClick={() => setPreviewImage(msg.fileUrl!)}
                                className="w-full max-h-60 object-cover cursor-pointer hover:scale-105 transition duration-200"
                              />
                            </div>
                          )}

                          {/* Attached File/Document Download Box */}
                          {msg.fileUrl && msg.messageType !== 'IMAGE' && !isDeleted && (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName || 'file'}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-2.5 mb-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 text-slate-200 transition group/file max-w-sm"
                            >
                              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <FileText size={16} />
                              </div>
                              <div className="flex-1 truncate text-left">
                                <p className="font-bold text-xs truncate">{msg.fileName || 'Download File'}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{msg.fileSize || 'Attachment'}</p>
                              </div>
                              <Download size={14} className="text-slate-400 group-hover/file:text-emerald-400" />
                            </a>
                          )}

                          {/* Text Body */}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>

                        {/* Reactions Row */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                              msg.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => {
                              const hasReacted = msg.reactions.some(
                                (r) => r.emoji === emoji && r.userId === user?.id
                              );
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border transition ${
                                    hasReacted
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-900'
                                  }`}
                                  title={`Toggle ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[10px]">{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Message Hover Quick Action Bar */}
                      {!isDeleted && (
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-all absolute top-0 ${
                            isMe ? 'left-2 -translate-x-full' : 'right-2 translate-x-full'
                          } flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-xl z-10`}
                        >
                          {/* Quick Emoji Buttons */}
                          {['👍', '❤️', '🔥', '✅'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="p-1 hover:scale-125 transition text-xs"
                            >
                              {emoji}
                            </button>
                          ))}

                          <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />

                          {/* Reply Button */}
                          <button
                            type="button"
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 text-slate-400 hover:text-emerald-400 transition"
                            title="Reply to message"
                          >
                            <Reply size={13} />
                          </button>

                          {/* Delete for Me or Admin */}
                          {(isMe || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                              title="Delete message"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Live Typing Banner */}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 italic bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 max-w-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{Array.from(typingUsers.values()).join(', ')} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply & Attachment Preview Floating Bar */}
            {(replyingTo || attachedFile) && (
              <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
                {replyingTo && (
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <Reply size={14} className="text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Replying to <b className="text-emerald-400">{replyingTo.sender.firstName}</b>: &ldquo;
                      {replyingTo.content}&rdquo;
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-0.5 rounded text-slate-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {attachedFile && (
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <Paperclip size={14} className="text-blue-400 shrink-0" />
                    <span className="truncate">
                      Attached: <b className="text-blue-400">{attachedFile.fileName}</b> ({attachedFile.fileSize})
                    </span>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="p-0.5 rounded text-slate-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Message Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950/90 border-t border-slate-800 shrink-0">
              <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-emerald-500/50 transition">
                {/* File Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition shrink-0"
                  title="Attach Image or Document"
                >
                  {uploadingAttachment ? (
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip size={16} />
                  )}
                </button>

                {/* Emoji Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition shrink-0 ${
                      showEmojiPicker ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                    }`}
                    title="Insert Emoji"
                  >
                    <Smile size={16} />
                  </button>

                  {/* Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 w-72 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-white">Emoji Palette</span>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(false)}
                          className="text-slate-500 hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {Object.entries(EMOJI_CATEGORIES).map(([cat, list]) => (
                        <div key={cat}>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{cat}</p>
                          <div className="grid grid-cols-6 gap-1">
                            {list.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  setShowEmojiPicker(false);
                                }}
                                className="p-1 text-base hover:bg-slate-900 rounded-lg transition"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel.name}... (Press Enter to send)`}
                  rows={1}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none py-2 max-h-32 custom-scrollbar"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() && !attachedFile}
                  className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 shadow-lg ${
                    inputText.trim() || attachedFile
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110 font-bold'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Select a channel or direct message from the sidebar to start chatting.
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 3. RIGHT INFO & MEDIA DRAWER (Collapsible) */}
      {/* ==================================================================== */}
      {showInfoPanel && activeChannel && (
        <div className="w-80 border-l border-slate-800 bg-slate-950/90 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <Info size={14} className="text-emerald-400" />
              <span>Channel Dossier</span>
            </h4>
            <button
              onClick={() => setShowInfoPanel(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
            {/* Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Channel Info</p>
              <h3 className="text-sm font-black text-white">{activeChannel.name}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {activeChannel.description || 'Corporate collaboration space for NetTech field teams.'}
              </p>
              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                <span>Created {activeChannel.lastMessageAt ? new Date(activeChannel.lastMessageAt).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>

            {/* Shared Media & Files */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Shared Media ({sharedMedia.length})</span>
              </div>

              {sharedMedia.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-500 text-[11px]">
                  No images or files shared yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {sharedMedia.map((m) => (
                    <a
                      key={m.id}
                      href={m.fileUrl!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 transition"
                    >
                      {m.messageType === 'IMAGE' ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                          <img src={m.fileUrl!} alt={m.fileName || ''} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <FileText size={15} />
                        </div>
                      )}
                      <div className="flex-1 truncate text-left">
                        <p className="font-bold text-[11px] truncate">{m.fileName || 'Attachment'}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{m.fileSize || 'File'}</p>
                      </div>
                      <Download size={13} className="text-slate-500" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. MODALS */}
      {/* ==================================================================== */}

      {/* NEW DIRECT MESSAGE MODAL */}
      {newDirectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon size={18} className="text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Start Direct Conversation</h3>
              </div>
              <button onClick={() => setNewDirectModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select a colleague to start a private 1-on-1 chat:</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {allUsers.map((u) => {
                  const isOnline = onlineUserIds.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleStartDirectChat(u)}
                      className="w-full p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/80 flex items-center justify-between transition group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                            {u.firstName?.[0]}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                              isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.designation || u.role} • {u.department || 'NetTech'}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW CHANNEL MODAL */}
      {newChannelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateChannel}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Create New Channel</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewChannelModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Channel Name *</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. cctv-tenders-ops"
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What is this channel about?"
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-amber-400" />
                  <div>
                    <p className="font-bold text-white text-xs">Private Channel</p>
                    <p className="text-[10px] text-slate-400">Only invited members can view this channel</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Invite Colleagues */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Invite Members</label>
                <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  {allUsers.map((u) => {
                    const isSelected = selectedInviteUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() =>
                          setSelectedInviteUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        className={`p-1.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-slate-900 text-slate-400'
                        }`}
                      >
                        <span className="truncate">{u.firstName} {u.lastName} ({u.role})</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewChannelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingChannel || !newChannelName.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition"
              >
                {creatingChannel ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-1"
            >
              <X size={18} />
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

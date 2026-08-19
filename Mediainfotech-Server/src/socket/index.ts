import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { ChatChannelType, ChatMessageType, ChatParticipantRole } from '@prisma/client';

let io: SocketIOServer | null = null;

// Track online users: userId -> Set of active socket IDs
const onlineUsers = new Map<string, Set<string>>();

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }
  return io;
};

export const isUserOnline = (userId: string): boolean => {
  const sockets = onlineUsers.get(userId);
  return !!(sockets && sockets.size > 0);
};

export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys()).filter((uid) => {
    const sockets = onlineUsers.get(uid);
    return sockets && sockets.size > 0;
  });
};

export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all frontend origins (dynamic reflection)
        callback(null, true);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Authentication Middleware for Sockets
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          department: true,
          designation: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new Error('User account is inactive or not found'));
      }

      socket.data.user = user;
      next();
    } catch (err: any) {
      console.error('Socket auth failed:', err.message);
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  // Connection Handler
  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    const userId = user.id;

    // Add to online user tracking
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join user's personal room for direct notification events
    socket.join(`user:${userId}`);
    socket.join(`role:${user.role}`);

    console.log(`⚡ [Socket Connected] ${user.firstName} ${user.lastName} (${user.role}) - Socket ID: ${socket.id}`);

    // Broadcast user online status if this is their first connection
    if (onlineUsers.get(userId)!.size === 1) {
      io?.emit('user_presence_change', {
        userId,
        isOnline: true,
        lastActive: new Date(),
      });
    }

    // Send initial online users list to this socket
    socket.emit('online_users_list', getOnlineUserIds());

    // Join All Channels the user is part of
    try {
      const userChannels = await prisma.chatParticipant.findMany({
        where: { userId },
        select: { channelId: true },
      });
      userChannels.forEach((p) => {
        socket.join(`channel:${p.channelId}`);
      });
    } catch (e) {
      console.error('Failed to auto-join user channels:', e);
    }

    // ------------------------------------------------------------------------
    // EVENT: Join Channel Room
    // ------------------------------------------------------------------------
    socket.on('join_channel', async ({ channelId }: { channelId: string }) => {
      if (!channelId) return;

      try {
        const channel = await prisma.chatChannel.findUnique({
          where: { id: channelId },
          include: { participants: { select: { userId: true } } },
        });

        if (!channel) return;

        if (channel.isPrivate || channel.type === ChatChannelType.DIRECT) {
          const isMember = channel.participants.some((p) => p.userId === userId);
          if (!isMember && user.role !== 'ADMIN') {
            socket.emit('error_message', { error: 'Access denied: You are not a participant in this conversation' });
            return;
          }
        }

        socket.join(`channel:${channelId}`);

        // Ensure participant record exists
        await prisma.chatParticipant.upsert({
          where: {
            channelId_userId: {
              channelId,
              userId,
            },
          },
          update: {
            lastReadAt: new Date(),
          },
          create: {
            channelId,
            userId,
            role: ChatParticipantRole.MEMBER,
            lastReadAt: new Date(),
          },
        });
      } catch (err) {
        // Ignored if channel is restricted
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Leave Channel Room
    // ------------------------------------------------------------------------
    socket.on('leave_channel', ({ channelId }: { channelId: string }) => {
      if (channelId) {
        socket.leave(`channel:${channelId}`);
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Send Message
    // ------------------------------------------------------------------------
    socket.on(
      'send_message',
      async (data: {
        channelId: string;
        content: string;
        messageType?: ChatMessageType;
        fileUrl?: string;
        fileName?: string;
        fileSize?: string;
        fileMime?: string;
        replyToId?: string;
      }) => {
        try {
          const {
            channelId,
            content,
            messageType = 'TEXT',
            fileUrl,
            fileName,
            fileSize,
            fileMime,
            replyToId,
          } = data;

          if (!channelId || (!content?.trim() && !fileUrl)) {
            socket.emit('error_message', { error: 'Message content or file attachment is required' });
            return;
          }

          // Validate channel authorization
          const channel = await prisma.chatChannel.findUnique({
            where: { id: channelId },
            include: { participants: { select: { userId: true } } },
          });

          if (!channel) {
            socket.emit('error_message', { error: 'Channel not found' });
            return;
          }

          if (channel.isPrivate || channel.type === ChatChannelType.DIRECT) {
            const isMember = channel.participants.some((p) => p.userId === userId);
            if (!isMember && user.role !== 'ADMIN') {
              socket.emit('error_message', { error: 'Access denied: You cannot post in this private conversation' });
              return;
            }
          }

          // Create message in database
          const message = await prisma.chatMessage.create({
            data: {
              channelId,
              senderId: userId,
              content: content ? content.trim() : '',
              messageType: messageType as ChatMessageType,
              fileUrl: fileUrl || null,
              fileName: fileName || null,
              fileSize: fileSize || null,
              fileMime: fileMime || null,
              replyToId: replyToId || null,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatar: true,
                  designation: true,
                  department: true,
                },
              },
              replyTo: {
                include: {
                  sender: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              reactions: {
                include: {
                  user: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          });

          // Update channel lastMessageAt
          await prisma.chatChannel.update({
            where: { id: channelId },
            data: { lastMessageAt: new Date() },
          });

          // Update sender's lastReadAt
          await prisma.chatParticipant.upsert({
            where: {
              channelId_userId: { channelId, userId },
            },
            update: { lastReadAt: new Date() },
            create: {
              channelId,
              userId,
              lastReadAt: new Date(),
            },
          });

          // Broadcast to all sockets in the channel room
          io?.to(`channel:${channelId}`).emit('new_message', message);

          // Notify all channel participants' individual rooms for sidebar unread counters and notifications
          const channelInfo = await prisma.chatChannel.findUnique({
            where: { id: channelId },
            select: { name: true, type: true },
          });

          const participants = await prisma.chatParticipant.findMany({
            where: { channelId },
            select: { userId: true },
          });

          for (const p of participants) {
            if (p.userId !== userId) {
              io?.to(`user:${p.userId}`).emit('channel_activity', {
                channelId,
                lastMessage: message,
                unreadDelta: 1,
              });

              // Create notification record for chat
              try {
                const notifTitle = channelInfo?.type === 'DIRECT'
                  ? `💬 Direct Message from ${user.firstName}`
                  : `💬 #${channelInfo?.name || 'chat'}`;
                const notifMsg = `${user.firstName}: "${(content || 'Sent an attachment').slice(0, 75)}"`;

                const createdNotif = await prisma.notification.create({
                  data: {
                    userId: p.userId,
                    title: notifTitle,
                    message: notifMsg,
                    category: 'CHAT',
                    priority: 'NORMAL',
                    actionUrl: '/chat',
                    entityId: message.id,
                    entityType: 'ChatMessage',
                  },
                });

                io?.to(`user:${p.userId}`).emit('new_notification', {
                  notification: createdNotif,
                });
              } catch (nErr) {
                // Ignore
              }
            }
          }
        } catch (err: any) {
          console.error('Socket send_message error:', err);
          socket.emit('error_message', { error: 'Failed to send message: ' + err.message });
        }
      }
    );

    // ------------------------------------------------------------------------
    // EVENT: Typing Indicators
    // ------------------------------------------------------------------------
    socket.on('typing_start', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('user_typing', {
        channelId,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
        },
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('user_typing', {
        channelId,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
        },
        isTyping: false,
      });
    });

    // ------------------------------------------------------------------------
    // EVENT: Emoji Reactions
    // ------------------------------------------------------------------------
    socket.on('toggle_reaction', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      try {
        if (!messageId || !emoji) return;

        const existing = await prisma.chatMessageReaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });

        if (existing) {
          await prisma.chatMessageReaction.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.chatMessageReaction.create({
            data: {
              messageId,
              userId,
              emoji,
            },
          });
        }

        // Fetch updated reactions for this message
        const updatedMessage = await prisma.chatMessage.findUnique({
          where: { id: messageId },
          select: {
            id: true,
            channelId: true,
            reactions: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        });

        if (updatedMessage) {
          io?.to(`channel:${updatedMessage.channelId}`).emit('reaction_updated', {
            messageId,
            channelId: updatedMessage.channelId,
            reactions: updatedMessage.reactions,
          });
        }
      } catch (err: any) {
        console.error('Socket toggle_reaction error:', err);
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Mark Channel Read
    // ------------------------------------------------------------------------
    socket.on('mark_read', async ({ channelId }: { channelId: string }) => {
      try {
        if (!channelId) return;

        await prisma.chatParticipant.upsert({
          where: {
            channelId_userId: { channelId, userId },
          },
          update: { lastReadAt: new Date() },
          create: {
            channelId,
            userId,
            lastReadAt: new Date(),
          },
        });

        socket.emit('channel_marked_read', { channelId });
      } catch (err) {
        console.error('Socket mark_read error:', err);
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Delete Message
    // ------------------------------------------------------------------------
    socket.on('delete_message', async ({ messageId }: { messageId: string }) => {
      try {
        if (!messageId) return;

        const msg = await prisma.chatMessage.findUnique({
          where: { id: messageId },
        });

        if (!msg) return;

        // Allow sender or Admin to delete
        const isSender = msg.senderId === userId;
        const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';

        if (!isSender && !isAdmin) {
          socket.emit('error_message', { error: 'Unauthorized to delete this message' });
          return;
        }

        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            content: 'This message was deleted.',
            fileUrl: null,
            fileName: null,
          },
        });

        io?.to(`channel:${msg.channelId}`).emit('message_deleted', {
          messageId,
          channelId: msg.channelId,
          deletedMessage: updated,
        });
      } catch (err: any) {
        console.error('Socket delete_message error:', err);
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Edit Message
    // ------------------------------------------------------------------------
    socket.on('edit_message', async ({ messageId, newContent }: { messageId: string; newContent: string }) => {
      try {
        if (!messageId || !newContent?.trim()) return;

        const msg = await prisma.chatMessage.findUnique({
          where: { id: messageId },
        });

        if (!msg || msg.senderId !== userId) {
          socket.emit('error_message', { error: 'Cannot edit message' });
          return;
        }

        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: {
            content: newContent.trim(),
            isEdited: true,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        });

        io?.to(`channel:${msg.channelId}`).emit('message_edited', updated);
      } catch (err: any) {
        console.error('Socket edit_message error:', err);
      }
    });

    // ------------------------------------------------------------------------
    // Disconnect Handler
    // ------------------------------------------------------------------------
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Broadcast offline presence
          io?.emit('user_presence_change', {
            userId,
            isOnline: false,
            lastActive: new Date(),
          });
        }
      }
      console.log(`🔌 [Socket Disconnected] ${user.firstName} ${user.lastName} (Socket ID: ${socket.id})`);
    });
  });

  return io;
};

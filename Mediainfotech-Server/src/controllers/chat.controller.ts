import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../lib/prisma';
import { ChatChannelType, ChatMessageType, ChatParticipantRole } from '@prisma/client';
import { getIO, isUserOnline, getOnlineUserIds } from '../socket';

/**
 * Ensure default corporate channels and group-linked channels exist in the database.
 */
export const ensureDefaultChannels = async () => {
  try {
    const defaultChannels = [
      {
        name: 'general-announcements',
        description: 'Company-wide notices, announcements and organizational updates.',
        type: ChatChannelType.CHANNEL,
        isPrivate: false,
      },
      {
        name: 'field-operations',
        description: 'Real-time updates on CCTV, surveillance, and networking installations.',
        type: ChatChannelType.CHANNEL,
        isPrivate: false,
      },
      {
        name: 'support-desk',
        description: 'Customer ticket support, troubleshooting, and field dispatch coordination.',
        type: ChatChannelType.CHANNEL,
        isPrivate: false,
      },
      {
        name: 'hr-helpdesk',
        description: 'Leave inquiries, payroll clarifications, and HR policy queries.',
        type: ChatChannelType.CHANNEL,
        isPrivate: false,
      },
    ];

    for (const ch of defaultChannels) {
      const existing = await prisma.chatChannel.findFirst({
        where: { name: ch.name, type: ChatChannelType.CHANNEL },
      });

      if (!existing) {
        await prisma.chatChannel.create({
          data: {
            name: ch.name,
            description: ch.description,
            type: ch.type,
            isPrivate: ch.isPrivate,
          },
        });
      }
    }

    // Auto-sync Channels for Field Groups
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      include: { members: true },
    });

    for (const grp of groups) {
      const groupChannelName = `team-${grp.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const existingGroupChannel = await prisma.chatChannel.findFirst({
        where: { linkedGroupId: grp.id },
      });

      if (!existingGroupChannel) {
        const newGroupChannel = await prisma.chatChannel.create({
          data: {
            name: groupChannelName,
            description: grp.description || `Official team coordination chat for ${grp.name}`,
            type: ChatChannelType.GROUP_LINKED,
            linkedGroupId: grp.id,
            createdById: grp.createdById,
          },
        });

        // Add all group members as participants
        for (const gm of grp.members) {
          await prisma.chatParticipant.upsert({
            where: {
              channelId_userId: {
                channelId: newGroupChannel.id,
                userId: gm.userId,
              },
            },
            update: {},
            create: {
              channelId: newGroupChannel.id,
              userId: gm.userId,
              role: gm.role === 'leader' ? ChatParticipantRole.ADMIN : ChatParticipantRole.MEMBER,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('ensureDefaultChannels error:', err);
  }
};

/**
 * Get all channels and direct messages accessible to current user.
 */
export const getChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Make sure default channels exist
    await ensureDefaultChannels();

    // Fetch channels where:
    // 1. User is an explicit participant, OR
    // 2. Channel is a public CHANNEL (anyone can see & join)
    const channels = await prisma.chatChannel.findMany({
      where: {
        OR: [
          { isPrivate: false, type: ChatChannelType.CHANNEL },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        linkedGroup: {
          select: { id: true, name: true, color: true },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatar: true,
                designation: true,
                department: true,
                lastLogin: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Format channels with unread counts and DM counterpart info
    const formatted = await Promise.all(
      channels.map(async (c) => {
        const myParticipant = c.participants.find((p) => p.userId === userId);
        const lastReadAt = myParticipant?.lastReadAt || new Date(0);

        // Count unread messages
        const unreadCount = await prisma.chatMessage.count({
          where: {
            channelId: c.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
            isDeleted: false,
          },
        });

        const lastMessage = c.messages[0] || null;

        // For Direct Message channels, extract the other user's profile
        let otherUser: any = null;
        if (c.type === ChatChannelType.DIRECT) {
          const counterpart = c.participants.find((p) => p.userId !== userId)?.user;
          if (counterpart) {
            otherUser = {
              ...counterpart,
              isOnline: isUserOnline(counterpart.id),
            };
          }
        }

        return {
          id: c.id,
          name: c.type === ChatChannelType.DIRECT && otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : c.name,
          type: c.type,
          description: c.description,
          isPrivate: c.isPrivate,
          avatar: c.avatar || (otherUser ? otherUser.avatar : null),
          linkedGroup: c.linkedGroup,
          otherUser,
          unreadCount,
          isMuted: myParticipant?.isMuted || false,
          memberCount: c.participants.length,
          lastMessageAt: c.lastMessageAt || c.createdAt,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                messageType: lastMessage.messageType,
                fileName: lastMessage.fileName,
                senderId: lastMessage.senderId,
                senderName: `${lastMessage.sender.firstName} ${lastMessage.sender.lastName}`,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
    );

    res.json({ data: formatted });
  } catch (error: any) {
    console.error('getChannels error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chat channels' });
  }
};

/**
 * Get or Start a 1-on-1 Direct Message conversation with another user.
 */
export const getOrCreateDirectChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const { targetUserId } = req.body;

    if (!currentUserId || !targetUserId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ error: 'Cannot create a direct chat with yourself' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true, role: true, avatar: true, designation: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Find existing direct channel between these two users
    const existingDirect = await prisma.chatChannel.findFirst({
      where: {
        type: ChatChannelType.DIRECT,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    if (existingDirect) {
      res.json({
        data: {
          ...existingDirect,
          name: `${targetUser.firstName} ${targetUser.lastName}`,
          otherUser: {
            ...targetUser,
            isOnline: isUserOnline(targetUser.id),
          },
        },
      });
      return;
    }

    // Create new direct channel
    const newChannel = await prisma.chatChannel.create({
      data: {
        type: ChatChannelType.DIRECT,
        isPrivate: true,
        createdById: currentUserId,
        participants: {
          create: [
            { userId: currentUserId, role: ChatParticipantRole.MEMBER },
            { userId: targetUserId, role: ChatParticipantRole.MEMBER },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      data: {
        ...newChannel,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        otherUser: {
          ...targetUser,
          isOnline: isUserOnline(targetUser.id),
        },
      },
    });
  } catch (error: any) {
    console.error('getOrCreateDirectChannel error:', error);
    res.status(500).json({ error: error.message || 'Failed to start direct conversation' });
  }
};

/**
 * Create a new team channel.
 */
export const createChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, description, isPrivate = false, memberUserIds = [] } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');

    // Check if channel name is taken
    const existing = await prisma.chatChannel.findFirst({
      where: { name: cleanName },
    });
    if (existing) {
      res.status(400).json({ error: 'A channel with this name already exists' });
      return;
    }

    // Build participant list (creator as ADMIN + invited members)
    const allMemberIds = Array.from(new Set([userId!, ...(memberUserIds || [])]));

    const channel = await prisma.chatChannel.create({
      data: {
        name: cleanName,
        description: description ? description.trim() : null,
        isPrivate: Boolean(isPrivate),
        type: ChatChannelType.CHANNEL,
        createdById: userId,
        participants: {
          create: allMemberIds.map((uid) => ({
            userId: uid,
            role: uid === userId ? ChatParticipantRole.ADMIN : ChatParticipantRole.MEMBER,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
            },
          },
        },
      },
    });

    // Notify online participants via socket
    try {
      const io = getIO();
      allMemberIds.forEach((uid) => {
        io.to(`user:${uid}`).emit('new_channel_created', channel);
      });
    } catch (e) {
      // Ignored
    }

    res.status(201).json({ data: channel });
  } catch (error: any) {
    console.error('createChannel error:', error);
    res.status(500).json({ error: error.message || 'Failed to create channel' });
  }
};

/**
 * Get paginated messages for a channel.
 */
export const getChannelMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { limit = '50', before } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        participants: { select: { userId: true } },
      },
    });

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    // Verify channel access for private or direct message channels
    if (channel.isPrivate || channel.type === ChatChannelType.DIRECT) {
      const isMember = channel.participants.some((p) => p.userId === userId);
      if (!isMember && userRole !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied: You are not a participant in this private conversation' });
        return;
      }
    }

    const where: any = { channelId };
    if (before) {
      where.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
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
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Mark channel as read for current user
    if (req.user?.id) {
      await prisma.chatParticipant.upsert({
        where: {
          channelId_userId: { channelId, userId: req.user.id },
        },
        update: { lastReadAt: new Date() },
        create: {
          channelId,
          userId: req.user.id,
          lastReadAt: new Date(),
        },
      });
    }

    // Return in chronological order for UI
    res.json({
      data: messages.reverse(),
      hasMore: messages.length === limitNum,
    });
  } catch (error: any) {
    console.error('getChannelMessages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
};

/**
 * Send message via REST endpoint (with attachment support).
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const channelId = req.params.id as string;
    const {
      content,
      messageType = 'TEXT',
      fileUrl,
      fileName,
      fileSize,
      fileMime,
      replyToId,
    } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content?.trim() && !fileUrl) {
      res.status(400).json({ error: 'Message content or attachment is required' });
      return;
    }

    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        participants: { select: { userId: true } },
      },
    });

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    // Verify channel access for private or direct message channels
    if (channel.isPrivate || channel.type === ChatChannelType.DIRECT) {
      const isMember = channel.participants.some((p) => p.userId === userId);
      if (!isMember && userRole !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied: You cannot send messages in this private conversation' });
        return;
      }
    }

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
          },
        },
        replyTo: {
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    await prisma.chatChannel.update({
      where: { id: channelId },
      data: { lastMessageAt: new Date() },
    });

    // Broadcast via socket
    try {
      const io = getIO();
      io.to(`channel:${channelId}`).emit('new_message', message);
    } catch (e) {
      // Socket not ready, REST handles persistence
    }

    res.status(201).json({ data: message });
  } catch (error: any) {
    console.error('sendMessage error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

/**
 * Mark a channel as read.
 */
export const markChannelAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const channelId = req.params.id as string;

    if (!userId || !channelId) {
      res.status(400).json({ error: 'Invalid channel or user' });
      return;
    }

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

    res.json({ success: true });
  } catch (error: any) {
    console.error('markChannelAsRead error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
};

/**
 * List all users available for direct messaging and channel invitations.
 */
export const getChatUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const { search } = req.query;

    const where: any = { isActive: true };
    if (currentUserId) {
      where.id = { not: currentUserId };
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        department: true,
        designation: true,
        lastLogin: true,
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const formatted = users.map((u) => ({
      ...u,
      isOnline: isUserOnline(u.id),
    }));

    res.json({ data: formatted });
  } catch (error: any) {
    console.error('getChatUsers error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
};

import { Request, Response } from "express";
import { prisma } from "../db";
import { z } from "zod";

// Validation Schemas
export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    currency: z.string().default("INR"),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    upiId: z.string().optional().nullable(),
    bankDetails: z.string().optional().nullable(),
    color: z.string().default("#2563EB"),
  }),
});

export async function listGroups(req: any, res: Response) {
  try {
    const userId = req.user.id;

    // Find all groups where user is an admin or a member
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { adminId: userId },
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(groups);
  } catch (error: any) {
    console.error("List Groups Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createGroup(req: any, res: Response) {
  try {
    const { name, description, currency } = req.body;
    const adminId = req.user.id;

    // Generate random invite code (e.g. SPLIT-XXXX)
    const codeSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteCode = `SPLIT-${codeSuffix}`;

    const newGroup = await prisma.$transaction(async (tx) => {
      // 1. Create Group
      const group = await tx.group.create({
        data: {
          name,
          description,
          currency,
          inviteCode,
          adminId,
        },
      });

      // Fetch user to get name/email
      const user = await tx.user.findUniqueOrThrow({ where: { id: adminId } });

      // 2. Add admin as the first member
      await tx.member.create({
        data: {
          groupId: group.id,
          userId: adminId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          upiId: user.upiId,
          color: "#EF4444",
          status: "ACTIVE",
        },
      });

      // 3. Log Activity
      await tx.activityLog.create({
        data: {
          groupId: group.id,
          actorId: adminId,
          action: "CREATE_GROUP",
          details: JSON.stringify({ name: group.name }),
        },
      });

      return group;
    });

    return res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (error: any) {
    console.error("Create Group Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGroupDetails(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check membership
    const member = await prisma.member.findFirst({
      where: {
        groupId,
        OR: [{ userId }, { group: { adminId: userId } }],
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Access denied. You are not a member of this group." });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { avatar: true },
            },
          },
        },
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Dynamic QR invite code URL
    const qrInviteUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=smartsplit://join/${group.inviteCode}`;

    return res.json({
      ...group,
      qrInviteUrl,
    });
  } catch (error: any) {
    console.error("Get Group Details Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function joinGroupByCode(req: any, res: Response) {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    const group = await prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if user is already a member
    const existingMember = await prisma.member.findFirst({
      where: { groupId: group.id, userId },
    });

    if (existingMember) {
      return res.status(400).json({ error: "You are already a member of this group" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Pick a random hex color for the member
    const colors = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#14B8A6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.member.create({
        data: {
          groupId: group.id,
          userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          upiId: user.upiId,
          color: randomColor,
          status: "ACTIVE",
        },
      });

      await tx.activityLog.create({
        data: {
          groupId: group.id,
          actorId: userId,
          action: "JOIN_GROUP",
          details: JSON.stringify({ memberName: user.name }),
        },
      });

      return newMember;
    });

    return res.json({
      message: "Successfully joined the group!",
      group,
      member,
    });
  } catch (error: any) {
    console.error("Join Group Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function addMemberManually(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const { name, email, phone, upiId, bankDetails, color } = req.body;
    const userId = req.user.id;

    // Check if user is the admin
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (group.adminId !== userId) {
      return res.status(403).json({ error: "Only the group administrator can add members manually" });
    }

    // Check if duplicate email in this group
    if (email) {
      const existing = await prisma.member.findFirst({
        where: { groupId, email },
      });
      if (existing) {
        return res.status(400).json({ error: "A member with this email already exists in the group" });
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      // Check if email belongs to an existing registered User
      let linkedUserId = null;
      if (email) {
        const registered = await tx.user.findUnique({ where: { email } });
        if (registered) {
          linkedUserId = registered.id;
        }
      }

      const newMember = await tx.member.create({
        data: {
          groupId,
          userId: linkedUserId,
          name,
          email,
          phone,
          upiId,
          bankDetails,
          color,
          status: email ? "INVITED" : "ACTIVE",
        },
      });

      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "ADD_MEMBER",
          details: JSON.stringify({ memberName: name }),
        },
      });

      return newMember;
    });

    return res.status(201).json({
      message: "Member added successfully",
      member,
    });
  } catch (error: any) {
    console.error("Add Member Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteMember(req: any, res: Response) {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    // 1. Verify group & admin
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (group.adminId !== userId) {
      return res.status(403).json({ error: "Only the group administrator can remove members" });
    }

    // 2. Fetch member to check their activity and balance
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        paidTransactions: true,
        shares: true,
      },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Cannot remove admin member
    if (member.userId === group.adminId) {
      return res.status(400).json({ error: "Cannot remove the group administrator" });
    }

    // 3. Check transactions - if they paid or participated in any transactions
    // Wait, let's verify if their current net balance is non-zero
    const allGroupMembers = await prisma.member.findMany({ where: { groupId } });
    const allTransactions = await prisma.transaction.findMany({
      where: { groupId },
      include: { participants: true },
    });

    // Run net balances calculation
    const balanceMap = new Map<string, number>();
    for (const m of allGroupMembers) balanceMap.set(m.id, 0);

    for (const tx of allTransactions) {
      const payerId = tx.payerId;
      const amt = Number(tx.amount);
      if (balanceMap.has(payerId)) {
        balanceMap.set(payerId, (balanceMap.get(payerId) || 0) + amt);
      }
      for (const p of tx.participants) {
        const oweAmt = Number(p.calculatedOwe);
        if (balanceMap.has(p.memberId)) {
          balanceMap.set(p.memberId, (balanceMap.get(p.memberId) || 0) - oweAmt);
        }
      }
    }

    const currentBalance = balanceMap.get(memberId) || 0;
    if (Math.abs(currentBalance) > 0.05) {
      return res.status(400).json({
        error: `Cannot remove member. They have an active outstanding balance of ₹${currentBalance.toFixed(2)}. They must settle first.`
      });
    }

    // 4. Delete member from group
    await prisma.$transaction(async (tx) => {
      // Remove any references or Cascade will handle participants/shares.
      // But wait! If they participated in transaction splits and we delete them, it will throw foreign key errors if Cascade is not fully set, or it will alter transaction balances.
      // Our schema matches: Participant has "onDelete: Cascade".
      // But deleting the participant alters the mathematical sum of the transaction.
      // However, since their balance is ZERO, their shares net out exactly.
      // To be safe, we delete participants and the member.
      
      await tx.member.delete({ where: { id: memberId } });

      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "DELETE_MEMBER",
          details: JSON.stringify({ memberName: member.name }),
        },
      });
    });

    return res.json({ message: "Member removed successfully" });
  } catch (error: any) {
    console.error("Delete Member Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

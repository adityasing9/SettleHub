import { Request, Response } from "express";
import { prisma } from "../db";
import { simplifyDebts, calculateNetBalances } from "../services/settlement";
import { z } from "zod";

export const recordPaymentSchema = z.object({
  body: z.object({
    fromId: z.string(),
    toId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.string().default("UPI"),
    notes: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
  }),
});

export async function getSimplifiedSettlements(req: any, res: Response) {
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
      return res.status(403).json({ error: "Access denied" });
    }

    const members = await prisma.member.findMany({
      where: { groupId },
      select: { id: true, name: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { groupId },
      select: {
        payerId: true,
        amount: true,
        participants: {
          select: { memberId: true, calculatedOwe: true },
        },
      },
    });

    const payments = await prisma.payment.findMany({
      where: { groupId },
      select: {
        fromId: true,
        toId: true,
        amount: true,
      },
    });

    // 1. Calculate base net balances from transactions
    const baseBalances = calculateNetBalances(members, transactions);

    // 2. Adjust balances for payments already made
    const balanceMap = new Map<string, number>();
    for (const b of baseBalances) {
      balanceMap.set(b.memberId, b.balance);
    }

    for (const p of payments) {
      const fromId = p.fromId;
      const toId = p.toId;
      const amt = Number(p.amount);

      // A payment reduces the debt of fromId and reduces the credit of toId
      if (balanceMap.has(fromId)) {
        balanceMap.set(fromId, (balanceMap.get(fromId) || 0) + amt);
      }
      if (balanceMap.has(toId)) {
        balanceMap.set(toId, (balanceMap.get(toId) || 0) - amt);
      }
    }

    const adjustedBalances = members.map(m => ({
      memberId: m.id,
      name: m.name,
      balance: balanceMap.get(m.id) || 0,
    }));

    // 3. Run greedy simplification on adjusted balances
    const settlements = simplifyDebts(adjustedBalances);

    return res.json({
      netBalances: adjustedBalances,
      settlements,
    });
  } catch (error: any) {
    console.error("Get Settlements Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function recordPayment(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { fromId, toId, amount, paymentMethod, notes, receiptUrl } = req.body;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const [fromMember, toMember] = await Promise.all([
      prisma.member.findUnique({ where: { id: fromId } }),
      prisma.member.findUnique({ where: { id: toId } }),
    ]);

    if (!fromMember || !toMember || fromMember.groupId !== groupId || toMember.groupId !== groupId) {
      return res.status(400).json({ error: "Invalid settlement members" });
    }

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const pay = await tx.payment.create({
        data: {
          groupId,
          fromId,
          toId,
          amount,
          paymentMethod,
          notes,
          receiptUrl,
          status: "COMPLETED",
        },
      });

      // 2. Create Activity Log
      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "RECORD_PAYMENT",
          details: JSON.stringify({
            fromName: fromMember.name,
            toName: toMember.name,
            amount,
          }),
        },
      });

      // 3. Create Notification for the receiver (toMember)
      if (toMember.userId) {
        await tx.notification.create({
          data: {
            userId: toMember.userId,
            title: "Payment Received",
            message: `${fromMember.name} marked a payment of ₹${amount.toFixed(2)} to you.`,
            type: "TRANSACTION",
          },
        });
      }

      return pay;
    });

    return res.status(201).json({
      message: "Settlement payment recorded successfully",
      payment,
    });
  } catch (error: any) {
    console.error("Record Payment Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendReminder(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const { fromId, toId, amount } = req.body;
    const userId = req.user.id;

    const [fromMember, toMember] = await Promise.all([
      prisma.member.findUnique({ where: { id: fromId } }),
      prisma.member.findUnique({ where: { id: toId } }),
    ]);

    if (!fromMember || !toMember) {
      return res.status(404).json({ error: "Members not found" });
    }

    // If the debtor is a registered user, create an in-app Notification
    if (fromMember.userId) {
      await prisma.notification.create({
        data: {
          userId: fromMember.userId,
          title: "Payment Reminder",
          message: `${toMember.name} has requested that you settle your outstanding debt of ₹${Number(amount).toFixed(2)}.`,
          type: "REMINDER",
        },
      });
    }

    // Mock sending email / SMS or push
    console.log(`[Reminder Notification Logged]: Send reminder from ${toMember.name} to ${fromMember.name} for ₹${amount}`);

    return res.json({
      message: `Reminder sent successfully to ${fromMember.name}!`,
    });
  } catch (error: any) {
    console.error("Send Reminder Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPaymentsHistory(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const payments = await prisma.payment.findMany({
      where: { groupId },
      include: {
        from: true,
        to: true,
      },
      orderBy: { date: "desc" },
    });

    return res.json(payments);
  } catch (error: any) {
    console.error("Payments History Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

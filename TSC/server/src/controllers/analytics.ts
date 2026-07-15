import { Response } from "express";
import { prisma } from "../db";

export async function getDashboardStats(req: any, res: Response) {
  try {
    const userId = req.user.id;

    // Find all groups user belongs to
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { adminId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        members: true,
        transactions: {
          include: { participants: true }
        },
        payments: true
      }
    });

    let totalExpensesPaid = 0;
    let totalExpensesOwed = 0;
    let totalPaymentsMade = 0;
    let totalPaymentsReceived = 0;

    // Calculate aggregated balances
    for (const g of groups) {
      const userMember = g.members.find(m => m.userId === userId);
      if (!userMember) continue;

      // Transactions paid by user
      const paidTx = g.transactions.filter(t => t.payerId === userMember.id);
      paidTx.forEach(t => {
        totalExpensesPaid += Number(t.amount);
      });

      // Transactions user owes for
      g.transactions.forEach(t => {
        const participant = t.participants.find(p => p.memberId === userMember.id);
        if (participant) {
          totalExpensesOwed += Number(participant.calculatedOwe);
        }
      });

      // Payments user made
      const paymentsSent = g.payments.filter(p => p.fromId === userMember.id);
      paymentsSent.forEach(p => {
        totalPaymentsMade += Number(p.amount);
      });

      // Payments user received
      const paymentsRecv = g.payments.filter(p => p.toId === userMember.id);
      paymentsRecv.forEach(p => {
        totalPaymentsReceived += Number(p.amount);
      });
    }

    // Balance formula: (Total Paid + Payments Made) - (Total Owed + Payments Received)
    const netBalance = (totalExpensesPaid + totalPaymentsMade) - (totalExpensesOwed + totalPaymentsReceived);

    return res.json({
      summary: {
        totalPaid: totalExpensesPaid,
        totalOwed: totalExpensesOwed,
        paymentsMade: totalPaymentsMade,
        paymentsReceived: totalPaymentsReceived,
        netBalance,
        groupCount: groups.length,
      },
      recentGroups: groups.slice(0, 5).map(g => ({
        id: g.id,
        name: g.name,
        currency: g.currency,
        memberCount: g.members.length,
      }))
    });
  } catch (error: any) {
    console.error("Get Dashboard Stats Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGroupAnalytics(req: any, res: Response) {
  try {
    const { groupId } = req.params;

    const [transactions, members] = await Promise.all([
      prisma.transaction.findMany({
        where: { groupId },
        orderBy: { date: "asc" },
      }),
      prisma.member.findMany({ where: { groupId } }),
    ]);

    // 1. Calculate spending per category
    const categoryBreakdown: { [category: string]: number } = {};
    // 2. Calculate spending per member (as payer)
    const memberBreakdown: { [name: string]: number } = {};
    // 3. Calculate monthly spending trends
    const monthlySpending: { [month: string]: number } = {};

    let totalSpending = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount);
      totalSpending += amt;

      // Category
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;

      // Payer
      const payer = members.find(m => m.id === t.payerId);
      if (payer) {
        memberBreakdown[payer.name] = (memberBreakdown[payer.name] || 0) + amt;
      }

      // Month: e.g. "Jul 2026"
      const date = new Date(t.date);
      const monthYear = date.toLocaleString("default", { month: "short", year: "numeric" });
      monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + amt;
    });

    return res.json({
      totalSpending,
      categoryBreakdown,
      memberBreakdown,
      monthlySpending,
      transactionCount: transactions.length,
    });
  } catch (error: any) {
    console.error("Get Group Analytics Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function exportGroupCSV(req: any, res: Response) {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        transactions: {
          include: { payer: true },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Create CSV Header
    let csvContent = "Date,Item Name,Category,Paid By,Total Amount,Description,Location\n";

    group.transactions.forEach(tx => {
      const dateStr = new Date(tx.date).toISOString().split("T")[0];
      const name = tx.itemName.replace(/"/g, '""');
      const category = tx.category;
      const payerName = tx.payer.name;
      const amt = Number(tx.amount);
      const desc = (tx.description || "").replace(/"/g, '""');
      const loc = (tx.location || "").replace(/"/g, '""');

      csvContent += `"${dateStr}","${name}","${category}","${payerName}",${amt},"${desc}","${loc}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${group.name.replace(/\s+/g, "_")}_ledger.csv"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error("Export CSV Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getNotifications(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(notifications);
  } catch (error: any) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function markNotificationsAsRead(req: any, res: Response) {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    console.error("Mark Notifications Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGroupActivityLogs(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const logs = await prisma.activityLog.findMany({
      where: { groupId },
      include: {
        actor: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const parsedLogs = logs.map(l => ({
      id: l.id,
      groupId: l.groupId,
      actorName: l.actor.name,
      action: l.action,
      details: JSON.parse(l.details),
      createdAt: l.createdAt,
    }));

    return res.json(parsedLogs);
  } catch (error: any) {
    console.error("Get Activity Logs Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

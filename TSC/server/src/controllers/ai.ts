import { Request, Response } from "express";
import { prisma } from "../db";
import { generateAIInsights, parseNLPQuery, getSmartCategory } from "../services/ai";
import { calculateNetBalances } from "../services/settlement";

export async function getGroupAIInsights(req: any, res: Response) {
  try {
    const { groupId } = req.params;

    const [transactions, members] = await Promise.all([
      prisma.transaction.findMany({
        where: { groupId },
        include: { payer: true },
        orderBy: { date: "desc" },
      }),
      prisma.member.findMany({ where: { groupId } }),
    ]);

    const txParticipants = await prisma.transaction.findMany({
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

    // Calculate balances
    const baseBalances = calculateNetBalances(members, txParticipants);
    const balanceMap = new Map<string, number>();
    for (const b of baseBalances) {
      balanceMap.set(b.memberId, b.balance);
    }

    for (const p of payments) {
      const fromId = p.fromId;
      const toId = p.toId;
      const amt = Number(p.amount);
      if (balanceMap.has(fromId)) {
        balanceMap.set(fromId, (balanceMap.get(fromId) || 0) + amt);
      }
      if (balanceMap.has(toId)) {
        balanceMap.set(toId, (balanceMap.get(toId) || 0) - amt);
      }
    }

    const currentBalances = members.map(m => ({
      memberId: m.id,
      name: m.name,
      balance: balanceMap.get(m.id) || 0,
    }));

    // Formulate transaction data for AI analyzer
    const txData = transactions.map(t => ({
      id: t.id,
      itemName: t.itemName,
      amount: Number(t.amount),
      category: t.category,
      date: t.date,
      payerName: t.payer.name,
    }));

    const analysis = generateAIInsights(txData, currentBalances);

    return res.json(analysis);
  } catch (error: any) {
    console.error("Get AI Insights Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function askAI(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const { query } = req.body;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const members = await prisma.member.findMany({ where: { groupId } });
    const userMember = members.find(m => m.userId === userId || m.email === user.email);

    const parseResult = parseNLPQuery(query, user.name);

    // Fetch transactions database info to answer
    const transactions = await prisma.transaction.findMany({
      where: { groupId },
      include: {
        payer: true,
        participants: {
          include: { member: true },
        },
      },
      orderBy: { date: "desc" },
    });

    let answer = parseResult.reply;
    let data: any = null;

    if (parseResult.intent === "SPENDER_QUERY") {
      // Find top payer
      const spenders: { [name: string]: number } = {};
      transactions.forEach(t => {
        spenders[t.payer.name] = (spenders[t.payer.name] || 0) + Number(t.amount);
      });

      const top = Object.entries(spenders).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        answer = `In this group, **${top[0]}** has spent the most money, with a total of **₹${top[1].toFixed(2)}** in payments.`;
        data = { name: top[0], amount: top[1] };
      } else {
        answer = "No expenses recorded yet, so there is no top spender.";
      }
    } 
    else if (parseResult.intent === "DEBT_QUERY") {
      if (!userMember) {
        answer = "I couldn't identify your member profile in this group to calculate your debts.";
      } else {
        // Calculate net balance for user
        const txParticipants = await prisma.transaction.findMany({
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
          select: { fromId: true, toId: true, amount: true },
        });

        const balances = calculateNetBalances(members, txParticipants);
        const balanceMap = new Map<string, number>();
        for (const b of balances) balanceMap.set(b.memberId, b.balance);

        for (const p of payments) {
          if (balanceMap.has(p.fromId)) balanceMap.set(p.fromId, (balanceMap.get(p.fromId) || 0) + Number(p.amount));
          if (balanceMap.has(p.toId)) balanceMap.set(p.toId, (balanceMap.get(p.toId) || 0) - Number(p.amount));
        }

        const bal = balanceMap.get(userMember.id) || 0;
        if (bal > 0) {
          answer = `Your current balance is **+₹${bal.toFixed(2)}**. You are owed money in this group!`;
        } else if (bal < 0) {
          answer = `Your current balance is **-₹${Math.abs(bal).toFixed(2)}**. You owe money. Settle up using the Settlements screen!`;
        } else {
          answer = "You are all settled up! Your current balance is ₹0.00.";
        }
        data = { balance: bal };
      }
    } 
    else if (parseResult.intent === "CATEGORY_FILTER") {
      const cat = parseResult.filterValue as string;
      const filtered = transactions.filter(t => t.category.toLowerCase() === cat.toLowerCase());
      const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);

      answer = `Found **${filtered.length}** transactions in category **${cat.toUpperCase()}**, totaling **₹${total.toFixed(2)}**.`;
      data = filtered.map(t => ({
        id: t.id,
        itemName: t.itemName,
        amount: Number(t.amount),
        date: t.date,
        payer: t.payer.name,
      }));
    } 
    else if (parseResult.intent === "SEARCH_FILTER") {
      const term = parseResult.filterValue as string;
      const filtered = transactions.filter(t => 
        t.itemName.toLowerCase().includes(term) || 
        (t.description && t.description.toLowerCase().includes(term))
      );
      const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);

      answer = `Found **${filtered.length}** transactions matching "${term}", totaling **₹${total.toFixed(2)}**.`;
      data = filtered.map(t => ({
        id: t.id,
        itemName: t.itemName,
        amount: Number(t.amount),
        date: t.date,
        payer: t.payer.name,
      }));
    }

    return res.json({
      query,
      answer,
      intent: parseResult.intent,
      data,
    });
  } catch (error: any) {
    console.error("Ask AI Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function suggestCategory(req: Request, res: Response) {
  try {
    const { itemName } = req.query;
    if (!itemName) {
      return res.status(400).json({ error: "itemName query parameter is required" });
    }

    const category = getSmartCategory(itemName as string);
    return res.json({ itemName, category });
  } catch (error: any) {
    console.error("Suggest Category Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

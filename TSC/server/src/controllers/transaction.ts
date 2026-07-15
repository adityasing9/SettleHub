import { Request, Response } from "express";
import { prisma } from "../db";
import { z } from "zod";
import { SplitType } from "@prisma/client";

// Input Validation Schemas
export const createTransactionSchema = z.object({
  body: z.object({
    itemName: z.string().min(1),
    amount: z.number().positive(),
    payerId: z.string(),
    category: z.string().default("General"),
    description: z.string().optional().nullable(),
    date: z.string().optional(), // ISO String
    splitType: z.nativeEnum(SplitType),
    participants: z.array(
      z.object({
        memberId: z.string(),
        shareValue: z.number(), // percentage, exact, weighted, shares value
      })
    ).min(1),
    location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  }),
});

export async function createTransaction(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const {
      itemName,
      amount,
      payerId,
      category,
      description,
      date,
      splitType,
      participants,
      location,
      notes,
      tags,
    } = req.body;

    // Verify member permissions
    const payerMember = await prisma.member.findUnique({
      where: { id: payerId },
    });
    if (!payerMember || payerMember.groupId !== groupId) {
      return res.status(400).json({ error: "Invalid payer ID for this group" });
    }

    // 1. Perform split calculations
    const oweCalculations = calculateSplits(amount, splitType, participants);
    if (!oweCalculations) {
      return res.status(400).json({ error: "Calculated split total does not match transaction amount" });
    }

    // 2. Database write
    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction header
      const newTx = await tx.transaction.create({
        data: {
          groupId,
          payerId,
          amount,
          itemName,
          category,
          description,
          date: date ? new Date(date) : new Date(),
          splitType,
          location,
          notes,
        },
      });

      // Create transaction participants
      for (const calc of oweCalculations) {
        await tx.transactionParticipant.create({
          data: {
            transactionId: newTx.id,
            memberId: calc.memberId,
            shareValue: calc.shareValue,
            calculatedOwe: calc.calculatedOwe,
          },
        });
      }

      // Add tags if provided
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          await tx.tag.create({
            data: {
              name: tagName,
              transactionId: newTx.id,
            },
          });
        }
      }

      // Log Activity
      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "ADD_TRANSACTION",
          details: JSON.stringify({ itemName, amount }),
        },
      });

      return newTx;
    });

    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        payer: true,
        participants: {
          include: { member: true },
        },
        tags: true,
      },
    });

    return res.status(201).json(fullTransaction);
  } catch (error: any) {
    console.error("Create Transaction Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function editTransaction(req: any, res: Response) {
  try {
    const { groupId, transactionId } = req.params;
    const userId = req.user.id;
    const {
      itemName,
      amount,
      payerId,
      category,
      description,
      date,
      splitType,
      participants,
      location,
      notes,
      tags,
    } = req.body;

    const existingTx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!existingTx || existingTx.groupId !== groupId) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Verify member permissions
    const payerMember = await prisma.member.findUnique({
      where: { id: payerId },
    });
    if (!payerMember || payerMember.groupId !== groupId) {
      return res.status(400).json({ error: "Invalid payer ID for this group" });
    }

    // Perform split calculations
    const oweCalculations = calculateSplits(amount, splitType, participants);
    if (!oweCalculations) {
      return res.status(400).json({ error: "Calculated split total does not match transaction amount" });
    }

    // Database write
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing participants & tags
      await tx.transactionParticipant.deleteMany({ where: { transactionId } });
      await tx.tag.deleteMany({ where: { transactionId } });

      // 2. Update transaction details
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          payerId,
          amount,
          itemName,
          category,
          description,
          date: date ? new Date(date) : new Date(),
          splitType,
          location,
          notes,
        },
      });

      // 3. Add new participants
      for (const calc of oweCalculations) {
        await tx.transactionParticipant.create({
          data: {
            transactionId,
            memberId: calc.memberId,
            shareValue: calc.shareValue,
            calculatedOwe: calc.calculatedOwe,
          },
        });
      }

      // 4. Add new tags
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          await tx.tag.create({
            data: {
              name: tagName,
              transactionId,
            },
          });
        }
      }

      // Log Activity
      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "UPDATE_TRANSACTION",
          details: JSON.stringify({
            itemName,
            oldAmount: Number(existingTx.amount),
            newAmount: amount,
          }),
        },
      });
    });

    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        payer: true,
        participants: {
          include: { member: true },
        },
        tags: true,
      },
    });

    return res.json(fullTransaction);
  } catch (error: any) {
    console.error("Edit Transaction Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteTransaction(req: any, res: Response) {
  try {
    const { groupId, transactionId } = req.params;
    const userId = req.user.id;

    const existingTx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!existingTx || existingTx.groupId !== groupId) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transactionParticipant.deleteMany({ where: { transactionId } });
      await tx.tag.deleteMany({ where: { transactionId } });
      await tx.transaction.delete({ where: { id: transactionId } });

      await tx.activityLog.create({
        data: {
          groupId,
          actorId: userId,
          action: "DELETE_TRANSACTION",
          details: JSON.stringify({ itemName: existingTx.itemName, amount: Number(existingTx.amount) }),
        },
      });
    });

    return res.json({ message: "Transaction deleted successfully" });
  } catch (error: any) {
    console.error("Delete Transaction Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listTransactions(req: any, res: Response) {
  try {
    const { groupId } = req.params;
    const {
      search,
      category,
      payerId,
      memberId, // Filter by participant member
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = "date",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma query filters
    const whereClause: any = { groupId };

    if (search) {
      whereClause.OR = [
        { itemName: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (payerId) {
      whereClause.payerId = payerId;
    }

    if (memberId) {
      whereClause.participants = {
        some: { memberId: memberId },
      };
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    if (minAmount || maxAmount) {
      whereClause.amount = {};
      if (minAmount) whereClause.amount.gte = parseFloat(minAmount as string);
      if (maxAmount) whereClause.amount.lte = parseFloat(maxAmount as string);
    }

    // Sort mappings
    let orderByClause: any = { date: "desc" };
    if (sortBy === "amount") {
      orderByClause = { amount: sortOrder };
    } else if (sortBy === "itemName") {
      orderByClause = { itemName: sortOrder };
    } else {
      orderByClause = { date: sortOrder };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          payer: true,
          participants: {
            include: { member: true },
          },
          tags: true,
        },
        orderBy: orderByClause,
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List Transactions Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Split Calculations Helper
 */
function calculateSplits(
  amount: number,
  splitType: SplitType,
  participants: { memberId: string; shareValue: number }[]
): { memberId: string; shareValue: number; calculatedOwe: number }[] | null {
  const n = participants.length;
  if (n === 0) return null;

  const result = participants.map(p => ({
    memberId: p.memberId,
    shareValue: p.shareValue,
    calculatedOwe: 0,
  }));

  let totalCalculated = 0;

  if (splitType === SplitType.EQUAL) {
    const rawShare = amount / n;
    const roundedShare = Math.round(rawShare * 100) / 100;
    
    result.forEach(r => {
      r.calculatedOwe = roundedShare;
      totalCalculated += roundedShare;
    });

    // Rounding adjustment
    const difference = Math.round((amount - totalCalculated) * 100) / 100;
    if (Math.abs(difference) > 0.001) {
      result[0].calculatedOwe = Math.round((result[0].calculatedOwe + difference) * 100) / 100;
    }
  } 
  else if (splitType === SplitType.PERCENTAGE) {
    let pctSum = 0;
    result.forEach(r => {
      const shareOwe = Math.round((amount * (r.shareValue / 100)) * 100) / 100;
      r.calculatedOwe = shareOwe;
      pctSum += r.shareValue;
      totalCalculated += shareOwe;
    });

    if (Math.abs(pctSum - 100) > 0.05) {
      return null; // Percentages must sum to 100%
    }

    const difference = Math.round((amount - totalCalculated) * 100) / 100;
    if (Math.abs(difference) > 0.001) {
      result[0].calculatedOwe = Math.round((result[0].calculatedOwe + difference) * 100) / 100;
    }
  } 
  else if (splitType === SplitType.EXACT || splitType === SplitType.CUSTOM) {
    let exactSum = 0;
    result.forEach(r => {
      r.calculatedOwe = Math.round(r.shareValue * 100) / 100;
      exactSum += r.calculatedOwe;
    });

    if (Math.abs(exactSum - amount) > 0.05) {
      return null; // Exact values must sum to total amount
    }
  } 
  else if (splitType === SplitType.WEIGHTED || splitType === SplitType.SHARES) {
    const totalWeights = participants.reduce((sum, p) => sum + p.shareValue, 0);
    if (totalWeights <= 0) return null;

    result.forEach(r => {
      const weightShare = Math.round((amount * (r.shareValue / totalWeights)) * 100) / 100;
      r.calculatedOwe = weightShare;
      totalCalculated += weightShare;
    });

    const difference = Math.round((amount - totalCalculated) * 100) / 100;
    if (Math.abs(difference) > 0.001) {
      result[0].calculatedOwe = Math.round((result[0].calculatedOwe + difference) * 100) / 100;
    }
  }

  return result;
}

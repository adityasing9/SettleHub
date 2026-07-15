import { Decimal } from "@prisma/client/runtime/library";

interface TransactionData {
  id: string;
  itemName: string;
  amount: number | Decimal;
  category: string;
  date: Date;
  payerName: string;
}

interface GroupBalance {
  memberId: string;
  name: string;
  balance: number;
}

export interface AIAnalysis {
  highestSpender: { name: string; amount: number } | null;
  lowestSpender: { name: string; amount: number } | null;
  averageExpense: number;
  largestTransaction: { itemName: string; amount: number; payerName: string } | null;
  duplicates: { t1: TransactionData; t2: TransactionData; reason: string }[];
  categoryBreakdown: { [category: string]: number };
  insights: string[];
}

/**
 * Automatically analyze transactions to generate summaries, flag duplicates, and highlight insights.
 */
export function generateAIInsights(transactions: TransactionData[], balances: GroupBalance[]): AIAnalysis {
  const analysis: AIAnalysis = {
    highestSpender: null,
    lowestSpender: null,
    averageExpense: 0,
    largestTransaction: null,
    duplicates: [],
    categoryBreakdown: {},
    insights: [],
  };

  if (transactions.length === 0) {
    analysis.insights.push("No transactions recorded yet. Add some expenses to generate insights!");
    return analysis;
  }

  // 1. Calculations on individual transactions
  let totalAmount = 0;
  let maxTx: TransactionData | null = null;
  const categorySums: { [cat: string]: number } = {};

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    totalAmount += amt;

    if (!maxTx || amt > Number(maxTx.amount)) {
      maxTx = tx;
    }

    categorySums[tx.category] = (categorySums[tx.category] || 0) + amt;
  }

  analysis.averageExpense = totalAmount / transactions.length;
  analysis.categoryBreakdown = categorySums;

  if (maxTx) {
    analysis.largestTransaction = {
      itemName: maxTx.itemName,
      amount: Number(maxTx.amount),
      payerName: maxTx.payerName,
    };
  }

  // 2. Spendings per member (who spent the most/least overall as payers)
  const payerTotals: { [name: string]: number } = {};
  for (const tx of transactions) {
    payerTotals[tx.payerName] = (payerTotals[tx.payerName] || 0) + Number(tx.amount);
  }

  let maxSpenderName = "";
  let maxSpenderAmt = -1;
  let minSpenderName = "";
  let minSpenderAmt = Infinity;

  Object.entries(payerTotals).forEach(([name, amt]) => {
    if (amt > maxSpenderAmt) {
      maxSpenderAmt = amt;
      maxSpenderName = name;
    }
    if (amt < minSpenderAmt) {
      minSpenderAmt = amt;
      minSpenderName = name;
    }
  });

  if (maxSpenderName) {
    analysis.highestSpender = { name: maxSpenderName, amount: maxSpenderAmt };
  }
  if (minSpenderName && minSpenderAmt !== Infinity) {
    analysis.lowestSpender = { name: minSpenderName, amount: minSpenderAmt };
  }

  // 3. Duplicate Expense Detection
  // Flag if two transactions have the same amount, same name (case-insensitive), or within 24 hours
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      const timeDiff = Math.abs(t1.date.getTime() - t2.date.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      const nameMatch = t1.itemName.trim().toLowerCase() === t2.itemName.trim().toLowerCase();
      const amountMatch = Math.abs(Number(t1.amount) - Number(t2.amount)) < 0.01;

      if (amountMatch && (nameMatch || hoursDiff < 24)) {
        let reason = "";
        if (nameMatch && amountMatch && hoursDiff < 24) {
          reason = "Identical name and amount within 24 hours.";
        } else if (amountMatch && hoursDiff < 1) {
          reason = "Identical amount recorded within 1 hour.";
        } else if (nameMatch && amountMatch) {
          reason = "Identical name and amount on different dates.";
        }

        if (reason) {
          analysis.duplicates.push({ t1, t2, reason });
        }
      }
    }
  }

  // 4. Generate text insights
  if (analysis.highestSpender) {
    analysis.insights.push(`${analysis.highestSpender.name} is the top spender, paying a total of ₹${analysis.highestSpender.amount.toFixed(2)}.`);
  }

  if (analysis.largestTransaction) {
    analysis.insights.push(`The single largest transaction is "${analysis.largestTransaction.itemName}" for ₹${analysis.largestTransaction.amount.toFixed(2)}, paid by ${analysis.largestTransaction.payerName}.`);
  }

  // Category insights
  const topCat = Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const percent = (topCat[1] / totalAmount) * 100;
    analysis.insights.push(`Most spending went to "${topCat[0]}" (₹${topCat[1].toFixed(2)}, or ${percent.toFixed(1)}% of total).`);
  }

  // Debt warnings
  const deepDebtors = balances.filter(b => b.balance < -1000);
  if (deepDebtors.length > 0) {
    const names = deepDebtors.map(d => d.name).join(", ");
    analysis.insights.push(`Reminder: ${names} have outstanding debts of over ₹1,000. Send a settlement reminder!`);
  }

  if (analysis.duplicates.length > 0) {
    analysis.insights.push(`Detected ${analysis.duplicates.length} potential duplicate transaction(s). Please review the duplicates section.`);
  }

  return analysis;
}

/**
 * Natural Language Query Engine for "Ask AI" queries.
 * Translates English questions into structured filter intents.
 */
export function parseNLPQuery(query: string, currentUserName: string): {
  intent: "SPENDER_QUERY" | "DEBT_QUERY" | "CATEGORY_FILTER" | "SEARCH_FILTER" | "UNKNOWN";
  reply: string;
  filterValue?: any;
} {
  const q = query.toLowerCase().trim();

  // 1. Spender query
  if (q.includes("spent the most") || q.includes("highest spender") || q.includes("who spent most") || q.includes("who spent the most")) {
    return {
      intent: "SPENDER_QUERY",
      reply: "Let me check who has spent the most in this group...",
    };
  }

  // 2. Debt query
  if (q.includes("how much do i owe") || q.includes("my balance") || q.includes("what do i owe") || q.includes("my debt")) {
    return {
      intent: "DEBT_QUERY",
      reply: `Checking the outstanding balances for you (${currentUserName})...`,
    };
  }

  // 3. Who owes me query
  if (q.includes("who owes me") || q.includes("who owes me money") || q.includes("who needs to pay me")) {
    return {
      intent: "DEBT_QUERY",
      reply: "Scanning group settlements to see who owes you money...",
      filterValue: { owesMe: true }
    };
  }

  // 4. Category filtering
  const categories = ["food", "rent", "petrol", "travel", "groceries", "utilities", "entertainment", "general", "bills", "shopping"];
  for (const cat of categories) {
    if (q.includes(`show ${cat}`) || q.includes(`${cat} expenses`) || q.includes(`spent on ${cat}`) || q.includes(`spent for ${cat}`)) {
      return {
        intent: "CATEGORY_FILTER",
        reply: `Filtering all transactions in the "${cat.toUpperCase()}" category...`,
        filterValue: cat,
      };
    }
  }

  // 5. General search fallback
  if (q.startsWith("show ") || q.startsWith("find ") || q.startsWith("search ")) {
    const searchTerm = q.replace(/^(show|find|search)\s+(expenses\s+for\s+|expenses\s+with\s+|for\s+|about\s+|)?/, "");
    return {
      intent: "SEARCH_FILTER",
      reply: `Searching transactions matching "${searchTerm}"...`,
      filterValue: searchTerm,
    };
  }

  // Default fallback matching some keywords
  if (q.includes("petrol") || q.includes("fuel") || q.includes("cab") || q.includes("uber") || q.includes("travel")) {
    return {
      intent: "CATEGORY_FILTER",
      reply: "Filtering travel and transport expenses...",
      filterValue: "travel",
    };
  }

  return {
    intent: "UNKNOWN",
    reply: "I'm not quite sure. You can ask me: 'Who spent the most?', 'How much do I owe?', 'Who owes me money?', or 'Show food expenses'."
  };
}

/**
 * Rule-based smart categorization based on transaction item name.
 */
export function getSmartCategory(itemName: string): string {
  const name = itemName.toLowerCase().trim();

  const rules: { [category: string]: string[] } = {
    Food: ["restaurant", "cafe", "pizza", "burger", "dinner", "lunch", "breakfast", "swiggy", "zomato", "starbucks", "food", "tea", "coffee", "mcdonalds", "kfc"],
    Groceries: ["grocery", "groceries", "supermarket", "blinkit", "zepto", "milk", "vegetables", "fruits", "mart"],
    Travel: ["petrol", "fuel", "diesel", "uber", "ola", "cab", "taxi", "train", "flight", "bus", "parking", "tolltax", "metro", "auto"],
    Utilities: ["electricity", "water", "wifi", "internet", "recharge", "broadband", "gas", "electricity bill"],
    Entertainment: ["movie", "netflix", "spotify", "ticket", "concert", "game", "bowling", "club", "party", "pub", "bar"],
    Shopping: ["amazon", "flipkart", "clothes", "shoes", "mall", "myntra", "electronics", "gift"],
    Rent: ["rent", "deposit", "maintenance", "brokerage"],
  };

  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return "General";
}

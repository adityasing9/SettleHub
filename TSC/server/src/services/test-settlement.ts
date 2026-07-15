import { simplifyDebts, calculateNetBalances, MemberBalance } from "./settlement";

function runTest() {
  console.log("=== Running Debt Simplification Test ===");

  const members = [
    { id: "m1", name: "Aaditya" },
    { id: "m2", name: "Sonu" },
    { id: "m3", name: "Prince" },
    { id: "m4", name: "Riyaj" },
    { id: "m5", name: "Ayush" },
  ];

  // Transactions representation
  const transactions = [
    {
      payerId: "m1", // Aaditya paid 15000 rent
      amount: 15000,
      participants: [
        { memberId: "m1", calculatedOwe: 3000 },
        { memberId: "m2", calculatedOwe: 3000 },
        { memberId: "m3", calculatedOwe: 3000 },
        { memberId: "m4", calculatedOwe: 3000 },
        { memberId: "m5", calculatedOwe: 3000 },
      ]
    },
    {
      payerId: "m2", // Sonu paid 2500 dinner
      amount: 2500,
      participants: [
        { memberId: "m1", calculatedOwe: 500 },
        { memberId: "m2", calculatedOwe: 500 },
        { memberId: "m3", calculatedOwe: 500 },
        { memberId: "m4", calculatedOwe: 500 },
        { memberId: "m5", calculatedOwe: 500 },
      ]
    },
    {
      payerId: "m3", // Prince paid 4000 power bill
      amount: 4000,
      participants: [
        { memberId: "m1", calculatedOwe: 1000 },
        { memberId: "m2", calculatedOwe: 1000 },
        { memberId: "m3", calculatedOwe: 1000 },
        { memberId: "m4", calculatedOwe: 400 },
        { memberId: "m5", calculatedOwe: 600 },
      ]
    },
    {
      payerId: "m4", // Riyaj paid 1200 petrol
      amount: 1200,
      participants: [
        { memberId: "m1", calculatedOwe: 600 },
        { memberId: "m5", calculatedOwe: 600 },
      ]
    }
  ];

  const balances = calculateNetBalances(members, transactions);
  console.log("Calculated Net Balances:");
  balances.forEach(b => {
    console.log(`- ${b.name}: ${b.balance >= 0 ? "+" : ""}${b.balance.toFixed(2)}`);
  });

  const settlements = simplifyDebts(balances);
  console.log("\nSimplified Settlements (Minimizing payments):");
  settlements.forEach(s => {
    console.log(`- ${s.fromName} owes ${s.toName} ₹${s.amount.toFixed(2)}`);
  });

  console.log("\nTotal settlements required:", settlements.length);
}

runTest();

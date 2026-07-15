import { PrismaClient, Role, SplitType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.transactionParticipant.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.currency.deleteMany();

  console.log("Cleared existing database tables.");

  // 2. Seed Currencies
  const currencies = [
    { code: "INR", symbol: "₹", rate: 83.50 }, // 1 USD = 83.50 INR
    { code: "USD", symbol: "$", rate: 1.00 },  // Base
    { code: "EUR", symbol: "€", rate: 0.92 },  // 1 USD = 0.92 EUR
    { code: "AED", symbol: "د.إ", rate: 3.67 }, // 1 USD = 3.67 AED
    { code: "GBP", symbol: "£", rate: 0.79 },  // 1 USD = 0.79 GBP
    { code: "JPY", symbol: "¥", rate: 155.20 }, // 1 USD = 155.20 JPY
  ];

  for (const c of currencies) {
    await prisma.currency.create({
      data: {
        code: c.code,
        symbol: c.symbol,
        rate: c.rate,
      },
    });
  }
  console.log("Seeded currencies.");

  // 3. Seed Categories
  const categories = [
    { name: "Food", icon: "Utensils", color: "#F59E0B" },
    { name: "Groceries", icon: "ShoppingBag", color: "#10B981" },
    { name: "Travel", icon: "Car", color: "#3B82F6" },
    { name: "Utilities", icon: "Zap", color: "#8B5CF6" },
    { name: "Entertainment", icon: "Tv", color: "#EC4899" },
    { name: "Shopping", icon: "ShoppingBag", color: "#6366F1" },
    { name: "Rent", icon: "Home", color: "#6B7280" },
    { name: "General", icon: "CreditCard", color: "#EF4444" },
  ];

  for (const cat of categories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }
  console.log("Seeded categories.");

  // 4. Seed Users
  const passwordHash = await bcrypt.hash("password123", 10);

  const aaditya = await prisma.user.create({
    data: {
      email: "aaditya@example.com",
      passwordHash,
      name: "Aaditya",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aaditya",
      phone: "9876543210",
      upiId: "aaditya@ybl",
      bankName: "State Bank of India",
      bankAccount: "30291029302",
      bankIfsc: "SBIN0001234",
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  const sonu = await prisma.user.create({
    data: {
      email: "sonu@example.com",
      passwordHash,
      name: "Sonu",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sonu",
      phone: "9876543211",
      upiId: "sonu@okaxis",
      role: Role.USER,
      isVerified: true,
    },
  });

  const prince = await prisma.user.create({
    data: {
      email: "prince@example.com",
      passwordHash,
      name: "Prince",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Prince",
      phone: "9876543212",
      upiId: "prince@paytm",
      role: Role.USER,
      isVerified: true,
    },
  });

  const riyaj = await prisma.user.create({
    data: {
      email: "riyaj@example.com",
      passwordHash,
      name: "Riyaj",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riyaj",
      phone: "9876543213",
      upiId: "riyaj@okhdfc",
      role: Role.USER,
      isVerified: true,
    },
  });

  const ayush = await prisma.user.create({
    data: {
      email: "ayush@example.com",
      passwordHash,
      name: "Ayush",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayush",
      phone: "9876543214",
      upiId: "ayush@ybl",
      role: Role.USER,
      isVerified: true,
    },
  });

  console.log("Seeded user accounts.");

  // 5. Seed Groups
  const hostelGroup = await prisma.group.create({
    data: {
      name: "Hostel Flat 402",
      description: "Daily expenses and rent splits for roommates in Flat 402",
      currency: "INR",
      inviteCode: "FLAT402",
      adminId: aaditya.id,
    },
  });

  const tripGroup = await prisma.group.create({
    data: {
      name: "Goa Trip 2026",
      description: "Vacation expenses, travel, stay and food sharing",
      currency: "INR",
      inviteCode: "GOATRIP",
      adminId: aaditya.id,
    },
  });

  console.log("Seeded groups.");

  // 6. Seed Group Members
  // Members for Hostel Group
  const mHostelAaditya = await prisma.member.create({
    data: { groupId: hostelGroup.id, userId: aaditya.id, name: "Aaditya", email: aaditya.email, phone: aaditya.phone, upiId: aaditya.upiId, color: "#EF4444" },
  });
  const mHostelSonu = await prisma.member.create({
    data: { groupId: hostelGroup.id, userId: sonu.id, name: "Sonu", email: sonu.email, phone: sonu.phone, upiId: sonu.upiId, color: "#3B82F6" },
  });
  const mHostelPrince = await prisma.member.create({
    data: { groupId: hostelGroup.id, userId: prince.id, name: "Prince", email: prince.email, phone: prince.phone, upiId: prince.upiId, color: "#10B981" },
  });
  const mHostelRiyaj = await prisma.member.create({
    data: { groupId: hostelGroup.id, userId: riyaj.id, name: "Riyaj", email: riyaj.email, phone: riyaj.phone, upiId: riyaj.upiId, color: "#8B5CF6" },
  });
  const mHostelAyush = await prisma.member.create({
    data: { groupId: hostelGroup.id, userId: ayush.id, name: "Ayush", email: ayush.email, phone: ayush.phone, upiId: ayush.upiId, color: "#EC4899" },
  });

  // Members for Goa Group
  const mTripAaditya = await prisma.member.create({
    data: { groupId: tripGroup.id, userId: aaditya.id, name: "Aaditya", email: aaditya.email, phone: aaditya.phone, upiId: aaditya.upiId, color: "#EF4444" },
  });
  const mTripSonu = await prisma.member.create({
    data: { groupId: tripGroup.id, userId: sonu.id, name: "Sonu", email: sonu.email, phone: sonu.phone, upiId: sonu.upiId, color: "#3B82F6" },
  });
  const mTripPrince = await prisma.member.create({
    data: { groupId: tripGroup.id, userId: prince.id, name: "Prince", email: prince.email, phone: prince.phone, upiId: prince.upiId, color: "#10B981" },
  });

  console.log("Seeded members.");

  // 7. Seed Transactions
  // Transaction 1: Rent paid by Aaditya (Hostel Group) - Equal split among all 5 roommates
  const rentTx = await prisma.transaction.create({
    data: {
      groupId: hostelGroup.id,
      payerId: mHostelAaditya.id,
      amount: 15000.00,
      itemName: "Apartment Rent - July",
      category: "Rent",
      description: "Monthly apartment rent paid directly to owner",
      splitType: SplitType.EQUAL,
    },
  });

  const hostelMembers = [mHostelAaditya, mHostelSonu, mHostelPrince, mHostelRiyaj, mHostelAyush];
  for (const m of hostelMembers) {
    await prisma.transactionParticipant.create({
      data: {
        transactionId: rentTx.id,
        memberId: m.id,
        shareValue: 20, // 20% each (equal)
        calculatedOwe: 3000.00, // 15000 / 5
      },
    });
  }

  // Transaction 2: Food & Drinks paid by Sonu (Hostel Group) - Equal split
  const dinnerTx = await prisma.transaction.create({
    data: {
      groupId: hostelGroup.id,
      payerId: mHostelSonu.id,
      amount: 2500.00,
      itemName: "Barbeque Dinner",
      category: "Food",
      description: "Celebration Dinner",
      splitType: SplitType.EQUAL,
    },
  });

  for (const m of hostelMembers) {
    await prisma.transactionParticipant.create({
      data: {
        transactionId: dinnerTx.id,
        memberId: m.id,
        shareValue: 20,
        calculatedOwe: 500.00,
      },
    });
  }

  // Transaction 3: Electricity bill paid by Prince (Hostel Group) - Custom splits
  // Riyaj stayed only half month, so he pays less.
  const powerTx = await prisma.transaction.create({
    data: {
      groupId: hostelGroup.id,
      payerId: mHostelPrince.id,
      amount: 4000.00,
      itemName: "Electricity Bill",
      category: "Utilities",
      splitType: SplitType.EXACT,
    },
  });

  const powerShares = [
    { id: mHostelAaditya.id, owe: 1000.00 },
    { id: mHostelSonu.id, owe: 1000.00 },
    { id: mHostelPrince.id, owe: 1000.00 },
    { id: mHostelRiyaj.id, owe: 400.00 },
    { id: mHostelAyush.id, owe: 600.00 },
  ];

  for (const ps of powerShares) {
    await prisma.transactionParticipant.create({
      data: {
        transactionId: powerTx.id,
        memberId: ps.id,
        shareValue: ps.owe,
        calculatedOwe: ps.owe,
      },
    });
  }

  // Transaction 4: Petrol paid by Riyaj (Hostel Group) - Aaditya and Ayush only
  const petrolTx = await prisma.transaction.create({
    data: {
      groupId: hostelGroup.id,
      payerId: mHostelRiyaj.id,
      amount: 1200.00,
      itemName: "Car Petrol Fuel",
      category: "Travel",
      splitType: SplitType.EQUAL,
    },
  });

  await prisma.transactionParticipant.create({
    data: { transactionId: petrolTx.id, memberId: mHostelAaditya.id, shareValue: 50, calculatedOwe: 600.00 },
  });
  await prisma.transactionParticipant.create({
    data: { transactionId: petrolTx.id, memberId: mHostelAyush.id, shareValue: 50, calculatedOwe: 600.00 },
  });

  // Trip group transactions
  // Flight tickets paid by Prince
  const flightTx = await prisma.transaction.create({
    data: {
      groupId: tripGroup.id,
      payerId: mTripPrince.id,
      amount: 18000.00,
      itemName: "Vistara Flights to Goa",
      category: "Travel",
      splitType: SplitType.EQUAL,
    },
  });

  const tripMembers = [mTripAaditya, mTripSonu, mTripPrince];
  for (const m of tripMembers) {
    await prisma.transactionParticipant.create({
      data: {
        transactionId: flightTx.id,
        memberId: m.id,
        shareValue: 33.33,
        calculatedOwe: 6000.00,
      },
    });
  }

  console.log("Seeded transactions and participants.");

  // 8. Generate Initial Activity Logs
  await prisma.activityLog.create({
    data: {
      groupId: hostelGroup.id,
      actorId: aaditya.id,
      action: "CREATE_GROUP",
      details: JSON.stringify({ name: hostelGroup.name }),
    },
  });

  await prisma.activityLog.create({
    data: {
      groupId: hostelGroup.id,
      actorId: aaditya.id,
      action: "ADD_TRANSACTION",
      details: JSON.stringify({ itemName: "Apartment Rent - July", amount: 15000 }),
    },
  });

  console.log("Seeded activity logs.");

  // 9. Generate Settlements (To be resolved or default simulated)
  // Let's create one pending settlement in Hostel Group: Sonu owes Prince ₹200
  await prisma.settlement.create({
    data: {
      groupId: hostelGroup.id,
      fromId: mHostelSonu.id,
      toId: mHostelPrince.id,
      amount: 200.00,
      status: "PENDING",
    },
  });

  // Let's create one completed payment: Prince paid Aaditya ₹1000
  const payment = await prisma.payment.create({
    data: {
      groupId: hostelGroup.id,
      fromId: mHostelPrince.id,
      toId: mHostelAaditya.id,
      amount: 1000.00,
      paymentMethod: "UPI",
      notes: "Settled half of rent",
      status: "COMPLETED",
    },
  });

  console.log("Seeded settlements and payments.");
  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

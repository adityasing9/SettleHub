import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import * as authCtrl from "../controllers/auth";
import * as groupCtrl from "../controllers/group";
import * as txCtrl from "../controllers/transaction";
import * as settleCtrl from "../controllers/settlement";
import * as analyticsCtrl from "../controllers/analytics";
import * as aiCtrl from "../controllers/ai";

const router = Router();

// ==========================================
// AUTH ROUTES
// ==========================================
router.post(
  "/auth/register",
  validateRequest(authCtrl.registerSchema),
  authCtrl.register
);
router.post(
  "/auth/login",
  validateRequest(authCtrl.loginSchema),
  authCtrl.login
);
router.post(
  "/auth/verify",
  validateRequest(authCtrl.verifySchema),
  authCtrl.verify
);
router.post(
  "/auth/forgot-password",
  validateRequest(authCtrl.forgotPasswordSchema),
  authCtrl.forgotPassword
);
router.get("/auth/profile", authenticateJWT, authCtrl.getProfile);
router.put("/auth/profile", authenticateJWT, authCtrl.updateProfile);

// ==========================================
// DASHBOARD ROUTES
// ==========================================
router.get("/dashboard/stats", authenticateJWT, analyticsCtrl.getDashboardStats);
router.get("/dashboard/notifications", authenticateJWT, analyticsCtrl.getNotifications);
router.post("/dashboard/notifications/read", authenticateJWT, analyticsCtrl.markNotificationsAsRead);

// ==========================================
// GROUP ROUTES
// ==========================================
router.get("/groups", authenticateJWT, groupCtrl.listGroups);
router.post(
  "/groups",
  authenticateJWT,
  validateRequest(groupCtrl.createGroupSchema),
  groupCtrl.createGroup
);
router.post("/groups/join", authenticateJWT, groupCtrl.joinGroupByCode);
router.get("/groups/:groupId", authenticateJWT, groupCtrl.getGroupDetails);

// Members sub-routes
router.post(
  "/groups/:groupId/members",
  authenticateJWT,
  validateRequest(groupCtrl.addMemberSchema),
  groupCtrl.addMemberManually
);
router.delete("/groups/:groupId/members/:memberId", authenticateJWT, groupCtrl.deleteMember);

// ==========================================
// TRANSACTION ROUTES
// ==========================================
router.get("/groups/:groupId/transactions", authenticateJWT, txCtrl.listTransactions);
router.post(
  "/groups/:groupId/transactions",
  authenticateJWT,
  validateRequest(txCtrl.createTransactionSchema),
  txCtrl.createTransaction
);
router.put(
  "/groups/:groupId/transactions/:transactionId",
  authenticateJWT,
  validateRequest(txCtrl.createTransactionSchema),
  txCtrl.editTransaction
);
router.delete("/groups/:groupId/transactions/:transactionId", authenticateJWT, txCtrl.deleteTransaction);

// ==========================================
// SETTLEMENT & PAYMENTS ROUTES
// ==========================================
router.get("/groups/:groupId/settlements", authenticateJWT, settleCtrl.getSimplifiedSettlements);
router.post(
  "/groups/:groupId/payments",
  authenticateJWT,
  validateRequest(settleCtrl.recordPaymentSchema),
  settleCtrl.recordPayment
);
router.get("/groups/:groupId/payments/history", authenticateJWT, settleCtrl.getPaymentsHistory);
router.post("/groups/:groupId/remind", authenticateJWT, settleCtrl.sendReminder);

// ==========================================
// ANALYTICS & REPORTS ROUTES
// ==========================================
router.get("/groups/:groupId/analytics", authenticateJWT, analyticsCtrl.getGroupAnalytics);
router.get("/groups/:groupId/export", authenticateJWT, analyticsCtrl.exportGroupCSV);
router.get("/groups/:groupId/activity", authenticateJWT, analyticsCtrl.getGroupActivityLogs);

// ==========================================
// AI ROUTES
// ==========================================
router.get("/groups/:groupId/ai/insights", authenticateJWT, aiCtrl.getGroupAIInsights);
router.post("/groups/:groupId/ai/query", authenticateJWT, aiCtrl.askAI);
router.get("/ai/suggest-category", authenticateJWT, aiCtrl.suggestCategory);

export default router;

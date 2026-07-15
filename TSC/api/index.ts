import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import apiRoutes from "../server/src/routes";

dotenv.config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());

// Mount the existing Express routes
app.use("/api", apiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", serverless: true, timestamp: new Date() });
});

export default app;

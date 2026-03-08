import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import memberRoutes from "./routes/member.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import healthRouter from "./HealthCheck.routes.js";

const app = express();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV });
});

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://trip-sync-sigma.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api", memberRoutes);
app.use("/api", activityRoutes);
app.use("/api", commentRoutes);
app.use("/api", checklistRoutes);
app.use("/api", reservationRoutes);
app.use("/api", expenseRoutes);
app.use("/api", uploadRoutes);
app.use("/api", aiRoutes);
app.use("/api", chatRoutes);

app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;

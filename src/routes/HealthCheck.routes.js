import express from "express";
const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status:    "ok",
    service:   "TripSync API",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

export default router;
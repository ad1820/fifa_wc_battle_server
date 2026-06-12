import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboard.controller.js";

const router = Router();

// Public route to view the global leaderboard
router.get("/", getLeaderboard);

export default router;

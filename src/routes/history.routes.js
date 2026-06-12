import { Router } from "express";
import { getMatchHistory } from "../controllers/history.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected endpoint to fetch user's personal match history
router.get("/", verifyFirebaseToken, getMatchHistory);

export default router;

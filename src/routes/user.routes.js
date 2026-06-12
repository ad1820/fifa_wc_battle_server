import { Router } from "express";
import { getUserProfile, getCooldowns } from "../controllers/user.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Endpoint to fetch authenticated user's profile and streak
router.get("/profile", verifyFirebaseToken, getUserProfile);

// Endpoint to fetch currently exhausted player IDs
router.get("/cooldowns", verifyFirebaseToken, getCooldowns);

export default router;

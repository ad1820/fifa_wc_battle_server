import { Router } from "express";
import { playMatchController } from "../controllers/match.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect the game loop with Firebase Authentication
router.post("/play", verifyFirebaseToken, playMatchController);

export default router;

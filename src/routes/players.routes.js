import { Router } from "express";
import { getAllPlayers } from "../controllers/players.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected route so only authenticated users can grab the master player list
router.get("/", verifyFirebaseToken, getAllPlayers);

export default router;

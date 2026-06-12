import { Router } from "express";
import { loginUser } from "../controllers/auth.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Endpoint called by frontend after successful Google OAuth
router.post("/login", verifyFirebaseToken, loginUser);

export default router;

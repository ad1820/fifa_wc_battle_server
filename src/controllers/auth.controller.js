import { User } from '../models/user.model.js';

export const loginUser = async (req, res) => {
    try {
        const decodedToken = req.user; // Attached by verifyFirebaseToken middleware

        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({ message: "Invalid authentication token." });
        }

        // Check if user exists
        let user = await User.findOne({ firebaseUid: decodedToken.uid });

        if (!user) {
            // Create new user if first login
            user = new User({
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || "Unknown Player",
                avatar: decodedToken.picture || "",
                role: "USER",
                current_xp: 0
            });
            await user.save();
        }

        return res.status(200).json({
            message: "Login successful",
            user
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error during login." });
    }
};

import { User } from '../models/user.model.js';
import { redisClient } from '../config/redis.js';

export const getUserProfile = async (req, res) => {
    try {
        const decodedToken = req.user;
        
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const streakKey = `user:${user._id.toString()}:streak`;
        const currentStreakStr = await redisClient.get(streakKey);
        const currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;

        return res.status(200).json({
            user,
            currentStreak
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getCooldowns = async (req, res) => {
    try {
        const decodedToken = req.user;
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        if (!user) return res.status(404).json({ message: "User not found." });

        const userId = user._id.toString();
        const pattern = `user:${userId}:cooldown:*`;
        
        // Scan Redis for all cooldown keys for this user
        const keys = await redisClient.keys(pattern);
        
        const exhaustedPlayerIds = keys.map(key => {
            // key format: user:{userId}:cooldown:{playerId}
            const parts = key.split(':');
            return parts[3];  // The playerId part
        });

        return res.status(200).json(exhaustedPlayerIds);
    } catch (error) {
        console.error("Get Cooldowns Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

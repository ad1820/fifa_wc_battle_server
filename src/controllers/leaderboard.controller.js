import { redisClient } from '../config/redis.js';
import { User } from '../models/user.model.js';

export const getLeaderboard = async (req, res) => {
    try {
        // Fetch top 50 from Redis Sorted Set (highest score first)
        const topPlayers = await redisClient.zrange('global_leaderboard', 0, 49, { rev: true, withScores: true });
        
        if (!topPlayers || topPlayers.length === 0) {
            return res.status(200).json([]);
        }

        // Handle upstash returning array of objects vs flat array
        let parsedPlayers = [];
        if (typeof topPlayers[0] === 'object' && topPlayers[0] !== null) {
            parsedPlayers = topPlayers;
        } else {
            // Parse flat array [id1, score1, id2, score2]
            for (let i = 0; i < topPlayers.length; i += 2) {
                parsedPlayers.push({ member: topPlayers[i], score: topPlayers[i+1] });
            }
        }

        const playerIds = parsedPlayers.map(p => p.member);

        // Fetch display names and avatars from MongoDB
        const users = await User.find({ _id: { $in: playerIds } }).select('name avatar');

        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = {
                name: u.name,
                avatar: u.avatar
            };
        });

        const leaderboardData = parsedPlayers.map((p, index) => {
            const userInfo = userMap[p.member] || { name: 'Unknown User', avatar: '' };
            
            return {
                rank: index + 1,
                userId: p.member,
                name: userInfo.name,
                avatar: userInfo.avatar,
                score: p.score
            };
        });

        return res.status(200).json(leaderboardData);
    } catch (error) {
        console.error("Get Leaderboard Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

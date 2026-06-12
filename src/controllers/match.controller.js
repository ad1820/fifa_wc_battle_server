import { playMatch } from '../services/match.service.js';
import { generateCommentary } from '../services/commentary.service.js';
import { User } from '../models/user.model.js';

export const playMatchController = async (req, res) => {
    try {
        const { userPlayer, chosenAttribute } = req.body;

        if (!userPlayer || !chosenAttribute) {
            return res.status(400).json({ error: "userPlayer and chosenAttribute are required." });
        }

        if (!userPlayer.id || !userPlayer.name) {
            return res.status(400).json({ error: "userPlayer must contain 'id' and 'name'." });
        }

        // The auth middleware attaches the decoded Firebase token to req.user
        // Find the corresponding MongoDB User Document
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            return res.status(404).json({ error: "User not found in database. Please ensure you are fully registered." });
        }

        const result = await playMatch(user._id.toString(), userPlayer, chosenAttribute);
        const commentary = await generateCommentary(result.userPlayer, result.aiPlayer, chosenAttribute, result.counterAttr, result.outcome);
        
        return res.status(200).json({
            type: 'result',
            payload: {
                ...result,
                commentary
            }
        });
    } catch (error) {
        if (!res.headersSent) {
            if (error.message === "PLAYER_EXHAUSTED") {
                return res.status(400).json({ error: "Player exhausted. A 24-hour cooldown is active for this player card." });
            }
            console.error("Match error:", error);
            return res.status(500).json({ error: "Internal server error during matchup." });
        } else {
            console.error("Match error during streaming:", error);
            res.end();
        }
    }
};

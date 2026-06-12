import { GameHistory } from '../models/gameHistory.model.js';
import { User } from '../models/user.model.js';

export const getMatchHistory = async (req, res) => {
    try {
        const decodedToken = req.user;
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Fetch the 20 most recent games for this user
        const history = await GameHistory.find({ userPlayer: user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('systemPlayer winner createdAt');

        return res.status(200).json(history);
    } catch (error) {
        console.error("Get History Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

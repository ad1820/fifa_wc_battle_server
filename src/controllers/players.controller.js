import { fullPlayersMap } from '../services/playerStore.service.js';

let cachedMergedPlayers = null;

export const getAllPlayers = (req, res) => {
    try {
        if (cachedMergedPlayers) {
            return res.status(200).json(cachedMergedPlayers);
        }

        if (fullPlayersMap.size === 0) {
            return res.status(503).json({ message: "Players data is still loading." });
        }

        cachedMergedPlayers = Array.from(fullPlayersMap.values());
        
        // Sort alphabetically by name
        cachedMergedPlayers.sort((a, b) => a.name.localeCompare(b.name));

        return res.status(200).json(cachedMergedPlayers);
    } catch (error) {
        console.error("Error fetching merged players:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

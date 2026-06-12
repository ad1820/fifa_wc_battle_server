import { redisClient }       from '../config/redis.js';
import { User }              from '../models/user.model.js';
import { GameHistory }       from '../models/gameHistory.model.js';
import { getOpponentFor }    from './playerStore.service.js';

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  Main match engine
// ─────────────────────────────────────────────────────────────
export const playMatch = async (userId, userPlayer, chosenAttribute) => {
    if (!redisClient) throw new Error('Redis client not initialised.');

    // ── 1. 24-hour cooldown check ─────────────────────────────
    const cooldownKey  = `user:${userId}:cooldown:${userPlayer.id}`;
    const isCoolingDown = await redisClient.get(cooldownKey);
    if (isCoolingDown) throw new Error('PLAYER_EXHAUSTED');

    // Set cooldown immediately (24 h)
    await redisClient.set(cooldownKey, '1', { ex: 86400 });

    // ── 2. Pick opponent from the counter pool ─────────────────
    //  userPlayer[chosenAttribute] holds the stat value (e.g. ATT: 78)
    const userStatValue = Number(userPlayer[chosenAttribute]) || 50;
    const opponentData  = getOpponentFor(userPlayer.position, chosenAttribute, userStatValue);

    const aiPlayer      = opponentData.player;
    const aiStatValue   = opponentData.value;
    const counterAttr   = opponentData.attribute;   // e.g. "SAV"

    // ── 3. Win-probability engine ──────────────────────────────
    // Final chance is 50/50 for win/loss. With 10% draw margin, winChance = 45.
    let winChance = 45;

    // Streak buff / nerf
    const streakKey = `user:${userId}:streak`;
    const streakRaw = await redisClient.get(streakKey);
    let   streak    = streakRaw ? parseInt(streakRaw, 10) : 0;

    if      (streak >= 5)  winChance -= 25;   // hot-streak nerf
    else if (streak <= -3) winChance += 20;   // pity buff (keep negative streak for calculation only)

    // Clamp between 5 % and 85 %
    winChance = Math.max(5, Math.min(85, winChance));

    // ── 4. Three-way dice roll ─────────────────────────────────
    const roll  = Math.random() * 100;
    let outcome = 'LOSS';

    if      (roll <= winChance)              outcome = 'WIN';
    else if (roll <= winChance + 10)         outcome = 'DRAW';
    // else LOSS

    // ── 5. Update streak ──────────────────────────────────────
    if      (outcome === 'WIN')  streak  = streak < 0 ? 1 : streak + 1;
    else if (outcome === 'LOSS') streak  = 0;          // never goes negative
    // DRAW: freeze streak

    if (outcome !== 'DRAW') {
        await redisClient.set(streakKey, String(streak));
    }

    // ── 6. Persist to MongoDB ──────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
        await redisClient.del(cooldownKey);            // undo cooldown
        throw new Error('USER_NOT_FOUND');
    }

    // Chess.com style Elo system
    // K-factor is higher for lower ratings to help them climb faster, then stabilizes
    const K = user.current_xp < 500 ? 40 : 20;
    
    // We treat the stat-matched opponent as an equal rating match (E = 0.5)
    // Score (S): WIN = 1, DRAW = 0.5, LOSS = 0
    const S = outcome === 'WIN' ? 1 : outcome === 'DRAW' ? 0.5 : 0;
    
    const xpChange = Math.round(K * (S - 0.5));
    user.current_xp = Math.max(0, user.current_xp + xpChange);
    await user.save();

    // ── 7. Leaderboard ─────────────────────────────────────────
    await redisClient.zadd('global_leaderboard', {
        score:  user.current_xp,
        member: userId,
    });

    // ── 8. Game history ────────────────────────────────────────
    const winnerMap = { WIN: 'USER', DRAW: 'DRAW', LOSS: 'SYSTEM' };
    await GameHistory.create({
        userPlayer:   user._id,
        systemPlayer: aiPlayer.name,
        winner:       winnerMap[outcome],
    });

    // ── 9. Commentary is handled by the controller via stream ──
    return {
        outcome,
        userPlayer,
        aiPlayer,
        xpChange,
        newTotalXp: user.current_xp,
        currentStreak: streak,
        counterAttr,
    };
};

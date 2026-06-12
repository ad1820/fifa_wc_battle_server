import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonDir = path.join(__dirname, '../../json_attributes');

// ─────────────────────────────────────────────────────────────
//  In-memory player pools, keyed by attribute code
// ─────────────────────────────────────────────────────────────
export const playerStore = {
    // Outfield pools  (sorted ascending by stat value in the JSON files)
    ATT: [],   // outfield_attacking      → field key: "ATT"
    DEF: [],   // outfield_defensive      → field key: "DEF"
    TEC: [],   // outfield_technical      → field key: "TEC"
    TAC: [],   // outfield_tactical       → field key: "TAC"
    CRE: [],   // outfield_creativity     → field key: "CRE"

    // Goalkeeper pools
    SAV: [],   // gk_shot_saving          → field key: "SAV"
    ANT: [],   // gk_anticipation         → field key: "ANT"
    DIS: [],   // gk_distribution         → field key: "DIS"
    AER: [],   // gk_aerial_command       → field key: "AER"
    GKTAC: [], // gk_tactical             → field key: "TAC"
};

// ─────────────────────────────────────────────────────────────
//  The JSON field key each pool actually stores its rating in
// ─────────────────────────────────────────────────────────────
const POOL_FIELD = {
    ATT:   'ATT',
    DEF:   'DEF',
    TEC:   'TEC',
    TAC:   'TAC',
    CRE:   'CRE',
    SAV:   'SAV',
    ANT:   'ANT',
    DIS:   'DIS',
    AER:   'AER',
    GKTAC: 'TAC',   // gk_tactical.json stores the value under the key "TAC"
};

// ─────────────────────────────────────────────────────────────
//  Narrative labels used by the commentary service
// ─────────────────────────────────────────────────────────────
export const ATTRIBUTE_LABEL = {
    ATT:   'Attacking',
    DEF:   'Defending',
    TEC:   'Technical',
    TAC:   'Tactical',
    CRE:   'Creativity',
    SAV:   'Shot Saving',
    ANT:   'Anticipation',
    DIS:   'Distribution',
    AER:   'Aerial Command',
    GKTAC: 'GK Tactical',
};

// ─────────────────────────────────────────────────────────────
//  Position and attribute counter mapping
// ─────────────────────────────────────────────────────────────
export const COUNTERS = {
  FW: { // Forward
    ATT: ["DEF", "TAC", "ANT", "SAV"],
    CRE: ["TAC", "ANT"],
    TEC: ["DEF", "TAC", "ANT", "SAV"],
    TAC: ["TAC"],
  },

  MF: { // Midfielder
    ATT: ["DEF", "TAC", "ANT"],
    CRE: ["TAC", "ANT"],
    TEC: ["DEF", "TAC", "ANT"],
    TAC: ["TAC"],
  },

  DF: { // Defender
    DEF: ["ATT", "CRE", "TEC", "TAC"],
    TAC: ["CRE", "TEC", "TAC"],
  },

  GK: { // Goalkeeper
    AER: ["ATT", "CRE"],
    ANT: ["ATT", "CRE", "TEC"],
    DIS: ["ATT", "CRE", "TAC"], // Changed from BAL to DIS to match attributes
    SAV: ["ATT", "TEC"],
    TAC: ["ATT", "CRE", "TEC", "TAC"],
  }
};

// ─────────────────────────────────────────────────────────────
//  Load all JSON files into memory on startup
// ─────────────────────────────────────────────────────────────
export const fullPlayersMap = new Map();

export const loadPlayerStore = () => {
    try {
        playerStore.ATT   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_attacking.json'),   'utf8'));
        playerStore.DEF   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_defensive.json'),   'utf8'));
        playerStore.TEC   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_technical.json'),   'utf8'));
        playerStore.TAC   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_tactical.json'),    'utf8'));
        playerStore.CRE   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_creativity.json'),  'utf8'));

        playerStore.SAV   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'gk_shot_saving.json'),       'utf8'));
        playerStore.ANT   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'gk_anticipation.json'),      'utf8'));
        playerStore.DIS   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'gk_distribution.json'),      'utf8'));
        playerStore.AER   = JSON.parse(fs.readFileSync(path.join(jsonDir, 'gk_aerial_command.json'),    'utf8'));
        playerStore.GKTAC = JSON.parse(fs.readFileSync(path.join(jsonDir, 'gk_tactical.json'),          'utf8'));
        
        // Load the missing SHO pool to ensure full attributes if it exists
        try {
            playerStore.SHO = JSON.parse(fs.readFileSync(path.join(jsonDir, 'outfield_shooting.json'), 'utf8'));
        } catch (e) {
            playerStore.SHO = [];
        }

        console.log('✅ Player store loaded into memory.');

        // Build fullPlayersMap
        const mergeIntoMap = (array, poolKey) => {
            if (!array) return;
            array.forEach(player => {
                if (!fullPlayersMap.has(player.id)) {
                    fullPlayersMap.set(player.id, {
                        id: player.id,
                        name: player.name,
                        nation: player.nation,
                        position: player.position,
                        attributes: {}
                    });
                }
                const pObj = fullPlayersMap.get(player.id);
                for (const key in player) {
                    if (['id', 'name', 'nation', 'position'].includes(key)) continue;
                    if (typeof player[key] === 'number') {
                        if (poolKey === 'GKTAC' && key === 'TAC') {
                            pObj.attributes['GKTAC'] = player[key];
                        } else {
                            pObj.attributes[key] = player[key];
                        }
                    }
                }
            });
        };

        mergeIntoMap(playerStore.ATT, 'ATT');
        mergeIntoMap(playerStore.DEF, 'DEF');
        mergeIntoMap(playerStore.TEC, 'TEC');
        mergeIntoMap(playerStore.TAC, 'TAC');
        mergeIntoMap(playerStore.CRE, 'CRE');
        mergeIntoMap(playerStore.SHO, 'SHO');
        
        mergeIntoMap(playerStore.AER, 'AER');
        mergeIntoMap(playerStore.ANT, 'ANT');
        mergeIntoMap(playerStore.DIS, 'DIS');
        mergeIntoMap(playerStore.SAV, 'SAV');
        mergeIntoMap(playerStore.GKTAC, 'GKTAC');

    } catch (error) {
        console.error('❌ Failed to load player store JSON files:', error.message);
    }
};

// ─────────────────────────────────────────────────────────────
//  Return a fallback counter attribute code for a given attribute
// ─────────────────────────────────────────────────────────────
export const getCounterAttribute = (attribute) => {
    // Basic fallback if position-based mapping fails
    const fallback = {
        ATT: 'SAV', TEC: 'ANT', TAC: 'TAC', DEF: 'DIS', CRE: 'AER',
        SAV: 'ATT', ANT: 'TEC', DIS: 'DEF', AER: 'CRE'
    };
    return fallback[attribute] ?? 'SAV';
};

// ─────────────────────────────────────────────────────────────
//  Pick an opponent near the user's stat value from the
//  counter pool (+/- 5 points), picking randomly from all matches
// ─────────────────────────────────────────────────────────────
export const getOpponentFor = (userPosition, attribute, userStatValue) => {
    // Normalise position if needed, default to MF if missing
    let pos = userPosition || 'MF';
    if (!COUNTERS[pos]) {
        // Simple mapping if position is full name or unusual
        if (pos.includes('Forward') || ['ST', 'CF', 'RW', 'LW'].includes(pos)) pos = 'FW';
        else if (pos.includes('Defender') || ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(pos)) pos = 'DF';
        else if (pos.includes('Goalkeeper') || pos === 'GK') pos = 'GK';
        else pos = 'MF';
    }

    // Handle GK TAC which is stored under GKTAC in playerStore but passed as TAC
    // For user attribute, if user is GK and picks TAC, it's GKTAC under the hood.
    // Wait, the user attribute passed in is just what they chose. We assume it matches keys in COUNTERS.
    let searchAttribute = attribute;
    if (attribute === 'GKTAC') searchAttribute = 'TAC';

    const counterKeys = COUNTERS[pos]?.[searchAttribute] || [getCounterAttribute(attribute)];

    let tempArray = [];

    for (let counterKey of counterKeys) {
        // If the pool is TAC but we are finding a GK counter, we should ideally use GKTAC.
        // But the mapping from user is generic. We'll use the outfield TAC.
        // If you meant GK tactical, it would be GKTAC. We'll use the exact key, except map BAL to DIS if it slips through.
        if (counterKey === 'BAL') counterKey = 'DIS';

        const pool = playerStore[counterKey];
        if (!pool || pool.length === 0) continue;

        const fieldKey = POOL_FIELD[counterKey] || counterKey;

        // Find all players within +/- 5
        const minVal = userStatValue - 5;
        const maxVal = userStatValue + 5;

        // Filter valid players
        const validPlayers = pool.filter(p => {
            const val = p[fieldKey] ?? 0;
            return val >= minVal && val <= maxVal;
        });

        for (const player of validPlayers) {
            tempArray.push({
                player: player,
                attribute: counterKey,
                fieldKey: fieldKey,
                value: player[fieldKey] ?? 0
            });
        }
    }

    if (tempArray.length > 0) {
        // Randomly choose from all eligible opponents across all valid counter attributes
        const picked = tempArray[Math.floor(Math.random() * tempArray.length)];
        picked.player = fullPlayersMap.get(picked.player.id) || picked.player;
        return picked;
    }

    // Fallback if no players found in +/- 5 range: just find the closest player in the first pool
    const fallbackKey = counterKeys[0] === 'BAL' ? 'DIS' : counterKeys[0];
    const pool = playerStore[fallbackKey] || playerStore['SAV'];
    const fieldKey = POOL_FIELD[fallbackKey] || fallbackKey;
    
    let lo = 0, hi = pool.length - 1, closestIdx = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const midVal = pool[mid][fieldKey] ?? 0;

        if (midVal === userStatValue) { closestIdx = mid; break; }
        if (midVal < userStatValue) { closestIdx = mid; lo = mid + 1; }
        else { hi = mid - 1; }
    }

    const start = Math.max(0, closestIdx - 5);
    const end = Math.min(pool.length, closestIdx + 5);
    const candidates = pool.slice(start, end);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    return {
        player: fullPlayersMap.get(picked.id) || picked,
        attribute: fallbackKey,
        fieldKey: fieldKey,
        value: picked[fieldKey] ?? 0,
    };
};

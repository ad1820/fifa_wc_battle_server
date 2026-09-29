import { ChatOpenAI } from '@langchain/openai';

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const isKeeper = (player) => player?.position === 'GK';
const nameOf = (player, fallback) => player?.name?.trim() || fallback;
const recentCalls = [];
let llm = null;
let activeProvider = null;
const COMMENTARY_TIMEOUT_MS = Number(process.env.COMMENTARY_TIMEOUT_MS || 8000);

const invokeWithTimeout = (prompt, timeoutMs) => {
    const controller = new AbortController();
    let timeoutId;

    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`LLM request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([llm.invoke(prompt, {
        signal: controller.signal,
        reasoningEffort: 'low',
    }), timeout])
        .finally(() => clearTimeout(timeoutId));
};

export const initializeAI = () => {
    const provider = process.env.GROQ_API_KEY
        ? {
            name: 'Groq',
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        }
        : process.env.NVIDIA_API_KEY
            ? {
                name: 'NVIDIA',
                apiKey: process.env.NVIDIA_API_KEY,
                baseURL: 'https://integrate.api.nvidia.com/v1',
                model: process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-nano-8b-v1',
            }
            : null;

    if (!provider) {
        llm = null;
        activeProvider = null;
        console.warn('GROQ_API_KEY and NVIDIA_API_KEY missing - using varied local commentary.');
        return;
    }

    llm = new ChatOpenAI({
        apiKey: provider.apiKey,
        configuration: { baseURL: provider.baseURL },
        model: provider.model,
        temperature: 1,
        topP: 0.9,
        maxTokens: 350,
    });
    activeProvider = { name: provider.name, model: provider.model };
    console.log(`AI commentary enabled with ${provider.name} (${provider.model}).`);
};

export const checkCommentaryHealth = async (timeoutMs) => {
    if (!llm || !activeProvider) throw new Error('AI commentary is not configured.');

    const response = await invokeWithTimeout('Reply with OK only.', timeoutMs);
    if (!cleanAIResponse(response?.content)) throw new Error('AI commentary returned an empty response.');

    return activeProvider;
};

const remember = (line) => {
    recentCalls.push(line);
    if (recentCalls.length > 40) recentCalls.shift();
    return line;
};

const wordsOf = (line) => String(line).toLowerCase().match(/[a-z0-9]+/g) || [];

const isTooSimilar = (line) => {
    const candidate = new Set(wordsOf(line));
    if (!candidate.size) return true;

    return recentCalls.some((recent) => {
        const previous = new Set(wordsOf(recent));
        const shared = [...candidate].filter((word) => previous.has(word)).length;
        const union = new Set([...candidate, ...previous]).size;
        return union > 0 && shared / union >= 0.62;
    });
};

const describeEvent = (user, opponent, outcome, attribute) => {
    const userWon = outcome === 'WIN';
    if (outcome === 'DRAW') return pick(['a last-minute chance flashes wide', 'both players cancel each other out', 'a final attack is blocked on the line']);

    if (isKeeper(user) || isKeeper(opponent)) {
        const keeper = isKeeper(user) ? user : opponent;
        const attacker = isKeeper(user) ? opponent : user;
        const keeperWon = isKeeper(user) ? userWon : !userWon;
        return keeperWon
            ? `${nameOf(attacker, 'the attacker')} is denied by ${nameOf(keeper, 'the keeper')} with ${pick(['a fingertip save', 'a brave one-on-one stop', 'a full-stretch dive', 'a sharp reflex block'])}`
            : `${nameOf(attacker, 'the attacker')} beats ${nameOf(keeper, 'the keeper')} with ${pick(['a cheeky Panenka', 'a finish through the legs', 'a curled shot into the top corner', 'a delayed finish after sending the keeper early', 'a thunderous strike off the bar'])}`;
    }

    const winner = nameOf(userWon ? user : opponent, 'the winner');
    const loser = nameOf(userWon ? opponent : user, 'the opponent');
    const moments = {
        ATT: ['a ruthless first-time finish', 'a fierce strike into the roof of the net', 'a perfectly placed finish'],
        CRE: ['an outrageous defence-splitting pass', 'a disguised final ball', 'a clever flick that opens the defence'],
        TEC: ['a nutmeg and a silky finish', 'a sharp turn that leaves the defender frozen', 'a dazzling piece of close control'],
        DEF: ['a perfectly timed last-ditch tackle', 'a goal-line clearance', 'a crunching but clean interception'],
        TAC: ['a perfectly read run', 'a pressing trap executed to perfection', 'a clever move that catches the rival cold'],
    };
    return `${winner} beats ${loser} with ${pick(moments[attribute] || ['one decisive moment'])}`;
};

const localCommentary = (user, opponent, outcome, event) => {
    const winner = nameOf(outcome === 'WIN' ? user : opponent, 'The winner');
    const loser = nameOf(outcome === 'WIN' ? opponent : user, 'the opponent');
    const eventCall = `${event.charAt(0).toUpperCase()}${event.slice(1)}!`;
    if (outcome === 'DRAW') return pick([
        `${eventCall} The final whistle finds them inseparable after a contest that refused to settle.`,
        `Nothing between them! ${eventCall} Both players leave everything on the pitch.`,
        `${eventCall} The tension breaks, but the deadlock does not. What a battle.`,
        `So close to a winner, yet neither gives way. ${eventCall}`,
        `${eventCall} A breathless finish, a hard-earned draw, and no complaints from either side.`,
    ]);

    return pick([
        `${eventCall} ${winner} seizes the moment, and ${loser} can only watch the celebration begin.`,
        `The pressure peaks, the chance arrives, and ${winner} delivers! ${eventCall}`,
        `${winner} has turned this duel into a showstopper. ${eventCall}`,
        `Listen to that roar! ${eventCall} ${winner} has produced the decisive flash of brilliance.`,
        `${eventCall} Cool head, fearless execution, unforgettable finish from ${winner}.`,
        `Out of nowhere, the game catches fire! ${eventCall} ${winner} owns the moment.`,
        `${loser} was ready for everything except that. ${eventCall} Magnificent from ${winner}!`,
        `One opening, one heartbeat, one ruthless answer. ${eventCall} ${winner} takes it.`,
    ]);
};

const variedLocalCommentary = (user, opponent, outcome, event) => {
    let line;
    for (let attempt = 0; attempt < 6; attempt += 1) {
        line = localCommentary(user, opponent, outcome, event);
        if (!isTooSimilar(line)) return line;
    }
    return line;
};

const cleanAIResponse = (content) => String(content || '')
    .replace(/^['"“]|['"”]$/g, '')
    .replace(/^(commentary|commentator):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

export const generateCommentary = async (userPlayer, aiPlayer, userAttr, counterAttr, outcome) => {
    const event = describeEvent(userPlayer, aiPlayer, outcome, userAttr);
    const fallback = variedLocalCommentary(userPlayer, aiPlayer, outcome, event);
    if (!llm) return remember(fallback);

    const styles = [
        'breathless radio call with a sudden explosive finish',
        'slow-building tension followed by an emotional release',
        'sharp, punchy television commentary with vivid action verbs',
        'cinematic match narration focused on pressure and atmosphere',
        'astonished live reaction that feels spontaneous and unscripted',
        'confident tactical observation that erupts into celebration',
    ];

    try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const recentExamples = recentCalls.length
                ? recentCalls.slice(-6).map((line) => `- ${line}`).join('\n')
                : '- None yet';
            const prompt = `Create original live football video-game commentary for this exact moment: ${event}.
Result: ${outcome} for ${nameOf(userPlayer, 'the user')}. The opponent is ${nameOf(aiPlayer, 'the opponent')}.
Delivery style: ${pick(styles)}.

Write 25-65 words in 1-4 sentences. Build drama around the action, tension, crowd, momentum, or emotion. Use player names naturally, not mechanically. Vary the opening, sentence length, imagery, and final beat. Do not invent scores or match facts.

Never mention ratings, attribute codes (${userAttr}/${counterAttr}), prompts, AI, or "FC27". Avoid famous commentary catchphrases and generic endings such as "pure theatre", "ice in the veins", or "makes the moment count".

Do not reuse the wording, structure, opening, or ending of these recent calls:
${recentExamples}

Return only the commentary. Creative seed: ${Date.now()}-${attempt}-${Math.random().toString(36).slice(2)}.`;
            const response = await invokeWithTimeout(prompt, COMMENTARY_TIMEOUT_MS);
            const line = cleanAIResponse(response?.content);
            const wordCount = wordsOf(line).length;
            if (wordCount >= 10 && wordCount < 100 && !isTooSimilar(line)) return remember(line);
        }
    } catch (error) {
        console.error('Commentary generation failed:', error.message);
    }

    return remember(fallback);
};

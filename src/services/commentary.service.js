import { ChatOpenAI } from '@langchain/openai';

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const isKeeper = (player) => player?.position === 'GK';
const nameOf = (player, fallback) => player?.name?.trim() || fallback;
const recentCalls = [];
let llm = null;
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

    return Promise.race([llm.invoke(prompt, { signal: controller.signal }), timeout])
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
        console.warn('GROQ_API_KEY and NVIDIA_API_KEY missing - using varied local commentary.');
        return;
    }

    llm = new ChatOpenAI({
        apiKey: provider.apiKey,
        configuration: { baseURL: provider.baseURL },
        model: provider.model,
        temperature: 1,
        topP: 0.9,
        maxTokens: 70,
    });
    console.log(`AI commentary enabled with ${provider.name} (${provider.model}).`);
};

const remember = (line) => {
    recentCalls.push(line.toLowerCase().replace(/[^a-z0-9 ]/g, ''));
    if (recentCalls.length > 40) recentCalls.shift();
    return line;
};

const wasRecentlyUsed = (line) => recentCalls.includes(line.toLowerCase().replace(/[^a-z0-9 ]/g, ''));

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
    const eventCall = `${event.charAt(0).toUpperCase()}${event.slice(1)}!`;
    if (outcome === 'DRAW') return `${eventCall} ${pick(['No winner under the lights.', 'Neither side gives an inch.', 'The whistle ends a breathless battle.'])}`;

    return `${eventCall} ${pick([
        `${winner}—oh, that is outrageous!`,
        `${winner} makes the moment count!`,
        `Would you believe it? ${winner} delivers!`,
        `${winner}, with ice in the veins!`,
        `That is pure theatre from ${winner}!`,
    ])}`;
};

const cleanAIResponse = (content) => String(content || '')
    .replace(/^['"“]|['"”]$/g, '')
    .replace(/^(commentary|commentator):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

export const generateCommentary = async (userPlayer, aiPlayer, userAttr, counterAttr, outcome) => {
    const event = describeEvent(userPlayer, aiPlayer, outcome, userAttr);
    const fallback = localCommentary(userPlayer, aiPlayer, outcome, event);
    if (!llm) return remember(fallback);

    const prompt = `Write one short live football video-game commentary call about this exact moment: ${event}.
Result: ${outcome} for ${nameOf(userPlayer, 'the user')}. Attribute clash: ${userAttr} against ${counterAttr}.
Use both player names when natural. Sound spontaneous, dramatic and conversational. Vary sentence rhythm and vocabulary. Maximum 28 words and 2 sentences. Never mention ratings, attribute codes, the prompt, or "FC27". Do not copy familiar real-world commentary catchphrases.
Creative variation token: ${Date.now()}-${Math.random().toString(36).slice(2)}.`;

    try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const response = await invokeWithTimeout(prompt, COMMENTARY_TIMEOUT_MS);
            const line = cleanAIResponse(response?.content);
            if (line && line.split(/\s+/).length <= 34 && !wasRecentlyUsed(line)) return remember(line);
        }
    } catch (error) {
        console.error('Commentary generation failed:', error.message);
    }

    return remember(fallback);
};

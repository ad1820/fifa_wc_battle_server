import { ChatOpenAI } from '@langchain/openai';
import { ATTRIBUTE_LABEL } from './playerStore.service.js';

// ─────────────────────────────────────────────────────────────
//  Scenario templates – what physically happens on the pitch
//  when a given attribute clash plays out
// ─────────────────────────────────────────────────────────────
const SCENARIO = {
    ATT_SAV: { action: 'clinical, powerful shot', defender: 'diving save', arena: 'penalty area' },
    TEC_ANT: { action: 'mazy, step-over dribble', defender: 'anticipates and intercepts', arena: 'midfield corridor' },
    TAC_GKTAC: { action: 'perfectly-timed attacking run', defender: 'reads the run and claims the ball', arena: 'box' },
    DEF_DIS: { action: 'defensive block', defender: 'sharp distribution launches a counter', arena: 'own half' },
    CRE_AER: { action: 'whipped cross into the box', defender: 'commanding aerial punch', arena: 'six-yard box' },
    // Reverse (GK picks)
    SAV_ATT: { action: 'reaction save', defender: 'powerful follow-up header', arena: 'goal mouth' },
    ANT_TEC: { action: 'reading pass', defender: 'dancing through with footwork', arena: 'midfield' },
    GKTAC_TAC: { action: 'sweeper-keeper rush', defender: 'tactical press wins the ball', arena: 'halfway line' },
    DIS_DEF: { action: 'precise long distribution', defender: 'reads every bounce', arena: 'defensive third' },
    AER_CRE: { action: 'aerial dominance claim', defender: 'creative flick-on', arena: 'far post' },
};

const getScenarioKey = (userAttr, counterAttr) => `${userAttr}_${counterAttr}`;

// ─────────────────────────────────────────────────────────────
//  One dramatic example per outcome to seed the AI's tone
// ─────────────────────────────────────────────────────────────
const WIN_EXAMPLE = `Mbappé burst into the box like lightning, cut inside the last defender and unleashed a thunderbolt into the top-right corner before the goalkeeper could even blink. The net rippled. The stadium shook. Fifty thousand voices became one.`;

const LOSS_EXAMPLE = `Vitinha shaped to shoot from twenty-five yards, the whole stadium held its breath — but Lukáš Horníček had already read every pixel of that motion, springing full-stretch to his left and clawing the ball away with one iron fist. Vitinha stood motionless. His moment was gone. The keeper roared at the sky.`;

const DRAW_EXAMPLE = `Neither man would yield an inch. The attacker came at him twice, three times, yet every time the goalkeeper spread himself wide and forced the ball out for a corner. When the final whistle blew, both men stared at each other — exhausted, grudging, respectful.`;

let llm = null;

// ─────────────────────────────────────────────────────────────
//  Initialise the LangChain / OpenAI model
// ─────────────────────────────────────────────────────────────
export const initializeAI = () => {
    if (!process.env.NVIDIA_API_KEY) {
        console.warn('⚠️  NVIDIA_API_KEY missing – commentary will use fallback text.');
        return;
    }

    try {
        llm = new ChatOpenAI({
            apiKey: process.env.NVIDIA_API_KEY,
            configuration: {
                baseURL: 'https://integrate.api.nvidia.com/v1',
            },
            model: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
            temperature: 0.80,
            topP: 0.01,
            maxTokens: 500
        });
        console.log('✅ LangChain Commentary Agent initialised (Nvidia Nemotron Nano 8b).');
    } catch (err) {
        console.error('❌ Failed to initialise LangChain:', err.message);
    }
};

// ─────────────────────────────────────────────────────────────
//  Build a concise fallback that is already exciting and clean
// ─────────────────────────────────────────────────────────────
const buildFallback = (userPlayer, aiPlayer, outcome) => {
    if (outcome === 'WIN') return `${userPlayer.name} left ${aiPlayer.name} in the dust and walked away with all three points. A statement performance.`;
    if (outcome === 'DRAW') return `${userPlayer.name} and ${aiPlayer.name} pushed each other to the absolute limit and left the pitch sharing the spoils. Neither deserved to lose.`;
    return `${aiPlayer.name} proved too strong today. ${userPlayer.name} gave everything but the result is brutal — nothing to show for it.`;
};

// ─────────────────────────────────────────────────────────────
//  Main commentary generator
// ─────────────────────────────────────────────────────────────
export const generateCommentary = async (userPlayer, aiPlayer, userAttr, counterAttr, outcome) => {
    const fallback = buildFallback(userPlayer, aiPlayer, outcome);

    if (!llm) {
        return fallback;
    }

    const scenarioKey = getScenarioKey(userAttr, counterAttr);
    const scene = SCENARIO[scenarioKey] ?? { action: 'decisive moment', defender: 'heroic intervention', arena: 'the pitch' };

    const outcomeExample = outcome === 'WIN' ? WIN_EXAMPLE : outcome === 'DRAW' ? DRAW_EXAMPLE : LOSS_EXAMPLE;

    const prompt = `You are the most electrifying and poetic football commentator alive — think Peter Drury at his absolute peak, but fused with a bit of cheeky, heavy banter. You live for these dramatic moments, and you aren't afraid to lightly mock the loser.

TONE EXAMPLE (study and copy this exact style and length):
"${outcomeExample}"

THE MATCH SITUATION:
- Player in question: ${userPlayer.name} (${userPlayer.nation}, ${userPlayer.position ?? 'outfield'})
- Opponent: ${aiPlayer.name} (${aiPlayer.nation}, ${aiPlayer.position ?? 'GK'})
- The physical battle: a ${scene.action} in the ${scene.arena}, met with a ${scene.defender}
- Final outcome: ${outcome} for ${userPlayer.name}

YOUR TASK:
Write EXACTLY 5 to 6 punchy, vivid sentences of live match commentary describing this moment physically — from the poetic build-up of tension, through the breathtaking moment of action, to the stadium's erupting reaction. Add a splash of heavy, cheeky banter directed at the player who came up short.

STRICT RULES:
1. Do NOT mention any numbers, ratings, stats, or attribute codes (ATT, SAV, TEC, 90, etc.)
2. Do NOT use generic phrases like "in a gripping fixture" or "outclassed" — be specific and visual
3. DO use the players' real names naturally throughout
4. DO describe the physical action happening on the pitch as if it's live television

Begin the commentary now:`;

    try {
        const response = await llm.invoke(prompt);
        if (response?.content) {
            return response.content;
        }
        console.warn('⚠️  LLM returned empty response, using fallback.');
        return fallback;
    } catch (err) {
        console.error('❌ Commentary generation failed:', err.message);
        return fallback;
    }
};

import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';
import { checkCommentaryHealth } from '../services/commentary.service.js';

const HEALTH_CHECK_TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 5000);

const withTimeout = (promise, service) => {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error(`${service} health check timed out.`)),
            HEALTH_CHECK_TIMEOUT_MS,
        );
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const runCheck = async (name, check) => {
    const startedAt = Date.now();

    try {
        const details = await check();
        return [name, {
            status: 'up',
            latencyMs: Date.now() - startedAt,
            ...(details || {}),
        }];
    } catch (error) {
        console.error(`${name} health check failed:`, error.message);
        return [name, {
            status: 'down',
            latencyMs: Date.now() - startedAt,
        }];
    }
};

export const getHealth = async (req, res) => {
    const checks = Object.fromEntries(await Promise.all([
        runCheck('backend', async () => ({ uptimeSeconds: Math.floor(process.uptime()) })),
        runCheck('database', async () => {
            if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
                throw new Error('MongoDB is not connected.');
            }
            await withTimeout(mongoose.connection.db.admin().ping(), 'Database');
            return { provider: 'MongoDB' };
        }),
        runCheck('redis', async () => {
            if (!redisClient) throw new Error('Redis is not configured.');
            await withTimeout(redisClient.ping(), 'Redis');
            return { provider: 'Upstash Redis' };
        }),
        runCheck('llm', async () => {
            const provider = await checkCommentaryHealth(HEALTH_CHECK_TIMEOUT_MS);
            return { provider: provider.name, model: provider.model };
        }),
    ]));

    const healthy = Object.values(checks).every((check) => check.status === 'up');

    return res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        checks,
    });
};

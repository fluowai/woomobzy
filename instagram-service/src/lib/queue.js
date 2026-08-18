import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

export const instagramQueue = new Queue('instagram-worker-tasks', {
  connection: redisUrl,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

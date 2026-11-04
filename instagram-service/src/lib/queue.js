import { Queue } from 'bullmq';
import { redisConfig } from '../index.js';

export const instagramQueue = new Queue('instagram-worker-tasks', {
  connection: redisConfig.connection,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

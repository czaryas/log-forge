import { Queue } from 'bullmq';
import { redisConfig } from '../../config/redisConfig';


export const logProcessingQueue = new Queue('log-processing-queue',{
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
          },
    },
    
})
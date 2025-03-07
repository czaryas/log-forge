// // server/worker.ts or scripts/start-worker.ts
// import { WorkerManager } from '../lib/bullmq/worker';

// async function startWorker() {
//   try {
//     console.log('Starting BullMQ Worker...');
    
//     const worker = WorkerManager.startBackgroundService();
    
//     console.log('Worker initialized successfully');
//   } catch (error) {
//     console.error('Failed to start worker:', error);
//     process.exit(1);
//   }
// }

// // Allow direct script execution
// if (require.main === module) {
//   startWorker();
// }

// export default startWorker;
// tests/logProcessingWorker.test.ts
import { jest } from '@jest/globals';
import { describe, it, expect } from '@jest/globals';
import { logProcessingWorker } from '../lib/bullmq/worker';
import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
  }),
}));

describe('logProcessingWorker', () => {
  it('processes a log file successfully', async () => {
    const job: Job = {
      data: {
        fileId: 'file-123',
        filePath: '/path/to/file',
        userId: 'user-123',
        fileName: 'file-name.txt',
      },
    };

    await logProcessingWorker(job);

    expect(console.log).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenCalledWith('process.env.SUPABASE_URL', process.env.SUPABASE_URL);
    expect(console.log).toHaveBeenCalledWith('process.env.NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(console.log).toHaveBeenCalledWith(`Log file ${job.data.fileName} processed successfully`);
  });

  it('handles a failed job', async () => {
    const job: Job = {
      data: {
        fileId: 'file-123',
        filePath: '/path/to/file',
        userId: 'user-123',
        fileName: 'file-name.txt',
      },
    };

    const error: Error = new Error('Mock error');
    logProcessingWorker.on('failed', async (job: Job, err: Error) => {
      expect(job).toBe(job);
      expect(err).toBe(error);
      console.error(`Job ${job.id} failed:`, err);
    });

    await logProcessingWorker(job);
    await logProcessingWorker.emit('failed', job, error);
  });
});
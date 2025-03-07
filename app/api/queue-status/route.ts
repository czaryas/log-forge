// app/api/queue-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logProcessingQueue } from '@/lib/bullmq/queue';

export async function GET(request: NextRequest) {
  try {

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      logProcessingQueue.getWaitingCount(),
      logProcessingQueue.getActiveCount(),
      logProcessingQueue.getCompletedCount(),
      logProcessingQueue.getFailedCount(),
      logProcessingQueue.getDelayedCount()
    ]);

    return NextResponse.json({
      waiting,
      active,
      completed,
      failed,
      delayed
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue status' }, 
      { status: 500 }
    );
  }
}
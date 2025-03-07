import { NextRequest } from "next/server";
import { QueueEvents } from "bullmq";
import { redisConfig } from '@/config/redisConfig';
import {logProcessingQueue} from "@/lib/bullmq/queue"

const queueEvents = new QueueEvents('log-processing-queue',{
  connection: redisConfig
});

export const dynamic = 'force-dynamic';

export async function GET(req:NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Function to send data to client
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial stats
      const jobCounts = await logProcessingQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
      sendEvent('stats', jobCounts);

      // Set up event listeners for real-time updates
      queueEvents.on('completed', async ({ jobId }) => {
        const jobCounts = await logProcessingQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
        sendEvent('stats', { ...jobCounts, lastCompleted: jobId });
      });

      queueEvents.on('failed', async ({ jobId, failedReason }) => {
        const jobCounts = await logProcessingQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
        sendEvent('stats', { ...jobCounts, lastFailed: jobId, failedReason });
      });

      queueEvents.on('active', async ({ jobId }) => {
        const jobCounts = await logProcessingQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
        sendEvent('stats', { ...jobCounts, lastActive: jobId });
      });

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        queueEvents.removeAllListeners();
        controller.close();
      });

      // Keep connection alive with a ping every 30 seconds
      const pingInterval = setInterval(() => {
        sendEvent('ping', { time: new Date().toISOString() });
      }, 30000);

      // Clean up ping interval on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}


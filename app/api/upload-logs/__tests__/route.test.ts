import { NextRequest, NextResponse } from "next/server";
import { POST } from '@/app/api/upload-logs/route';
import { logProcessingQueue } from '@/lib/bullmq/queue';

jest.mock('@/lib/bullmq/queue', () => ({
    logProcessingQueue: {
      add: jest.fn().mockResolvedValue({ id: 'mocked-job-id' }),
    },
}));


jest.mock('fs', () => ({
    mkdirSync: jest.fn(),
}));

  
jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
}));
  
jest.mock('crypto', () => ({
    randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

describe('upload logs API', () => {
    it('should process file and queue it for processing', async()=>{
        const file = new File(['test content'], 'test.log', { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', file);
    
        const request = new NextRequest('http://localhost:3000/api/upload-logs', {
            method: 'POST',
            body: formData,
        });

        const response = await POST(request, {} as NextResponse);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({
            jobId: 'mocked-job-id',
            message: 'File queued for processing',
        });
        expect(logProcessingQueue.add).toHaveBeenCalled();
    })

  
})

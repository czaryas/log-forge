import { LogProcessor } from '../LogProcessor';
import * as fs from 'fs';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { Result } from 'postcss';
import { EventEmitter } from 'events';

class MockReadStream extends EventEmitter {
    on(event:any, callback:any) {
      super.on(event, callback);
      return this;
    }
    
    pipe(dest:any) {
      return dest;
    }
    
    close() {}
}
  
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    createReadStream: jest.fn().mockImplementation(() => {
      return new MockReadStream();
    }),
    unlinkSync: jest.fn()
}));
  
  // Mock readline directly
  jest.mock('readline', () => ({
    createInterface: jest.fn().mockImplementation(({ input }) => {
      const mockInterface = {
        close: jest.fn(),
        [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
          // Default empty implementation, will be overridden in tests
        })
      };
      return mockInterface;
    })
  }));

describe('LogProcessor', ()=>{

    let logProcessor: LogProcessor;
    const mockKeywords = ['error', 'security', 'breach'];
  
    beforeEach(() => {
        logProcessor = new LogProcessor(mockKeywords);
        jest.clearAllMocks();
    });

    describe('parseLognEntry',()=>{
        test('should correct parse a log entry with timestamp, level & JSON payload', ()=>{

            const logLine = '[2023-07-25T10:15:30.123Z] ERROR Failed to authenticate {"ip":"192.168.1.1","userId":"123"}';
            const result = logProcessor.parseLogEntry(logLine);
            expect(result).toEqual({
                timestamp: '2023-07-25T10:15:30.123Z',
                level: 'ERROR',
                message: logLine,
                payload: {
                  ip: '192.168.1.1',
                  userId: '123'
                }
              });
        })

        test('should handle log entry without timestamp', ()=>{
            const logLine = 'ERROR Failed to authenticate {"ip":"192.168.1.1"}';
            const result = logProcessor.parseLogEntry(logLine);
            expect(result).toEqual({
                timestamp: null,
                level: 'ERROR',
                message: logLine,
                payload: {
                    ip: '192.168.1.1'
                }
            })
        })
    });

    
    
})
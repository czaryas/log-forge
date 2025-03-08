import { LogProcessor } from '../LogProcessor';
import { LogEntry } from '@/interfaces';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn().mockReturnThis(),
      download: jest.fn(),
      remove: jest.fn()
    }
  }))
}));

jest.mock('../../config', () => ({
  config: {
    monitorKeywords: ['authentication', 'error', 'memory'],
    supabaseUrl: 'https://mock-url.supabase.co',
    supabaseAnonKey: 'mock-key'
  }
}));

describe('LogProcessor', () => {
  let logProcessor: LogProcessor;
  let mockSupabaseClient: any;

  beforeEach(() => {
    logProcessor = new LogProcessor([]);

  });

  describe('parseLogEntry', () => {
    it('should correctly parse a standard log entry with timestamp, level and JSON payload', () => {
      const logLine = '[2023-05-15T14:30:45.123Z] ERROR Failed to authenticate user {"userId": "123", "ip": "192.168.1.1"}';
      
      const result: LogEntry = logProcessor.parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: '2023-05-15T14:30:45.123Z',
        level: 'ERROR',
        message: logLine,
        payload: {
          userId: '123',
          ip: '192.168.1.1'
        }
      });
    });

    it('should handle log entries without timestamp', () => {
      const logLine = 'WARN System running low on memory {"available": "120MB"}';
      
      const result = logProcessor.parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: null,
        level: 'WARN',
        message: logLine,
        payload: {
          available: '120MB'
        }
      });
    });

    it('should handle log entries without JSON payload', () => {
      const logLine = '[2023-05-15T15:00:00.000Z] INFO Server started successfully';
      
      const result = logProcessor.parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: '2023-05-15T15:00:00.000Z',
        level: 'INFO',
        message: logLine,
        payload: null
      });
    });

    it('should set level to UNKNOWN when no level is found', () => {
      const logLine = 'This is just some text without proper log format';
      
      const result = logProcessor.parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: null,
        level: 'UNKNOWN',
        message: logLine,
        payload: null
      });
    });

    it('should handle malformed JSON payloads gracefully', () => {
      const logLine = '[2023-05-15T16:20:10.456Z] ERROR Database connection failed {"error": "timeout", "attempts": 3,}';
      
      const result = logProcessor.parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: '2023-05-15T16:20:10.456Z',
        level: 'ERROR',
        message: logLine,
        payload: null
      });
    });
  });
});
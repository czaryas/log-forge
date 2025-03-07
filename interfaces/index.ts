


  export interface LogStats {
    id?: string | null; 
    job_id?: string;
    file_name?: string;
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    ipAddresses: string[];
    keywordMatches: Record<string, number>;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: string | null;
    userId?: string;
}
  
export interface QueueStatus {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }



export interface LogEntry{
    timestamp: string | null;
    level: string;
    message: string;
    payload: any | null;
}

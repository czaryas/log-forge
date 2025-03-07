import dotenv from 'dotenv';
dotenv.config();

export const config = {
  
  // Supabase configuration
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Worker configuration
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 4),
  deleteFilesAfterProcessing: process.env.DELETE_FILES_AFTER_PROCESSING === 'true',
  
  // Log processing configuration
  monitorKeywords: process.env.MONITOR_KEYWORDS?.split(',') || []
};
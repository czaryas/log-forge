import * as readline from "readline";
import { Readable } from "stream";
import { config } from "../config";
import { LogStats, LogEntry } from "@/interfaces";
import { createClient } from "@supabase/supabase-js";

export class LogProcessor {
  private monitorKeywords: string[];
  private supabase;

  constructor(monitorKeywords = config.monitorKeywords) {
    this.monitorKeywords = monitorKeywords;
    this.supabase =  createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async processLogFile(fileUrl: string): Promise<LogStats> {
    const stats: LogStats = {
      id: null,
      totalEntries: 0,
      errorCount: 0,
      warningCount: 0,
      ipAddresses: [],
      keywordMatches: {},
    };

    try {
      const bucketName = "logs";
      const fileName = fileUrl.split('/').pop();
      
      if (!fileName) {
        throw new Error("Invalid file URL");
      }

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .download(fileName);
      
      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }
      
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileStream = Readable.from(buffer);
      
      let remainder = '';
      const chunkSize = 64 * 1024; // 64KB chunks
      const chunks: Buffer[] = [];
      
      for await (const chunk of fileStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        
        if (Buffer.concat(chunks).length >= chunkSize) {
          const buffer = Buffer.concat(chunks);
          const content = remainder + buffer.toString('utf-8');
          const lines = content.split(/\r?\n/);
          
          remainder = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue; 
            await this.processLine(line, stats);
          }
          
          chunks.length = 0;
        }
      }
      
      // Process any remaining data
      if (chunks.length > 0 || remainder) {
        const buffer = Buffer.concat(chunks);
        const content = remainder + buffer.toString('utf-8');
        const lines = content.split(/\r?\n/);
        
        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          await this.processLine(line, stats);
        }
      }
      
    } catch (error) {
      console.error("Error processing log file:", error);
      throw error;
    }

    return stats;
  }
  
  private async processLine(line: string, stats: LogStats): Promise<void> {
    stats.totalEntries++;
    const logEntry = this.parseLogEntry(line);
    if (logEntry.level === "ERROR") stats.errorCount++;
    if (logEntry.level === "WARN") stats.warningCount++;

    if (logEntry.payload?.ip) {
      stats.ipAddresses.push(logEntry.payload.ip);
    }

    this.monitorKeywords.forEach((keyword) => {
      if (line.includes(keyword)) {
        stats.keywordMatches[keyword] =
          (stats.keywordMatches[keyword] || 0) + 1;
      }
    });
  }

  parseLogEntry(line: string): LogEntry {
    const timestampMatch = line.match(/^\[(.+?)\]/);
    
    let level = "UNKNOWN";
    let levelMatch = null;
    
    if (timestampMatch) {
        levelMatch = line.match(/\] (\w+) /);
        if (levelMatch) {
            level = levelMatch[1];
        }
    } else {
        levelMatch = line.match(/^(\w+)/);
        if (levelMatch && ["INFO", "ERROR", "WARN", "DEBUG"].includes(levelMatch[1])) {
            level = levelMatch[1];
        }
    }
    
    const jsonMatch = line.match(/\{.*\}$/);
    let payload = null;
    if (jsonMatch) {
        try {
            payload = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.warn(`Failed to parse JSON in log entry: ${jsonMatch[0]}`);
        }
    }
    
    return {
        timestamp: timestampMatch ? timestampMatch[1] : null,
        level: level,
        message: line,
        payload,
    };
  }

  async cleanupFile(fileUrl: string): Promise<void> {
    try {
      // Extract the file name from the URL
      const bucketName = "logs";
      const fileName = fileUrl.split('/').pop();
      
      if (!fileName) {
        throw new Error("Invalid file URL");
      }

      // Delete the file from Supabase storage
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([fileName]);
      
      if (error) {
        throw error;
      }
      
      console.log(`Successfully removed file ${fileName} from Supabase storage`);
    } catch (error) {
      console.error(`Failed to delete file ${fileUrl}:`, error);
    }
  }
}
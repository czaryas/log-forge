import * as fs from 'fs';
import * as readline from 'readline'
import { config } from '../config';
import { LogStats, LogEntry } from '@/interfaces';





export class LogProcessor{
    private monitorKeywords: string[];

    constructor(monitorKeywords = config.monitorKeywords) {
        this.monitorKeywords = monitorKeywords;
    }

    async processLogFile(filePath:string) : Promise<LogStats>{

        const stats: LogStats = {
            id: null,
            totalEntries: 0,
            errorCount: 0,
            warningCount: 0,
            ipAddresses: [],
            keywordMatches: {}
        };

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        try{
            for await(const line of rl){
                stats.totalEntries++;
                const logEntry = this.parseLogEntry(line);
                if (logEntry.level === 'ERROR') stats.errorCount++;
                if (logEntry.level === 'WARN') stats.warningCount++;

                // Track IP addresses
                if (logEntry.payload?.ip) {
                    stats.ipAddresses.push(logEntry.payload.ip);
                }

                // Check for keyword matches
                this.monitorKeywords.forEach(keyword => {
                if (line.includes(keyword)) {
                    stats.keywordMatches[keyword] = 
                    (stats.keywordMatches[keyword] || 0) + 1;
                }
                });
            }
            
        }finally {
            rl.close();
            fileStream.close();
        }

        return stats;
    }
        

    parseLogEntry(line: string): LogEntry {
        const timestampMatch = line.match(/^\[(.+?)\]/);
        const levelMatch = timestampMatch ? line.match(/\] (\w+) /) : line.match(/^(\w+)/);
        const jsonMatch = line.match(/\{.*\}$/);
      
        return {
          timestamp: timestampMatch ? timestampMatch[1] : null,
          level: levelMatch ? levelMatch[1] : 'UNKNOWN',
          message: line,
          payload: jsonMatch ? JSON.parse(jsonMatch[0]) : null
        };
    }

    async cleanupFile(filePath: string): Promise<void> {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete file ${filePath}:`, error);
        }
    }
}

    


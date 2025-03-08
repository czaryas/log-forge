import { Worker, Job } from "bullmq";
import * as fs from "fs";
import * as readline from "readline";
import { redisConfig } from "../../config/redisConfig";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

export const logProcessingWorker = new Worker(
  "log-processing-queue",
  async (job: Job) => {
    console.log("process.env.SUPABASE_URL", process.env.SUPABASE_URL);
    console.log(
      "process.env.NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // const supabase = await createClient();

    console.log(`Log file ${job.data.fileName} processed successfully`);
    const { fileId, filePath, userId, fileName } = job.data;

    const stats = {
      totalEntries: 0,
      errorCount: 0,
      warningCount: 0,
      ipAddresses: [] as string[],
      keywordMatches: {} as Record<string, number>,
    };

    const monitorKeywords = process.env.MONITOR_KEYWORDS?.split(",") || [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    try {
      for await (const line of rl) {
        stats.totalEntries++;

        // Parse log entry
        const logEntry = parseLogEntry(line);

        // Track errors and warnings
        if (logEntry.level === "ERROR") stats.errorCount++;
        if (logEntry.level === "WARN") stats.warningCount++;

        // Track IP addresses
        if (logEntry.payload?.ip) {
          stats.ipAddresses.push(logEntry.payload.ip);
        }

        // Check for keyword matches
        monitorKeywords.forEach((keyword) => {
          if (line.includes(keyword)) {
            stats.keywordMatches[keyword] =
              (stats.keywordMatches[keyword] || 0) + 1;
          }
        });
      }

      console.log("Final stats of file", JSON.stringify(stats));
      // Store results in Supabase
      const { error } = await supabase.from("log_stats").insert({
        job_id: fileId,
        user_id: userId,
        file_name: fileName,
        total_entries: stats.totalEntries,
        error_count: stats.errorCount,
        warning_count: stats.warningCount,
        ip_addresses: Array.from(stats.ipAddresses),
        keyword_matches: stats.keywordMatches,
        status: "completed",
        metadata: { originalFilePath: filePath },
      });

      if (error) throw error;

      return stats;
    } catch (error) {
      // Update job status in Supabase
      // await supabase.from('log_stats').update({
      //   status: 'failed',
      //   metadata: { error: String(error) }
      // }).eq('job_id', fileId);

      throw error;
    } finally {
      // Clean up file after processing
      // fs.unlinkSync(filePath);
    }
  },
  {
    connection: redisConfig,
    concurrency: 4, // Process 4 jobs concurrently
  }
);

function parseLogEntry(line: string) {
  const timestampMatch = line.match(/^\[(.+?)\]/);
  const levelMatch = line.match(/\] (\w+) /);
  const jsonMatch = line.match(/\{.*\}$/);

  return {
    timestamp: timestampMatch ? timestampMatch[1] : null,
    level: levelMatch ? levelMatch[1] : "UNKNOWN",
    message: line,
    payload: jsonMatch ? JSON.parse(jsonMatch[0]) : null,
  };
}

logProcessingWorker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);

  // Update job status in Supabase
  // await supabase.from('log_stats').update({
  //   status: 'failed',
  //   metadata: { error: String(err) }
  // }).eq('job_id', job?.data.fileId);
});

logProcessingWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

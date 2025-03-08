import { Worker, Job } from "bullmq";
import { redisConfig } from "@/config/redisConfig";
import { LogProcessor } from "@/services/LogProcessor";
import { SupabaseService } from "@/services/SupabaseService";
import { config } from "@/config";

export const createLogProcessingWorker = (
  logProcessor = new LogProcessor(),
  dbService = new SupabaseService()
) => {
  const worker = new Worker(
    "log-processing-queue",
    async (job: Job) => {
      console.log(`Processing log file: ${job.data.fileName}`);
      const { fileId, filePath, userId, fileName } = job.data;

      try {
        const stats = await logProcessor.processLogFile(filePath);

        await dbService.saveLogStats({
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

        console.log(`Log file ${fileName} processed successfully`);
        return stats;
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);

        await dbService.updateLogStats(fileId, {
          status: "failed",
          metadata: { error: String(error) },
        });

        throw error;
      } finally {
        if (config.deleteFilesAfterProcessing) {
          await logProcessor.cleanupFile(filePath);
        }
      }
    },
    {
      connection: redisConfig,
      concurrency: config.workerConcurrency || 4,
    }
  );

  worker.on("failed", async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);

    if (job) {
      await dbService.updateLogStats(job.data.fileId, {
        status: "failed",
        metadata: { error: String(err) },
      });
    }
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  return worker;
};

export const logProcessingWorker = createLogProcessingWorker();

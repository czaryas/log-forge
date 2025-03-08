// src/services/SupabaseService.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

export interface LogStatsRecord {
  job_id: string;
  user_id: string;
  file_name: string;
  total_entries: number;
  error_count: number;
  warning_count: number;
  ip_addresses: string[];
  keyword_matches: Record<string, number>;
  status: "completed" | "failed" | "processing";
  metadata: Record<string, any>;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async saveLogStats(stats: LogStatsRecord): Promise<void> {
    const { error } = await this.client.from("log_stats").insert(stats);

    if (error) throw error;
  }

  async updateLogStats(
    jobId: string,
    updates: Partial<LogStatsRecord>
  ): Promise<void> {
    const { error } = await this.client
      .from("log_stats")
      .update(updates)
      .eq("job_id", jobId);

    if (error) throw error;
  }
}

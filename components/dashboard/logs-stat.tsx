"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
} from "lucide-react";

interface LogStats {
  id: string;
  job_id: string;
  file_name: string;
  total_entries: number;
  error_count: number;
  warning_count: number;
  ip_addresses: string[];
  keyword_matches: Record<string, number>;
  status: "pending" | "processing" | "completed" | "failed";
  processed_at: string;
  user_id: string;
}

const STATUS_STYLES = {
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="w-4 h-4" />,
  },
  processing: {
    color: "bg-blue-100 text-blue-800",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  completed: {
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  failed: {
    color: "bg-red-100 text-red-800",
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function LogStatsComponent() {
  const [stats, setStats] = useState<LogStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<LogStats | null>(null);
  const [filter, setFilter] = useState<string>("");
  const supabase = createClient();

  // Filter stats based on search input
  const filteredStats = stats.filter(
    (stat) =>
      stat.job_id.includes(filter) ||
      stat.file_name.toLowerCase().includes(filter.toLowerCase())
  );

  const fetchStats = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      setRefreshing(true);
      const response = await fetch("/api/stats", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch stats");
      }

      const result: LogStats[] = await response.json();
      setStats(result);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Failed to fetch log processing statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleViewJob = async (jobId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await axios.get(`/api/stats/${jobId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setSelectedJob(response.data);
    } catch (error) {
      console.error("Failed to fetch job details:", error);
      toast.error("Failed to fetch job details");
    }
  };

  const handleRefresh = () => {
    fetchStats();
  };

  useEffect(() => {
    fetchStats();

    const supabaseSubscription = supabase
      .channel("log_stats_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "log_stats",
        },
        async () => {
          console.log("Supabase realtime update received");
          await fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabaseSubscription.unsubscribe();
    };
  }, [fetchStats]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Log Processing Jobs</CardTitle>
            <CardDescription>
              View and manage your log processing jobs
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Input
              placeholder="Search by job ID or file name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <p>Loading job statistics...</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Job ID</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-6 text-gray-500"
                      >
                        No log processing jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStats.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell className="font-mono text-xs">
                          {stat.job_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {stat.file_name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {stat.total_entries
                            ? stat.total_entries.toLocaleString()
                            : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              stat.error_count > 0 ? "destructive" : "secondary"
                            }
                          >
                            {stat.error_count
                              ? stat.error_count.toLocaleString()
                              : 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {STATUS_STYLES[stat.status].icon}
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[stat.status].color}`}
                            >
                              {stat.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(stat.processed_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewJob(stat.job_id)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedJob && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Job Details: {selectedJob.job_id}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setSelectedJob(null)}
            >
              ×
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Basic Information</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>File Name:</div>
                  <div>{selectedJob.file_name}</div>
                  <div>Status:</div>
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[selectedJob.status].color}`}
                    >
                      {selectedJob.status}
                    </span>
                  </div>
                  <div>Processed At:</div>
                  <div>
                    {new Date(selectedJob.processed_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium">Statistics</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>Total Entries:</div>
                  <div>{selectedJob.total_entries.toLocaleString()}</div>
                  <div>Error Count:</div>
                  <div>{selectedJob.error_count.toLocaleString()}</div>
                  <div>Warning Count:</div>
                  <div>{selectedJob.warning_count.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium">IP Addresses (Top 5)</h3>
                <div className="mt-2">
                  {selectedJob.ip_addresses.slice(0, 5).map((ip, index) => (
                    <Badge key={index} variant="outline" className="mr-1 mb-1">
                      {ip}
                    </Badge>
                  ))}
                  {selectedJob.ip_addresses.length > 5 && (
                    <Badge variant="outline">
                      +{selectedJob.ip_addresses.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium">Keyword Matches</h3>
                <div className="mt-2">
                  {Object.entries(selectedJob.keyword_matches).map(
                    ([keyword, count], index) => (
                      <div key={index} className="flex justify-between mb-1">
                        <span>{keyword}:</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    )
                  )}
                  {Object.keys(selectedJob.keyword_matches).length === 0 && (
                    <p className="text-gray-500">No keyword matches found</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

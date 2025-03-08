"use client";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JobDetailsProps {
  job: LogStats;
  onClose: () => void;
}

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
    icon: null,
  },
  processing: {
    color: "bg-blue-100 text-blue-800",
    icon: null,
  },
  completed: {
    color: "bg-green-100 text-green-800",
    icon: null,
  },
  failed: {
    color: "bg-red-100 text-red-800",
    icon: null,
  },
};

export default function JobDetails({ job, onClose }: JobDetailsProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Job Details: {job.job_id}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2"
          onClick={onClose}
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
              <div>{job.file_name}</div>
              <div>Status:</div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[job.status].color}`}
                >
                  {job.status}
                </span>
              </div>
              <div>Processed At:</div>
              <div>
                {new Date(job.processed_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium">Statistics</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>Total Entries:</div>
              <div>{job.total_entries.toLocaleString()}</div>
              <div>Error Count:</div>
              <div>{job.error_count.toLocaleString()}</div>
              <div>Warning Count:</div>
              <div>{job.warning_count.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium">IP Addresses (Top 5)</h3>
            <div className="mt-2">
              {job.ip_addresses.slice(0, 5).map((ip, index) => (
                <Badge key={index} variant="outline" className="mr-1 mb-1">
                  {ip}
                </Badge>
              ))}
              {job.ip_addresses.length > 5 && (
                <Badge variant="outline">
                  +{job.ip_addresses.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium">Keyword Matches</h3>
            <div className="mt-2">
              {Object.entries(job.keyword_matches).map(
                ([keyword, count], index) => (
                  <div key={index} className="flex justify-between mb-1">
                    <span>{keyword}:</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                )
              )}
              {Object.keys(job.keyword_matches).length === 0 && (
                <p className="text-gray-500">No keyword matches found</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
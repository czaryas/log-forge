"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import LogUploader from "@/components/LogUploader";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import QueueStatusComponent from "@/components/dashboard/queue-status";
import LogStatsComponent from "@/components/dashboard/logs-stat";

export default function DashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/sign-in";
        return;
      }

      setIsAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-10">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Log Processing Dashboard</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle> Upload Log file</CardTitle>
        </CardHeader>
        <CardContent>
          <LogUploader
            onUploadSuccess={(jobId) => {
              toast.success("File Uploaded Successfully", {
                description: `Job ID: ${jobId}`,
              });
            }}
          />
        </CardContent>
      </Card>

      <QueueStatusComponent />
      <LogStatsComponent />
    </div>
  );
}

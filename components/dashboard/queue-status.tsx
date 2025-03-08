"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import axios from "axios";
import { createClient } from "@/utils/supabase/client";
import { QueueStatus } from "@/interfaces";
import { toast } from "sonner";

const QueueStatusComponent: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const response = await axios.get("/api/queue-status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        setQueueStatus(response.data);
      } catch (error) {
        console.error("Failed to fetch queue status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueStatus();

    const eventSource = new EventSource("/api/live-stats");
    setIsConnected(true);

    // Handle connection open
    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("SSE connection established");
    };

    // Handle stats event
    eventSource.addEventListener("stats", (event) => {
      try {
        const data = JSON.parse(event.data) as QueueStatus;
        setQueueStatus(data);
        setLastUpdated(new Date());
        
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    });

    // Handle ping event to keep connection alive
    eventSource.addEventListener("ping", () => {
      setIsConnected(true);
    });

    // Handle connection error
    eventSource.onerror = () => {
      setIsConnected(false);
      console.error("SSE connection error");

      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        eventSource.close();
        setIsConnected(false);
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <p>Loading queue status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queueStatus) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Queue Status</span>
          {isConnected && (
            <span className="text-xs text-green-600 font-normal flex items-center">
              <span className="h-2 w-2 bg-green-600 rounded-full mr-1"></span>
              Live
            </span>
          )}
        </CardTitle>
        {lastUpdated && (
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Waiting</p>
            <p className="text-2xl font-bold">{queueStatus.waiting}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg">
            <p className="text-sm text-blue-500">Active</p>
            <p className="text-2xl font-bold">{queueStatus.active}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-sm text-green-500">Completed</p>
            <p className="text-2xl font-bold">{queueStatus.completed}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-sm text-red-500">Failed</p>
            <p className="text-2xl font-bold">{queueStatus.failed}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <p className="text-sm text-yellow-500">Delayed</p>
            <p className="text-2xl font-bold">{queueStatus.delayed}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QueueStatusComponent;
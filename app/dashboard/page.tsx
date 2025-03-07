'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import React, { useState, useEffect, useCallback } from 'react';
import LogUploader from '@/components/LogUploader';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input';
import { redirect } from "next/navigation";

import { 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    XCircle,
    RefreshCw,
    Search
  } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const STATUS_COLORS = {
    pending: 'yellow',
    processing: 'blue',
    completed: 'green',
    failed: 'red'
  };
  
  // Define status icons
  const STATUS_ICONS = {
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    processing: <AlertCircle className="w-4 h-4 text-blue-500" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />
  };


  interface LogStat {
    id: string;
    job_id: string;
    file_name: string;
    total_entries: number;
    error_count: number;
    warning_count: number;
    ip_addresses: string[];
    keyword_matches: Record<string, number>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processed_at: string;
    user_id: string;
  }
  
  interface QueueStatus {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }

  const STATUS_STYLES = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
    processing: { color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="w-4 h-4" /> },
    completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-4 h-4" /> },
    failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> }
  };
export default function DashboardPage() {
    const [stats, setStats] = useState<LogStat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedJob, setSelectedJob] = useState<LogStat | null>(null);
    const [filter, setFilter] = useState<string>('');
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    const supabase = createClient()
    
    
    const handleRefresh = () => {
        fetchStats();
        // fetchQueueStatus();
      };

    const handleViewJob = async (jobId: string) => {
        const { data: {session}} = await supabase.auth.getSession();

        try {
          const response = await axios.get(`/api/stats/${jobId}`, {
            headers: {
              'Authorization': `Bearer {session.access_token}`
            }
          });
          setSelectedJob(response.data);
        } catch (error) {
          console.error('Failed to fetch job details:', error);
          toast.error('Failed to fetch job details');
        }
      };
    
      // Filter stats based on search input
      const filteredStats = stats.filter(stat => 
        stat.job_id.includes(filter) || 
        stat.file_name.toLowerCase().includes(filter.toLowerCase())
      );

    const fetchStats = useCallback(async () => {
        try {
            const { data: {session}} = await supabase.auth.getSession();
            setRefreshing(true);
            const response = await fetch('/api/stats', {
                headers:{
                    'Authorization': `Bearer {session.access_token}`
                },
            });
            if(!response.ok){
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed')
            }
            const result: LogStat[] = await response.json();
            setStats(result);
            } catch (error) {
            console.error('Failed to fetch stats:', error);
            toast.error('Failed to fetch log processing statistics');
            } finally {
            setLoading(false);
            setRefreshing(false);
            }
      }, []);

      const fetchQueueStatus = useCallback(async () => {
        try {
            const { data: {session}} = await supabase.auth.getSession();
            const response = await axios.get('/api/queue-status', {
                headers: {
                    'Authorization': `Bearer {session.access_token}`
                }
          });
          setQueueStatus(response.data);
        } catch (error) {
          console.error('Failed to fetch queue status:', error);
        }
      }, []);

      const validateUser = async()=>{
        const {
            data: { user },
        } = await supabase.auth.getUser();
    
        if (!user) {
            return redirect("/sign-in");
        }
      }

      useEffect(() => {
          fetchStats();
          fetchQueueStatus();
          // Set up polling for queue status
        //   const intervalId = setInterval(fetchQueueStatus, 10000);
        //   return () => clearInterval(intervalId);
      }, [ fetchStats]);

      useEffect(() => {

       
      }, [fetchStats, fetchQueueStatus]);
    return (
        <div className='container mx-auto p-6'>
            <h1 className="text-2xl font-bold mb-6">Log Processing Dashboard</h1>
            <Card className='mb-6'>
                <CardHeader>
                    <CardTitle> Upload Log file</CardTitle>
                </CardHeader>
                <CardContent>
                    <LogUploader onUploadSuccess={(jobId)=>{
                       toast.success('File Uploaded Successfully', {
                        description: `Job ID: ${jobId}`
                       }) 
                    }} />
                </CardContent>
            </Card>

           
            {queueStatus && (
                <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Queue Status</CardTitle>
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
            )}
      
      {/* Stats Section */}
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
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="mb-4 relative">
            <Input
              placeholder="Search by job ID or file name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Stats table */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <p>Loading job statistics...</p>
            </div>
          ) : (
            <>
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
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
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
                            {stat.file_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.total_entries.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={stat.error_count > 0 ? "destructive" : "secondary"}>
                              {stat.error_count.toLocaleString()}
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
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Job Details Modal - would be implemented using a modal component */}
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
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[selectedJob.status].color}`}>
                      {selectedJob.status}
                    </span>
                  </div>
                  <div>Processed At:</div>
                  <div>{new Date(selectedJob.processed_at).toLocaleString()}</div>
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
                  {Object.entries(selectedJob.keyword_matches).map(([keyword, count], index) => (
                    <div key={index} className="flex justify-between mb-1">
                      <span>{keyword}:</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(selectedJob.keyword_matches).length === 0 && (
                    <p className="text-gray-500">No keyword matches found</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
    );
}
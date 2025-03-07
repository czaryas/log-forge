import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
    request: NextRequest,
    { params }: { params: { jobid: string } }
  ) {    try{
        const { jobid } = params;

        console.log('Fetching data for jobid', jobid);
        const supabase = await createClient();
        const {data, error} =  await supabase.from('log_stats').select('*')
            .eq('job_id', jobid)
            .single();
    
        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch log stats' }, 
                { status: 500 }
            );
        }
        return NextResponse.json(data);
    }catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
          { error: 'Internal server error' }, 
          { status: 500 }
        );
      }
} 
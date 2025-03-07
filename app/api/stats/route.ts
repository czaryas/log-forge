import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from 'next/navigation'



export async function GET(req:NextRequest, res:NextResponse) {
    try{
        const supabase = await createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            redirect('/login')
        }
        
        const {data, error: queryError} =  await supabase.from('log_stats').select('*').order('processed_at', { ascending: false });
    
        if (queryError) {
            console.error('Supabase query error:', queryError);
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
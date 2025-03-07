import { NextRequest, NextResponse } from "next/server";
// import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { logProcessingQueue } from "@/lib/bullmq/queue";
import { createClient } from "@/utils/supabase/server";
import { redirect } from 'next/navigation'

export async function POST(req:NextRequest, res:NextResponse) {
    
    console.log('Upload-logs API called');
    try {
    

        const supabase = await createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            redirect('/login')
        }
        let formData = await req.formData();
        const file = formData.get("file") as File;
        const fileId = crypto.randomUUID();
        const uploadDir = path.join(process.cwd(), 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, `${fileId}-${file.name}`);
        // Move uploaded file
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        const job = await logProcessingQueue.add('log-processing-job', {
            fileId,
            filePath,
            userId: userData.user.id,
            fileName: file.name
        });
        return NextResponse.json({ 
            jobId: job.id, 
            message: 'File queued for processing' 
            });
    }catch(err){
        console.log(err);
            return NextResponse.json({ 
                success: false,
                message: 'Could not process file check input' 
                });;
    }
    
        
    // });
    
    
}
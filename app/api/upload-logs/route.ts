import { NextRequest, NextResponse } from "next/server";
// import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { logProcessingQueue } from "@/lib/bullmq/queue";

export async function POST(req:NextRequest, res:NextResponse) {
    
    console.log('Upload-logs API called');

    // const form = formidable({});
    try {
        // const [fields, files] = await form.parse(await req.formData());
    // form.parse(req, async(err, fields, files)=>{
       
        // const file = files.file as unknown as formidable.File;
        // if (Array.isArray(files.file)) {
        //     const file = files.file[0];
        // } else {
        //     const file = files.file;
        // }
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
            userId: 1,
            fileName: file.name
        });
        return NextResponse.json({ 
            jobId: job.id, 
            message: 'File queued for processing' 
            });
    }catch(err){
        console.log(err);
            return NextResponse.json({ 
                jobId: 1, 
                message: 'File queued for processing' 
                });;
    }
    
        
    // });
    
    
}
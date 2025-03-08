import { NextRequest, NextResponse } from "next/server";
import { logProcessingQueue } from "@/lib/bullmq/queue";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function POST(req: NextRequest, res: any) {
  console.log("Upload-logs API called");
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      redirect("/login");
    }

    let formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file found in the request",
      }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const fileName = `${fileId}-${file.name}`;
    const buffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("logs")
      .upload(fileName, buffer, {
        contentType: file.type || 'text/plain',
        cacheControl: '3600',
        upsert: false

      });
      
    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json({
        success: false,
        message: "Failed to upload file to storage",
      }, { status: 500 });
    }
    
    const { data: urlData } = supabase.storage
      .from("logs")
      .getPublicUrl(fileName);
      
    const filePath = urlData.publicUrl;

    const fileSizeInBytes = file.size;
    const priority = Math.ceil(Math.log10(fileSizeInBytes));
    
    const job = await logProcessingQueue.add("log-processing-job", {
      fileId,
      filePath, 
      userId: userData.user.id,
      fileName: file.name,
    }, {
      priority,
    });
    
    return NextResponse.json({
      jobId: job.id,
      message: "File queued for processing",
      fileUrl: filePath,
    });
  } catch (err) {
    console.error("Error processing upload:", err);
    return NextResponse.json({
      success: false,
      message: "Could not process file check input",
    }, { status: 500 });
  }
}
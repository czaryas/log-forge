import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { logProcessingQueue } from "@/lib/bullmq/queue";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function POST(req: NextRequest, res: NextResponse) {
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
    const uploadDir = path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${fileId}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileSizeInBytes = file.size;
    const priority = Math.ceil(Math.log10(fileSizeInBytes));
    const job = await logProcessingQueue.add("log-processing-job", {
      fileId,
      filePath,
      userId: userData.user.id,
      fileName: file.name,
    },{
      priority, // Lower number = higher priority (smaller files)
    });
    return NextResponse.json({
      jobId: job.id,
      message: "File queued for processing",
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json({
      success: false,
      message: "Could not process file check input",
    });
  }

}

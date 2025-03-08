import { POST } from "@/app/api/upload-logs/route";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { logProcessingQueue } from "@/lib/bullmq/queue";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

jest.mock("fs/promises", () => ({
  writeFile: jest.fn(),
}));

jest.mock("fs", () => ({
  mkdirSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((first, second, third) => {
    if (third) {
      return `${first}/${second}/${third}`;
    }
    return `${first}/${second}`;
  }),
}));

jest.mock("@/lib/bullmq/queue", () => ({
  logProcessingQueue: {
    add: jest.fn().mockResolvedValue({ id: "test-job-id" }),
  },
}));

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

global.crypto = {
  randomUUID: jest.fn().mockReturnValue("test-uuid"),
} as any;

describe("Upload Logs API Route", () => {
  let mockFormData: FormData;
  let mockFile: File;
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFormData = new FormData();

    mockFile = {
      name: "test-log.txt",
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    } as unknown as File;

    mockFormData.append("file", mockFile);

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  it("should redirect to login if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const mockRequest = new NextRequest("http://localhost/api/upload-logs", {
      method: "POST",
    });
    Object.defineProperty(mockRequest, "formData", {
      value: jest.fn().mockResolvedValue(mockFormData),
    });

    await POST(mockRequest, {} as NextResponse);

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should return 400 if no file is provided", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    const emptyFormData = new FormData();

    const mockRequest = new NextRequest("http://localhost/api/upload-logs", {
      method: "POST",
    });
    Object.defineProperty(mockRequest, "formData", {
      value: jest.fn().mockResolvedValue(emptyFormData),
    });

    const response = await POST(mockRequest, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      message: "No file found in the request",
    });
  });

  it("should process file upload successfully", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    const mockRequest = new NextRequest("http://localhost/api/upload-logs", {
      method: "POST",
    });
    Object.defineProperty(mockRequest, "formData", {
      value: jest.fn().mockResolvedValue(mockFormData),
    });

    const response = await POST(mockRequest, {} as NextResponse);
    const responseData = await response.json();
    expect(logProcessingQueue.add).toHaveBeenCalledWith(
      "log-processing-job",
      {
        fileId: "test-uuid",
        filePath: expect.stringContaining("test-uuid-test-log.txt"),
        userId: "test-user-id",
        fileName: "test-log.txt",
      },
      {
        priority: expect.any(Number),
      }
    );

    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      jobId: "test-job-id",
      message: "File queued for processing",
    });
  });

  it("should handle errors gracefully", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    (writeFile as jest.Mock).mockRejectedValue(new Error("Disk full"));

    const mockRequest = new NextRequest("http://localhost/api/upload-logs", {
      method: "POST",
    });
    Object.defineProperty(mockRequest, "formData", {
      value: jest.fn().mockResolvedValue(mockFormData),
    });

    const response = await POST(mockRequest, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(200); // The route returns 200 even for errors
    expect(responseData).toEqual({
      success: false,
      message: "Could not process file check input",
    });

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(logProcessingQueue.add).not.toHaveBeenCalled();
  });
});

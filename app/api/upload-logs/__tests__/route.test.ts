import { POST } from "@/app/api/upload-logs/route";
import { logProcessingQueue } from "@/lib/bullmq/queue";
import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/bullmq/queue", () => ({
  logProcessingQueue: {
    add: jest.fn(),
  },
}));

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

interface MockFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer: jest.Mock<Promise<ArrayBuffer>>;
}

interface MockFormData {
  get: jest.Mock<any>;
}

interface MockSupabase {
  auth: {
    getUser: jest.Mock;
  };
  storage: {
    from: jest.Mock;
    upload: jest.Mock;
    getPublicUrl: jest.Mock;
  };
}

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: (): string => "123e4567-e89b-12d3-a456-426614174000",
  },
});

describe("Upload Logs API Route", () => {
  let mockSupabase: MockSupabase;
  let mockFormData: MockFormData;
  let mockFile: MockFile;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      },
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    mockSupabase.storage.upload.mockResolvedValue({
      data: { path: "logs/test-file.txt" },
      error: null,
    });

    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://logforge.com/storage/logs/test-file.txt" },
    });

    (logProcessingQueue.add as jest.Mock).mockResolvedValue({ id: "job-123" });

    require("@/utils/supabase/server").createClient.mockResolvedValue(
      mockSupabase
    );

    mockFile = {
      name: "test-file.txt",
      type: "text/plain",
      size: 1000,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
    };
    mockFormData = {
      get: jest.fn().mockReturnValue(mockFile),
    };
  });

  it("should return 400 when no file is provided", async () => {
    mockFormData.get.mockReturnValue(null);

    const request = new NextRequest("https://logforge.com/api/upload-logs", {
      method: "POST",
    });
    request.formData = jest.fn().mockResolvedValue(mockFormData);

    const response = await POST(request, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      success: false,
      message: "No file found in the request",
    });
    expect(logProcessingQueue.add).not.toHaveBeenCalled();
  });

  it("should return 500 when file upload fails", async () => {
    mockSupabase.storage.upload.mockResolvedValue({
      data: null,
      error: { message: "Upload failed" },
    });

    const request = new NextRequest("https://logforge.com/api/upload-logs", {
      method: "POST",
    });
    request.formData = jest.fn().mockResolvedValue(mockFormData);

    const response = await POST(request, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      success: false,
      message: "Failed to upload file to storage",
    });
    expect(logProcessingQueue.add).not.toHaveBeenCalled();
  });

  it("should successfully process file upload and queue job", async () => {
    const request = new NextRequest("https://logforge.com/api/upload-logs", {
      method: "POST",
    });
    request.formData = jest.fn().mockResolvedValue(mockFormData);

    const response = await POST(request, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      jobId: "job-123",
      message: "File queued for processing",
      fileUrl: "https://logforge.com/storage/logs/test-file.txt",
    });

    // Check if all operations were called correctly
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000-test-file.txt",
      expect.any(ArrayBuffer),
      expect.objectContaining({
        contentType: "text/plain",
        cacheControl: "3600",
        upsert: false,
      })
    );
    expect(mockSupabase.storage.getPublicUrl).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000-test-file.txt"
    );
    expect(logProcessingQueue.add).toHaveBeenCalledWith(
      "log-processing-job",
      {
        fileId: "123e4567-e89b-12d3-a456-426614174000",
        filePath: "https://logforge.com/storage/logs/test-file.txt",
        userId: "test-user-id",
        fileName: "test-file.txt",
      },
      {
        priority: 3, // log10(1000) = 3
      }
    );
  });

  it("should handle different file sizes with appropriate priority", async () => {
    interface SizeTestCase {
      size: number;
      expectedPriority: number;
    }

    const testCases: SizeTestCase[] = [
      { size: 100, expectedPriority: 2 }, // log10(100) = 2
      { size: 10000, expectedPriority: 4 }, // log10(10000) = 4
      { size: 1000000, expectedPriority: 6 }, // log10(1000000) = 6
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();

      const sizedFile: MockFile = {
        ...mockFile,
        size: testCase.size,
      };

      mockFormData.get.mockReturnValue(sizedFile);

      const request = new NextRequest("https://logforge.com/api/upload-logs", {
        method: "POST",
      });
      request.formData = jest.fn().mockResolvedValue(mockFormData);

      await POST(request, {} as NextResponse);

      expect(logProcessingQueue.add).toHaveBeenCalledWith(
        "log-processing-job",
        expect.any(Object),
        {
          priority: testCase.expectedPriority,
        }
      );
    }
  });

  it("should handle general errors gracefully", async () => {
    const request = new NextRequest("https://logforge.com/api/upload-logs", {
      method: "POST",
    });
    request.formData = jest
      .fn()
      .mockRejectedValue(new Error("Unexpected error"));
    const response = await POST(request, {} as NextResponse);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      success: false,
      message: "Could not process file check input",
    });
  });
});

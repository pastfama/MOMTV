// ============================================================
// MOMTV — Azure Video Indexer Client
// ============================================================
// Uploads video segments to Azure Video Indexer and retrieves
// analysis insights (STT, OCR, scenes, topics).
// ============================================================

// ── Configuration ──────────────────────────────────────────────

const VI_API_BASE = "https://api.videoindexer.ai";
const VI_ACCOUNT_ID =
  process.env.VI_ACCOUNT_ID || "37f614a3-1806-4883-a912-34d85d1a9aeb";
const VI_LOCATION = process.env.VI_LOCATION || "eastus2";
const VI_ARM_ACCESS_TOKEN = process.env.VI_ARM_ACCESS_TOKEN || "";
const SUBSCRIPTION_ID = "8cce2fe7-7c75-4969-9da9-707aadd13e52";
const RESOURCE_GROUP = "rg-resilient-steering-dev-663329e5";
const RESOURCE_NAME = "momtv-video-indexer";

// ── Types ──────────────────────────────────────────────────────

export interface VideoIndexResult {
  videoId: string;
  status: "uploaded" | "indexing" | "completed" | "failed";
  transcript?: TranscriptLine[];
  ocr?: OcrResult[];
  scenes?: SceneResult[];
  topics?: TopicResult[];
  summary?: string;
  duration?: number;
}

export interface TranscriptLine {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  startTime: string;
  confidence: number;
}

export interface SceneResult {
  id: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface TopicResult {
  name: string;
  confidence: number;
}

// ── Access Token Management ───────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Use pre-provided token
  if (VI_ARM_ACCESS_TOKEN) {
    return VI_ARM_ACCESS_TOKEN;
  }

  // Generate token via Azure CLI (ARM API)
  const { execSync: exec } = await import("child_process");

  const url = `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.VideoIndexer/accounts/${RESOURCE_NAME}/generateAccessToken?api-version=2024-01-01`;

  const result = exec(
    `az rest --method post --uri "${url}" --body '{\"permissionType\":\"Contributor\",\"scope\":\"Account\"}' --output json`,
    { encoding: "utf-8" },
  );

  const data = JSON.parse(result) as { accessToken: string };
  cachedToken = data.accessToken;
  tokenExpiry = Date.now() + 55 * 60 * 1000; // Cache for 55 minutes

  return cachedToken;
}

// ── Upload & Index ────────────────────────────────────────────

export async function uploadAndIndex(
  videoUrl: string,
  videoName: string,
  language: string = "ru",
): Promise<{ videoId: string; operationLocation: string }> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    name: videoName,
    language,
    videoUrl,
    indexingPreset: "Basic",
    privacy: "Private",
  });

  const response = await fetch(
    `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos?${params}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Video Indexer upload failed (${response.status}): ${errorText}`,
    );
  }

  const operationLocation =
    response.headers.get("Operation-Location") || "";
  const data = (await response.json()) as { id: string };

  console.log(`[VI] Uploaded video: ${data.id}`);
  console.log(`[VI] Operation location: ${operationLocation}`);

  return {
    videoId: data.id,
    operationLocation,
  };
}

// ── Check Indexing Status ─────────────────────────────────────

export async function getIndexingStatus(
  videoId: string,
): Promise<{ state: string; progress?: number }> {
  const token = await getAccessToken();

  const response = await fetch(
    `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos/${videoId}/Index`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get indexing status: ${response.status}`);
  }

  const data = (await response.json()) as {
    state: string;
    progress?: number;
  };

  return data;
}

// ── Get Full Insights ─────────────────────────────────────────

export async function getVideoInsights(
  videoId: string,
): Promise<VideoIndexResult> {
  const token = await getAccessToken();

  const response = await fetch(
    `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos/${videoId}/Index`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get video insights: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    state: string;
    duration?: string;
    videos?: Array<{
      transcript?: {
        items: Array<{
          id: string;
          text: string;
          startTime: string;
          endTime: string;
          confidence: number;
        }>;
      };
      insights?: {
        ocr?: Array<{
          text: string;
          startTime: string;
          confidence: number;
        }>;
        scenes?: Array<{
          id: string;
          startTime: string;
          endTime: string;
          description?: string;
        }>;
        topics?: Array<{
          name: string;
          confidence: number;
        }>;
      };
    }>;
  };

  const video = data.videos?.[0];
  const result: VideoIndexResult = {
    videoId: data.id,
    status: data.state === "Processed" ? "completed" : "indexing",
  };

  // Extract transcript
  if (video?.transcript?.items) {
    result.transcript = video.transcript.items.map((item) => ({
      id: item.id,
      text: item.text,
      startTime: item.startTime,
      endTime: item.endTime,
      confidence: item.confidence,
    }));
  }

  // Extract OCR
  if (video?.insights?.ocr) {
    result.ocr = video.insights.ocr.map((item) => ({
      text: item.text,
      startTime: item.startTime,
      confidence: item.confidence,
    }));
  }

  // Extract scenes
  if (video?.insights?.scenes) {
    result.scenes = video.insights.scenes.map((item) => ({
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      description: item.description,
    }));
  }

  // Extract topics
  if (video?.insights?.topics) {
    result.topics = video.insights.topics.map((item) => ({
      name: item.name,
      confidence: item.confidence,
    }));
  }

  return result;
}

// ── Get Transcript Only ───────────────────────────────────────

export async function getTranscript(
  videoId: string,
  language: string = "ru",
): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(
    `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos/${videoId}/Captions?language=${language}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get transcript: ${response.status}`);
  }

  return response.text();
}

// ── Wait for Completion ───────────────────────────────────────

export async function waitForCompletion(
  videoId: string,
  maxWaitMs: number = 120_000,
): Promise<VideoIndexResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getIndexingStatus(videoId);
    console.log(`[VI] Video ${videoId} status: ${status.state}`);

    if (status.state === "Processed") {
      return getVideoInsights(videoId);
    }

    if (status.state === "Failed") {
      throw new Error(`Video indexing failed for ${videoId}`);
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  throw new Error(`Video indexing timed out for ${videoId}`);
}

// ── Full Pipeline: Upload → Index → Get Insights ──────────────

export async function analyzeSegment(
  blobUrl: string,
  segmentId: string,
): Promise<VideoIndexResult> {
  console.log(`[VI] Starting analysis for segment: ${segmentId}`);

  // 1. Upload and start indexing
  const { videoId } = await uploadAndIndex(blobUrl, segmentId, "ru");

  // 2. Wait for completion
  const result = await waitForCompletion(videoId);

  console.log(
    `[VI] Analysis complete for ${segmentId}:`,
    `transcript=${result.transcript?.length || 0} lines,`,
    `ocr=${result.ocr?.length || 0} items,`,
    `scenes=${result.scenes?.length || 0},`,
    `topics=${result.topics?.length || 0}`,
  );

  return result;
}
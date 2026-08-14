// ============================================================
// MOMTV — Twitch HLS Stream Capture
// ============================================================
// Downloads 30-second video segments from Twitch HLS streams
// and uploads them to Azure Blob Storage for Video Indexer analysis.
// ============================================================

import { BlobServiceClient } from "@azure/storage-blob";

// ── Configuration ──────────────────────────────────────────────

const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL || "KNIG04Ei";

const AZURE_STORAGE_CONNECTION =
  process.env.AZURE_STORAGE_CONNECTION || "";
const BLOB_CONTAINER = "stream-segments";

const SEGMENT_DURATION_SEC = 30;
const CAPTURE_INTERVAL_MS = SEGMENT_DURATION_SEC * 1000;

// ── Types ──────────────────────────────────────────────────────

interface HlsManifest {
  masterUrl: string;
  variantUrl: string;
  segmentUrls: string[];
}

interface CaptureResult {
  segmentId: string;
  blobName: string;
  blobUrl: string;
  timestamp: number;
  duration: number;
}

// ── Twitch GQL ────────────────────────────────────────────────

async function getPlaybackAccessToken(
  channel: string,
): Promise<{ value: string; signature: string }> {
  const response = await fetch(TWITCH_GQL_URL, {
    method: "POST",
    headers: {
      "Client-Id": TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: "PlaybackAccessToken",
      variables: {
        isLive: true,
        login: channel,
        isVod: false,
        vodID: "",
        playerType: "site",
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712",
        },
      },
    }),
  });

  const data = (await response.json()) as {
    data?: {
      streamPlaybackAccessToken?: {
        value: string;
        signature: string;
      };
    };
  };

  const token = data.data?.streamPlaybackAccessToken;
  if (!token) {
    throw new Error(
      `Failed to get playback access token for ${channel}`,
    );
  }

  return token;
}

async function getHlsManifestUrl(channel: string): Promise<string> {
  const { value, signature } = await getPlaybackAccessToken(channel);
  return `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8?sig=${signature}&token=${encodeURIComponent(value)}`;
}

// ── HLS Parsing ───────────────────────────────────────────────

async function parseHlsManifest(manifestUrl: string): Promise<HlsManifest> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch HLS manifest: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n");

  // Find the best quality variant (1080p or highest available)
  let variantUrl = "";
  let bandwidth = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
      const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      if (bwMatch) {
        const bw = parseInt(bwMatch[1], 10);
        if (bw > bandwidth) {
          bandwidth = bw;
          variantUrl = lines[i + 1]?.trim() || "";
        }
      }
    }
  }

  if (!variantUrl) {
    throw new Error("No variant found in HLS manifest");
  }

  // Resolve variant URL relative to manifest URL
  if (!variantUrl.startsWith("http")) {
    const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/"));
    variantUrl = `${baseUrl}/${variantUrl}`;
  }

  // Fetch the variant playlist to get segment URLs
  const variantResponse = await fetch(variantUrl);
  if (!variantResponse.ok) {
    throw new Error(`Failed to fetch variant playlist: ${variantResponse.status}`);
  }

  const variantText = await variantResponse.text();
  const segmentUrls: string[] = [];
  const baseUrl = variantUrl.substring(0, variantUrl.lastIndexOf("/"));

  for (const line of variantText.split("\n")) {
    if (line.trim() && !line.startsWith("#")) {
      const url = line.trim();
      segmentUrls.push(
        url.startsWith("http") ? url : `${baseUrl}/${url}`,
      );
    }
  }

  return {
    masterUrl: manifestUrl,
    variantUrl,
    segmentUrls,
  };
}

// ── Segment Download ──────────────────────────────────────────

async function downloadSegment(segmentUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(segmentUrl);
  if (!response.ok) {
    throw new Error(`Failed to download segment: ${response.status}`);
  }
  return response.arrayBuffer();
}

// ── Azure Blob Upload ─────────────────────────────────────────

async function uploadToBlob(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobName: string,
  data: ArrayBuffer,
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(data, {
    blobHTTPHeaders: { blobContentType: "video/mp2t" },
  });

  return blockBlobClient.url;
}

// ── Capture Loop ──────────────────────────────────────────────

export async function captureSegment(
  blobServiceClient: BlobServiceClient,
): Promise<CaptureResult | null> {
  try {
    // 1. Get HLS manifest URL
    const manifestUrl = await getHlsManifestUrl(TWITCH_CHANNEL);
    console.log(`[HLS] Got manifest URL for ${TWITCH_CHANNEL}`);

    // 2. Parse manifest to get segment URLs
    const manifest = await parseHlsManifest(manifestUrl);
    if (manifest.segmentUrls.length === 0) {
      console.warn("[HLS] No segments found in manifest");
      return null;
    }

    // 3. Get the latest segment
    const latestSegmentUrl =
      manifest.segmentUrls[manifest.segmentUrls.length - 1];
    console.log(`[HLS] Downloading segment: ${latestSegmentUrl}`);

    // 4. Download the segment
    const segmentData = await downloadSegment(latestSegmentUrl);
    console.log(
      `[HLS] Downloaded segment: ${(segmentData.byteLength / 1024 / 1024).toFixed(1)} MB`,
    );

    // 5. Upload to Azure Blob
    const timestamp = Date.now();
    const segmentId = `${TWITCH_CHANNEL}-${timestamp}`;
    const blobName = `segments/${segmentId}.ts`;

    const blobUrl = await uploadToBlob(
      blobServiceClient,
      BLOB_CONTAINER,
      blobName,
      segmentData,
    );

    console.log(`[HLS] Uploaded to blob: ${blobName}`);

    return {
      segmentId,
      blobName,
      blobUrl,
      timestamp,
      duration: SEGMENT_DURATION_SEC,
    };
  } catch (error) {
    console.error("[HLS] Capture failed:", error);
    return null;
  }
}

// ── Main Capture Loop ─────────────────────────────────────────

export async function startCaptureLoop(): Promise<void> {
  console.log(
    `[HLS] Starting capture loop for ${TWITCH_CHANNEL} (every ${SEGMENT_DURATION_SEC}s)`,
  );

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION,
  );

  while (true) {
    const result = await captureSegment(blobServiceClient);
    if (result) {
      console.log(`[HLS] Segment captured: ${result.segmentId}`);
      // Emit event or call next pipeline stage
    }

    // Wait for next capture
    await new Promise((resolve) => setTimeout(resolve, CAPTURE_INTERVAL_MS));
  }
}
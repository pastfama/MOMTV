// ============================================================
// MOM TV — Twitch HLS Segment Fetcher
// ============================================================
// Fetches live stream segment URLs from Twitch via GQL API.
// Pure HTTP — no Streamlink, no FFmpeg.
// ============================================================

// Use proxy to bypass CORS restrictions
const TWITCH_PROXY_BASE = "/api/twitch";

export interface HlsSegment {
  url: string;
  channel: string;
  timestamp: number;
}

/**
 * Get a Twitch playback access token via the GQL API.
 */
async function getPlaybackAccessToken(
  channel: string,
): Promise<{ value: string; signature: string }> {
  const response = await fetch(`${TWITCH_PROXY_BASE}/gql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    throw new Error(`Failed to get playback access token for ${channel}`);
  }

  return token;
}

/**
 * Get the HLS master manifest URL for a Twitch channel.
 */
async function getHlsManifestUrl(channel: string): Promise<string> {
  const { value, signature } = await getPlaybackAccessToken(channel);
  return `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8?sig=${signature}&token=${encodeURIComponent(value)}`;
}

/**
 * Parse the HLS master manifest and find the best quality variant.
 * Returns the variant playlist URL.
 */
async function getVariantPlaylistUrl(masterUrl: string): Promise<string> {
  const response = await fetch(`${TWITCH_PROXY_BASE}/fetch?url=${encodeURIComponent(masterUrl)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch HLS master manifest: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n");

  // Find the highest bandwidth variant
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

  // Resolve relative URL
  if (!variantUrl.startsWith("http")) {
    const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf("/"));
    variantUrl = `${baseUrl}/${variantUrl}`;
  }

  return variantUrl;
}

/**
 * Get the latest segment URL from a variant playlist.
 */
async function getLatestSegmentUrl(variantUrl: string): Promise<string> {
  const response = await fetch(`${TWITCH_PROXY_BASE}/fetch?url=${encodeURIComponent(variantUrl)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch variant playlist: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n");
  const segmentUrls: string[] = [];
  const baseUrl = variantUrl.substring(0, variantUrl.lastIndexOf("/"));

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      segmentUrls.push(
        trimmed.startsWith("http") ? trimmed : `${baseUrl}/${trimmed}`,
      );
    }
  }

  if (segmentUrls.length === 0) {
    throw new Error("No segments found in variant playlist");
  }

  // Return the last (most recent) segment
  return segmentUrls[segmentUrls.length - 1];
}

/**
 * Fetch the latest HLS segment URL for a Twitch channel.
 * Pure HTTP — no Streamlink, no FFmpeg.
 *
 * @returns Segment info with URL, or null if stream is offline.
 */
export async function fetchLatestSegment(
  channel: string,
): Promise<HlsSegment | null> {
  try {
    // 1. Get HLS manifest URL
    const manifestUrl = await getHlsManifestUrl(channel);

    // 2. Get best quality variant playlist
    const variantUrl = await getVariantPlaylistUrl(manifestUrl);

    // 3. Get latest segment URL
    const segmentUrl = await getLatestSegmentUrl(variantUrl);

    return {
      url: segmentUrl,
      channel,
      timestamp: Date.now(),
    };
  } catch (err) {
    // Stream is likely offline or access token failed
    console.warn(`[TwitchHLS] Could not fetch segment for ${channel}:`, err);
    return null;
  }
}
// Azure Function proxy for Azure Video Indexer
// Handles video segment upload, status polling, and insights retrieval

const VI_API_BASE = "https://api.videoindexer.ai";
const VI_ACCOUNT_ID = process.env.VI_ACCOUNT_ID || "37f614a3-1806-4883-a912-34d85d1a9aeb";
const VI_LOCATION = process.env.VI_LOCATION || "eastus2";
const SUBSCRIPTION_ID = "8cce2fe7-7c75-4969-9da9-707aadd13e52";
const RESOURCE_GROUP = "rg-resilient-steering-dev-663329e5";
const RESOURCE_NAME = "momtv-video-indexer";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(context) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    // Use ARM REST API with DefaultAzureCredential-like approach
    // Get a token from the Azure Instance Metadata Service (IMDS)
    const tokenUrl = "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/";

    const tokenResp = await fetch(tokenUrl, {
      headers: { Metadata: "true" },
    });

    if (!tokenResp.ok) {
      // Fallback: try getting token from environment
      const envToken = process.env.AZURE_ACCESS_TOKEN;
      if (envToken) {
        cachedToken = envToken;
        tokenExpiry = Date.now() + 55 * 60 * 1000;
        return cachedToken;
      }
      throw new Error(`Failed to get token from IMDS: ${tokenResp.status}`);
    }

    const tokenData = await tokenResp.json();
    const armToken = tokenData.access_token;

    // Now use ARM to get VI token
    const url = `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.VideoIndexer/accounts/${RESOURCE_NAME}/generateAccessToken?api-version=2024-01-01`;

    const viResp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${armToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permissionType: "Contributor", scope: "Account" }),
    });

    if (!viResp.ok) {
      const errText = await viResp.text();
      throw new Error(`Failed to get VI token: ${viResp.status} ${errText}`);
    }

    const data = await viResp.json();
    cachedToken = data.accessToken;
    tokenExpiry = Date.now() + 55 * 60 * 1000;
    context.log("[VI] Got access token");
    return cachedToken;
  } catch (err) {
    context.log.error(`[VI] Failed to get access token: ${err.message}`);
    throw err;
  }
}

module.exports = async function (context, req) {
  const action = context.bindingData.action;

  try {
    const token = await getAccessToken(context);

    if (action === "upload") {
      // Upload a video URL for indexing
      const { videoUrl, videoName, language } = req.body || {};
      if (!videoUrl) {
        context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { error: "videoUrl is required" } };
        return;
      }

      const params = new URLSearchParams({
        name: videoName || `segment-${Date.now()}`,
        language: language || "en",
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        context.log.error(`[VI] Upload failed (${response.status}): ${errorText}`);
        context.res = { status: response.status, headers: { "Content-Type": "application/json" }, body: { error: errorText } };
        return;
      }

      const data = await response.json();
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { videoId: data.id, message: "Video uploaded for indexing" },
      };

    } else if (action === "status") {
      // Check indexing status
      const videoId = req.query.videoId;
      if (!videoId) {
        context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { error: "videoId is required" } };
        return;
      }

      const response = await fetch(
        `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos/${videoId}/State`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        context.res = { status: response.status, headers: { "Content-Type": "application/json" }, body: { error: "Failed to get status" } };
        return;
      }

      const data = await response.json();
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: data,
      };

    } else if (action === "insights") {
      // Get full insights for a video
      const videoId = req.query.videoId;
      if (!videoId) {
        context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { error: "videoId is required" } };
        return;
      }

      const response = await fetch(
        `${VI_API_BASE}/${VI_LOCATION}/Accounts/${VI_ACCOUNT_ID}/Videos/${videoId}/Index`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        context.res = { status: response.status, headers: { "Content-Type": "application/json" }, body: { error: "Failed to get insights" } };
        return;
      }

      const data = await response.json();
      const video = data.videos?.[0];

      // Extract key insights
      const insights = {
        videoId: data.id,
        state: data.state,
        duration: data.duration,
        transcript: video?.transcript?.items?.map(i => ({
          text: i.text,
          startTime: i.startTime,
          endTime: i.endTime,
          confidence: i.confidence,
        })) || [],
        ocr: video?.insights?.ocr?.map(i => ({
          text: i.text,
          startTime: i.startTime,
          confidence: i.confidence,
        })) || [],
        scenes: video?.insights?.scenes?.map(i => ({
          id: i.id,
          startTime: i.startTime,
          endTime: i.endTime,
          description: i.description,
        })) || [],
        topics: video?.insights?.topics?.map(i => ({
          name: i.name,
          confidence: i.confidence,
        })) || [],
        labels: video?.insights?.labels?.map(i => ({
          name: i.name,
          confidence: i.confidence,
        })) || [],
      };

      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: insights,
      };

    } else {
      context.res = { status: 404, headers: { "Content-Type": "application/json" }, body: { error: `Unknown action: ${action}` } };
    }

  } catch (err) {
    context.log.error(`[VideoIndexer] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message },
    };
  }
};
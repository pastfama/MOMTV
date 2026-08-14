// Azure Function proxy for Azure AI Content Understanding
// Provides fast image analysis via the synchronous Content Understanding API

const VISION_ENDPOINT = process.env.VISION_ENDPOINT || "https://cog-cdwzd6d3oc77y.cognitiveservices.azure.com";
const VISION_KEY = process.env.VISION_KEY || process.env.FOUNDRY_API_KEY || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://momtv.surge.sh",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  try {
    const { imageBase64, imageUrl } = req.body || {};

    if (!imageBase64 && !imageUrl) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: { error: "Provide imageBase64 (data URL) or imageUrl" },
      };
      return;
    }

    let analysisResult;

    if (imageBase64) {
      // Send binary image data to Content Understanding synchronous API
      // Strip the data URL prefix to get raw base64
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const imageBuffer = Buffer.from(base64Data, "base64");

      const response = await fetch(
        `${VISION_ENDPOINT}/contentunderstanding/analyzers/prebuilt-imageAnalyzer:analyzeBinaryInline?api-version=2026-06-01-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Ocp-Apim-Subscription-Key": VISION_KEY,
          },
          body: imageBuffer,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        context.log.error(`[VisionProxy] Content Understanding error (${response.status}): ${errorText}`);
        // Fall back to Computer Vision API
        analysisResult = await analyzeWithComputerVision(base64Data, context);
      } else {
        analysisResult = await response.json();
      }
    } else if (imageUrl) {
      // Send image URL to Content Understanding API
      const response = await fetch(
        `${VISION_ENDPOINT}/contentunderstanding/analyzers/prebuilt-imageAnalyzer:analyze?api-version=2026-06-01-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": VISION_KEY,
          },
          body: JSON.stringify({ url: imageUrl }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        context.log.error(`[VisionProxy] Content Understanding error (${response.status}): ${errorText}`);
        analysisResult = await analyzeWithComputerVisionUrl(imageUrl, context);
      } else {
        analysisResult = await response.json();
      }
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: analysisResult,
    };
  } catch (err) {
    context.log.error(`[VisionProxy] Error: ${err.message}`);
    context.res = {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: { error: err.message },
    };
  }
};

// Fallback: Use Computer Vision v4.0 API
async function analyzeWithComputerVision(base64Data, context) {
  const imageBuffer = Buffer.from(base64Data, "base64");

  const response = await fetch(
    `${VISION_ENDPOINT}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read,tags,objects&language=en`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Ocp-Apim-Subscription-Key": VISION_KEY,
      },
      body: imageBuffer,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Computer Vision error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Normalize to a consistent format
  return normalizeVisionResult(data);
}

async function analyzeWithComputerVisionUrl(imageUrl, context) {
  const response = await fetch(
    `${VISION_ENDPOINT}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read,tags,objects&language=en`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": VISION_KEY,
      },
      body: JSON.stringify({ url: imageUrl }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Computer Vision error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return normalizeVisionResult(data);
}

function normalizeVisionResult(data) {
  // Extract caption
  const caption = data.captionResult?.text || data.caption?.text || "";
  const captionConfidence = data.captionResult?.confidence || data.caption?.confidence || 0;

  // Extract tags
  const tags = (data.tagsResult?.values || data.tags || []).map(t => ({
    name: t.name,
    confidence: t.confidence,
  }));

  // Extract objects
  const objects = (data.objectsResult?.values || data.objects || []).map(o => ({
    name: o.tags?.[0]?.name || o.name || "unknown",
    confidence: o.tags?.[0]?.confidence || o.confidence || 0,
  }));

  // Extract text (OCR)
  const textBlocks = [];
  if (data.readResult?.blocks) {
    for (const block of data.readResult.blocks) {
      for (const line of block.lines || []) {
        textBlocks.push(line.text);
      }
    }
  }

  return {
    caption,
    captionConfidence,
    tags,
    objects,
    text: textBlocks,
    raw: data,
  };
}
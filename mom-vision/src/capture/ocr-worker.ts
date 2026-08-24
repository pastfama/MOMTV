// ============================================================
// mom-vision — OCR Worker
// ============================================================
// Azure AI Vision Read API for text extraction from stream frames
// ============================================================

import type { OcrCapture, TextRegion } from './types.js';

const VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT!;
const VISION_KEY = process.env.AZURE_VISION_KEY!;

export class OcrWorker {
  /**
   * Extract text from a stream frame using Azure AI Vision Read API
   */
  async captureFrame(imageBase64: string, channel: string): Promise<OcrCapture> {
    // Call Azure AI Vision Read API
    const response = await fetch(
      `${VISION_ENDPOINT}/vision/v3.2/read/analyze?language=ru`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': VISION_KEY,
        },
        body: JSON.stringify({
          url: `data:image/jpeg;base64,${imageBase64}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    // Get operation ID from response header
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No Operation-Location header');
    }

    const operationId = operationLocation.split('/').pop();

    // Poll for results
    let result: any;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(
        `${VISION_ENDPOINT}/vision/v3.2/read/analyzeResults/${operationId}`,
        {
          headers: { 'Ocp-Apim-Subscription-Key': VISION_KEY },
        }
      );

      result = await pollResponse.json();

      if (result.status === 'succeeded') break;
      if (result.status === 'failed') {
        throw new Error('OCR analysis failed');
      }

      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('OCR timeout');
    }

    // Parse results
    const regions: TextRegion[] = [];
    const text: string[] = [];

    for (const page of result.analyzeResult.readResults) {
      for (const line of page.lines) {
        text.push(line.text);
        regions.push({
          text: line.text,
          confidence: line.confidence || 0,
          boundingBox: {
            x: line.boundingBox[0],
            y: line.boundingBox[1],
            width: line.boundingBox[4] - line.boundingBox[0],
            height: line.boundingBox[5] - line.boundingBox[1],
          },
        });
      }
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      channel,
      text,
      regions,
      language: this.detectLanguage(text),
    };
  }

  /**
   * Detect language from text content
   */
  private detectLanguage(text: string[]): 'ru' | 'en' | 'mixed' {
    const hasRussian = text.some((t) => /[а-яА-Я]/.test(t));
    const hasEnglish = text.some((t) => /[a-zA-Z]/.test(t));

    if (hasRussian && hasEnglish) return 'mixed';
    if (hasRussian) return 'ru';
    return 'en';
  }
}

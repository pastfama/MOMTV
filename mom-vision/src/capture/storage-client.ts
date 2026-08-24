// ============================================================
// mom-vision — Storage Client
// ============================================================
// Hybrid storage: Cosmos DB (fast) + Blob Storage (cheap)
// ============================================================

import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import type { OcrCapture, AudioTranscript, StreamHighlight, StreamState } from './types.js';

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT!;
const COSMOS_KEY = process.env.COSMOS_KEY!;
const BLOB_CONNECTION = process.env.BLOB_CONNECTION!;

export class StorageClient {
  private cosmosClient: CosmosClient;
  private blobService: BlobServiceClient;
  private databaseId = 'stream-capture';

  constructor() {
    this.cosmosClient = new CosmosClient({
      endpoint: COSMOS_ENDPOINT,
      key: COSMOS_KEY,
    });
    this.blobService = BlobServiceClient.fromConnectionString(BLOB_CONNECTION);
  }

  /**
   * Store OCR capture in Cosmos DB
   */
  async storeOcr(capture: OcrCapture): Promise<void> {
    const container = this.cosmosClient
      .database(this.databaseId)
      .container('ocr-captures');
    await container.items.upsert(capture);
  }

  /**
   * Store transcript in Cosmos DB
   */
  async storeTranscript(transcript: AudioTranscript): Promise<void> {
    const container = this.cosmosClient
      .database(this.databaseId)
      .container('transcripts');
    await container.items.upsert(transcript);
  }

  /**
   * Store highlight in Cosmos DB
   */
  async storeHighlight(highlight: StreamHighlight): Promise<void> {
    const container = this.cosmosClient
      .database(this.databaseId)
      .container('highlights');
    await container.items.upsert(highlight);
  }

  /**
   * Upload 1080p highlight frame to Blob Storage
   */
  async uploadHighlightFrame(
    highlightId: string,
    imageBuffer: Buffer
  ): Promise<string> {
    const containerClient = this.blobService.getContainerClient('highlights');
    const blockBlobClient = containerClient.getBlockBlobClient(`${highlightId}.jpg`);
    await blockBlobClient.upload(imageBuffer, imageBuffer.length);
    return blockBlobClient.url;
  }

  /**
   * Upload audio chunk to Blob Storage
   */
  async uploadAudioChunk(
    chunkId: string,
    audioBuffer: Buffer
  ): Promise<string> {
    const containerClient = this.blobService.getContainerClient('audio-chunks');
    const blockBlobClient = containerClient.getBlockBlobClient(`${chunkId}.wav`);
    await blockBlobClient.upload(audioBuffer, audioBuffer.length);
    return blockBlobClient.url;
  }

  /**
   * Get current stream state from Cosmos DB
   */
  async getStreamState(): Promise<StreamState | null> {
    try {
      const container = this.cosmosClient
        .database(this.databaseId)
        .container('stream-state');
      const { resource } = await container.item('current', 'current').read();
      return resource as StreamState;
    } catch {
      return null;
    }
  }

  /**
   * Set current stream state in Cosmos DB
   */
  async setStreamState(state: StreamState): Promise<void> {
    const container = this.cosmosClient
      .database(this.databaseId)
      .container('stream-state');
    await container.items.upsert(state);
  }
}

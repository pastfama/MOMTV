// ============================================================
// mom-vision — Structured Logger
// ============================================================
// Application Insights + Console logging for 24/7 monitoring
// ============================================================

import * as appInsights from 'applicationinsights';

let client: appInsights.TelemetryClient | null = null;

/**
 * Initialize Application Insights
 */
export function initLogger(connectionString?: string): void {
  const connStr = connectionString || process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '';
  
  if (connStr) {
    appInsights.setup(connStr)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(false)
      .start();
    
    client = appInsights.defaultClient;
    console.log('[Logger] Application Insights initialized');
  } else {
    console.log('[Logger] No connection string - using console only');
  }
}

/**
 * Log a capture event
 */
export function logCapture(event: {
  channel: string;
  type: 'ocr' | 'audio' | 'highlight';
  captureCount: number;
  durationMs?: number;
  confidence?: number;
  error?: string;
}): void {
  // Console log
  console.log(`[Capture] ${event.type}: ${event.channel} #${event.captureCount}${event.error ? ' ERROR: ' + event.error : ''}`);
  
  // Application Insights custom event
  if (client) {
    client.trackEvent({
      name: 'StreamCapture',
      properties: {
        channel: event.channel,
        captureType: event.type,
        captureCount: event.captureCount,
        durationMs: event.durationMs,
        confidence: event.confidence,
        error: event.error,
      },
    });
    
    // Track metric
    client.trackMetric({
      name: 'CaptureCount',
      value: 1,
      properties: { channel: event.channel, type: event.type },
    });
  }
}

/**
 * Log a channel switch event
 */
export function logChannelSwitch(event: {
  from: string;
  to: string;
  reason: string;
  isLive: boolean;
}): void {
  console.log(`[Channel] Switch: ${event.from} → ${event.to} (${event.reason})`);
  
  if (client) {
    client.trackEvent({
      name: 'ChannelSwitch',
      properties: {
        from: event.from,
        to: event.to,
        reason: event.reason,
        isLive: event.isLive,
      },
    });
  }
}

/**
 * Log a stream status check
 */
export function logStreamCheck(event: {
  channel: string;
  isLive: boolean;
  viewerCount?: number;
}): void {
  console.log(`[Stream] ${event.channel}: ${event.isLive ? 'LIVE' : 'OFFLINE'}${event.viewerCount ? ` (${event.viewerCount} viewers)` : ''}`);
  
  if (client) {
    client.trackEvent({
      name: 'StreamCheck',
      properties: {
        channel: event.channel,
        isLive: event.isLive,
        viewerCount: event.viewerCount,
      },
    });
  }
}

/**
 * Log an error
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  console.error(`[Error] ${error.message}`, context);
  
  if (client) {
    client.trackException({
      exception: error,
      properties: context,
    });
  }
}

/**
 * Track a custom metric
 */
export function trackMetric(name: string, value: number, properties?: Record<string, string>): void {
  if (client) {
    client.trackMetric({ name, value, properties });
  }
}

/**
 * Flush pending telemetry
 */
export async function flushLogger(): Promise<void> {
  if (client) {
    await client.flush();
  }
}

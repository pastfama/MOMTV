// ============================================================
// MOM TV — Azure Agent Client
// ============================================================
// Connects to Azure AI Foundry agents via the Responses API.
// Streams real-time analysis from each agent.
// ============================================================

import { getToken } from "./auth.js";

export interface AgentConfig {
  name: string;
  displayName: string;
  endpoint: string;
}

export interface AgentResponse {
  agent: string;
  content: string;
  timestamp: number;
}

export type AgentResponseHandler = (response: AgentResponse) => void;

// Use the Azure Function proxy to avoid CORS issues with the Foundry endpoint.
// The proxy runs at /api/agents/{agentName} on the same origin.
const PROXY_BASE = "/api/agents";

export const AGENTS: Record<string, AgentConfig> = {
  "stream-monitor": {
    name: "stream-monitor",
    displayName: "Stream Monitor",
    endpoint: `${PROXY_BASE}/stream-monitor?api-version=v1`,
  },
  "content-analyzer": {
    name: "content-analyzer",
    displayName: "Content Analyzer",
    endpoint: `${PROXY_BASE}/content-analyzer?api-version=v1`,
  },
  "chat-pulse": {
    name: "chat-pulse",
    displayName: "Chat Pulse",
    endpoint: `${PROXY_BASE}/chat-pulse?api-version=v1`,
  },
  "show-producer": {
    name: "show-producer",
    displayName: "Show Producer",
    endpoint: `${PROXY_BASE}/show-producer?api-version=v1`,
  },
  "art-director": {
    name: "art-director",
    displayName: "Art Director",
    endpoint: `${PROXY_BASE}/art-director?api-version=v1`,
  },
  "meta-agent": {
    name: "meta-agent",
    displayName: "Meta-Agent",
    endpoint: `${PROXY_BASE}/meta-agent?api-version=v1`,
  },
  "director": {
    name: "director",
    displayName: "Director",
    endpoint: `${PROXY_BASE}/director?api-version=v1`,
  },
  "agent-fib": {
    name: "agent-fib",
    displayName: "Agent FIB",
    endpoint: `${PROXY_BASE}/agent-fib?api-version=v1`,
  },
  "stream-watcher": {
    name: "stream-watcher",
    displayName: "Stream Watcher",
    // Not a Foundry agent — this is a local client-side agent.
    // Endpoint is unused; the StreamWatcher class handles communication directly.
    endpoint: "",
  },
};

export class AgentClient {
  private handlers: AgentResponseHandler[] = [];
  private activeSessions: Map<string, string> = new Map(); // agent -> response_id
  // API key no longer needed in frontend — handled by the Azure Function proxy
  private apiKey: string = "";

  onResponse(handler: AgentResponseHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Send a command to an agent and stream the response.
   */
  async sendCommand(
    agentName: string,
    message: string,
  ): Promise<void> {
    const agent = AGENTS[agentName];
    if (!agent) {
      console.error(`[AgentClient] Unknown agent: ${agentName}`);
      return;
    }

    const previousResponseId = this.activeSessions.get(agentName);

    const body: Record<string, unknown> = {
      input: message,
      store: true,
      background: true,
    };

    if (previousResponseId) {
      body.previous_response_id = previousResponseId;
    }

    try {
      console.log(`[AgentClient] Sending to ${agent.displayName}: "${message.slice(0, 50)}..."`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (this.apiKey) {
        headers["api-key"] = this.apiKey;
      }

      const response = await fetch(agent.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AgentClient] ${agent.displayName} error (${response.status}): ${errorText}`);
        return;
      }

      const data = await response.json() as { id?: string; status?: string; output?: unknown };
      console.log(`[AgentClient] ${agent.displayName} response:`, JSON.stringify(data).slice(0, 500));

      if (data.id) {
        this.activeSessions.set(agentName, data.id);
        console.log(`[AgentClient] ${agent.displayName} response ID: ${data.id}`);

        // If the proxy returned a completed response (server-side polling), use it directly
        if (data.status === "completed" || data.status === "succeeded") {
          const text = this.extractText(data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }>);
          if (text) {
            this.emitResponse(agentName, text);
          }
        } else {
          // Poll for the background response
          await this.pollResponse(agentName, data.id);
        }
      } else if (data.output) {
        // Response came back immediately (not background)
        const text = this.extractText(data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }>);
        if (text) {
          this.emitResponse(agentName, text);
        }
      }

    } catch (err) {
      console.error(`[AgentClient] ${agent.displayName} connection error:`, err);
    }
  }

  /**
   * Poll a background response until completed.
   */
  private async pollResponse(agentName: string, responseId?: string): Promise<void> {
    if (!responseId) return;

    const agent = AGENTS[agentName];
    if (!agent) return;

    const pollUrl = `${agent.endpoint.split("?")[0]}/${responseId}`;

    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const pollHeaders: Record<string, string> = {};
        const pollToken = getToken();
        if (pollToken) {
          pollHeaders["Authorization"] = `Bearer ${pollToken}`;
        } else if (this.apiKey) {
          pollHeaders["api-key"] = this.apiKey;
        }
        const response = await fetch(pollUrl, { headers: pollHeaders });
        if (!response.ok) continue;

        const data = await response.json() as {
          status?: string;
          output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
        };

        if (data.status === "completed" || data.status === "succeeded") {
          // Extract text from output
          const text = this.extractText(data.output);
          if (text) {
            this.emitResponse(agentName, text);
          }
          return;
        }

        if (data.status === "failed" || data.status === "cancelled") {
          console.error(`[AgentClient] ${agent.displayName} response ${data.status}`);
          return;
        }

        // Still processing, extract partial if available
        const partialText = this.extractText(data.output);
        if (partialText) {
          this.emitResponse(agentName, partialText);
        }

      } catch {
        // Continue polling
      }
    }
  }

  /**
   * Extract text content from agent response output.
   */
  private extractText(output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>): string {
    if (!output) return "";

    const texts: string[] = [];
    for (const item of output) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.type === "output_text" && content.text) {
            texts.push(content.text);
          }
        }
      }
    }

    return texts.join("\n");
  }

  /**
   * Emit a response to all handlers.
   */
  private emitResponse(agentName: string, content: string): void {
    const response: AgentResponse = {
      agent: agentName,
      content,
      timestamp: Date.now(),
    };

    for (const handler of this.handlers) {
      try {
        handler(response);
      } catch (err) {
        console.error(`[AgentClient] Handler error:`, err);
      }
    }
  }

  /**
   * Start monitoring — send initial commands to all agents.
   * 
   * NOTE: Periodic scheduling is now handled server-side by Foundry Routines
   * (see azure.yaml: stream-capture, visual-analysis, sentiment-pulse, etc.).
   * The studio is a pure display layer — it only sends on-demand queries,
   * not polling intervals.
   */
  startMonitoring(channel: string, platform: string = "twitch"): void {
    console.log(`[AgentClient] Starting monitoring for ${channel} on ${platform}`);
    console.log(`[AgentClient] Note: periodic scheduling handled by Foundry Routines (server-side)`);

    // Initial commands to kick off monitoring
    this.sendCommand("stream-monitor", `Начни мониторинг стрима ${channel} на ${platform}`);
    this.sendCommand("content-analyzer", `Проанализируй контент стрима ${channel} на ${platform}`);
    this.sendCommand("chat-pulse", `Анализируй чат стрима ${channel} на ${platform}`);

    // Initial Director coordination (calls all agents via A2A)
    this.sendCommand("director", `Начни координацию стрима ${channel} на ${platform}. Вызови всех агентов через A2A и начни производство шоу.`);
  }

  /**
   * Request a manual coordination cycle from the Director.
   * Useful for on-demand updates without waiting for the next routine trigger.
   */
  requestCoordination(channel: string, platform: string = "twitch"): void {
    console.log(`[AgentClient] Requesting manual coordination for ${channel}`);
    this.sendCommand("director", `Проведи координацию: вызови всех агентов через A2A, собери данные, оцени ситуацию на стриме ${channel}, сгенерируй комментарии для ведущих.`);
  }
}
// ============================================================
// MOMTV Studio — Agent State Dashboard
// ============================================================
// MC-CIV-style observability: shows each agent's state, goals,
// memory, and relationships in real-time.
// ============================================================

export interface AgentDashboardData {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    lastAction: string;
    lastActionTime: number;
    goals: string[];
    mood: string;
    fame: number;
    recentInteractions: number;
  }>;
  worldState: {
    isLive: boolean;
    viewers: number;
    game: string;
    sentiment: string;
    eventsCount: number;
  };
  transactions: Array<{
    id: string;
    agentId: string;
    type: string;
    outcome: string;
    timestamp: number;
  }>;
}

export class AgentDashboard {
  private container: HTMLElement;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(containerId: string = "agent-panel") {
    this.container =
      document.getElementById(containerId) ?? this.createContainer();
  }

  async init(): Promise<void> {
    console.log("[AgentDashboard] Initializing agent dashboard...");
    this.render();
    this.startAutoRefresh();
    console.log("[AgentDashboard] Agent dashboard ready");
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async fetchData(): Promise<AgentDashboardData | null> {
    try {
      const [agentsResp, stateResp, txResp] = await Promise.all([
        fetch("/api/simulation/agents"),
        fetch("/api/simulation/state"),
        fetch("/api/simulation/transactions?limit=10"),
      ]);

      if (!agentsResp.ok || !stateResp.ok) return null;

      const agents = await agentsResp.json();
      const state = await stateResp.json();
      const transactions = txResp.ok ? await txResp.json() : [];

      return {
        agents: agents.map((a: Record<string, unknown>) => ({
          id: a.agentId as string,
          name: a.name as string,
          role: a.role as string,
          status: a.status as string,
          lastAction: a.lastAction as string,
          lastActionTime: a.lastActionTime as number,
          goals: a.goals as string[],
          mood: a.mood as string,
          fame: a.fame as number,
          recentInteractions: 0,
        })),
        worldState: {
          isLive: state.stream?.isLive ?? false,
          viewers: state.stream?.viewers ?? 0,
          game: state.stream?.game ?? "Unknown",
          sentiment: state.chat?.sentiment ?? "neutral",
          eventsCount: state.events?.length ?? 0,
        },
        transactions: transactions.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          agentId: t.agentId as string,
          type: t.type as string,
          outcome: t.outcome as string,
          timestamp: t.timestamp as number,
        })),
      };
    } catch {
      return null;
    }
  }

  private async render(): Promise<void> {
    this.container.innerHTML = "";

    const data = await this.fetchData();

    // Header
    const header = document.createElement("div");
    header.className = "agent-header";
    header.innerHTML = `
      <h3>🎭 Agent Swarm</h3>
      <div class="agent-header-actions">
        <button id="agent-refresh" class="agent-btn agent-btn-sm">↻ Refresh</button>
      </div>
    `;
    this.container.appendChild(header);

    document.getElementById("agent-refresh")?.addEventListener("click", () => this.render());

    if (!data) {
      this.container.innerHTML += '<div class="agent-empty">Simulation API unavailable</div>';
      this.injectStyles();
      return;
    }

    // World State Summary
    const worldSection = document.createElement("div");
    worldSection.className = "agent-section";
    worldSection.innerHTML = `
      <h4>🌍 World State</h4>
      <div class="agent-world-grid">
        <div class="agent-world-card">
          <span class="agent-world-label">Stream</span>
          <span class="agent-world-value ${data.worldState.isLive ? 'live' : 'offline'}">${data.worldState.isLive ? '🔴 LIVE' : '⚫ OFFLINE'}</span>
        </div>
        <div class="agent-world-card">
          <span class="agent-world-label">Viewers</span>
          <span class="agent-world-value">${data.worldState.viewers.toLocaleString()}</span>
        </div>
        <div class="agent-world-card">
          <span class="agent-world-label">Game</span>
          <span class="agent-world-value">${data.worldState.game}</span>
        </div>
        <div class="agent-world-card">
          <span class="agent-world-label">Sentiment</span>
          <span class="agent-world-value sentiment-${data.worldState.sentiment}">${data.worldState.sentiment}</span>
        </div>
        <div class="agent-world-card">
          <span class="agent-world-label">Events</span>
          <span class="agent-world-value">${data.worldState.eventsCount}</span>
        </div>
      </div>
    `;
    this.container.appendChild(worldSection);

    // Agent Cards
    const agentsSection = document.createElement("div");
    agentsSection.className = "agent-section";
    agentsSection.innerHTML = `
      <h4>👥 Agents (${data.agents.length})</h4>
      <div class="agent-cards-grid">
        ${data.agents.map(agent => `
          <div class="agent-card status-${agent.status}">
            <div class="agent-card-header">
              <span class="agent-status-dot ${agent.status}"></span>
              <span class="agent-card-name">${agent.name}</span>
              <span class="agent-card-role">${agent.role}</span>
            </div>
            <div class="agent-card-body">
              <div class="agent-card-field"><span>Mood:</span> ${agent.mood}</div>
              <div class="agent-card-field"><span>Fame:</span> ${agent.fame}</div>
              <div class="agent-card-field"><span>Last:</span> ${agent.lastAction || "none"}</div>
              <div class="agent-card-field"><span>Goals:</span> ${agent.goals.slice(0, 2).join(", ")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    this.container.appendChild(agentsSection);

    // Recent Transactions
    if (data.transactions.length > 0) {
      const txSection = document.createElement("div");
      txSection.className = "agent-section";
      txSection.innerHTML = `
        <h4>📝 Recent Transactions</h4>
        <div class="agent-transactions">
          ${data.transactions.slice(0, 5).map(tx => `
            <div class="agent-tx-item outcome-${tx.outcome}">
              <span class="agent-tx-agent">${tx.agentId}</span>
              <span class="agent-tx-type">${tx.type}</span>
              <span class="agent-tx-outcome">${tx.outcome}</span>
              <span class="agent-tx-time">${new Date(tx.timestamp).toLocaleTimeString()}</span>
            </div>
          `).join("")}
        </div>
      `;
      this.container.appendChild(txSection);
    }

    this.injectStyles();
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => this.render(), 10_000);
  }

  private createContainer(): HTMLElement {
    const el = document.createElement("div");
    el.id = "agent-panel";
    el.className = "agent-dashboard";
    document.body.appendChild(el);
    return el;
  }

  private injectStyles(): void {
    if (document.getElementById("agent-dashboard-styles")) return;
    const style = document.createElement("style");
    style.id = "agent-dashboard-styles";
    style.textContent = `
      .agent-dashboard {
        position: fixed;
        left: 0;
        top: 0;
        width: 320px;
        height: 100vh;
        background: rgba(15, 15, 25, 0.95);
        color: #e0e0e0;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 12px;
        overflow-y: auto;
        z-index: 10000;
        border-right: 1px solid rgba(255,255,255,0.1);
        padding: 12px;
        box-sizing: border-box;
      }
      .agent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .agent-header h3 { margin: 0; font-size: 14px; color: #fff; }
      .agent-btn {
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: #e0e0e0;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      .agent-btn:hover { background: rgba(255,255,255,0.1); }
      .agent-section { margin-bottom: 12px; }
      .agent-section h4 { margin: 0 0 6px 0; font-size: 12px; color: #fff; }
      .agent-world-grid { display: flex; flex-wrap: wrap; gap: 4px; }
      .agent-world-card {
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
        padding: 4px 8px;
        flex: 1;
        min-width: 60px;
      }
      .agent-world-label { display: block; font-size: 10px; color: #888; }
      .agent-world-value { font-weight: 600; color: #fff; font-size: 11px; }
      .agent-world-value.live { color: #ef4444; }
      .agent-world-value.offline { color: #6b7280; }
      .sentiment-positive { color: #22c55e; }
      .sentiment-negative { color: #ef4444; }
      .sentiment-excited { color: #f59e0b; }
      .agent-cards-grid { display: flex; flex-direction: column; gap: 4px; }
      .agent-card {
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
        padding: 6px 8px;
        border-left: 3px solid #6b7280;
      }
      .agent-card.status-speaking { border-left-color: #22c55e; }
      .agent-card.status-thinking { border-left-color: #f59e0b; }
      .agent-card-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .agent-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #6b7280;
      }
      .agent-status-dot.speaking { background: #22c55e; }
      .agent-status-dot.thinking { background: #f59e0b; }
      .agent-card-name { font-weight: 600; color: #fff; font-size: 11px; }
      .agent-card-role { color: #888; font-size: 10px; }
      .agent-card-body { font-size: 10px; color: #aaa; }
      .agent-card-field { margin: 1px 0; }
      .agent-card-field span { color: #666; }
      .agent-transactions { display: flex; flex-direction: column; gap: 3px; }
      .agent-tx-item {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 10px;
        padding: 3px 6px;
        background: rgba(255,255,255,0.03);
        border-radius: 3px;
      }
      .agent-tx-agent { color: #60a5fa; font-weight: 600; }
      .agent-tx-type { color: #888; }
      .agent-tx-outcome { color: #22c55e; }
      .agent-tx-outcome.failure { color: #ef4444; }
      .agent-tx-time { color: #666; margin-left: auto; }
      .agent-empty { color: #666; font-style: italic; padding: 12px; text-align: center; }
    `;
    document.head.appendChild(style);
  }
}
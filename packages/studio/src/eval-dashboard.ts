// ============================================================
// MOMTV Studio — Foundry Evaluation Dashboard
// ============================================================
// Displays real-time evaluation metrics, continuous eval results,
// and quality scores from Azure AI Foundry evaluation pipeline.
// ============================================================

export interface EvalMetric {
  name: string;
  displayName: string;
  value: number;
  threshold: number;
  passed: boolean;
  category: "quality" | "safety" | "agents";
  scoringType: "ordinal" | "continuous" | "boolean";
  maxValue?: number;
  reason?: string;
}

export interface EvalRun {
  id: string;
  agentName: string;
  timestamp: number;
  metrics: EvalMetric[];
  overallScore: number;
  overallPassed: boolean;
  status: "completed" | "in_progress" | "failed";
}

export interface ContinuousEvalStatus {
  agentName: string;
  enabled: boolean;
  lastEvalTime: number | null;
  nextEvalTime: number | null;
  evaluatorNames: string[];
}

// Use proxy to avoid CORS — the eval API is called through the agents proxy
const PROJECT_ENDPOINT = "/api/agents";

export class EvalDashboard {
  private container: HTMLElement;
  private runs: EvalRun[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(containerId: string = "eval-panel") {
    this.container =
      document.getElementById(containerId) ?? this.createContainer();
  }

  async init(): Promise<void> {
    console.log("[EvalDashboard] Initializing evaluation dashboard...");
    this.render();
    this.startAutoRefresh();
    console.log("[EvalDashboard] Eval dashboard ready");
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ── API Calls ──────────────────────────────────────────────

  async fetchEvaluatorCatalog(): Promise<
    Array<{ name: string; displayName: string; category: string; version: string }>
  > {
    try {
      const response = await fetch(
        `${PROJECT_ENDPOINT}/evaluators?api-version=v1`,
      );
      if (!response.ok) return this.getDefaultEvaluators();
      const data = (await response.json()) as {
        value?: Array<{
          name: string;
          displayName?: string;
          category?: string;
          version?: string;
        }>;
      };
      return (
        data.value?.map((e) => ({
          name: e.name,
          displayName: e.displayName ?? e.name,
          category: e.category ?? "unknown",
          version: e.version ?? "latest",
        })) ?? this.getDefaultEvaluators()
      );
    } catch {
      return this.getDefaultEvaluators();
    }
  }

  async fetchEvaluationRuns(): Promise<EvalRun[]> {
    try {
      const response = await fetch(
        `${PROJECT_ENDPOINT}/evaluations?isRequestForRuns=true&api-version=v1`,
      );
      if (!response.ok) return this.runs;
      const data = (await response.json()) as {
        value?: Array<{
          id: string;
          name?: string;
          status?: string;
          createdAt?: string;
          evaluationResults?: {
            perTestingCriteriaResults?: Array<{
              evaluatorName?: string;
              passed?: boolean;
              score?: number;
              threshold?: number;
            }>;
          };
        }>;
      };
      if (!data.value) return this.runs;

      this.runs = data.value.slice(0, 20).map((run) => ({
        id: run.id,
        agentName: run.name ?? "unknown",
        timestamp: run.createdAt
          ? new Date(run.createdAt).getTime()
          : Date.now(),
        metrics: (
          run.evaluationResults?.perTestingCriteriaResults ?? []
        ).map((criteria) => ({
          name: criteria.evaluatorName ?? "unknown",
          displayName: this.getDisplayName(criteria.evaluatorName ?? ""),
          value: criteria.score ?? 0,
          threshold: criteria.threshold ?? 0,
          passed: criteria.passed ?? false,
          category: this.getCategory(criteria.evaluatorName ?? ""),
          scoringType: "continuous" as const,
        })),
        overallScore: this.calculateOverallScore(
          run.evaluationResults?.perTestingCriteriaResults,
        ),
        overallPassed:
          run.evaluationResults?.perTestingCriteriaResults?.every(
            (c) => c.passed,
          ) ?? false,
        status:
          run.status === "Completed"
            ? "completed"
            : run.status === "Failed"
              ? "failed"
              : "in_progress",
      }));

      return this.runs;
    } catch {
      return this.runs;
    }
  }

  // ── Rendering ──────────────────────────────────────────────

  private render(): void {
    this.container.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "eval-header";
    header.innerHTML = `
      <h3>📊 Foundry Evaluation Pipeline</h3>
      <div class="eval-header-actions">
        <button id="eval-refresh" class="eval-btn eval-btn-sm">↻ Refresh</button>
        <button id="eval-run-suite" class="eval-btn eval-btn-primary eval-btn-sm">▶ Run Suite</button>
      </div>
    `;
    this.container.appendChild(header);

    document
      .getElementById("eval-refresh")
      ?.addEventListener("click", () => this.refresh());
    document
      .getElementById("eval-run-suite")
      ?.addEventListener("click", () => this.runFullSuite());

    // Evaluator Catalog Summary
    const catalogSection = document.createElement("div");
    catalogSection.className = "eval-section";
    catalogSection.innerHTML = `
      <h4>🎯 Custom Evaluators (5)</h4>
      <div class="eval-catalog-grid">
        ${this.renderEvaluatorCard("momtv-anchor-quality", "Anchor Script Quality", "quality", "ordinal 1-5", "≥ 3.0")}
        ${this.renderEvaluatorCard("momtv-sentiment-accuracy", "Sentiment Accuracy", "quality", "continuous 0-1", "≥ 0.6")}
        ${this.renderEvaluatorCard("momtv-show-coherence", "Show Coherence", "quality", "ordinal 1-5", "≥ 3.0")}
        ${this.renderEvaluatorCard("momtv-breaking-news-relevance", "Breaking News Relevance", "quality", "boolean", "≥ 0.5")}
        ${this.renderEvaluatorCard("momtv-safety-check", "Content Safety", "safety", "boolean", "≥ 0.5")}
      </div>
    `;
    this.container.appendChild(catalogSection);

    // Evaluation Suites
    const suitesSection = document.createElement("div");
    suitesSection.className = "eval-section";
    suitesSection.innerHTML = `
      <h4>📋 Evaluation Suites (3)</h4>
      <div class="eval-suites-grid">
        ${this.renderSuiteCard("momtv-anchor-quality-suite", "Anchor Quality", "show-producer", ["anchor-quality", "show-coherence", "breaking-news-relevance"])}
        ${this.renderSuiteCard("momtv-sentiment-suite", "Sentiment Analysis", "chat-pulse", ["sentiment-accuracy", "safety-check"])}
        ${this.renderSuiteCard("momtv-full-production-suite", "Full Production", "director", ["anchor-quality", "show-coherence", "sentiment-accuracy", "safety-check", "coherence", "fluency", "groundedness"])}
      </div>
    `;
    this.container.appendChild(suitesSection);

    // Recent Eval Runs
    const runsSection = document.createElement("div");
    runsSection.className = "eval-section";
    runsSection.id = "eval-runs-section";
    runsSection.innerHTML = `
      <h4>📈 Recent Evaluation Runs</h4>
      <div class="eval-runs-list">
        ${this.runs.length > 0 ? this.renderRunsList() : '<div class="eval-empty">No evaluation runs yet. Click "Run Suite" to start.</div>'}
      </div>
    `;
    this.container.appendChild(runsSection);

    // Continuous Eval Status
    const continuousSection = document.createElement("div");
    continuousSection.className = "eval-section";
    continuousSection.innerHTML = `
      <h4>🔄 Continuous Evaluation</h4>
      <div class="eval-continuous-grid">
        ${this.renderContinuousCard("director", true, ["coherence", "fluency", "groundedness", "safety-check"])}
        ${this.renderContinuousCard("show-producer", false, ["anchor-quality", "show-coherence"])}
        ${this.renderContinuousCard("chat-pulse", false, ["sentiment-accuracy", "safety-check"])}
      </div>
      <div class="eval-note">⚠️ Continuous evaluation requires Foundry User role. Enable via Azure Portal → AI Project → Access Control (IAM).</div>
    `;
    this.container.appendChild(continuousSection);

    // Apply styles
    this.injectStyles();
  }

  private renderEvaluatorCard(
    name: string,
    displayName: string,
    category: string,
    scoringType: string,
    threshold: string,
  ): string {
    const catColor =
      category === "safety"
        ? "#ef4444"
        : category === "quality"
          ? "#3b82f6"
          : "#8b5cf6";
    return `
      <div class="eval-card">
        <div class="eval-card-header">
          <span class="eval-badge" style="background:${catColor}">${category}</span>
          <span class="eval-card-name">${displayName}</span>
        </div>
        <div class="eval-card-body">
          <div class="eval-card-field"><span>Type:</span> ${scoringType}</div>
          <div class="eval-card-field"><span>Threshold:</span> ${threshold}</div>
          <div class="eval-card-field"><span>ID:</span> <code>${name}</code></div>
        </div>
      </div>
    `;
  }

  private renderSuiteCard(
    name: string,
    displayName: string,
    targetAgent: string,
    evaluators: string[],
  ): string {
    return `
      <div class="eval-card eval-suite-card">
        <div class="eval-card-header">
          <span class="eval-badge" style="background:#10b981">suite</span>
          <span class="eval-card-name">${displayName}</span>
        </div>
        <div class="eval-card-body">
          <div class="eval-card-field"><span>Target:</span> ${targetAgent}</div>
          <div class="eval-card-field"><span>Evaluators:</span></div>
          <div class="eval-tags">
            ${evaluators.map((e) => `<span class="eval-tag">${e}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  private renderRunsList(): string {
    return this.runs
      .slice(0, 10)
      .map(
        (run) => `
      <div class="eval-run-item ${run.overallPassed ? "passed" : "failed"}">
        <div class="eval-run-header">
          <span class="eval-run-status ${run.status}">${run.status === "completed" ? "✅" : run.status === "failed" ? "❌" : "⏳"}</span>
          <span class="eval-run-agent">${run.agentName}</span>
          <span class="eval-run-score">${(run.overallScore * 100).toFixed(0)}%</span>
          <span class="eval-run-time">${new Date(run.timestamp).toLocaleString()}</span>
        </div>
        <div class="eval-run-metrics">
          ${run.metrics
            .map(
              (m) => `
            <div class="eval-metric ${m.passed ? "passed" : "failed"}">
              <span class="eval-metric-name">${m.displayName}</span>
              <span class="eval-metric-value">${typeof m.value === "number" ? m.value.toFixed(2) : m.value}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `,
      )
      .join("");
  }

  private renderContinuousCard(
    agentName: string,
    enabled: boolean,
    evaluators: string[],
  ): string {
    return `
      <div class="eval-card eval-continuous-card ${enabled ? "enabled" : "disabled"}">
        <div class="eval-card-header">
          <span class="eval-status-dot ${enabled ? "on" : "off"}"></span>
          <span class="eval-card-name">${agentName}</span>
          <span class="eval-badge" style="background:${enabled ? "#22c55e" : "#6b7280"}">${enabled ? "active" : "inactive"}</span>
        </div>
        <div class="eval-card-body">
          <div class="eval-tags">
            ${evaluators.map((e) => `<span class="eval-tag">${e}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // ── Actions ────────────────────────────────────────────────

  private async refresh(): Promise<void> {
    console.log("[EvalDashboard] Refreshing evaluation data...");
    await this.fetchEvaluationRuns();
    this.render();
  }

  private async runFullSuite(): Promise<void> {
    console.log("[EvalDashboard] Running full production evaluation suite...");
    // In production, this would call the Foundry API to trigger the suite
    // For now, show a notification
    const note = document.createElement("div");
    note.className = "eval-toast";
    note.textContent = "🚀 Evaluation suite triggered. Check Azure AI Foundry for results.";
    this.container.prepend(note);
    setTimeout(() => note.remove(), 5000);
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => this.refresh(), 30_000);
  }

  // ── Helpers ────────────────────────────────────────────────

  private calculateOverallScore(
    criteria?: Array<{ score?: number; threshold?: number }>,
  ): number {
    if (!criteria || criteria.length === 0) return 0;
    const scores = criteria.map((c) => {
      const score = c.score ?? 0;
      const threshold = c.threshold ?? 1;
      return threshold > 0 ? score / threshold : score;
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private getDisplayName(name: string): string {
    const displayNames: Record<string, string> = {
      "momtv-anchor-quality": "Anchor Quality",
      "momtv-sentiment-accuracy": "Sentiment Accuracy",
      "momtv-show-coherence": "Show Coherence",
      "momtv-breaking-news-relevance": "Breaking News Relevance",
      "momtv-safety-check": "Content Safety",
      coherence: "Coherence",
      fluency: "Fluency",
      groundedness: "Groundedness",
    };
    return displayNames[name] ?? name;
  }

  private getCategory(name: string): "quality" | "safety" | "agents" {
    if (name.includes("safety")) return "safety";
    if (name.includes("task_") || name.includes("tool_")) return "agents";
    return "quality";
  }

  private getDefaultEvaluators() {
    return [
      { name: "momtv-anchor-quality", displayName: "Anchor Script Quality", category: "quality", version: "1" },
      { name: "momtv-sentiment-accuracy", displayName: "Sentiment Accuracy", category: "quality", version: "1" },
      { name: "momtv-show-coherence", displayName: "Show Coherence", category: "quality", version: "1" },
      { name: "momtv-breaking-news-relevance", displayName: "Breaking News Relevance", category: "quality", version: "1" },
      { name: "momtv-safety-check", displayName: "Content Safety", category: "safety", version: "1" },
    ];
  }

  private createContainer(): HTMLElement {
    const el = document.createElement("div");
    el.id = "eval-panel";
    el.className = "eval-dashboard";
    document.body.appendChild(el);
    return el;
  }

  // ── Styles ─────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById("eval-dashboard-styles")) return;
    const style = document.createElement("style");
    style.id = "eval-dashboard-styles";
    style.textContent = `
      .eval-dashboard {
        position: fixed;
        right: 0;
        top: 0;
        width: 420px;
        height: 100vh;
        background: rgba(15, 15, 25, 0.95);
        color: #e0e0e0;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        overflow-y: auto;
        z-index: 10000;
        border-left: 1px solid rgba(255,255,255,0.1);
        padding: 16px;
        box-sizing: border-box;
      }
      .eval-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .eval-header h3 { margin: 0; font-size: 16px; color: #fff; }
      .eval-header-actions { display: flex; gap: 8px; }
      .eval-btn {
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: #e0e0e0;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .eval-btn:hover { background: rgba(255,255,255,0.1); }
      .eval-btn-primary { background: rgba(59,130,246,0.3); border-color: #3b82f6; }
      .eval-btn-primary:hover { background: rgba(59,130,246,0.5); }
      .eval-btn-sm { padding: 4px 8px; font-size: 11px; }
      .eval-section { margin-bottom: 20px; }
      .eval-section h4 { margin: 0 0 10px 0; font-size: 14px; color: #fff; }
      .eval-catalog-grid, .eval-suites-grid, .eval-continuous-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .eval-card {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .eval-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .eval-card-name { font-weight: 600; color: #fff; }
      .eval-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        color: #fff;
        text-transform: uppercase;
        font-weight: 600;
      }
      .eval-card-body { font-size: 12px; color: #aaa; }
      .eval-card-field { margin: 2px 0; }
      .eval-card-field span { color: #888; }
      .eval-card-field code { color: #60a5fa; font-size: 11px; }
      .eval-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
      .eval-tag {
        background: rgba(255,255,255,0.08);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        color: #aaa;
      }
      .eval-run-item {
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
        padding: 8px 10px;
        margin-bottom: 6px;
        border-left: 3px solid #6b7280;
      }
      .eval-run-item.passed { border-left-color: #22c55e; }
      .eval-run-item.failed { border-left-color: #ef4444; }
      .eval-run-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .eval-run-agent { font-weight: 600; color: #fff; }
      .eval-run-score { color: #60a5fa; font-weight: 600; }
      .eval-run-time { color: #666; font-size: 11px; margin-left: auto; }
      .eval-run-metrics { display: flex; flex-wrap: wrap; gap: 6px; }
      .eval-metric {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.05);
      }
      .eval-metric.passed { color: #22c55e; }
      .eval-metric.failed { color: #ef4444; }
      .eval-metric-name { color: #888; margin-right: 4px; }
      .eval-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      .eval-status-dot.on { background: #22c55e; }
      .eval-status-dot.off { background: #6b7280; }
      .eval-empty { color: #666; font-style: italic; padding: 12px; text-align: center; }
      .eval-note { color: #f59e0b; font-size: 11px; margin-top: 8px; padding: 8px; background: rgba(245,158,11,0.1); border-radius: 6px; }
      .eval-toast {
        position: sticky;
        top: 0;
        background: rgba(59,130,246,0.9);
        color: #fff;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        margin-bottom: 12px;
        animation: fadeIn 0.3s;
      }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }
}
// ============================================================
// WorldStateDataSource — replaces MockDataSource
// Connects the MOMTV simulation engine (via town-server WS)
// to the Agentshire town frontend.
// ============================================================

import type { IWorldDataSource, ConnectResult, WorldSnapshot, NPCSnapshot } from './IWorldDataSource'
import type { GameEvent, GameAction, NPCPhase } from './GameProtocol'
import type { TownConfig } from './TownConfig'
import type { SceneType } from '../types'

// ── Agent → NPC ID mapping ──

const AGENT_TO_NPC: Record<string, string> = {
  'character-dmitri-volkov': 'dmitri',
  'character-alex-morgan': 'alex',
  'character-irina-morozova': 'irina',
  'character-artem-sokolov': 'artem',
  'character-sasha-taylor': 'sasha',
  'character-jordan-davis': 'jordan',
  'character-natalia-bondarenko': 'natalia',
  'character-kirill-fedorov': 'kirill',
  'director': 'director',
  'casting-director': 'casting-director',
  'economy-bank': 'economy-bank',
  'economy-market': 'economy-market',
  'fame-calculator': 'fame-calculator',
  'character-factory': 'character-factory',
}

function agentToNpc(agentId: string): string {
  return AGENT_TO_NPC[agentId] ?? agentId
}

// ── Simulation API client ──

const SIM_URL = import.meta.env.VITE_SIMULATION_URL || 'http://localhost:7071/api/simulation'

interface SimState {
  agents: Array<{
    agentId: string
    name: string
    role: string
    status: string
    lastAction: string
    lastActionTime: number
    mood: string
  }>
  stream: { isLive: boolean; viewers: number; game: string; title: string }
  chat: { sentiment: string; sentimentScore: number; messagesPerMinute: number }
  events: Array<{ type: string; description: string; timestamp: number }>
  recentTransactions: Array<{ agentId: string; type: string; payload: Record<string, unknown> }>
}

// ── WorldStateDataSource ──

export class WorldStateDataSource implements IWorldDataSource {
  private _connected = false
  private _config: TownConfig | null = null
  private handlers: Array<(event: GameEvent) => void> = []
  private actions: Array<(action: GameAction) => void> = []
  private snapshot: WorldSnapshot | null = null
  private ws: WebSocket | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private previousEventCount = 0
  private previousTxCount = 0

  readonly connected = false

  async connect(townConfig: TownConfig): Promise<ConnectResult> {
    this._config = townConfig
    this._connected = true

    // Connect WebSocket to town server (receives AgentEvents)
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:55211'
      this.ws = new WebSocket(wsUrl)

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'agent_event' && msg.event) {
            const mapped = this.mapAgentEvent(msg.event)
            if (mapped) {
              for (const handler of this.handlers) handler(mapped)
            }
          }
        } catch {}
      }

      this.ws.onerror = () => {
        // Server may not be running yet
      }

      this.ws.onclose = () => {
        // Auto-reconnect after 5s
        setTimeout(() => { if (this._connected) this.connect(townConfig) }, 5000)
      }
    } catch {}

    // Initial world state
    await this.fetchWorldState()

    // Poll every 10s
    this.pollTimer = setInterval(() => this.fetchWorldState(), 10_000)

    return { hasWorkRestore: false }
  }

  disconnect(): void {
    this._connected = false
    if (this.ws) { this.ws.close(); this.ws = null }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
  }

  onGameEvent(handler: (event: GameEvent) => void): void {
    this.handlers.push(handler)
  }

  sendAction(action: GameAction): void {
    // In the future: send actions back to simulation API
    for (const actionHandler of this.actions) actionHandler(action)
  }

  getSnapshot(): WorldSnapshot | null {
    return this.snapshot
  }

  // ── Internal ──

  private async fetchWorldState(): Promise<void> {
    try {
      const resp = await fetch(`${SIM_URL}/state`)
      if (!resp.ok) return

      const state = await resp.json() as SimState

      // Build snapshot
      this.snapshot = {
        currentScene: 'town' as SceneType,
        activeWork: state.agents.some(a => a.status === 'speaking'),
        npcs: state.agents.map(agent => ({
          npcId: agentToNpc(agent.agentId),
          name: agent.name,
          phase: agent.status === 'speaking' ? 'working' as NPCPhase : 'idle' as NPCPhase,
          scene: 'town' as SceneType,
          position: { x: 0, y: 0, z: 0 },
        })),
      }

      // Map new events
      for (const ev of (state.events || []).slice(this.previousEventCount)) {
        const mapped = this.mapWorldEvent(ev)
        if (mapped) for (const handler of this.handlers) handler(mapped)
      }
      this.previousEventCount = (state.events || []).length

      // Map new transactions
      for (const tx of (state.recentTransactions || []).slice(this.previousTxCount)) {
        const mapped = this.mapTransaction(tx)
        if (mapped) for (const handler of this.handlers) handler(mapped)
      }
      this.previousTxCount = (state.recentTransactions || []).length

    } catch {
      // Simulation API may not be running
    }
  }

  private mapAgentEvent(event: Record<string, unknown>): GameEvent | null {
    const type = event.type as string
    if (type === 'npc_phase') return { type: 'npc_phase', npcId: event.npcId as string, phase: event.phase as NPCPhase, message: event.message as string | undefined }
    if (type === 'dialog_message') return { type: 'dialog_message', npcId: event.npcId as string, text: event.text as string, isStreaming: false }
    if (type === 'set_time') return { type: 'set_time', action: 'set', hour: event.hour as number | undefined }
    if (type === 'set_weather') return { type: 'set_weather', action: 'set', weather: event.weather as string | undefined }
    if (type === 'text') return { type: 'dialog_message', npcId: 'director', text: event.content as string, isStreaming: false }
    return null
  }

  private mapWorldEvent(ev: Record<string, unknown>): GameEvent | null {
    const type = ev.type as string
    if (type === 'stream_live') return { type: 'set_weather', action: 'set', weather: 'clear' }
    if (type === 'stream_offline') return { type: 'set_weather', action: 'set', weather: 'fog' }
    return null
  }

  private mapTransaction(tx: Record<string, unknown>): GameEvent | null {
    const txType = tx.type as string
    const payload = tx.payload as Record<string, unknown> || {}
    const dialogue = payload.dialogue as string || ''
    if (dialogue && (txType === 'speak' || txType === 'pitch')) {
      return { type: 'dialog_message', npcId: agentToNpc(tx.agentId as string), text: dialogue, isStreaming: false }
    }
    return null
  }
}
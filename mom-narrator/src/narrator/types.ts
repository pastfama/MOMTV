export interface StreamState { id: string; channel: string; isLive: boolean; vodId: string | null; vodTitle: string | null; updatedAt: string; }
export interface NarratorDecision { action: string; newState: StreamState; reason: string; }
export interface ServiceEvent { type: string; timestamp: number; data: any; }

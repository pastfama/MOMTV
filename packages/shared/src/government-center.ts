// ============================================================
// MOMTV Government Center Mapper
// ============================================================
// Reads GovernmentConfig and maps agents to their government roles.
// Enhances agent instructions with branch/department/power identity.
// ============================================================

import type {
  GovernmentConfig,
  GovernmentBranch,
  CabinetRole,
  GovernmentPost,
  IndependentAgency,
  DEFAULT_GOVERNMENT_CONFIG,
} from "./government-config.js";

// ── Government Center State ──

export interface GovernmentCenterState {
  config: GovernmentConfig;
  posts: GovernmentPost[];
  activeBranches: GovernmentBranch[];
  agentDepartments: Map<string, {
    branch: GovernmentBranch;
    role: string;
    powers: string[];
    wing: string;
  }>;
  vetoHistory: Veto[];
  confirmationQueue: ConfirmationRequest[];
}

export interface Veto {
  id: string;
  timestamp: number;
  president: string;
  target: string;
  reason: string;
  overturned: boolean;
}

export interface ConfirmationRequest {
  id: string;
  characterId: string;
  nominatedBy: string; // House
  status: "pending" | "confirmed" | "rejected";
  senateVote: number;
  senateTotal: number;
}

// ── Government Center Class ──

export class GovernmentCenter {
  private state: GovernmentCenterState;
  private config: GovernmentConfig;

  constructor(config: GovernmentConfig) {
    this.config = config;
    this.state = {
      config,
      posts: this.buildPosts(config),
      activeBranches: ["legislative", "executive", "judicial"],
      agentDepartments: new Map(),
      vetoHistory: [],
      confirmationQueue: [],
    };

    this.mapAgentDepartments();
  }

  /**
   * Initialize from default config.
   */
  static fromDefault(): GovernmentCenter {
    const config = {
      branches: {
        legislative: {
          senate: {
            agent: "casting-director",
            role: "Senate — confirms character appointments",
            power: ["confirm_characters", "approve_transfers", "vetoes"],
          },
          house: {
            agent: "character-factory",
            role: "House — proposes new citizens",
            power: ["create_citizens", "nominate_characters"],
          },
        },
        executive: {
          president: {
            agent: "director",
            role: "President — central executive",
            power: ["veto", "set_agenda", "allocate_airtime"],
          },
          vicePresident: {
            agent: "show-producer",
            role: "Vice President — succession + production output",
            power: ["succession", "produce_content"],
          },
          cabinet: {
            treasury: {
              agent: "economy-bank",
              role: "Secretary of the Treasury",
              power: ["money_supply", "ledgers"],
            },
            commerce: {
              agent: "economy-market",
              role: "Secretary of Commerce",
              power: ["set_prices", "inflation_control"],
            },
            state: {
              agent: "character-factory",
              role: "Secretary of State",
              power: ["immigration"],
            },
            justice: {
              agent: "casting-director",
              role: "Attorney General",
              power: ["transfer_disputes"],
            },
            homeland: {
              agent: "stream-watcher",
              role: "Secretary of Homeland Security",
              power: ["monitor_threats"],
            },
            fbi: {
              agent: "agent-fib",
              role: "FBI Director",
              power: ["intelligence_gathering"],
            },
            cia: {
              agent: "meta-agent",
              role: "CIA Director",
              power: ["internal_intel"],
            },
          },
        },
        judicial: {
          supremeCourt: {
            agent: "meta-agent",
            role: "Supreme Court",
            power: ["strike_down_rules", "arbitrate_conflicts"],
          },
        },
      },
      independentAgencies: {
        federal_reserve: {
          agent: "economy-bank",
          role: "Federal Reserve",
          power: ["interest_rates", "monetary_policy"],
        },
        fcc: {
          agent: "show-producer",
          role: "FCC",
          power: ["broadcast_rules"],
        },
        census: {
          agent: "fame-calculator",
          role: "Census Bureau",
          power: ["measure_population"],
        },
      },
      citizenry: {
        characters: [
          "character-dmitri-volkov",
          "character-alex-morgan",
          "character-irina-morozova",
          "character-artem-sokolov",
          "character-sasha-taylor",
          "character-jordan-davis",
          "character-natalia-bondarenko",
          "character-kirill-fedorov",
        ],
        immigration: {
          gate: "character-factory",
          confirmation: "casting-director",
        },
      },
    };
    return new GovernmentCenter(config);
  }

  // ── Public API ──

  getState(): GovernmentCenterState {
    return this.state;
  }

  getConfig(): GovernmentConfig {
    return this.config;
  }

  /**
   * Get government instruction text for an agent.
   * This is injected into the agent's system prompt.
   */
  getGovernmentInstructions(agentId: string): string {
    const dept = this.state.agentDepartments.get(agentId);
    if (!dept) {
      // Check if this is a citizen character
      const isCitizen = this.config.citizenry.characters.includes(agentId);
      if (isCitizen) {
        return this.getCitizenInstructions(agentId);
      }
      return "";
    }

    return this.getGovernmentOfficialInstructions(agentId, dept);
  }

  /**
   * Get all government posts (for 3D town positioning).
   */
  getPosts(): GovernmentPost[] {
    return this.state.posts;
  }

  /**
   * Get an agent's government department.
   */
  getAgentDepartment(agentId: string): GovernmentPost | null {
    return this.state.posts.find(p => p.agent === agentId) ?? null;
  }

  /**
   * Record a presidential veto.
   */
  veto(target: string, reason: string): Veto {
    const veto: Veto = {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      president: this.config.branches.executive.president.agent,
      target,
      reason,
      overturned: false,
    };
    this.state.vetoHistory.push(veto);
    return veto;
  }

  /**
   * Record a Senate confirmation.
   */
  confirmCharacter(characterId: string): ConfirmationRequest {
    const request: ConfirmationRequest = {
      id: `conf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      characterId,
      nominatedBy: this.config.branches.legislative.house.agent,
      status: "confirmed",
      senateVote: 7,
      senateTotal: 10,
    };
    this.state.confirmationQueue.push(request);
    return request;
  }

  /**
   * Reject a character (Senate rejects the nomination).
   */
  rejectCharacter(characterId: string): ConfirmationRequest {
    const request: ConfirmationRequest = {
      id: `rej-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      characterId,
      nominatedBy: this.config.branches.legislative.house.agent,
      status: "rejected",
      senateVote: 4,
      senateTotal: 10,
    };
    this.state.confirmationQueue.push(request);
    return request;
  }

  /**
   * Get veto history.
   */
  getVetoHistory(): Veto[] {
    return [...this.state.vetoHistory];
  }

  /**
   * Get confirmation queue.
   */
  getConfirmationQueue(): ConfirmationRequest[] {
    return [...this.state.confirmationQueue];
  }

  // ── Internal ──

  private buildPosts(config: GovernmentConfig): GovernmentPost[] {
    const posts: GovernmentPost[] = [];

    // Legislative
    posts.push({
      agent: config.branches.legislative.senate.agent,
      role: "senate",
      power: config.branches.legislative.senate.power,
      branch: "legislative",
      buildingWing: "senate-wing",
      floor: 2,
      deskPosition: { x: -10, y: 2, z: 0 },
    });
    posts.push({
      agent: config.branches.legislative.house.agent,
      role: "house",
      power: config.branches.legislative.house.power,
      branch: "legislative",
      buildingWing: "house-wing",
      floor: 1,
      deskPosition: { x: -10, y: 0, z: 5 },
    });

    // Executive
    posts.push({
      agent: config.branches.executive.president.agent,
      role: "president",
      power: config.branches.executive.president.power,
      branch: "executive",
      buildingWing: "executive-wing",
      floor: 3,
      deskPosition: { x: 0, y: 4, z: 0 },
    });
    posts.push({
      agent: config.branches.executive.vicePresident.agent,
      role: "vice_president",
      power: config.branches.executive.vicePresident.power,
      branch: "executive",
      buildingWing: "executive-wing",
      floor: 3,
      deskPosition: { x: 2, y: 4, z: 0 },
    });

    // Cabinet
    for (const [role, post] of Object.entries(config.branches.executive.cabinet)) {
      posts.push({
        agent: post.agent,
        role: role as CabinetRole,
        power: post.power,
        branch: "executive",
        buildingWing: `${role}-office`,
        floor: 1,
        deskPosition: { x: 5, y: 0, z: -5 },
      });
    }

    // Judicial
    posts.push({
      agent: config.branches.judicial.supremeCourt.agent,
      role: "supreme_court",
      power: config.branches.judicial.supremeCourt.power,
      branch: "judicial",
      buildingWing: "court-wing",
      floor: 2,
      deskPosition: { x: 10, y: 2, z: 0 },
    });

    return posts;
  }

  private mapAgentDepartments(): void {
    this.state.agentDepartments.clear();
    for (const post of this.state.posts) {
      this.state.agentDepartments.set(post.agent, {
        branch: post.branch,
        role: post.role,
        powers: post.power,
        wing: post.buildingWing,
      });
    }
  }

  private getGovernmentOfficialInstructions(agentId: string, dept: {
    branch: GovernmentBranch;
    role: string;
    powers: string[];
    wing: string;
  }): string {
    const branchEmoji =
      dept.branch === "executive" ? "🏛️" :
      dept.branch === "legislative" ? "⚖️" : "🔔";

    return [
      `${branchEmoji} GOVERNMENT IDENTITY: You are the MOMTV ${dept.role}`,
      `Department: ${dept.wing}`,
      `Branch: ${dept.branch.charAt(0).toUpperCase() + dept.branch.slice(1)}`,
      `Powers: ${dept.powers.join(", ")}`,
      "",
      "As a government official in the MOMTV Broadcast Center:",
      "- You operate from your government office (not the broadcast studios)",
      "- You enforce/legislate/judge the rules of the network",
      "- Your decisions shape all citizens (broadcast characters)",
      "- Other branches check your power — the Senate must confirm your appointments",
      "- The Supreme Court can overrule your executive orders",
      "- Citizens (broadcast characters) live in the Broadcast Center wing",
    ].join("\n");
  }

  private getCitizenInstructions(agentId: string): string {
    return [
      "🏠 CITIZEN: You are a broadcast citizen in the MOMTV network",
      "You live in the Broadcast Center wing (not the Government Center)",
      "You earn fame through airtime, compete with other citizens",
      "The Senate (Casting Director) can transfer you between studios",
      "The President (Director) sets the broadcast agenda",
      "The Census Bureau (Fame Calculator) tracks your fame",
      "The Treasury (Economy Bank) manages your MOM Coins",
    ].join("\n");
  }
}
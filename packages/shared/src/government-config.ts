// ============================================================
// MOMTV Shared Types - U.S. Government Configuration
// ============================================================
// The Government Center adopts the American federal government
// structure: Legislative, Executive, Judicial branches + independent agencies.
//
// This is the single source of truth for the Government Center.
// Both the simulation engine AND the 3D town read this.
// ============================================================

// ── Branches ──

export type GovernmentBranch = "legislative" | "executive" | "judicial";

export type CabinetRole =
  | "president"
  | "vice_president"
  | "senate"
  | "house"
  | "treasury"
  | "commerce"
  | "state"
  | "justice"
  | "homeland"
  | "fbi"
  | "cia"
  | "supreme_court"
  | "chief_justice"
  | "federal_reserve"
  | "fcc"
  | "census";

export interface GovernmentPost {
  agent: string;           // MOMTV agent name
  role: CabinetRole;       // government role
  power: string[];         // what they can do
  branch: GovernmentBranch;
  buildingWing: string;    // where they sit in the 3D town
  floor: number;           // floor number
  deskPosition: { x: number; y: number; z: number };
}

// ── Branches ──

export interface LegislativeBranch {
  senate: {
    agent: string;
    role: string;
    power: string[];
  };
  house: {
    agent: string;
    role: string;
    power: string[];
  };
}

export interface ExecutiveBranch {
  president: {
    agent: string;
    role: string;
    power: string[];
  };
  vicePresident: {
    agent: string;
    role: string;
    power: string[];
  };
  cabinet: Record<string, {
    agent: string;
    role: string;
    power: string[];
  }>;
}

export interface JudicialBranch {
  supremeCourt: {
    agent: string;
    role: string;
    power: string[];
  };
}

// ── Independent Agencies ──

export interface IndependentAgency {
  agent: string;
  role: string;
  power: string[];
}

// ── Citizenry ──

export interface Citizenry {
  characters: string[];
  immigration: {
    gate: string;
    confirmation: string;
  };
}

// ── Government Config (the full config) ──

export interface GovernmentConfig {
  branches: {
    legislative: LegislativeBranch;
    executive: ExecutiveBranch;
    judicial: JudicialBranch;
  };
  independentAgencies: Record<string, IndependentAgency>;
  citizenry: Citizenry;
}

// ── Default Configuration ──

export const DEFAULT_GOVERNMENT_CONFIG: GovernmentConfig = {
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
          role: "Secretary of the Treasury — money supply",
          power: ["money_supply", "ledgers", "transaction_processing"],
        },
        commerce: {
          agent: "economy-market",
          role: "Secretary of Commerce — prices and trade",
          power: ["set_prices", "supply_demand", "inflation_control"],
        },
        state: {
          agent: "character-factory",
          role: "Secretary of State — foreign relations / newcomers",
          power: ["immigration", "new_character_intake"],
        },
        justice: {
          agent: "casting-director",
          role: "Attorney General — rules on disputes",
          power: ["transfer_disputes", "character_reviews"],
        },
        homeland: {
          agent: "stream-watcher",
          role: "Secretary of Homeland Security — threat monitoring",
          power: ["monitor_threats", "viewer_alerts", "game_change_detection"],
        },
        fbi: {
          agent: "agent-fib",
          role: "FBI Director — field intelligence",
          power: ["intelligence_gathering", "drama_detection"],
        },
        cia: {
          agent: "meta-agent",
          role: "CIA Director — internal intelligence",
          power: ["internal_intel", "quality_auditing", "self_monitoring"],
        },
      },
    },
    judicial: {
      supremeCourt: {
        agent: "meta-agent",
        role: "Supreme Court — settles disputes",
        power: ["strike_down_rules", "arbitrate_conflicts", "quality_review"],
      },
    },
  },
  independentAgencies: {
    federal_reserve: {
      agent: "economy-bank",
      role: "Federal Reserve — sets interest rates",
      power: ["interest_rates", "monetary_policy", "inflation_target"],
    },
    fcc: {
      agent: "show-producer",
      role: "FCC — broadcast regulation",
      power: ["broadcast_rules", "content_standards", "channel_scheduling"],
    },
    census: {
      agent: "fame-calculator",
      role: "Census Bureau / BLS — measures the population",
      power: ["measure_population", "fame_statistics", "ranking"],
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

// ── Utility: get all posts as a flat list ──

export function getAllPosts(config: GovernmentConfig): GovernmentPost[] {
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

// ── Utility: get agent's department info ──

export function getAgentDepartment(
  config: GovernmentConfig,
  agentId: string,
): { branch: GovernmentBranch; role: string; powers: string[] } | null {
  // Check all branches and cabinet
  const allPosts = getAllPosts(config);
  const post = allPosts.find(p => p.agent === agentId);
  if (post) {
    return {
      branch: post.branch,
      role: post.role,
      powers: post.power,
    };
  }

  // Check independent agencies
  for (const [, agency] of Object.entries(config.independentAgencies)) {
    if (agency.agent === agentId) {
      return {
        branch: "executive", // independent agencies report to executive nominally
        role: agency.role,
        powers: agency.power,
      };
    }
  }

  return null;
}
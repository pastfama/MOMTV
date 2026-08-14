// ============================================================
// MOMTV Shared Types - Character & Studio System
// ============================================================
// Portable character profiles, studio entities, job system,
// waypoint navigation, and language-aware behavior.
// ============================================================

import type { LanguageCode, AgentPersonalityTone } from "./models.js";

// --- Nationality & Language System ---

export type Nationality =
  | "russian"
  | "ukrainian"
  | "american"
  | "british"
  | "german"
  | "french"
  | "japanese"
  | "korean"
  | "brazilian"
  | "spanish";

export interface LanguageCapability {
  code: LanguageCode;
  proficiency: "native" | "fluent" | "conversational" | "basic";
  accent?: string; // e.g. "moscow", "saint-petersburg", "american", "british"
}

/** Authentic name pools per nationality for procedural character generation */
export const NAME_POOLS: Record<Nationality, { first: string[]; last: string[] }> = {
  russian: {
    first: [
      "Дмитрий", "Алексей", "Сергей", "Николай", "Максим",
      "Ирина", "Елена", "Татьяна", "Ольга", "Анна",
      "Виктор", "Наталья", "Артём", "Марина", "Павел",
      "Андрей", "Юлия", "Кирилл", "Светлана", "Роман",
    ],
    last: [
      "Иванов", "Петров", "Смирнов", "Кузнецов", "Попов",
      "Волков", "Соколов", "Новиков", "Морозова", "Васильев",
      "Фёдоров", "Орлов", "Лебедев", "Захаров", "Михайлов",
    ],
  },
  ukrainian: {
    first: [
      "Олександр", "Богдан", "Віталій", "Тарас", "Мирослав",
      "Оксана", "Ірина", "Леся", "Дарина", "Юрій",
    ],
    last: [
      "Шевченко", "Коваленко", "Бондаренко", "Ткаченко", "Мельник",
      "Кравченко", "Олійник", "Лисенко", "Поліщук", "Марченко",
    ],
  },
  american: {
    first: [
      "Alex", "Jordan", "Taylor", "Morgan", "Casey",
      "Riley", "Drew", "Quinn", "Avery", "Blake",
    ],
    last: [
      "Smith", "Johnson", "Williams", "Brown", "Miller",
      "Davis", "Wilson", "Anderson", "Thomas", "Jackson",
    ],
  },
  british: {
    first: [
      "Oliver", "Charlotte", "James", "Emily", "William",
      "Sophie", "George", "Amelia", "Harry", "Isla",
    ],
    last: [
      "Jones", "Evans", "Taylor", "Thomas", "Roberts",
      "Wright", "Thompson", "Hughes", "Edwards", "Green",
    ],
  },
  german: {
    first: [
      "Hans", "Friedrich", "Lukas", "Klaus", "Stefan",
      "Anna", "Katrin", "Sabine", "Monika", "Lena",
    ],
    last: [
      "Müller", "Schmidt", "Schneider", "Fischer", "Weber",
      "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    ],
  },
  french: {
    first: [
      "Antoine", "Louis", "Hugo", "Nicolas", "Julien",
      "Camille", "Léa", "Chloé", "Manon", "Sophie",
    ],
    last: [
      "Dubois", "Moreau", "Laurent", "Simon", "Michel",
      "Lefevre", "Leroy", "Roux", "David", "Bertrand",
    ],
  },
  japanese: {
    first: [
      "Haruto", "Yuki", "Sakura", "Ren", "Akira",
      "Hina", "Mio", "Sota", "Takumi", "Mei",
    ],
    last: [
      "Tanaka", "Suzuki", "Takahashi", "Watanabe", "Ito",
      "Yamamoto", "Nakamura", "Kobayashi", "Saito", "Kato",
    ],
  },
  korean: {
    first: [
      "Min-jun", "Seo-yeon", "Ji-hoon", "Ha-na", "Do-yun",
      "Yu-na", "Jun-seo", "Ye-jin", "Woo-jin", "Soo-yeon",
    ],
    last: [
      "Kim", "Lee", "Park", "Choi", "Jung",
      "Kang", "Cho", "Yoon", "Jang", "Lim",
    ],
  },
  brazilian: {
    first: [
      "Gabriel", "Lucas", "Mateus", "Pedro", "Rafael",
      "Ana", "Julia", "Maria", "Beatriz", "Larissa",
    ],
    last: [
      "Silva", "Santos", "Oliveira", "Souza", "Rodrigues",
      "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
    ],
  },
  spanish: {
    first: [
      "Carlos", "Pablo", "Alejandro", "Diego", "Javier",
      "Carmen", "Lucia", "Sofia", "Elena", "Ana",
    ],
    last: [
      "Garcia", "Rodriguez", "Fernandez", "Lopez", "Martinez",
      "Sanchez", "Perez", "Gomez", "Martin", "Ruiz",
    ],
  },
};

// --- Character Profile (Portable Identity) ---

export interface CharacterProfile {
  id: string;
  name: string;                       // Display name (may be in native script)
  nameLatin?: string;                 // Latin transliteration for non-Latin names
  // Nationality & Language (core identity)
  nationality: Nationality;
  nativeLanguage: LanguageCode;
  spokenLanguages: LanguageCapability[];
  // Visual
  appearance: CharacterAppearance;
  // Personality (persisted, grows over time)
  personality: CharacterPersonality;
  // Skills & capabilities
  skills: CharacterSkill[];
  // Career history
  resume: EmploymentRecord[];
  // Motivation (what drives this character)
  motivation: CharacterMotivationConfig;
  // Current state (transient)
  currentStudioId: string | null;
  currentPosition: Vector2;
  currentFacing: Direction;
  currentActivity: CharacterActivity;
}

export interface CharacterAppearance {
  rivFile: string;                    // Rive animation file URL
  color: string;                      // Primary brand color
  secondaryColor?: string;
  scale: number;
  bodyType: "humanoid" | "mascot" | "abstract";
  outfit: OutfitConfig;
  accessories: string[];
}

export interface OutfitConfig {
  base: string;                       // "suit", "casual", "uniform", "costume"
  colorPrimary: string;
  colorSecondary: string;
  accessories?: string[];             // "glasses", "hat", "badge", "microphone"
}

export interface CharacterPersonality {
  tone: AgentPersonalityTone;
  expertise: string[];
  catchphrases: Partial<Record<LanguageCode, string[]>>;
  description: Partial<Record<LanguageCode, string>>;
  traits: string[];                   // e.g. "curious", "lazy", "perfectionist", "intense"
  mood: MoodState;
}

export interface MoodState {
  energy: number;     // 0-1 (low energy = calm, high = energetic)
  valence: number;    // 0-1 (negative = sad/angry, positive = happy/excited)
  stress: number;     // 0-1 (relaxed to overwhelmed)
}

// --- Character Motivation (base config for what drives this character) ---

export interface CharacterMotivationConfig {
  ambition: number;                   // 0-1 — desire for airtime/fame
  loyalty: number;                    // 0-1 — attachment to current studio
  curiosity: number;                  // 0-1 — desire to explore new topics/studios
  comfort: number;                    // 0-1 — preference for familiar environment
  fameGoal: "top_leaderboard" | "surpass_rival" | "get_promoted" | "break_story" | "build_reputation" | "maintain_lead";
  fameGoalTarget?: string;           // characterId for surpass_rival, jobId for get_promoted
  fameGoalDescription: string;       // Human-readable goal
}

export interface CharacterSkill {
  id: string;
  name: string;
  level: number;                      // 1-100
  category: "broadcasting" | "analysis" | "entertainment" | "technical" | "social";
}

export interface EmploymentRecord {
  studioId: string;
  studioName: string;
  jobTitle: string;
  hiredAt: number;                    // Unix timestamp
  leftAt?: number;
  performance?: number;               // 0-1 rating
  reason?: string;                    // "promoted", "transferred", "contract-ended"
}

// --- Character Activity State Machine ---

export type CharacterActivity =
  | { type: "idle" }
  | { type: "walking"; destination: Waypoint; path: string[] }
  | { type: "working"; jobId: string; taskId: string }
  | { type: "talking"; targetCharacterId: string; topic?: string }
  | { type: "on_air"; broadcastId: string; cameraId: string }
  | { type: "break" }
  | { type: "transitioning"; fromStudioId: string; toStudioId: string }
  | { type: "entering"; studioId: string }
  | { type: "exiting"; studioId: string };

// --- Geometry & Navigation ---

export type Direction = "north" | "south" | "east" | "west" | "ne" | "nw" | "se" | "sw";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  position: Vector2;
  connections: string[];              // IDs of adjacent waypoints (graph edges)
  animation?: string;                 // Override animation for traversing TO this point
  speed?: number;                     // Movement speed multiplier (default 1.0)
}

export interface StudioZone {
  id: string;
  name: string;                       // "anchor-desk", "analysis-corner", "hallway", "green-room"
  label: Partial<Record<LanguageCode, string>>; // Localized zone name
  bounds: { x: number; y: number; w: number; h: number };
  allowedActivities: CharacterActivity["type"][];
  maxOccupancy: number;
  waypoints: Waypoint[];              // Navigation nodes within the zone
  cameraId?: string;                  // Associated camera
  setPieceId?: string;                // Associated set piece
}

// --- Studio Floor Plan ---

export interface StudioFloorPlan {
  width: number;                      // Virtual canvas width (default 1920)
  height: number;                     // Virtual canvas height (default 1080)
  zones: StudioZone[];
  cameras: CameraPosition[];
  sets: StudioSet[];
  /** All waypoints flattened for pathfinding (computed from zones) */
  waypointGraph: Waypoint[];
  /** Background image or color */
  background: string;
  /** Ambient lighting mood */
  lighting: "bright" | "warm" | "dramatic" | "dim" | "neon";
}

export interface CameraPosition {
  id: string;
  name: string;                       // "Cam 1 - Wide", "Cam 2 - Close-up"
  focus: Vector2;
  zoom: number;                       // 1.0 = normal, 2.0 = 2x zoom
  activeByDefault: boolean;
  transition: "cut" | "smooth" | "fade";
}

export interface StudioSet {
  id: string;
  name: string;                       // "Main Desk", "Video Wall", "Weather Map"
  position: Vector2;
  size: { w: number; h: number };
  interactiveZones: string[];         // Zone IDs where characters interact with this set
  assets: SetAsset[];
}

export interface SetAsset {
  id: string;
  type: "image" | "video" | "rive" | "canvas";
  src: string;
  position: Vector2;
  size: { w: number; h: number };
  zIndex: number;
  interactive: boolean;
}

// --- Studio Jobs ---

export interface StudioJob {
  id: string;
  title: string;                      // Human-readable: "Lead Anchor", "Field Correspondent"
  titleLocalized: Partial<Record<LanguageCode, string>>;
  description: string;
  requiredSkills: SkillRequirement[];
  zone: string;                       // Which zone this job operates in
  cameraSlot: string;                 // Which camera focuses on this position
  seatPosition: Vector2;              // Exact position within the zone
  priority: number;                   // Higher = more important for broadcast
  isOnAir: boolean;                   // Whether this job is camera-facing
  schedule?: JobSchedule;
  languageRequirement?: {
    mustSpeak: LanguageCode;
    minProficiency: LanguageCapability["proficiency"];
  };
}

export interface SkillRequirement {
  skillId: string;
  minLevel: number;                   // Minimum skill level to qualify
  weight: number;                     // How much this skill affects job performance (0-1)
}

export interface JobSchedule {
  segments: Array<{
    startMinute: number;              // Minute within the show cycle
    endMinute: number;
    showType: string;                 // "news", "analysis", "entertainment"
  }>;
}

export interface EmploymentSlot {
  characterId: string;
  jobId: string;
  hiredAt: number;
  contractEndsAt?: number;
  currentTask?: string;
  performance: number;                // Running average (0-1)
  languageCompliance: boolean;        // Whether character meets language requirements
}

// --- Studio Entity ---

export interface Studio {
  id: string;
  name: string;
  nameLocalized: Partial<Record<LanguageCode, string>>;
  // Brand identity
  brand: StudioBrand;
  // Physical space
  floorPlan: StudioFloorPlan;
  // Employment
  jobRoster: StudioJob[];
  activeEmployees: Map<string, EmploymentSlot>; // characterId → slot
  // Broadcast config
  broadcastLanguage: LanguageCode;
  secondaryLanguages: LanguageCode[];
  translationPolicy: "auto" | "manual" | "none";
  // Broadcast state
  broadcastState: BroadcastState;
  // Show schedule
  schedule: ShowSchedule;
}

export interface StudioBrand {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  tagline?: Partial<Record<LanguageCode, string>>;
  genre: StudioGenre;
}

export type StudioGenre =
  | "news"          // Traditional news broadcast
  | "sports"        // Sports coverage
  | "entertainment" // Variety/talk show
  | "gaming"        // Gaming/esports coverage
  | "music"         // Music channel
  | "education"     // Educational content
  | "comedy"        // Comedy/satire
  | "documentary"   // Documentary style
  | "children"      // Children's programming
  | "multicultural" // Multi-language international
  | "custom";

export interface BroadcastState {
  isLive: boolean;
  currentShowType: string;            // "news", "analysis", "commercial", "idle"
  currentTitle: string;
  activeCameraId: string;
  ticker: string;
  banner: string | null;
  startedAt: number | null;
}

export interface ShowSchedule {
  shows: ScheduledShow[];
  currentShowIndex: number;
  cycleMinutes: number;               // How long a full cycle repeats
}

export interface ScheduledShow {
  id: string;
  name: string;
  type: string;                       // "news", "analysis", "discussion", "commercial"
  startMinute: number;                // Minute within the cycle
  durationMinutes: number;
  requiredJobs: string[];             // Job IDs that must be filled
  cameraSequence: string[];           // Camera IDs to cycle through
  language?: LanguageCode;            // Override broadcast language for this show
}

// --- Character Events (new event types) ---

export type CharacterEventType =
  | "character_hired"
  | "character_fired"
  | "character_transferred"
  | "character_walk"
  | "character_arrived"
  | "character_departed"
  | "character_speak"
  | "character_emote"
  | "character_job_changed"
  | "character_mood_changed"
  | "studio_broadcast_start"
  | "studio_broadcast_end"
  | "studio_camera_switch";

export interface CharacterEvent {
  type: CharacterEventType;
  timestamp: number;
  characterId?: string;
  studioId?: string;
  data: Record<string, unknown>;
}

export interface CharacterSpeakEvent extends CharacterEvent {
  type: "character_speak";
  data: {
    characterId: string;
    text: string;
    originalLanguage: LanguageCode;     // What they "actually" said
    outputLanguage: LanguageCode;       // What the viewer hears
    translationNeeded: boolean;
    emotion: string;
    ttsVoiceId: string;
    accent?: string;
    duration: number;
    isOnAir: boolean;
  };
}

export interface CharacterWalkEvent extends CharacterEvent {
  type: "character_walk";
  data: {
    characterId: string;
    from: Vector2;
    to: Vector2;
    path: Vector2[];                    // Interpolated waypoints
    animation: string;
    speed: number;
    estimatedDuration: number;          // ms
  };
}

export interface CharacterHiredEvent extends CharacterEvent {
  type: "character_hired";
  data: {
    characterId: string;
    studioId: string;
    jobId: string;
    jobTitle: string;
  };
}

export interface CharacterTransferredEvent extends CharacterEvent {
  type: "character_transferred";
  data: {
    characterId: string;
    fromStudioId: string;
    toStudioId: string;
    newJobId: string;
    newJobTitle: string;
    reason: string;
  };
}

export interface StudioCameraSwitchEvent extends CharacterEvent {
  type: "studio_camera_switch";
  data: {
    studioId: string;
    cameraId: string;
    previousCameraId: string;
    transition: "cut" | "smooth" | "fade";
  };
}

// --- Pathfinding Helpers ---

export interface PathfindingResult {
  waypoints: Waypoint[];
  totalCost: number;
  estimatedDuration: number;          // ms
  path: Vector2[];                    // Interpolated positions for smooth movement
}

// --- Default Studios (seed data) ---

export function createDefaultStudio(
  id: string,
  name: string,
  genre: StudioGenre,
  broadcastLanguage: LanguageCode,
): Studio {
  return {
    id,
    name,
    nameLocalized: {},
    brand: {
      primaryColor: "#e8794b",
      secondaryColor: "#1a1a2e",
      genre,
    },
    floorPlan: {
      width: 1920,
      height: 1080,
      zones: [
        {
          id: "anchor-desk",
          name: "Anchor Desk",
          label: { en: "Anchor Desk", ru: "Стол ведущих" },
          bounds: { x: 200, y: 400, w: 500, h: 300 },
          allowedActivities: ["working", "on_air", "talking"],
          maxOccupancy: 2,
          waypoints: [
            { id: "anchor-left", position: { x: 350, y: 550 }, connections: ["anchor-right", "hallway-w1"] },
            { id: "anchor-right", position: { x: 550, y: 550 }, connections: ["anchor-left", "hallway-w1"] },
          ],
          cameraId: "cam-wide",
        },
        {
          id: "analysis-corner",
          name: "Analysis Corner",
          label: { en: "Analysis Corner", ru: "Угол аналитики" },
          bounds: { x: 1100, y: 400, w: 500, h: 300 },
          allowedActivities: ["working", "on_air", "talking"],
          maxOccupancy: 2,
          waypoints: [
            { id: "analysis-left", position: { x: 1200, y: 550 }, connections: ["analysis-right", "hallway-w2"] },
            { id: "analysis-right", position: { x: 1400, y: 550 }, connections: ["analysis-left", "hallway-w2"] },
          ],
          cameraId: "cam-analysis",
        },
        {
          id: "hallway",
          name: "Hallway",
          label: { en: "Hallway", ru: "Коридор" },
          bounds: { x: 100, y: 200, w: 1700, h: 150 },
          allowedActivities: ["walking", "talking", "idle"],
          maxOccupancy: 10,
          waypoints: [
            { id: "hallway-w1", position: { x: 400, y: 275 }, connections: ["anchor-left", "hallway-w2", "green-room-w"] },
            { id: "hallway-w2", position: { x: 1300, y: 275 }, connections: ["analysis-left", "hallway-w1", "backstage-w"] },
          ],
        },
        {
          id: "green-room",
          name: "Green Room",
          label: { en: "Green Room", ru: "Гримёрная" },
          bounds: { x: 100, y: 50, w: 400, h: 130 },
          allowedActivities: ["idle", "break", "talking"],
          maxOccupancy: 5,
          waypoints: [
            { id: "green-room-w", position: { x: 300, y: 115 }, connections: ["hallway-w1"] },
          ],
        },
        {
          id: "backstage",
          name: "Backstage",
          label: { en: "Backstage", ru: "За кулисами" },
          bounds: { x: 1400, y: 50, w: 400, h: 130 },
          allowedActivities: ["idle", "break", "entering", "exiting"],
          maxOccupancy: 5,
          waypoints: [
            { id: "backstage-w", position: { x: 1600, y: 115 }, connections: ["hallway-w2"] },
          ],
        },
      ],
      cameras: [
        { id: "cam-wide", name: "Wide Shot", focus: { x: 960, y: 540 }, zoom: 1.0, activeByDefault: true, transition: "smooth" },
        { id: "cam-anchor", name: "Anchor Close-up", focus: { x: 450, y: 500 }, zoom: 1.8, activeByDefault: false, transition: "smooth" },
        { id: "cam-analysis", name: "Analysis Close-up", focus: { x: 1300, y: 500 }, zoom: 1.8, activeByDefault: false, transition: "smooth" },
      ],
      sets: [
        {
          id: "main-desk",
          name: "Main Anchor Desk",
          position: { x: 300, y: 450 },
          size: { w: 400, h: 200 },
          interactiveZones: ["anchor-desk"],
          assets: [],
        },
        {
          id: "analysis-desk",
          name: "Analysis Desk",
          position: { x: 1100, y: 450 },
          size: { w: 400, h: 200 },
          interactiveZones: ["analysis-corner"],
          assets: [],
        },
        {
          id: "video-wall",
          name: "Video Wall",
          position: { x: 700, y: 50 },
          size: { w: 500, h: 300 },
          interactiveZones: [],
          assets: [],
        },
      ],
      waypointGraph: [],
      background: "#1a1a2e",
      lighting: "warm",
    },
    jobRoster: [
      {
        id: "lead-anchor",
        title: "Lead Anchor",
        titleLocalized: { en: "Lead Anchor", ru: "Главный ведущий" },
        description: "Primary on-air talent for news broadcasts",
        requiredSkills: [{ skillId: "broadcasting", minLevel: 70, weight: 0.8 }],
        zone: "anchor-desk",
        cameraSlot: "cam-anchor",
        seatPosition: { x: 350, y: 550 },
        priority: 10,
        isOnAir: true,
        languageRequirement: { mustSpeak: broadcastLanguage, minProficiency: "fluent" },
      },
      {
        id: "co-anchor",
        title: "Co-Anchor",
        titleLocalized: { en: "Co-Anchor", ru: "Ведущий" },
        description: "Secondary anchor providing commentary and analysis",
        requiredSkills: [
          { skillId: "broadcasting", minLevel: 50, weight: 0.5 },
          { skillId: "analysis", minLevel: 40, weight: 0.5 },
        ],
        zone: "anchor-desk",
        cameraSlot: "cam-anchor",
        seatPosition: { x: 550, y: 550 },
        priority: 8,
        isOnAir: true,
        languageRequirement: { mustSpeak: broadcastLanguage, minProficiency: "fluent" },
      },
      {
        id: "analyst",
        title: "Studio Analyst",
        titleLocalized: { en: "Studio Analyst", ru: "Аналитик" },
        description: "Provides expert analysis and data breakdowns",
        requiredSkills: [
          { skillId: "analysis", minLevel: 70, weight: 0.8 },
          { skillId: "broadcasting", minLevel: 30, weight: 0.2 },
        ],
        zone: "analysis-corner",
        cameraSlot: "cam-analysis",
        seatPosition: { x: 1200, y: 550 },
        priority: 6,
        isOnAir: true,
        languageRequirement: { mustSpeak: broadcastLanguage, minProficiency: "conversational" },
      },
      {
        id: "field-correspondent",
        title: "Field Correspondent",
        titleLocalized: { en: "Field Correspondent", ru: "Корреспондент" },
        description: "Reports from the field, appears as guest in studio",
        requiredSkills: [
          { skillId: "broadcasting", minLevel: 60, weight: 0.6 },
          { skillId: "social", minLevel: 50, weight: 0.4 },
        ],
        zone: "green-room",
        cameraSlot: "cam-wide",
        seatPosition: { x: 300, y: 115 },
        priority: 5,
        isOnAir: false,
      },
      {
        id: "producer",
        title: "Show Producer",
        titleLocalized: { en: "Show Producer", ru: "Продюсер" },
        description: "Manages show flow, works backstage",
        requiredSkills: [
          { skillId: "technical", minLevel: 60, weight: 0.6 },
          { skillId: "social", minLevel: 40, weight: 0.4 },
        ],
        zone: "backstage",
        cameraSlot: "cam-wide",
        seatPosition: { x: 1600, y: 115 },
        priority: 3,
        isOnAir: false,
      },
    ],
    activeEmployees: new Map(),
    broadcastLanguage,
    secondaryLanguages: [],
    translationPolicy: "auto",
    broadcastState: {
      isLive: false,
      currentShowType: "idle",
      currentTitle: "",
      activeCameraId: "cam-wide",
      ticker: "",
      banner: null,
      startedAt: null,
    },
    schedule: {
      shows: [
        {
          id: "quick-news",
          name: "Quick News Update",
          type: "news",
          startMinute: 0,
          durationMinutes: 2,
          requiredJobs: ["lead-anchor", "co-anchor"],
          cameraSequence: ["cam-wide", "cam-anchor"],
        },
        {
          id: "analysis-segment",
          name: "Analysis Segment",
          type: "analysis",
          startMinute: 5,
          durationMinutes: 5,
          requiredJobs: ["analyst", "co-anchor"],
          cameraSequence: ["cam-analysis", "cam-wide"],
        },
        {
          id: "full-news",
          name: "Full News Segment",
          type: "news",
          startMinute: 15,
          durationMinutes: 8,
          requiredJobs: ["lead-anchor", "co-anchor", "analyst"],
          cameraSequence: ["cam-wide", "cam-anchor", "cam-analysis"],
        },
      ],
      currentShowIndex: 0,
      cycleMinutes: 30,
    },
  };
}
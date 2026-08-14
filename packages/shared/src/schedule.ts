// ============================================================
// MOMTV Shared Types - 24-Hour Schedule System
// ============================================================
// Daily broadcast schedule: one studio per hour, assigned 24h
// in advance. Only RU and EN studios for now.
// ============================================================

import type { LanguageCode } from "./models.js";

// --- Schedule Types ---

export interface DailySchedule {
  /** ISO date string "2026-08-14" */
  date: string;
  /** When the Director generated this schedule */
  generatedAt: number;
  /** Director character ID */
  generatedBy: string;
  /** 24 hourly slots */
  slots: ScheduleSlot[];
  /** Director's strategy notes for the day */
  strategyNotes: string;
  /** Overall theme for the day (optional) */
  theme?: string;
}

export interface ScheduleSlot {
  /** Hour 0-23 (UTC) */
  hour: number;
  /** Display time "07:00" */
  timeLabel: string;
  /** Which studio is on air */
  studioId: string;
  /** Studio display name */
  studioName: string;
  /** Studio broadcast language */
  language: LanguageCode;
  /** Characters working this hour */
  cast: ScheduleCastMember[];
  /** Is this a prime time slot? */
  isPrimetime: boolean;
  /** Special event label (optional) */
  specialEvent?: string;
  /** Expected content type */
  contentHint?: string;
  /** Slot duration in minutes (default 60) */
  durationMinutes: number;
}

export interface ScheduleCastMember {
  characterId: string;
  characterName: string;
  /** Name in Latin script for non-Latin names */
  characterNameLatin?: string;
  /** Job role for this slot */
  role: string;
  /** Is this the primary on-camera talent? */
  isLead: boolean;
  /** What language they'll speak on air */
  language: LanguageCode;
  /** Whether character needs translation support */
  needsTranslation?: boolean;
}

// --- Schedule Statistics ---

export interface ScheduleStats {
  /** Total hours scheduled per character */
  hoursPerCharacter: Record<string, number>;
  /** Total slots per studio */
  slotsPerStudio: Record<string, number>;
  /** Prime time slots per studio */
  primetimePerStudio: Record<string, number>;
  /** Characters NOT scheduled (resting) */
  restingCharacters: string[];
  /** Language distribution */
  languageBreakdown: {
    ru: number;
    en: number;
  };
}

// --- Schedule Query Helpers ---

/** Check if a character is scheduled at a given hour */
export function isCharacterOnSchedule(
  schedule: DailySchedule,
  characterId: string,
  hour: number,
): boolean {
  const slot = schedule.slots.find(s => s.hour === hour);
  if (!slot) return false;
  return slot.cast.some(c => c.characterId === characterId);
}

/** Get all hours a character is scheduled for */
export function getCharacterHours(
  schedule: DailySchedule,
  characterId: string,
): number[] {
  return schedule.slots
    .filter(s => s.cast.some(c => c.characterId === characterId))
    .map(s => s.hour);
}

/** Get the current live slot from a schedule */
export function getCurrentSlot(schedule: DailySchedule): ScheduleSlot | null {
  const now = new Date();
  const currentHour = now.getUTCHours();
  return schedule.slots.find(s => s.hour === currentHour) ?? null;
}

/** Get the next slot from now */
export function getNextSlot(schedule: DailySchedule): ScheduleSlot | null {
  const now = new Date();
  const currentHour = now.getUTCHours();
  return schedule.slots.find(s => s.hour > currentHour) ?? null;
}

/** Calculate stats for a schedule */
export function calculateScheduleStats(schedule: DailySchedule): ScheduleStats {
  const hoursPerChar: Record<string, number> = {};
  const slotsPerStudio: Record<string, number> = {};
  const primetimePerStudio: Record<string, number> = {};

  for (const slot of schedule.slots) {
    // Count studio slots
    slotsPerStudio[slot.studioId] = (slotsPerStudio[slot.studioId] ?? 0) + 1;
    if (slot.isPrimetime) {
      primetimePerStudio[slot.studioId] = (primetimePerStudio[slot.studioId] ?? 0) + 1;
    }

    // Count character hours
    for (const member of slot.cast) {
      hoursPerChar[member.characterId] = (hoursPerChar[member.characterId] ?? 0) + 1;
    }
  }

  // Find resting characters (those with 0 hours)
  const allKnownCharacters = Object.keys(hoursPerChar);
  // We can't know ALL characters from the schedule alone, so this is just those
  // who appeared in at least one slot but might have fewer hours than others
  const restingCharacters = allKnownCharacters.filter(id => hoursPerChar[id] === 0);

  const ruSlots = schedule.slots.filter(s => s.language === "ru").length;
  const enSlots = schedule.slots.filter(s => s.language === "en").length;

  return {
    hoursPerCharacter: hoursPerChar,
    slotsPerStudio,
    primetimePerStudio,
    restingCharacters,
    languageBreakdown: { ru: ruSlots, en: enSlots },
  };
}

// --- Default Schedule Template ---
// Pre-built schedule that the Director can modify

export const PRIMETIME_HOURS = [7, 8, 12, 18, 19, 20, 21];

export function isPrimetime(hour: number): boolean {
  return PRIMETIME_HOURS.includes(hour);
}

/** Generate a time label from hour number */
export function hourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}
// ============================================================
// MOMTV Studio - Studio Registry (Multi-Studio Manager)
// ============================================================
// Manages multiple studios, character transfers between studios,
// and provides a unified view of the MOMTV network.
// ============================================================

import type {
  CharacterProfile,
  Studio,
  StudioGenre,
  LanguageCode,
  CharacterTransferredEvent,
} from "@momtv/shared";
import { EmploymentManager, type HiringDecision } from "./employment-manager.js";

export interface StudioInfo {
  studio: Studio;
  characterCount: number;
  openJobs: number;
  isLive: boolean;
}

export type TransferCallback = (event: CharacterTransferredEvent) => void;

export class StudioRegistry {
  private studios: Map<string, Studio> = new Map();
  private characters: Map<string, CharacterProfile> = new Map();
  private employmentManager: EmploymentManager;
  private transferCallbacks: TransferCallback[] = [];

  constructor() {
    this.employmentManager = new EmploymentManager();
  }

  // --- Registration ---

  registerStudio(studio: Studio): void {
    this.studios.set(studio.id, studio);
    console.log(`[Registry] Studio registered: ${studio.name} (${studio.id}) — language: ${studio.broadcastLanguage}, genre: ${studio.brand.genre}`);
  }

  unregisterStudio(studioId: string): void {
    const studio = this.studios.get(studioId);
    if (!studio) return;

    // Release all employees
    for (const [charId] of studio.activeEmployees) {
      const char = this.characters.get(charId);
      if (char) {
        this.employmentManager.fire(char, studio);
      }
    }

    this.studios.delete(studioId);
    console.log(`[Registry] Studio unregistered: ${studioId}`);
  }

  registerCharacter(character: CharacterProfile): void {
    this.characters.set(character.id, character);
    console.log(`[Registry] Character registered: ${character.name} (${character.id}) — ${character.nationality}, native: ${character.nativeLanguage}`);
  }

  unregisterCharacter(characterId: string): void {
    const char = this.characters.get(characterId);
    if (!char) return;

    // Remove from current studio if employed
    if (char.currentStudioId) {
      const studio = this.studios.get(char.currentStudioId);
      if (studio) {
        this.employmentManager.fire(char, studio);
      }
    }

    this.characters.delete(characterId);
  }

  // --- Queries ---

  getStudio(studioId: string): Studio | undefined {
    return this.studios.get(studioId);
  }

  getCharacter(characterId: string): CharacterProfile | undefined {
    return this.characters.get(characterId);
  }

  getAllStudios(): Studio[] {
    return Array.from(this.studios.values());
  }

  getAllCharacters(): CharacterProfile[] {
    return Array.from(this.characters.values());
  }

  getStudiosByLanguage(language: LanguageCode): Studio[] {
    return this.getAllStudios().filter(s => s.broadcastLanguage === language);
  }

  getStudiosByGenre(genre: StudioGenre): Studio[] {
    return this.getAllStudios().filter(s => s.brand.genre === genre);
  }

  getCharactersInStudio(studioId: string): CharacterProfile[] {
    return this.getAllCharacters().filter(c => c.currentStudioId === studioId);
  }

  getUnemployedCharacters(): CharacterProfile[] {
    return this.getAllCharacters().filter(c => c.currentStudioId === null);
  }

  /** Get a summary of all studios */
  getNetworkOverview(): StudioInfo[] {
    return this.getAllStudios().map(studio => ({
      studio,
      characterCount: this.getCharactersInStudio(studio.id).length,
      openJobs: this.employmentManager.getOpenJobs(studio).length,
      isLive: studio.broadcastState.isLive,
    }));
  }

  // --- Employment ---

  getEmploymentManager(): EmploymentManager {
    return this.employmentManager;
  }

  /** Auto-cast a studio with the best available characters */
  autoCastStudio(studioId: string): Map<string, HiringDecision> {
    const studio = this.studios.get(studioId);
    if (!studio) return new Map();

    const unemployed = this.getUnemployedCharacters();
    const decisions = this.employmentManager.castStudio(studio, unemployed);

    // Execute the hires
    for (const [jobId, decision] of decisions) {
      const char = this.characters.get(decision.characterId);
      if (char) {
        this.employmentManager.hire(char, studio, jobId);
        console.log(`[Registry] Hired ${char.name} as ${jobId} at ${studio.name} (score: ${decision.score.toFixed(2)})`);
      }
    }

    return decisions;
  }

  /** Auto-cast ALL studios */
  autoCastAll(): Map<string, Map<string, HiringDecision>> {
    const results = new Map<string, Map<string, HiringDecision>>();
    for (const studio of this.studios.values()) {
      results.set(studio.id, this.autoCastStudio(studio.id));
    }
    return results;
  }

  /** Hire a specific character into a specific studio job */
  hireCharacter(characterId: string, studioId: string, jobId: string): boolean {
    const char = this.characters.get(characterId);
    const studio = this.studios.get(studioId);
    if (!char || !studio) return false;

    // Fire from current studio if employed elsewhere
    if (char.currentStudioId && char.currentStudioId !== studioId) {
      const currentStudio = this.studios.get(char.currentStudioId);
      if (currentStudio) {
        this.employmentManager.fire(char, currentStudio);
      }
    }

    this.employmentManager.hire(char, studio, jobId);
    return true;
  }

  // --- Transfers ---

  /** Transfer a character from one studio to another */
  transferCharacter(
    characterId: string,
    fromStudioId: string,
    toStudioId: string,
    newJobId: string,
  ): boolean {
    const char = this.characters.get(characterId);
    const fromStudio = this.studios.get(fromStudioId);
    const toStudio = this.studios.get(toStudioId);
    if (!char || !fromStudio || !toStudio) return false;

    // Verify character is employed at the from studio
    if (char.currentStudioId !== fromStudioId) return false;

    // Execute transfer
    this.employmentManager.transfer(char, fromStudio, toStudio, newJobId);

    // Fire event
    const event: CharacterTransferredEvent = {
      type: "character_transferred",
      timestamp: Date.now(),
      characterId,
      studioId: toStudioId,
      data: {
        characterId,
        fromStudioId,
        toStudioId,
        newJobId,
        newJobTitle: toStudio.jobRoster.find(j => j.id === newJobId)?.title ?? newJobId,
        reason: "transfer",
      },
    };

    for (const cb of this.transferCallbacks) {
      cb(event);
    }

    console.log(`[Registry] Transferred ${char.name} from ${fromStudio.name} to ${toStudio.name} as ${newJobId}`);
    return true;
  }

  /** Find the best studio for an unemployed character */
  findBestStudioForCharacter(characterId: string): Array<{ studioId: string; jobId: string; score: number }> {
    const char = this.characters.get(characterId);
    if (!char) return [];

    const results: Array<{ studioId: string; jobId: string; score: number }> = [];

    for (const studio of this.studios.values()) {
      const qualifyingJobs = this.employmentManager.getQualifyingJobs(char, studio);
      for (const { job, decision } of qualifyingJobs) {
        results.push({
          studioId: studio.id,
          jobId: job.id,
          score: decision.score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /** Auto-transfer characters to better-fitting studios */
  optimizePlacements(): Array<{ characterId: string; fromStudioId: string; toStudioId: string; jobId: string; improvement: number }> {
    const transfers: Array<{ characterId: string; fromStudioId: string; toStudioId: string; jobId: string; improvement: number }> = [];

    for (const char of this.characters.values()) {
      if (!char.currentStudioId) continue;

      const currentStudio = this.studios.get(char.currentStudioId);
      if (!currentStudio) continue;

      const currentSlot = currentStudio.activeEmployees.get(char.id);
      if (!currentSlot) continue;

      // Check if there's a better fit elsewhere
      const alternatives = this.findBestStudioForCharacter(char.id);
      for (const alt of alternatives) {
        if (alt.studioId === char.currentStudioId) continue;
        const improvement = alt.score - currentSlot.performance;
        if (improvement > 0.15) {
          // Significant improvement — propose transfer
          transfers.push({
            characterId: char.id,
            fromStudioId: char.currentStudioId,
            toStudioId: alt.studioId,
            jobId: alt.jobId,
            improvement,
          });
          break; // Only one transfer per character per optimization cycle
        }
      }
    }

    return transfers;
  }

  // --- Events ---

  onTransfer(callback: TransferCallback): void {
    this.transferCallbacks.push(callback);
  }

  // --- Convenience: Register seed data ---

  registerSeedData(
    studios: Studio[],
    characters: CharacterProfile[],
  ): void {
    for (const studio of studios) {
      this.registerStudio(studio);
    }
    for (const char of characters) {
      this.registerCharacter(char);
    }
  }

  /** Quick setup: register all seed data and auto-cast */
  bootstrap(
    studios: Studio[],
    characters: CharacterProfile[],
  ): Map<string, Map<string, HiringDecision>> {
    this.registerSeedData(studios, characters);
    return this.autoCastAll();
  }
}
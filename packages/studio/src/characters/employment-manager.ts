// ============================================================
// MOMTV Studio - Employment Manager (Casting System)
// ============================================================
// Manages character hiring, firing, job matching based on skills,
// language compliance, and performance tracking.
// ============================================================

import type {
  CharacterProfile,
  Studio,
  StudioJob,
  EmploymentSlot,
  SkillRequirement,
  LanguageCapability,
} from "@momtv/shared";

export interface HiringDecision {
  characterId: string;
  jobId: string;
  score: number;              // 0-1 overall fit score
  skillScore: number;         // 0-1 skill match
  languageCompliant: boolean;
  reasons: string[];
}

export class EmploymentManager {

  // --- Hiring ---

  /** Evaluate how well a character fits a specific job */
  evaluateFit(character: CharacterProfile, job: StudioJob, studio: Studio): HiringDecision {
    const skillScore = this.calculateSkillScore(character, job);
    const languageCompliant = this.checkLanguageCompliance(character, job, studio);
    const experienceBonus = this.calculateExperienceBonus(character, studio.id);

    // Overall score: skills (60%) + language (20%) + experience (20%)
    const languageScore = languageCompliant ? 1.0 : 0.0;
    const score = skillScore * 0.6 + languageScore * 0.2 + experienceBonus * 0.2;

    const reasons: string[] = [];
    if (skillScore >= 0.8) reasons.push("Excellent skill match");
    else if (skillScore >= 0.5) reasons.push("Adequate skills");
    else reasons.push("Below skill requirements");

    if (!languageCompliant) {
      reasons.push(`Does not speak ${job.languageRequirement?.mustSpeak ?? studio.broadcastLanguage} at required level`);
    }

    if (experienceBonus > 0.5) reasons.push("Previous experience at this studio");

    return {
      characterId: character.id,
      jobId: job.id,
      score,
      skillScore,
      languageCompliant,
      reasons,
    };
  }

  /** Find the best character for each open job in a studio */
  castStudio(studio: Studio, availableCharacters: CharacterProfile[]): Map<string, HiringDecision> {
    const results = new Map<string, HiringDecision>();
    const assignedCharacters = new Set<string>();

    // Sort jobs by priority (highest first)
    const sortedJobs = [...studio.jobRoster].sort((a, b) => b.priority - a.priority);

    for (const job of sortedJobs) {
      // Skip if already filled
      if (studio.activeEmployees.has(this.findEmployeeForJob(studio, job.id)?.characterId ?? "")) {
        continue;
      }

      let bestCandidate: HiringDecision | null = null;

      for (const char of availableCharacters) {
        // Skip already assigned
        if (assignedCharacters.has(char.id)) continue;

        // Skip if already employed at this studio
        if (studio.activeEmployees.has(char.id)) continue;

        const decision = this.evaluateFit(char, job, studio);

        if (!bestCandidate || decision.score > bestCandidate.score) {
          bestCandidate = decision;
        }
      }

      if (bestCandidate && bestCandidate.score > 0.3) {
        results.set(job.id, bestCandidate);
        assignedCharacters.add(bestCandidate.characterId);
      }
    }

    return results;
  }

  /** Hire a character into a studio job */
  hire(
    character: CharacterProfile,
    studio: Studio,
    jobId: string,
  ): EmploymentSlot {
    const job = studio.jobRoster.find(j => j.id === jobId);
    if (!job) throw new Error(`Job ${jobId} not found in studio ${studio.id}`);

    const decision = this.evaluateFit(character, job, studio);

    const slot: EmploymentSlot = {
      characterId: character.id,
      jobId,
      hiredAt: Date.now(),
      performance: decision.score,
      languageCompliance: decision.languageCompliant,
    };

    studio.activeEmployees.set(character.id, slot);

    // Update character state
    character.currentStudioId = studio.id;
    character.currentPosition = { ...job.seatPosition };

    // Add to resume
    character.resume.push({
      studioId: studio.id,
      studioName: studio.name,
      jobTitle: job.title,
      hiredAt: Date.now(),
    });

    return slot;
  }

  /** Fire a character from a studio */
  fire(character: CharacterProfile, studio: Studio): void {
    const slot = studio.activeEmployees.get(character.id);
    if (!slot) return;

    // Update resume
    const currentEmployment = character.resume.find(
      r => r.studioId === studio.id && !r.leftAt
    );
    if (currentEmployment) {
      currentEmployment.leftAt = Date.now();
      currentEmployment.performance = slot.performance;
      currentEmployment.reason = "contract-ended";
    }

    studio.activeEmployees.delete(character.id);
    character.currentStudioId = null;
    character.currentActivity = { type: "idle" };
  }

  /** Transfer a character between studios */
  transfer(
    character: CharacterProfile,
    fromStudio: Studio,
    toStudio: Studio,
    newJobId: string,
  ): EmploymentSlot {
    // Fire from old studio
    this.fire(character, fromStudio);

    // Hire at new studio
    const slot = this.hire(character, toStudio, newJobId);

    // Update resume reason
    const latestEntry = character.resume[character.resume.length - 1];
    if (latestEntry) {
      latestEntry.reason = "transferred";
    }

    // Set transition state
    character.currentActivity = {
      type: "transitioning",
      fromStudioId: fromStudio.id,
      toStudioId: toStudio.id,
    };

    return slot;
  }

  // --- Performance ---

  /** Update a character's job performance rating */
  updatePerformance(characterId: string, studio: Studio, newRating: number): void {
    const slot = studio.activeEmployees.get(characterId);
    if (!slot) return;

    // Running average with decay
    slot.performance = slot.performance * 0.8 + newRating * 0.2;
  }

  /** Get all employees sorted by performance */
  getEmployeesByPerformance(studio: Studio): Array<{ characterId: string; slot: EmploymentSlot }> {
    return Array.from(studio.activeEmployees.entries())
      .map(([characterId, slot]) => ({ characterId, slot }))
      .sort((a, b) => b.slot.performance - a.slot.performance);
  }

  /** Find open (unfilled) jobs in a studio */
  getOpenJobs(studio: Studio): StudioJob[] {
    const filledJobIds = new Set(
      Array.from(studio.activeEmployees.values()).map(s => s.jobId)
    );
    return studio.jobRoster.filter(j => !filledJobIds.has(j.id));
  }

  /** Find jobs a character qualifies for in a studio */
  getQualifyingJobs(character: CharacterProfile, studio: Studio): Array<{ job: StudioJob; decision: HiringDecision }> {
    const openJobs = this.getOpenJobs(studio);
    return openJobs
      .map(job => ({
        job,
        decision: this.evaluateFit(character, job, studio),
      }))
      .filter(({ decision }) => decision.score > 0.3)
      .sort((a, b) => b.decision.score - a.decision.score);
  }

  // --- Internal ---

  private calculateSkillScore(character: CharacterProfile, job: StudioJob): number {
    if (job.requiredSkills.length === 0) return 1.0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const req of job.requiredSkills) {
      const charSkill = character.skills.find(s => s.id === req.skillId);
      const level = charSkill?.level ?? 0;
      const meetsMin = level >= req.minLevel;

      // Score: 1.0 if meets min, proportional above min, penalized below
      const score = meetsMin
        ? Math.min(1.0, 0.7 + (level - req.minLevel) / (100 - req.minLevel) * 0.3)
        : Math.max(0, level / req.minLevel * 0.6);

      weightedSum += score * req.weight;
      totalWeight += req.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private checkLanguageCompliance(
    character: CharacterProfile,
    job: StudioJob,
    studio: Studio,
  ): boolean {
    const req = job.languageRequirement;
    if (!req) return true; // No language requirement

    const lang = character.spokenLanguages.find(l => l.code === req.mustSpeak);
    if (!lang) return false;

    const proficiencyOrder = ["basic", "conversational", "fluent", "native"];
    const charLevel = proficiencyOrder.indexOf(lang.proficiency);
    const requiredLevel = proficiencyOrder.indexOf(req.minProficiency);

    return charLevel >= requiredLevel;
  }

  private calculateExperienceBonus(character: CharacterProfile, studioId: string): number {
    const records = character.resume.filter(r => r.studioId === studioId);
    if (records.length === 0) return 0;

    // Bonus for previous experience at this studio
    const avgPerformance = records
      .filter(r => r.performance !== undefined)
      .reduce((sum, r) => sum + (r.performance ?? 0), 0) / Math.max(1, records.length);

    return Math.min(1.0, avgPerformance + records.length * 0.1);
  }

  private findEmployeeForJob(studio: Studio, jobId: string): EmploymentSlot | undefined {
    for (const [, slot] of studio.activeEmployees) {
      if (slot.jobId === jobId) return slot;
    }
    return undefined;
  }
}
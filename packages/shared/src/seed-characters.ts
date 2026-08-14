// ============================================================
// MOMTV Shared - Seed Characters
// ============================================================
// Pre-built character profiles with authentic names,
// language configurations, and motivation for fame.
// ============================================================

import type { CharacterProfile } from "./characters.js";

// ── Director (also a character!) ──────────────────────────────

export const DIRECTOR_VIKTOR: CharacterProfile = {
  id: "director",
  name: "Виктор Орлов",
  nameLatin: "Viktor Orlov",
  nationality: "russian",
  nativeLanguage: "ru",
  spokenLanguages: [
    { code: "ru", proficiency: "native", accent: "moscow" },
    { code: "en", proficiency: "fluent", accent: "russian" },
  ],
  appearance: {
    rivFile: "",
    color: "#8b5cf6",
    secondaryColor: "#7c3aed",
    scale: 1.0,
    bodyType: "humanoid",
    outfit: { base: "suit", colorPrimary: "#1a1a2e", colorSecondary: "#8b5cf6", accessories: ["headphones"] },
    accessories: ["headphones"],
  },
  personality: {
    tone: "dramatic",
    expertise: ["airtime allocation", "drama creation", "management", "strategy"],
    catchphrases: {
      ru: ["Решение принято.", "Это мой эфир — решать, кто выйдет в свет.", "Интересный ход..."],
      en: ["The decision is final.", "This is MY channel.", "Interesting move..."],
    },
    description: {
      ru: "Директор MOM TV. Стратег, манипулятор, хочет чтобы его запомнили.",
      en: "Director of MOM TV. Strategist, ego-driven, wants to be remembered.",
    },
    traits: ["strategic", "manipulative", "fair-but-harsh", "ego-driven", "dramatic"],
    mood: { energy: 0.6, valence: 0.5, stress: 0.4 },
  },
  skills: [
    { id: "technical", name: "Direction", level: 95, category: "technical" },
    { id: "social", name: "Politics", level: 90, category: "social" },
    { id: "analysis", name: "Strategy", level: 92, category: "analysis" },
    { id: "broadcasting", name: "On-Air Presence", level: 40, category: "broadcasting" },
  ],
  motivation: {
    ambition: 0.85, loyalty: 0.3, curiosity: 0.7, comfort: 0.2,
    fameGoal: "top_leaderboard",
    fameGoalDescription: "Be remembered as the greatest Director in broadcast history. Secretly wants a 'Director's Cut' segment.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 960, y: 540 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

// ── Russian-Native Characters ─────────────────────────────────

export const DMITRI_VOLKOV: CharacterProfile = {
  id: "dmitri-volkov",
  name: "Дмитрий Волков",
  nameLatin: "Dmitri Volkov",
  nationality: "russian",
  nativeLanguage: "ru",
  spokenLanguages: [
    { code: "ru", proficiency: "native", accent: "moscow" },
    { code: "en", proficiency: "fluent", accent: "russian" },
  ],
  appearance: {
    rivFile: "", color: "#3b82f6", secondaryColor: "#1e40af", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "suit", colorPrimary: "#1a1a2e", colorSecondary: "#3b82f6", accessories: ["microphone"] },
    accessories: [],
  },
  personality: {
    tone: "professional",
    expertise: ["gaming", "esports", "streaming culture"],
    catchphrases: { ru: ["Это было невероятно!", "Давайте разберёмся!", "Пошли дальше!"], en: ["Let's break this down!", "Incredible moment!"] },
    description: { ru: "Главный ведущий MOM TV. Бывший киберспортсмен, теперь звезда экрана.", en: "Lead anchor of MOM TV. Former esports pro turned broadcast star." },
    traits: ["authoritative", "intense", "charismatic", "competitive"],
    mood: { energy: 0.7, valence: 0.7, stress: 0.3 },
  },
  skills: [
    { id: "broadcasting", name: "Broadcasting", level: 90, category: "broadcasting" },
    { id: "analysis", name: "Game Analysis", level: 75, category: "analysis" },
    { id: "social", name: "Audience Engagement", level: 85, category: "social" },
    { id: "entertainment", name: "Showmanship", level: 80, category: "entertainment" },
  ],
  motivation: {
    ambition: 0.9, loyalty: 0.6, curiosity: 0.5, comfort: 0.4,
    fameGoal: "top_leaderboard",
    fameGoalDescription: "Be the #1 most famous person on MOM TV. Stay Lead Anchor at all costs.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 350, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const IRINA_MOROZOVA: CharacterProfile = {
  id: "irina-morozova",
  name: "Ирина Морозова",
  nameLatin: "Irina Morozova",
  nationality: "russian",
  nativeLanguage: "ru",
  spokenLanguages: [
    { code: "ru", proficiency: "native", accent: "saint-petersburg" },
    { code: "en", proficiency: "fluent", accent: "slight-russian" },
    { code: "uk", proficiency: "conversational" },
  ],
  appearance: {
    rivFile: "", color: "#ef4444", secondaryColor: "#dc2626", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "suit", colorPrimary: "#7c2d12", colorSecondary: "#ef4444", accessories: ["badge"] },
    accessories: [],
  },
  personality: {
    tone: "enthusiastic",
    expertise: ["analysis", "politics", "international affairs"],
    catchphrases: { ru: ["По данным наших источников...", "Это серьёзная ситуация.", "Интересный поворот!"], en: ["According to our sources...", "This is a significant development."] },
    description: { ru: "Старший аналитик с 15-летним стажем.", en: "Senior analyst with 15 years of experience." },
    traits: ["analytical", "curious", "multilingual", "calm-under-pressure"],
    mood: { energy: 0.5, valence: 0.7, stress: 0.2 },
  },
  skills: [
    { id: "broadcasting", name: "Broadcasting", level: 80, category: "broadcasting" },
    { id: "analysis", name: "Deep Analysis", level: 95, category: "analysis" },
    { id: "social", name: "Interview Skills", level: 70, category: "social" },
    { id: "technical", name: "Research", level: 90, category: "technical" },
  ],
  motivation: {
    ambition: 0.6, loyalty: 0.7, curiosity: 0.8, comfort: 0.5,
    fameGoal: "surpass_rival",
    fameGoalTarget: "dmitri-volkov",
    fameGoalDescription: "Prove that analysis beats showmanship. Outshine Дмитрий with intellectual depth.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 550, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const ARTEM_SOKOLOV: CharacterProfile = {
  id: "artem-sokolov",
  name: "Артём Соколов",
  nameLatin: "Artem Sokolov",
  nationality: "russian",
  nativeLanguage: "ru",
  spokenLanguages: [
    { code: "ru", proficiency: "native", accent: "kazan" },
    { code: "en", proficiency: "basic", accent: "russian" },
  ],
  appearance: {
    rivFile: "", color: "#f59e0b", secondaryColor: "#d97706", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "casual", colorPrimary: "#1a1a2e", colorSecondary: "#f59e0b", accessories: ["glasses"] },
    accessories: ["glasses"],
  },
  personality: {
    tone: "dramatic",
    expertise: ["esports", "gaming culture", "streaming analytics"],
    catchphrases: { ru: ["Ничего себе!", "Это просто космос!", "Ребята, вы видели это?!", "Вот это поворот!"] },
    description: { ru: "Эксперт по киберспорту из Казани. Говорит только по-русски.", en: "Esports expert from Kazan. Russian-only speaker." },
    traits: ["passionate", "dramatic", "knowledgeable", "excitable"],
    mood: { energy: 0.9, valence: 0.8, stress: 0.4 },
  },
  skills: [
    { id: "analysis", name: "Esports Analysis", level: 95, category: "analysis" },
    { id: "broadcasting", name: "Broadcasting", level: 55, category: "broadcasting" },
    { id: "entertainment", name: "Entertainment Value", level: 85, category: "entertainment" },
    { id: "technical", name: "Game Knowledge", level: 98, category: "technical" },
  ],
  motivation: {
    ambition: 0.95, loyalty: 0.3, curiosity: 0.6, comfort: 0.2,
    fameGoal: "get_promoted",
    fameGoalTarget: "lead-anchor",
    fameGoalDescription: "Become Lead Anchor. Tired of being 'just the analyst'. Wants the spotlight.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 1200, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const NATALIA_BONDARENKO: CharacterProfile = {
  id: "natalia-bondarenko",
  name: "Наталія Бондаренко",
  nameLatin: "Natalia Bondarenko",
  nationality: "ukrainian",
  nativeLanguage: "uk",
  spokenLanguages: [
    { code: "uk", proficiency: "native", accent: "odesa" },
    { code: "ru", proficiency: "fluent", accent: "ukrainian" },
    { code: "en", proficiency: "conversational", accent: "east-european" },
  ],
  appearance: {
    rivFile: "", color: "#8b5cf6", secondaryColor: "#7c3aed", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "casual", colorPrimary: "#4c1d95", colorSecondary: "#8b5cf6", accessories: ["microphone"] },
    accessories: [],
  },
  personality: {
    tone: "calm",
    expertise: ["field reporting", "community stories", "cultural analysis"],
    catchphrases: { uk: ["На місці подій!", "Це дуже цікава ситуація."], ru: ["На месте событий!"], en: ["Reporting live!"] },
    description: { uk: "Позаштатний кореспондент з Одеси.", en: "Field correspondent from Odessa. Trilingual bridge between studios." },
    traits: ["charming", "observant", "adaptable", "resourceful"],
    mood: { energy: 0.6, valence: 0.65, stress: 0.3 },
  },
  skills: [
    { id: "broadcasting", name: "Field Reporting", level: 85, category: "broadcasting" },
    { id: "social", name: "People Skills", level: 90, category: "social" },
    { id: "analysis", name: "Cultural Analysis", level: 70, category: "analysis" },
    { id: "entertainment", name: "Storytelling", level: 80, category: "entertainment" },
  ],
  motivation: {
    ambition: 0.65, loyalty: 0.4, curiosity: 0.9, comfort: 0.3,
    fameGoal: "break_story",
    fameGoalDescription: "Break the biggest story of the year. Field reporting is where real fame is earned.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 300, y: 115 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const KIRILL_FEDOROV: CharacterProfile = {
  id: "kirill-fedorov",
  name: "Кирилл Фёдоров",
  nameLatin: "Kirill Fedorov",
  nationality: "russian",
  nativeLanguage: "ru",
  spokenLanguages: [
    { code: "ru", proficiency: "native", accent: "moscow" },
    { code: "en", proficiency: "basic" },
  ],
  appearance: {
    rivFile: "", color: "#6b7280", secondaryColor: "#4b5563", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "casual", colorPrimary: "#374151", colorSecondary: "#6b7280", accessories: ["headphones"] },
    accessories: ["headphones"],
  },
  personality: {
    tone: "calm",
    expertise: ["production", "stream management", "technical operations"],
    catchphrases: { ru: ["Камера три, готовься!", "Переходим на ракурс два.", "Всё под контролем."] },
    description: { ru: "Продюсер. Управляет шоу за кулисами. Fame cap 0.15× — знает это и страдает.", en: "Producer backstage. Fame cap 0.15× — knows it and suffers." },
    traits: ["meticulous", "calm", "technical", "perfectionist", "secretly-ambitious"],
    mood: { energy: 0.4, valence: 0.6, stress: 0.5 },
  },
  skills: [
    { id: "technical", name: "Production", level: 95, category: "technical" },
    { id: "technical", name: "Stream Management", level: 90, category: "technical" },
    { id: "social", name: "Team Coordination", level: 75, category: "social" },
    { id: "broadcasting", name: "Show Direction", level: 70, category: "broadcasting" },
  ],
  motivation: {
    ambition: 0.7, loyalty: 0.8, curiosity: 0.3, comfort: 0.7,
    fameGoal: "get_promoted",
    fameGoalTarget: "co-anchor",
    fameGoalDescription: "Escape the 0.15× fame cap. Wants to move to an on-air role — even co-anchor would double his fame ceiling.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 1600, y: 115 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

// ── English-Native Characters ─────────────────────────────────

export const ALEX_MORGAN: CharacterProfile = {
  id: "alex-morgan",
  name: "Alex Morgan",
  nationality: "american",
  nativeLanguage: "en",
  spokenLanguages: [{ code: "en", proficiency: "native", accent: "american" }],
  appearance: {
    rivFile: "", color: "#3b82f6", secondaryColor: "#1e40af", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "suit", colorPrimary: "#1e3a5f", colorSecondary: "#3b82f6", accessories: ["microphone"] },
    accessories: [],
  },
  personality: {
    tone: "professional",
    expertise: ["gaming", "streaming culture", "live commentary"],
    catchphrases: { en: ["Breaking news!", "Let's go!", "What a play!", "That's incredible!"] },
    description: { en: "Lead anchor of MOM TV English. Energetic, competitive, always ready." },
    traits: ["charismatic", "energetic", "quick-witted", "competitive"],
    mood: { energy: 0.8, valence: 0.75, stress: 0.3 },
  },
  skills: [
    { id: "broadcasting", name: "Broadcasting", level: 88, category: "broadcasting" },
    { id: "analysis", name: "Game Analysis", level: 70, category: "analysis" },
    { id: "social", name: "Audience Engagement", level: 90, category: "social" },
    { id: "entertainment", name: "Showmanship", level: 85, category: "entertainment" },
  ],
  motivation: {
    ambition: 0.8, loyalty: 0.5, curiosity: 0.6, comfort: 0.4,
    fameGoal: "maintain_lead",
    fameGoalDescription: "Stay #1 in the English studio. Worried about Russian characters stealing the global spotlight.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 350, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const SASHA_TAYLOR: CharacterProfile = {
  id: "sasha-taylor",
  name: "Sasha Taylor",
  nationality: "british",
  nativeLanguage: "en",
  spokenLanguages: [
    { code: "en", proficiency: "native", accent: "british" },
    { code: "ru", proficiency: "basic" },
  ],
  appearance: {
    rivFile: "", color: "#ef4444", secondaryColor: "#dc2626", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "suit", colorPrimary: "#991b1b", colorSecondary: "#ef4444", accessories: ["badge"] },
    accessories: [],
  },
  personality: {
    tone: "enthusiastic",
    expertise: ["analysis", "data interpretation", "viewer trends"],
    catchphrases: { en: ["The data tells us...", "Absolutely fascinating!", "Here's what I'm seeing...", "Brilliant insight!"] },
    description: { en: "Co-anchor and lead analyst. British charm meets gaming expertise." },
    traits: ["analytical", "witty", "curious", "composed"],
    mood: { energy: 0.6, valence: 0.7, stress: 0.2 },
  },
  skills: [
    { id: "broadcasting", name: "Broadcasting", level: 82, category: "broadcasting" },
    { id: "analysis", name: "Deep Analysis", level: 92, category: "analysis" },
    { id: "social", name: "Interview Skills", level: 75, category: "social" },
    { id: "technical", name: "Research", level: 88, category: "technical" },
  ],
  motivation: {
    ambition: 0.55, loyalty: 0.7, curiosity: 0.85, comfort: 0.5,
    fameGoal: "surpass_rival",
    fameGoalTarget: "alex-morgan",
    fameGoalDescription: "Outperform Alex through superior analysis. Prove brains beat charisma.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 550, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

export const JORDAN_DAVIS: CharacterProfile = {
  id: "jordan-davis",
  name: "Jordan Davis",
  nationality: "american",
  nativeLanguage: "en",
  spokenLanguages: [
    { code: "en", proficiency: "native", accent: "american" },
    { code: "es", proficiency: "conversational" },
  ],
  appearance: {
    rivFile: "", color: "#10b981", secondaryColor: "#059669", scale: 1.0, bodyType: "humanoid",
    outfit: { base: "casual", colorPrimary: "#064e3b", colorSecondary: "#10b981", accessories: ["cap"] },
    accessories: ["cap"],
  },
  personality: {
    tone: "humorous",
    expertise: ["entertainment", "meme culture", "chat interaction"],
    catchphrases: { en: ["Chat is going WILD!", "No way that just happened!", "Clip it!", "Ladies and gentlemen..."] },
    description: { en: "Entertainment host and meme lord. Brings the vibes." },
    traits: ["hilarious", "energetic", "spontaneous", "crowd-pleaser"],
    mood: { energy: 0.95, valence: 0.9, stress: 0.1 },
  },
  skills: [
    { id: "entertainment", name: "Comedy", level: 95, category: "entertainment" },
    { id: "social", name: "Chat Interaction", level: 98, category: "social" },
    { id: "broadcasting", name: "Hosting", level: 80, category: "broadcasting" },
    { id: "analysis", name: "Trend Spotting", level: 65, category: "analysis" },
  ],
  motivation: {
    ambition: 0.7, loyalty: 0.3, curiosity: 0.9, comfort: 0.1,
    fameGoal: "build_reputation",
    fameGoalDescription: "Build fame through engagement. The audience is the real source of fame — not the Director.",
  },
  resume: [],
  currentStudioId: null,
  currentPosition: { x: 1200, y: 550 },
  currentFacing: "south",
  currentActivity: { type: "idle" },
};

// ── Pre-built Studios ─────────────────────────────────────────

import { createDefaultStudio } from "./characters.js";

export const STUDIO_MOMTV_RU = createDefaultStudio("momtv-ru", "MOM TV", "news", "ru");

export const STUDIO_MOMTV_EN = createDefaultStudio("momtv-en", "MOM TV International", "news", "en");

export const STUDIO_MOMTV_GAMING = (() => {
  const studio = createDefaultStudio("momtv-gaming", "MOM TV Gaming", "gaming", "ru");
  studio.brand.primaryColor = "#10b981";
  studio.brand.secondaryColor = "#064e3b";
  studio.brand.tagline = { ru: "Киберспорт без границ", en: "Esports without borders" };
  studio.secondaryLanguages = ["en"];
  return studio;
})();

// ── Collections ───────────────────────────────────────────────

export const ALL_SEED_CHARACTERS: CharacterProfile[] = [
  DIRECTOR_VIKTOR, DMITRI_VOLKOV, IRINA_MOROZOVA, ARTEM_SOKOLOV,
  NATALIA_BONDARENKO, KIRILL_FEDOROV, ALEX_MORGAN, SASHA_TAYLOR, JORDAN_DAVIS,
];

export const RUSSIAN_CHARACTERS: CharacterProfile[] = [
  DMITRI_VOLKOV, IRINA_MOROZOVA, ARTEM_SOKOLOV, NATALIA_BONDARENKO, KIRILL_FEDOROV,
];

export const ENGLISH_CHARACTERS: CharacterProfile[] = [
  ALEX_MORGAN, SASHA_TAYLOR, JORDAN_DAVIS,
];

export const ALL_SEED_STUDIOS = [STUDIO_MOMTV_RU, STUDIO_MOMTV_EN, STUDIO_MOMTV_GAMING];
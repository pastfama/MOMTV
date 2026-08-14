// ============================================================
// MOMTV Shared - Full Network: 12 Studios, 23+ Characters
// ============================================================
// All studios are about WATCHING AND ANALYZING STREAMERS.
// Differentiated by: which streamers, what angle, what language.
// ============================================================

import type { CharacterProfile } from "./characters.js";
import { createDefaultStudio } from "./characters.js";

// ── New Russian-Only Characters ───────────────────────────────

export const MAXIM_PETROV: CharacterProfile = {
  id: "maxim-petrov", name: "Максим Петров", nameLatin: "Maxim Petrov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "kazan" }],
  appearance: { rivFile: "", color: "#06b6d4", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#164e63", colorSecondary: "#06b6d4", accessories: ["headphones"] }, accessories: ["headphones"] },
  personality: { tone: "dramatic", expertise: ["esports", "stream hosting", "viewer engagement"],
    catchphrases: { ru: ["Ребята, это БОМБА!", "Смотрите что происходит!", "Стрим горит!"] },
    description: { ru: "Ведущий MOM TV Gaming. Энергичный, драматичный, живёт стримами." },
    traits: ["energetic", "dramatic", "engaging", "competitive"], mood: { energy: 0.9, valence: 0.8, stress: 0.3 } },
  skills: [{ id: "broadcasting", name: "Hosting", level: 85, category: "broadcasting" }, { id: "entertainment", name: "Hype", level: 90, category: "entertainment" }, { id: "analysis", name: "Game Knowledge", level: 75, category: "analysis" }, { id: "social", name: "Chat Reading", level: 88, category: "social" }],
  motivation: { ambition: 0.8, loyalty: 0.4, curiosity: 0.7, comfort: 0.3, fameGoal: "break_story", fameGoalDescription: "Be the first to spot a legendary stream moment. Hype is my weapon." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const OLEG_KUZNETSOV: CharacterProfile = {
  id: "oleg-kuznetsov", name: "Олег Кузнецов", nameLatin: "Oleg Kuznetsov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "moscow" }],
  appearance: { rivFile: "", color: "#dc2626", scale: 1.0, bodyType: "humanoid", outfit: { base: "suit", colorPrimary: "#450a0a", colorSecondary: "#dc2626", accessories: ["microphone"] }, accessories: [] },
  personality: { tone: "professional", expertise: ["FPS games", "tactical analysis", "pro scene"],
    catchphrases: { ru: ["Тактический разбор!", "Видите позицию? Вот это уровень.", "Профессиональный подход."] },
    description: { ru: "Ведущий аналитик FPS стримов. Тактический, точный, как швейцарские часы." },
    traits: ["precise", "tactical", "calm", "methodical"], mood: { energy: 0.5, valence: 0.6, stress: 0.2 } },
  skills: [{ id: "analysis", name: "Tactical Analysis", level: 95, category: "analysis" }, { id: "broadcasting", name: "Anchor", level: 80, category: "broadcasting" }, { id: "technical", name: "FPS Knowledge", level: 92, category: "technical" }, { id: "social", name: "Audience", level: 60, category: "social" }],
  motivation: { ambition: 0.6, loyalty: 0.7, curiosity: 0.4, comfort: 0.6, fameGoal: "build_reputation", fameGoalDescription: "Be recognized as the best FPS analyst in Russian streaming." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const SERGEY_NOVIKOV: CharacterProfile = {
  id: "sergey-novikov", name: "Сергей Новиков", nameLatin: "Sergey Novikov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "rostov" }],
  appearance: { rivFile: "", color: "#f97316", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#7c2d12", colorSecondary: "#f97316", accessories: ["cap"] }, accessories: ["cap"] },
  personality: { tone: "enthusiastic", expertise: ["FPS commentary", "play-by-play", "hype casting"],
    catchphrases: { ru: ["ОН ПОПАЛ!", "Невероятный выстрел!", "Вот это КЛИП!"] },
    description: { ru: "Комментатор FPS стримов. Горячий, как донское лето." },
    traits: ["excitable", "loud", "passionate", "quick-talking"], mood: { energy: 0.95, valence: 0.85, stress: 0.3 } },
  skills: [{ id: "broadcasting", name: "Commentary", level: 90, category: "broadcasting" }, { id: "entertainment", name: "Hype Casting", level: 95, category: "entertainment" }, { id: "analysis", name: "Play Reading", level: 70, category: "analysis" }, { id: "social", name: "Energy", level: 92, category: "social" }],
  motivation: { ambition: 0.75, loyalty: 0.5, curiosity: 0.6, comfort: 0.2, fameGoal: "get_promoted", fameGoalTarget: "lead-anchor", fameGoalDescription: "From commentator to main anchor. My energy deserves the spotlight." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const TATYANA_SMIRNOVA: CharacterProfile = {
  id: "tatyana-smirnova", name: "Татьяна Смирнова", nameLatin: "Tatyana Smirnova",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "moscow" }, { code: "en", proficiency: "conversational" }],
  appearance: { rivFile: "", color: "#a855f7", scale: 1.0, bodyType: "humanoid", outfit: { base: "suit", colorPrimary: "#3b0764", colorSecondary: "#a855f7", accessories: ["badge"] }, accessories: [] },
  personality: { tone: "professional", expertise: ["streamer profiles", "growth analysis", "platform trends"],
    catchphrases: { ru: ["Давайте разберём стримера.", "Цифры говорят сами за себя.", "Интересная динамика."] },
    description: { ru: "Ведущая Стрим Кингз. Профили стримеров — её конёк." },
    traits: ["analytical", "curious", "thorough", "insightful"], mood: { energy: 0.6, valence: 0.7, stress: 0.25 } },
  skills: [{ id: "analysis", name: "Streamer Analysis", level: 95, category: "analysis" }, { id: "broadcasting", name: "Anchor", level: 82, category: "broadcasting" }, { id: "social", name: "Platform Trends", level: 88, category: "social" }, { id: "technical", name: "Data Interpretation", level: 90, category: "technical" }],
  motivation: { ambition: 0.7, loyalty: 0.6, curiosity: 0.8, comfort: 0.4, fameGoal: "top_leaderboard", fameGoalDescription: "Be the most trusted name in streamer analysis." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const ANNA_VASILEVA: CharacterProfile = {
  id: "anna-vasileva", name: "Анна Васильева", nameLatin: "Anna Vasileva",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "saint-petersburg" }],
  appearance: { rivFile: "", color: "#ec4899", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#831843", colorSecondary: "#ec4899", accessories: ["glasses"] }, accessories: ["glasses"] },
  personality: { tone: "calm", expertise: ["viewer analytics", "chat analysis", "streamer growth patterns"],
    catchphrases: { ru: ["Данные показывают...", "Посмотрите на график.", "Вот что я нашла."] },
    description: { ru: "Аналитик Стрим Кингз. Данные — её язык." },
    traits: ["data-driven", "methodical", "quiet-but-sharp", "observant"], mood: { energy: 0.4, valence: 0.65, stress: 0.2 } },
  skills: [{ id: "analysis", name: "Data Analysis", level: 98, category: "analysis" }, { id: "technical", name: "Analytics Tools", level: 92, category: "technical" }, { id: "broadcasting", name: "Analysis Delivery", level: 65, category: "broadcasting" }, { id: "social", name: "Chat Metrics", level: 85, category: "social" }],
  motivation: { ambition: 0.5, loyalty: 0.7, curiosity: 0.9, comfort: 0.5, fameGoal: "surpass_rival", fameGoalTarget: "tatyana-smirnova", fameGoalDescription: "Outanalyze Татьяна. Data beats charisma." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const ROMAN_VOLKOV: CharacterProfile = {
  id: "roman-volkov", name: "Роман Волков", nameLatin: "Roman Volkov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "yekaterinburg" }],
  appearance: { rivFile: "", color: "#ef4444", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#7f1d1d", colorSecondary: "#ef4444", accessories: ["cap"] }, accessories: [] },
  personality: { tone: "sarcastic", expertise: ["streamer drama", "controversy analysis", "hot takes"],
    catchphrases: { ru: ["Ну давайте, расскажу ВСЁ.", "Это же очевидно!", "Горячая тема, ребята!"] },
    description: { ru: "Ведущий Драма. Остроумный, язвительный, не боится говорить правду." },
    traits: ["opinionated", "sharp-tongued", "entertaining", "provocative"], mood: { energy: 0.8, valence: 0.6, stress: 0.4 } },
  skills: [{ id: "entertainment", name: "Hot Takes", level: 95, category: "entertainment" }, { id: "broadcasting", name: "Debate Hosting", level: 88, category: "broadcasting" }, { id: "social", name: "Drama Radar", level: 92, category: "social" }, { id: "analysis", name: "Controversy Analysis", level: 80, category: "analysis" }],
  motivation: { ambition: 0.85, loyalty: 0.3, curiosity: 0.8, comfort: 0.1, fameGoal: "top_leaderboard", fameGoalDescription: "Drama = views = fame. Be the most talked-about voice in streaming." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const YULIA_ZAKHAROVA: CharacterProfile = {
  id: "yulia-zakharova", name: "Юлия Захарова", nameLatin: "Yulia Zakharova",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "nizhny-novgorod" }],
  appearance: { rivFile: "", color: "#f59e0b", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#78350f", colorSecondary: "#f59e0b", accessories: ["badge"] }, accessories: [] },
  personality: { tone: "humorous", expertise: ["counter-arguments", "streamer defense", "perspective shifts"],
    catchphrases: { ru: ["А с другой стороны...", "Подождите, а может это ГЕНИАЛЬНО?", "Не всё так просто!"] },
    description: { ru: "Со-ведущая Драма. Адвокат дьявола. Заставляет думать." },
    traits: ["provocative", "witty", "empathetic", "devil's-advocate"], mood: { energy: 0.7, valence: 0.7, stress: 0.3 } },
  skills: [{ id: "entertainment", name: "Debate", level: 90, category: "entertainment" }, { id: "social", name: "Perspective", level: 88, category: "social" }, { id: "broadcasting", name: "Co-Hosting", level: 82, category: "broadcasting" }, { id: "analysis", name: "Context", level: 75, category: "analysis" }],
  motivation: { ambition: 0.65, loyalty: 0.5, curiosity: 0.85, comfort: 0.3, fameGoal: "surpass_rival", fameGoalTarget: "roman-volkov", fameGoalDescription: "Prove the devil's advocate gets more viewers than the hot take artist." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const ELENA_MOROZOVA: CharacterProfile = {
  id: "elena-morozova", name: "Елена Морозова", nameLatin: "Elena Morozova",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "saint-petersburg" }, { code: "en", proficiency: "fluent" }],
  appearance: { rivFile: "", color: "#6366f1", scale: 1.0, bodyType: "humanoid", outfit: { base: "suit", colorPrimary: "#1e1b4b", colorSecondary: "#6366f1", accessories: ["glasses"] }, accessories: ["glasses"] },
  personality: { tone: "calm", expertise: ["stream ecosystem analysis", "platform economics", "industry trends"],
    catchphrases: { ru: ["За видимой частью стрима скрывается...", "Давайте посмотрим глубже.", "Цифры говорят о тренде."] },
    description: { ru: "Рассказчик Глубокого Анализа. Серьёзная, как документальный фильм." },
    traits: ["serious", "thorough", "intellectual", "patient"], mood: { energy: 0.3, valence: 0.6, stress: 0.15 } },
  skills: [{ id: "analysis", name: "Deep Investigation", level: 98, category: "analysis" }, { id: "broadcasting", name: "Narration", level: 88, category: "broadcasting" }, { id: "technical", name: "Research", level: 95, category: "technical" }, { id: "social", name: "Interviews", level: 70, category: "social" }],
  motivation: { ambition: 0.55, loyalty: 0.8, curiosity: 0.95, comfort: 0.6, fameGoal: "top_leaderboard", fameGoalDescription: "Be the most respected investigative voice in streaming journalism." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const NIKOLAY_ORLOV: CharacterProfile = {
  id: "nikolay-orlov", name: "Николай Орлов", nameLatin: "Nikolay Orlov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "moscow" }, { code: "en", proficiency: "conversational" }],
  appearance: { rivFile: "", color: "#0ea5e9", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#0c4a6e", colorSecondary: "#0ea5e9", accessories: ["glasses"] }, accessories: ["glasses"] },
  personality: { tone: "professional", expertise: ["data scraping", "viewer bot detection", "stream analytics"],
    catchphrases: { ru: ["Алгоритмы показывают...", "Данные не врут.", "Паттерн обнаружен."] },
    description: { ru: "Аналитик данных Глубокого Анализа. Находит скрытые паттерны." },
    traits: ["meticulous", "data-obsessed", "quiet", "brilliant"], mood: { energy: 0.35, valence: 0.55, stress: 0.3 } },
  skills: [{ id: "technical", name: "Data Science", level: 98, category: "technical" }, { id: "analysis", name: "Pattern Recognition", level: 95, category: "analysis" }, { id: "broadcasting", name: "Data Presentation", level: 55, category: "broadcasting" }, { id: "social", name: "Research", level: 60, category: "social" }],
  motivation: { ambition: 0.4, loyalty: 0.8, curiosity: 0.95, comfort: 0.7, fameGoal: "build_reputation", fameGoalDescription: "Be the data wizard behind the scenes. Fame through intellectual respect." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const MARINA_LEBEDEVA: CharacterProfile = {
  id: "marina-lebedeva", name: "Марина Лебедева", nameLatin: "Marina Lebedeva",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "novosibirsk" }],
  appearance: { rivFile: "", color: "#22c55e", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#14532d", colorSecondary: "#22c55e", accessories: ["microphone"] }, accessories: [] },
  personality: { tone: "enthusiastic", expertise: ["new streamer discovery", "rising talent spotting", "platform trends"],
    catchphrases: { ru: ["Ребята, смотрите кого нашла!", "Этот стример — будущая звезда!", "Запомните это имя!"] },
    description: { ru: "Скаут Новичок. Находит звёзд до того, как они зажгутся." },
    traits: ["enthusiastic", "optimistic", "sharp-eyed", "trendy"], mood: { energy: 0.85, valence: 0.85, stress: 0.2 } },
  skills: [{ id: "social", name: "Talent Spotting", level: 95, category: "social" }, { id: "broadcasting", name: "Showcase Hosting", level: 80, category: "broadcasting" }, { id: "analysis", name: "Growth Prediction", level: 78, category: "analysis" }, { id: "entertainment", name: "Discovery Excitement", level: 90, category: "entertainment" }],
  motivation: { ambition: 0.7, loyalty: 0.4, curiosity: 0.95, comfort: 0.2, fameGoal: "break_story", fameGoalDescription: "Discover the next big streamer before anyone else. First to know = most famous." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const PAVEL_FEDOROV: CharacterProfile = {
  id: "pavel-fedorov", name: "Павел Фёдоров", nameLatin: "Pavel Fedorov",
  nationality: "russian", nativeLanguage: "ru",
  spokenLanguages: [{ code: "ru", proficiency: "native", accent: "moscow" }],
  appearance: { rivFile: "", color: "#78716c", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#292524", colorSecondary: "#78716c", accessories: ["glasses"] }, accessories: ["glasses"] },
  personality: { tone: "sarcastic", expertise: ["stream quality critique", "content evaluation", "harsh reviews"],
    catchphrases: { ru: ["Честно? Посредственно.", "Потенциал есть, но...", "Могу объективно оценить."] },
    description: { ru: "Критик Новичок. Строгий, но справедливый. Разбирает стримы по косточкам." },
    traits: ["harsh-but-fair", "critical", "knowledgeable", "standards-driven"], mood: { energy: 0.45, valence: 0.4, stress: 0.35 } },
  skills: [{ id: "analysis", name: "Content Critique", level: 95, category: "analysis" }, { id: "technical", name: "Production Quality", level: 88, category: "technical" }, { id: "broadcasting", name: "Review Delivery", level: 75, category: "broadcasting" }, { id: "entertainment", name: "Roasting", level: 82, category: "entertainment" }],
  motivation: { ambition: 0.5, loyalty: 0.6, curiosity: 0.7, comfort: 0.5, fameGoal: "build_reputation", fameGoalDescription: "Be the most respected (and feared) stream critic. Fame through honesty." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

// ── New International Characters ──────────────────────────────

export const BLAKE_ANDERSON: CharacterProfile = {
  id: "blake-anderson", name: "Blake Anderson", nationality: "american", nativeLanguage: "en",
  spokenLanguages: [{ code: "en", proficiency: "native", accent: "american" }],
  appearance: { rivFile: "", color: "#14b8a6", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#134e4a", colorSecondary: "#14b8a6", accessories: ["headphones"] }, accessories: ["headphones"] },
  personality: { tone: "enthusiastic", expertise: ["esports casting", "play-by-play", "hype moments"],
    catchphrases: { en: ["OH MY GOD DID YOU SEE THAT?!", "CLIP IT!", "That's going on the highlight reel!"] },
    description: { en: "English gaming caster. Pure energy. Makes every play sound legendary." },
    traits: ["loud", "hype", "quick-witted", "memorable"], mood: { energy: 0.95, valence: 0.9, stress: 0.15 } },
  skills: [{ id: "entertainment", name: "Casting", level: 95, category: "entertainment" }, { id: "broadcasting", name: "Play-by-Play", level: 90, category: "broadcasting" }, { id: "social", name: "Chat Hype", level: 88, category: "social" }, { id: "analysis", name: "Game Sense", level: 72, category: "analysis" }],
  motivation: { ambition: 0.8, loyalty: 0.3, curiosity: 0.7, comfort: 0.2, fameGoal: "build_reputation", fameGoalDescription: "Be the voice of English esports casting. Energy = fame." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const CARLOS_GARCIA: CharacterProfile = {
  id: "carlos-garcia", name: "Carlos García", nationality: "spanish", nativeLanguage: "es",
  spokenLanguages: [{ code: "es", proficiency: "native", accent: "madrid" }, { code: "en", proficiency: "fluent" }, { code: "pt", proficiency: "conversational" }],
  appearance: { rivFile: "", color: "#eab308", scale: 1.0, bodyType: "humanoid", outfit: { base: "suit", colorPrimary: "#422006", colorSecondary: "#eab308", accessories: ["microphone"] }, accessories: [] },
  personality: { tone: "professional", expertise: ["LATAM streamers", "Spanish-speaking community", "cross-cultural analysis"],
    catchphrases: { es: ["¡Esto es increíble!", "Vamos a analizar esto.", "Los números no mienten."] },
    description: { es: "Presentador de MOM TV Latino. Profesional, apasionado, conecta culturas." },
    traits: ["charismatic", "professional", "culturally-aware", "passionate"], mood: { energy: 0.7, valence: 0.75, stress: 0.25 } },
  skills: [{ id: "broadcasting", name: "Anchoring", level: 88, category: "broadcasting" }, { id: "social", name: "Community Connection", level: 90, category: "social" }, { id: "analysis", name: "Cultural Analysis", level: 82, category: "analysis" }, { id: "entertainment", name: "Presence", level: 85, category: "entertainment" }],
  motivation: { ambition: 0.7, loyalty: 0.5, curiosity: 0.7, comfort: 0.4, fameGoal: "top_leaderboard", fameGoalDescription: "Be the top Spanish-language stream analyst. Expand MOM TV to LATAM." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const SOFIA_MARTINEZ: CharacterProfile = {
  id: "sofia-martinez", name: "Sofía Martínez", nationality: "spanish", nativeLanguage: "es",
  spokenLanguages: [{ code: "es", proficiency: "native", accent: "buenos-aires" }, { code: "en", proficiency: "fluent" }, { code: "pt", proficiency: "conversational" }],
  appearance: { rivFile: "", color: "#d946ef", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#701a75", colorSecondary: "#d946ef", accessories: ["badge"] }, accessories: [] },
  personality: { tone: "enthusiastic", expertise: ["LATAM esports", "viewer trends", "streamer growth"],
    catchphrases: { es: ["¡Los datos son fascinantes!", "Miren estas estadísticas.", "¡Hay una tendencia nueva!"] },
    description: { es: "Analista de MOM TV Latino. Buenos Aires. Datos + pasión." },
    traits: ["analytical", "passionate", "detail-oriented", "engaging"], mood: { energy: 0.75, valence: 0.8, stress: 0.2 } },
  skills: [{ id: "analysis", name: "Data Analysis", level: 92, category: "analysis" }, { id: "broadcasting", name: "Analysis Delivery", level: 80, category: "broadcasting" }, { id: "social", name: "Community", level: 85, category: "social" }, { id: "technical", name: "Metrics", level: 88, category: "technical" }],
  motivation: { ambition: 0.6, loyalty: 0.6, curiosity: 0.8, comfort: 0.4, fameGoal: "surpass_rival", fameGoalTarget: "carlos-garcia", fameGoalDescription: "Prove data analysis beats anchor charisma in LATAM streaming." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const HARUTO_TANAKA: CharacterProfile = {
  id: "haruto-tanaka", name: "田中ハルト", nameLatin: "Haruto Tanaka", nationality: "japanese", nativeLanguage: "ja",
  spokenLanguages: [{ code: "ja", proficiency: "native" }, { code: "en", proficiency: "conversational" }, { code: "ko", proficiency: "basic" }],
  appearance: { rivFile: "", color: "#f43f5e", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#4c0519", colorSecondary: "#f43f5e", accessories: ["headphones"] }, accessories: ["headphones"] },
  personality: { tone: "calm", expertise: ["JP/KR streamers", "VTuber analysis", "Asian streaming platforms"],
    catchphrases: { ja: ["面白いストリームですね。", "データを見てみましょう。", "これがトレンドです。"] },
    description: { ja: "MOM TV Азияのホスト。冷静だが情熱的。JP/KRストリームの専門家。" },
    traits: ["calm", "insightful", "culturally-nuanced", "precise"], mood: { energy: 0.5, valence: 0.65, stress: 0.2 } },
  skills: [{ id: "analysis", name: "Asian Stream Analysis", level: 95, category: "analysis" }, { id: "broadcasting", name: "Hosting", level: 80, category: "broadcasting" }, { id: "social", name: "VTuber Knowledge", level: 92, category: "social" }, { id: "technical", name: "Platform Expert", level: 88, category: "technical" }],
  motivation: { ambition: 0.55, loyalty: 0.7, curiosity: 0.85, comfort: 0.5, fameGoal: "build_reputation", fameGoalDescription: "Introduce JP/KR streaming culture to the global MOM TV audience." },
  resume: [], currentStudioId: null, currentPosition: { x: 350, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const SAKURA_ITO: CharacterProfile = {
  id: "sakura-ito", name: "伊藤さくら", nameLatin: "Sakura Ito", nationality: "japanese", nativeLanguage: "ja",
  spokenLanguages: [{ code: "ja", proficiency: "native" }, { code: "en", proficiency: "conversational" }, { code: "ko", proficiency: "conversational" }],
  appearance: { rivFile: "", color: "#fb923c", scale: 1.0, bodyType: "humanoid", outfit: { base: "casual", colorPrimary: "#7c2d12", colorSecondary: "#fb923c", accessories: ["badge"] }, accessories: [] },
  personality: { tone: "enthusiastic", expertise: ["JP/KR esports", "tournament analysis", "pro player profiles"],
    catchphrases: { ja: ["すごいプレイ！", "これは注目すべきストリーマーです。", "アジアのeスポーツが熱い！"] },
    description: { ja: "MOM TV Азияのコメンテーター。エネルギッシュで詳しい。" },
    traits: ["energetic", "knowledgeable", "cheerful", "competitive"], mood: { energy: 0.85, valence: 0.8, stress: 0.25 } },
  skills: [{ id: "broadcasting", name: "Commentary", level: 85, category: "broadcasting" }, { id: "analysis", name: "Esports Analysis", level: 88, category: "analysis" }, { id: "entertainment", name: "Energy", level: 90, category: "entertainment" }, { id: "social", name: "Community", level: 82, category: "social" }],
  motivation: { ambition: 0.7, loyalty: 0.5, curiosity: 0.8, comfort: 0.3, fameGoal: "break_story", fameGoalDescription: "Break a major JP/KR esports story to the global audience." },
  resume: [], currentStudioId: null, currentPosition: { x: 550, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

export const MORGAN_TAYLOR: CharacterProfile = {
  id: "morgan-taylor", name: "Morgan Taylor", nationality: "british", nativeLanguage: "en",
  spokenLanguages: [{ code: "en", proficiency: "native", accent: "british" }, { code: "es", proficiency: "fluent" }, { code: "ru", proficiency: "conversational" }, { code: "fr", proficiency: "basic" }],
  appearance: { rivFile: "", color: "#8b5cf6", scale: 1.0, bodyType: "humanoid", outfit: { base: "suit", colorPrimary: "#2e1065", colorSecondary: "#8b5cf6", accessories: ["glasses"] }, accessories: ["glasses"] },
  personality: { tone: "calm", expertise: ["cross-cultural analysis", "international streams", "global trends"],
    catchphrases: { en: ["Comparing across cultures...", "The global picture is fascinating.", "In Russia they do it differently."] },
    description: { en: "Cultural analyst at MOM TV Мост. Bridges Russian, English, and Spanish streaming worlds." },
    traits: ["multilingual", "culturally-aware", "diplomatic", "insightful"], mood: { energy: 0.55, valence: 0.7, stress: 0.2 } },
  skills: [{ id: "analysis", name: "Cross-Cultural Analysis", level: 95, category: "analysis" }, { id: "social", name: "Multilingual Communication", level: 92, category: "social" }, { id: "broadcasting", name: "Reporting", level: 78, category: "broadcasting" }, { id: "technical", name: "Global Data", level: 85, category: "technical" }],
  motivation: { ambition: 0.6, loyalty: 0.5, curiosity: 0.95, comfort: 0.3, fameGoal: "break_story", fameGoalDescription: "Uncover a story that connects streamers across all MOM TV studios worldwide." },
  resume: [], currentStudioId: null, currentPosition: { x: 450, y: 550 }, currentFacing: "south", currentActivity: { type: "idle" },
};

// ── 12 Studios (all about watching/analyzing streamers) ──────

export const STUDIO_MOMTV_NEWS = (() => {
  const s = createDefaultStudio("momtv-news", "MOM TV", "news", "ru");
  s.brand.tagline = { ru: "Главные стримы России", en: "Russia's Top Streams" };
  return s;
})();

export const STUDIO_MOMTV_GAMING_RU = (() => {
  const s = createDefaultStudio("momtv-gaming", "MOM TV Gaming", "gaming", "ru");
  s.brand.primaryColor = "#06b6d4";
  s.brand.secondaryColor = "#164e63";
  s.brand.tagline = { ru: "Киберспорт без границ", en: "Esports without borders" };
  return s;
})();

export const STUDIO_MOMTV_FPS = (() => {
  const s = createDefaultStudio("momtv-fps", "MOM TV ФПС", "gaming", "ru");
  s.brand.primaryColor = "#dc2626";
  s.brand.secondaryColor = "#450a0a";
  s.brand.tagline = { ru: "Тактика. Стратегия. Стримы.", en: "Tactics. Strategy. Streams." };
  return s;
})();

export const STUDIO_MOMTV_STREAM_KINGS = (() => {
  const s = createDefaultStudio("momtv-stream-kings", "MOM TV Стрим Кингз", "entertainment", "ru");
  s.brand.primaryColor = "#a855f7";
  s.brand.secondaryColor = "#3b0764";
  s.brand.tagline = { ru: "Короли стримов", en: "Kings of Streaming" };
  return s;
})();

export const STUDIO_MOMTV_DRAMA = (() => {
  const s = createDefaultStudio("momtv-drama", "MOM TV Драма", "entertainment", "ru");
  s.brand.primaryColor = "#ef4444";
  s.brand.secondaryColor = "#7f1d1d";
  s.brand.tagline = { ru: "Горячие темы. Честные мнения.", en: "Hot takes. Honest opinions." };
  return s;
})();

export const STUDIO_MOMTV_DEEP = (() => {
  const s = createDefaultStudio("momtv-deep", "MOM TV Глубокий Анализ", "documentary", "ru");
  s.brand.primaryColor = "#6366f1";
  s.brand.secondaryColor = "#1e1b4b";
  s.brand.tagline = { ru: "За пределами стрима", en: "Beyond the stream" };
  return s;
})();

export const STUDIO_MOMTV_NEWCOMERS = (() => {
  const s = createDefaultStudio("momtv-newcomers", "MOM TV Новичок", "gaming", "ru");
  s.brand.primaryColor = "#22c55e";
  s.brand.secondaryColor = "#14532d";
  s.brand.tagline = { ru: "Завтрашние звёзды сегодня", en: "Tomorrow's stars today" };
  return s;
})();

export const STUDIO_MOMTV_INTERNATIONAL = (() => {
  const s = createDefaultStudio("momtv-international", "MOM TV International", "news", "en");
  s.brand.primaryColor = "#3b82f6";
  s.brand.secondaryColor = "#1e3a5f";
  s.brand.tagline = { en: "Global streams, global stories" };
  return s;
})();

export const STUDIO_MOMTV_GAMING_EN = (() => {
  const s = createDefaultStudio("momtv-gaming-en", "MOM TV Gaming EN", "gaming", "en");
  s.brand.primaryColor = "#14b8a6";
  s.brand.secondaryColor = "#134e4a";
  s.brand.tagline = { en: "English esports coverage" };
  return s;
})();

export const STUDIO_MOMTV_LATINO = (() => {
  const s = createDefaultStudio("momtv-latino", "MOM TV Latino", "entertainment", "es");
  s.brand.primaryColor = "#eab308";
  s.brand.secondaryColor = "#422006";
  s.brand.tagline = { es: "Streaming en español", en: "Streaming in Spanish" };
  s.secondaryLanguages = ["pt", "en"];
  return s;
})();

export const STUDIO_MOMTV_ASIA = (() => {
  const s = createDefaultStudio("momtv-asia", "MOM TV アジア", "gaming", "ja");
  s.brand.primaryColor = "#f43f5e";
  s.brand.secondaryColor = "#4c0519";
  s.brand.tagline = { ja: "アジアのストリーム", en: "Asian Streams" };
  s.secondaryLanguages = ["ko", "en"];
  return s;
})();

export const STUDIO_MOMTV_BRIDGE = (() => {
  const s = createDefaultStudio("momtv-bridge", "MOM TV Мост", "multicultural", "en");
  s.brand.primaryColor = "#8b5cf6";
  s.brand.secondaryColor = "#2e1065";
  s.brand.tagline = { en: "Bridging streaming cultures worldwide", ru: "Мост между стрим-культурами мира" };
  s.broadcastLanguage = "en";
  s.secondaryLanguages = ["ru", "es", "uk"];
  s.translationPolicy = "auto";
  return s;
})();

// ── Emergency Schedule (today, Russian studios until midnight) ─

import type { DailySchedule } from "./schedule.js";

const today = new Date();
const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

export const EMERGENCY_SCHEDULE: DailySchedule = {
  date: dateStr,
  generatedAt: Date.now(),
  generatedBy: "director",
  strategyNotes: "Emergency schedule: Russian studios only until midnight. English studios reserved for tomorrow. Drama gets prime late evening. News gets afternoon and evening prime. Gaming for the gamers watching late.",
  theme: "Russian Stream Marathon — All Eyes on Russian Streamers",
  slots: [
    {
      hour: 13, timeLabel: "13:00", studioId: "momtv-news", studioName: "MOM TV",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "Afternoon stream news roundup — what's happening in Russian streaming today",
      cast: [
        { characterId: "dmitri-volkov", characterName: "Дмитрий Волков", characterNameLatin: "Dmitri Volkov", role: "Lead Anchor", isLead: true, language: "ru" },
        { characterId: "irina-morozova", characterName: "Ирина Морозова", characterNameLatin: "Irina Morozova", role: "Analyst", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 14, timeLabel: "14:00", studioId: "momtv-stream-kings", studioName: "MOM TV Стрим Кингз",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "Streamer profiles — who's trending in Russian streaming right now",
      cast: [
        { characterId: "tatyana-smirnova", characterName: "Татьяна Смирнова", characterNameLatin: "Tatyana Smirnova", role: "Anchor", isLead: true, language: "ru" },
        { characterId: "anna-vasileva", characterName: "Анна Васильева", characterNameLatin: "Anna Vasileva", role: "Data Analyst", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 15, timeLabel: "15:00", studioId: "momtv-fps", studioName: "MOM TV ФПС",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "FPS stream analysis — CS2, Valorant, Apex tactical breakdowns",
      cast: [
        { characterId: "oleg-kuznetsov", characterName: "Олег Кузнецов", characterNameLatin: "Oleg Kuznetsov", role: "Tactical Analyst", isLead: true, language: "ru" },
        { characterId: "sergey-novikov", characterName: "Сергей Новиков", characterNameLatin: "Sergey Novikov", role: "Commentator", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 16, timeLabel: "16:00", studioId: "momtv-gaming", studioName: "MOM TV Gaming",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "Esports streams — tournament coverage and pro play analysis",
      cast: [
        { characterId: "artem-sokolov", characterName: "Артём Соколов", characterNameLatin: "Artem Sokolov", role: "Esports Analyst", isLead: true, language: "ru" },
        { characterId: "maxim-petrov", characterName: "Максим Петров", characterNameLatin: "Maxim Petrov", role: "Host", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 17, timeLabel: "17:00", studioId: "momtv-newcomers", studioName: "MOM TV Новичок",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "Rising streamers spotlight — discovering tomorrow's stars today",
      cast: [
        { characterId: "marina-lebedeva", characterName: "Марина Лебедева", characterNameLatin: "Marina Lebedeva", role: "Scout/Host", isLead: true, language: "ru" },
        { characterId: "pavel-fedorov", characterName: "Павел Фёдоров", characterNameLatin: "Pavel Fedorov", role: "Critic", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 18, timeLabel: "18:00", studioId: "momtv-news", studioName: "MOM TV",
      language: "ru", isPrimetime: true, specialEvent: "Evening Prime — Top Stories",
      contentHint: "Evening news prime — breaking stories, top streamer updates, viewer reactions",
      durationMinutes: 60,
      cast: [
        { characterId: "dmitri-volkov", characterName: "Дмитрий Волков", characterNameLatin: "Dmitri Volkov", role: "Lead Anchor", isLead: true, language: "ru" },
        { characterId: "irina-morozova", characterName: "Ирина Морозова", characterNameLatin: "Irina Morozova", role: "Co-Anchor", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 19, timeLabel: "19:00", studioId: "momtv-stream-kings", studioName: "MOM TV Стрим Кингз",
      language: "ru", isPrimetime: true, specialEvent: "Prime Time Profiles",
      contentHint: "Deep dive into the most-watched Russian streamers of the week",
      durationMinutes: 60,
      cast: [
        { characterId: "tatyana-smirnova", characterName: "Татьяна Смирнова", characterNameLatin: "Tatyana Smirnova", role: "Anchor", isLead: true, language: "ru" },
        { characterId: "anna-vasileva", characterName: "Анна Васильева", characterNameLatin: "Anna Vasileva", role: "Analyst", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 20, timeLabel: "20:00", studioId: "momtv-gaming", studioName: "MOM TV Gaming",
      language: "ru", isPrimetime: true, specialEvent: "Prime Time Gaming — Tournament Night",
      contentHint: "Gaming prime time — live tournament reactions, pro highlights, chat analysis",
      durationMinutes: 60,
      cast: [
        { characterId: "artem-sokolov", characterName: "Артём Соколов", characterNameLatin: "Artem Sokolov", role: "Lead Analyst", isLead: true, language: "ru" },
        { characterId: "maxim-petrov", characterName: "Максим Петров", characterNameLatin: "Maxim Petrov", role: "Host", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 21, timeLabel: "21:00", studioId: "momtv-drama", studioName: "MOM TV Драма",
      language: "ru", isPrimetime: true, specialEvent: "Prime Time Drama — Streamer Showdown",
      contentHint: "Hot takes on today's biggest streamer controversies and drama",
      durationMinutes: 60,
      cast: [
        { characterId: "roman-volkov", characterName: "Роман Волков", characterNameLatin: "Roman Volkov", role: "Host", isLead: true, language: "ru" },
        { characterId: "yulia-zakharova", characterName: "Юлия Захарова", characterNameLatin: "Yulia Zakharova", role: "Co-Host / Devil's Advocate", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 22, timeLabel: "22:00", studioId: "momtv-deep", studioName: "MOM TV Глубокий Анализ",
      language: "ru", isPrimetime: false, durationMinutes: 60,
      contentHint: "Late-night deep dive — investigative analysis of streaming industry trends",
      cast: [
        { characterId: "elena-morozova", characterName: "Елена Морозова", characterNameLatin: "Elena Morozova", role: "Narrator", isLead: true, language: "ru" },
        { characterId: "nikolay-orlov", characterName: "Николай Орлов", characterNameLatin: "Nikolay Orlov", role: "Data Analyst", isLead: false, language: "ru" },
      ],
    },
    {
      hour: 23, timeLabel: "23:00", studioId: "momtv-drama", studioName: "MOM TV Драма",
      language: "ru", isPrimetime: false, specialEvent: "Late Night Drama — Unfiltered",
      contentHint: "Late night unfiltered drama — the stories nobody else will tell",
      durationMinutes: 60,
      cast: [
        { characterId: "roman-volkov", characterName: "Роман Волков", characterNameLatin: "Roman Volkov", role: "Host", isLead: true, language: "ru" },
        { characterId: "yulia-zakharova", characterName: "Юлия Захарова", characterNameLatin: "Yulia Zakharova", role: "Co-Host", isLead: false, language: "ru" },
      ],
    },
  ],
};

// ── Collections ───────────────────────────────────────────────

export const ALL_NETWORK_CHARACTERS: CharacterProfile[] = [
  MAXIM_PETROV, OLEG_KUZNETSOV, SERGEY_NOVIKOV,
  TATYANA_SMIRNOVA, ANNA_VASILEVA,
  ROMAN_VOLKOV, YULIA_ZAKHAROVA,
  ELENA_MOROZOVA, NIKOLAY_ORLOV,
  MARINA_LEBEDEVA, PAVEL_FEDOROV,
  BLAKE_ANDERSON, CARLOS_GARCIA, SOFIA_MARTINEZ,
  HARUTO_TANAKA, SAKURA_ITO, MORGAN_TAYLOR,
];

export const ALL_NETWORK_STUDIOS = [
  STUDIO_MOMTV_NEWS, STUDIO_MOMTV_GAMING_RU, STUDIO_MOMTV_FPS,
  STUDIO_MOMTV_STREAM_KINGS, STUDIO_MOMTV_DRAMA, STUDIO_MOMTV_DEEP,
  STUDIO_MOMTV_NEWCOMERS,
  STUDIO_MOMTV_INTERNATIONAL, STUDIO_MOMTV_GAMING_EN,
  STUDIO_MOMTV_LATINO, STUDIO_MOMTV_ASIA, STUDIO_MOMTV_BRIDGE,
];

export const RUSSIAN_ONLY_STUDIOS = [
  STUDIO_MOMTV_NEWS, STUDIO_MOMTV_GAMING_RU, STUDIO_MOMTV_FPS,
  STUDIO_MOMTV_STREAM_KINGS, STUDIO_MOMTV_DRAMA, STUDIO_MOMTV_DEEP,
  STUDIO_MOMTV_NEWCOMERS,
];

export const INTERNATIONAL_STUDIOS = [
  STUDIO_MOMTV_INTERNATIONAL, STUDIO_MOMTV_GAMING_EN,
  STUDIO_MOMTV_LATINO, STUDIO_MOMTV_ASIA, STUDIO_MOMTV_BRIDGE,
];
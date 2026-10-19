import { getCategorySentences, type PracticeFormat } from "./sentenceBank.js";
import { getDifficultyKey, getWordsForDifficulty, WORD_BANK, WORD_CATEGORIES, type WordCategory } from "./wordBank.js";

export type ClassroomMatchConfig = {
  wordSet: WordCategory;
  practiceFormat: PracticeFormat;
  greggSubmode?: PracticeFormat;
  difficulty: "Easy" | "Normal" | "Hard";
  roundTime: 30 | 60 | 90;
  background: string;
};

type ConfigInput = {
  wordSet?: string; practiceFormat?: string; greggSubmode?: string;
  difficulty?: string; roundTime?: number; background?: string;
};

export class ClassroomConfigError extends Error {}

export function validateClassroomConfig(input: ConfigInput): ClassroomMatchConfig {
  const difficulty = typeof input.difficulty === "string" ? getDifficultyKey(input.difficulty) : null;
  const wordSet = WORD_CATEGORIES.find(category => typeof input.wordSet === "string" && category === input.wordSet.trim().toLowerCase());
  const practiceFormat = input.practiceFormat === undefined ? "word-phrase" : input.practiceFormat; // Legacy rooms were word games.
  if (!difficulty || !wordSet || ![30, 60, 90].includes(input.roundTime ?? 0)
    || !["blues", "volts", "office", "city"].includes(input.background ?? "blues")) {
    throw new ClassroomConfigError("Invalid category, difficulty, round time, or background.");
  }
  if (practiceFormat !== "word-phrase" && practiceFormat !== "full-sentence") {
    throw new ClassroomConfigError("Invalid gameplay format. Choose Word / Phrase or Full Sentence.");
  }
  if (wordSet === "stenography") {
    if (input.greggSubmode !== undefined && input.greggSubmode !== practiceFormat) {
      throw new ClassroomConfigError("Gregg submode must match the teacher's gameplay format.");
    }
    if (practiceFormat === "word-phrase") {
      throw new ClassroomConfigError("Classroom Gregg Word / Phrase is unavailable: cropped answers await verification. Select Full Sentence before selecting Stenography.");
    }
  } else if (practiceFormat === "full-sentence" && getCategorySentences(wordSet).length === 0) {
    throw new ClassroomConfigError("Full Sentence content is unavailable for the selected category.");
  }
  return {
    wordSet, practiceFormat,
    ...(wordSet === "stenography" ? { greggSubmode: practiceFormat } : {}),
    difficulty: difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard",
    roundTime: input.roundTime as 30 | 60 | 90,
    background: input.background ?? "blues",
  };
}

export function createClassroomSequence(config: ClassroomMatchConfig): string[] {
  // IDs select existing original image/answer records on every client. No answer bank is duplicated.
  if (config.wordSet === "stenography") return [6, 7, 8, 9, 10].map(number => `steno-${number}`);
  if (config.practiceFormat === "full-sentence") return [...getCategorySentences(config.wordSet)];
  const difficulty = getDifficultyKey(config.difficulty)!;
  const preferred = [...new Set(getWordsForDifficulty(config.wordSet, difficulty))];
  const preferredSet = new Set(preferred);
  const remaining = [...new Set(WORD_BANK[config.wordSet])].filter(word => !preferredSet.has(word));
  const shuffle = (words: string[]) => {
    const shuffled = [...words];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  };
  return [...shuffle(preferred), ...shuffle(remaining)];
}

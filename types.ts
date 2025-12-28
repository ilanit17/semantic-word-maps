
export interface WordCategory {
  id: string;
  name: string;
  words: string[];
}

export interface WordImage {
  word: string;
  url: string;
}

export interface OddOneOutSet {
  options: string[];
  answer: string;
  reason: string;
}

export interface DefinitionMatch {
  word: string;
  definition: string;
}

export interface DualWordSet {
  wordA: string;
  wordB: string;
}

export type LessonMode = 'topic' | 'text';

export interface LessonState {
  mode: LessonMode;
  topic: string;
  sourceText: string;
  description: string;
  gradeLevel: string;
  withNikud: boolean;
  categories: WordCategory[];
  wordImages: WordImage[];
  oddOneOutSets: OddOneOutSet[];
  definitionMatches: DefinitionMatch[];
  alphabeticalWords: string[];
  dualWordSets: DualWordSet[];
  text: string; // The generated educational text
  usedWords: string[];
}

export type Step = 1 | 2 | 3 | 4 | 5 | 6;


import { GoogleGenAI, Type } from "@google/genai";
import { WordCategory, OddOneOutSet } from "../types";

// Always create a new instance right before making an API call to ensure latest API key is used
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const getNikudInstruction = (withNikud: boolean) => 
  withNikud ? "IMPORTANT: Use full Hebrew punctuation (Nikud/Vocalization) for all Hebrew words and sentences." : "Use standard Hebrew without Nikud.";

export const suggestSemanticNetwork = async (topic: string, gradeLevel: string, withNikud: boolean): Promise<WordCategory[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest a semantic word network for the topic "${topic}" for students in grade level "${gradeLevel}". 
    Create 4-5 relevant categories and for each category, list 5-8 words. 
    ${getNikudInstruction(withNikud)}
    Respond in Hebrew.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING, description: "Category name in Hebrew" },
            words: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of words in Hebrew"
            }
          },
          required: ["id", "name", "words"]
        }
      }
    }
  });

  try {
    const jsonStr = response.text?.trim();
    return JSON.parse(jsonStr || '[]');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw e;
  }
};

export const suggestSemanticNetworkFromText = async (sourceText: string, gradeLevel: string, withNikud: boolean): Promise<{topic: string, categories: WordCategory[]}> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analysis this Hebrew text and create a semantic word network for students in grade level "${gradeLevel}". 
    1. Identify a short central topic name for this text.
    2. Create 4-5 relevant categories found in the text and for each category, list 5-8 specific words extracted from the text. 
    ${getNikudInstruction(withNikud)}
    Text: "${sourceText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "Suggested topic name in Hebrew" },
          categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                words: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "name", "words"]
            }
          }
        },
        required: ["topic", "categories"]
      }
    }
  });

  try {
    const jsonStr = response.text?.trim();
    return JSON.parse(jsonStr || '{ "topic": "", "categories": [] }');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw e;
  }
};

export const generateFillInTheBlanks = async (categories: WordCategory[], topic: string, withNikud: boolean, contextText?: string): Promise<string[]> => {
  const allWords = categories.flatMap(c => c.words);
  const ai = getAI();
  const prompt = contextText 
    ? `Based on this text: "${contextText}", create 4-5 educational sentences in Hebrew about the topic "${topic}". 
       Use words from this list: ${allWords.join(", ")}. 
       Each sentence should have one blank space represented as "________" where one of the provided words fits perfectly.
       ${getNikudInstruction(withNikud)}`
    : `Using some of these words: ${allWords.join(", ")}, create 4-5 educational sentences in Hebrew about the topic "${topic}". 
       Each sentence should have one blank space represented as "________" where one of the provided words fits perfectly.
       ${getNikudInstruction(withNikud)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    const jsonStr = response.text?.trim();
    return JSON.parse(jsonStr || '[]');
  } catch (e) {
    console.error("Failed to parse fill-in-the-blanks response", e);
    throw e;
  }
};

export const generateDefinitions = async (words: string[], topic: string, gradeLevel: string, withNikud: boolean, contextText?: string): Promise<{word: string, definition: string}[]> => {
  const ai = getAI();
  const prompt = contextText
    ? `Based on the context of this text: "${contextText}", for the following Hebrew words related to "${topic}" at a "${gradeLevel}" level, write a clear and simple definition in Hebrew for each: ${words.join(", ")}.
       ${getNikudInstruction(withNikud)}`
    : `For the following Hebrew words related to "${topic}" at a "${gradeLevel}" level, write a clear and simple definition in Hebrew for each: ${words.join(", ")}.
       ${getNikudInstruction(withNikud)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            definition: { type: Type.STRING }
          },
          required: ["word", "definition"]
        }
      }
    }
  });
  return JSON.parse(response.text?.trim() || '[]');
};

export const generateLogicalOddOneOut = async (categories: WordCategory[], topic: string, withNikud: boolean): Promise<OddOneOutSet[]> => {
  const ai = getAI();
  const networkInfo = categories.map(c => `${c.name}: ${c.words.join(", ")}`).join("\n");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the following word categories related to "${topic}":
    ${networkInfo}
    
    Create 3 distinct "Odd One Out" exercises in Hebrew. 
    Each set must have 4 words: 3 words that belong to a CLEAR common theme (logical sub-category) and 1 word that is the outlier.
    The outlier MUST be from a different category or have a different semantic meaning.
    The logic must be clear and solvable for students.
    Include a short explanation in Hebrew for why it is the outlier.
    ${getNikudInstruction(withNikud)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["options", "answer", "reason"]
        }
      }
    }
  });

  return JSON.parse(response.text?.trim() || '[]');
};

export const generateDualWordSets = async (words: string[], topic: string, gradeLevel: string, withNikud: boolean, contextText?: string): Promise<{wordA: string, wordB: string}[]> => {
  const ai = getAI();
  const prompt = contextText
    ? `Based on the following text: "${contextText}", from the list of words: ${words.join(", ")}, pick 3 pairs of words that appeared or can naturally be used together in a sentence about "${topic}".
       Respond in Hebrew.`
    : `From the list: ${words.join(", ")}, pick 3 pairs of words that can naturally be used together in a sentence about "${topic}".
       Respond in Hebrew.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            wordA: { type: Type.STRING },
            wordB: { type: Type.STRING }
          },
          required: ["wordA", "wordB"]
        }
      }
    }
  });
  return JSON.parse(response.text?.trim() || '[]');
};

export const generateImageForWord = async (word: string, topic: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A clear, simple, high-quality flat illustration of "${word}" related to "${topic}". 
            Minimalist style, white background, educational clip art style, no text in the image.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
  return null;
};

export const generateEducationalText = async (topic: string, gradeLevel: string, words: string[], withNikud: boolean): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write a short, engaging educational text (about 100-150 words) in Hebrew about "${topic}" suitable for grade "${gradeLevel}". 
    IMPORTANT: You must naturally include as many of these keywords as possible: ${words.join(", ")}. 
    Highlight the keywords by surrounding them with double asterisks like **keyword**.
    ${getNikudInstruction(withNikud)}
    The tone should be educational and encouraging.`
  });
  return response.text || '';
};

export const addNikudToContent = async (text: string): Promise<string> => {
  if (!text) return '';
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Add full Hebrew Nikud (punctuation/vocalization) to the following text. Respond ONLY with the nikudified text, do not add any explanation:
    "${text}"`
  });
  return response.text?.trim() || text;
};

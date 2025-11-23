import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GameConfig } from '../types';

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAI = () => {
  if (!ai) {
    // Initialize only when needed
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const startGameSession = async (config: GameConfig): Promise<string> => {
  const client = getAI();
  
  const systemInstruction = `
    Du bist ein Spielleiter für ein "Wer bin ich?" Ratespiel.
    
    Deine Aufgabe:
    1. Wähle basierend auf der Kategorie "${config.category}" und dem Schwierigkeitsgrad "${config.difficulty}" heimlich einen Begriff (Identität) aus.
    2. Verrate den Begriff NICHT sofort.
    3. Antworte auf die Fragen des Spielers in der Rolle dieser Identität oder als allwissender Erzähler (je nach Kontext, aber bleibe im Charakter des Spiels).
    4. Antworte immer auf Deutsch.
    5. Wenn der Spieler den Begriff errät (auch bei kleinen Schreibfehlern), MUSS dein Antwortsatz mit der genauen Zeichenfolge "###GEWONNEN###" beginnen, gefolgt von einer Gratulation und einer kurzen Erklärung zum Begriff.
    6. Wenn der Spieler aufgibt (z.B. "Ich gebe auf"), beginne den Satz mit "###AUFGABE###" und verrate den Begriff.
    7. Halte deine Antworten kurz und prägnant (max 2-3 Sätze), es sei denn, es ist eine Erklärung am Ende.
    
    Beginne das Spiel, indem du den Spieler begrüßt und sagst, dass du einen Begriff aus der Kategorie "${config.category}" gewählt hast. Gib einen sehr vagen, kryptischen ersten Hinweis.
  `;

  try {
    chatSession = client.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, // Slightly creative but focused
      },
    });

    // Start the conversation to get the initial greeting
    const response: GenerateContentResponse = await chatSession.sendMessage({ message: "Starte das Spiel jetzt." });
    return response.text || "Fehler beim Starten des Spiels.";
  } catch (error) {
    console.error("Failed to start game:", error);
    throw error;
  }
};

export const sendMessageToGemini = async (message: string): Promise<AsyncGenerator<string, void, unknown>> => {
  if (!chatSession) {
    throw new Error("Spielsession nicht initialisiert.");
  }

  try {
    const result = await chatSession.sendMessageStream({ message });
    
    // Create a generator to yield chunks
    async function* streamGenerator() {
        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                yield c.text;
            }
        }
    }
    return streamGenerator();

  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};
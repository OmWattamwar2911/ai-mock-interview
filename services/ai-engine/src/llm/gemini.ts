import { GoogleGenAI } from "@google/genai";
import type { LlmProvider } from "./types.js";

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
    });
    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  }
}

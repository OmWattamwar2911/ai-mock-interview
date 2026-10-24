import OpenAI from "openai";
import type { LlmProvider } from "./types.js";

export class GroqProvider implements LlmProvider {
  readonly name = "groq";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile") {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });
    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Groq returned an empty response");
    return text;
  }
}

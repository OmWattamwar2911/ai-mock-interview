import type { LlmProvider } from "./types.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAiProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GroqProvider } from "./groq.js";

export function createLlmProvider(): LlmProvider | null {
  const name = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
  if (name === "groq" && process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith("<")) {
    return new GroqProvider(process.env.GROQ_API_KEY);
  }
  if (name === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  if (name === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY);
  }
  if (name === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  }
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith("<")) return new GroqProvider(process.env.GROQ_API_KEY);
  if (process.env.GEMINI_API_KEY) return new GeminiProvider(process.env.GEMINI_API_KEY);
  if (process.env.OPENAI_API_KEY) return new OpenAiProvider(process.env.OPENAI_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  return null;
}

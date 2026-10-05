import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types.js";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((part) => part.type === "text");
    if (!block || block.type !== "text") throw new Error("Anthropic returned an empty response");
    return block.text;
  }
}

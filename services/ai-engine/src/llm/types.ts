export interface LlmProvider {
  readonly name: string;
  complete(prompt: string): Promise<string>;
}

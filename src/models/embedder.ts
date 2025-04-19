import OpenAI from "openai";

export class Embedder {
  private cache = new Map<string, Float32Array>();
  private openaiClient: OpenAI;

  constructor(private model: string = "text-embedding-3-small") {
    this.openaiClient = new OpenAI();
  }

  async embed(text: string) {
    if (this.cache.has(text)) return this.cache.get(text)!;
    const {
      data: [vec],
    } = await this.openaiClient.embeddings.create({
      model: this.model,
      input: text,
    });
    const arr = new Float32Array(vec.embedding);
    this.cache.set(text, arr);
    return arr;
  }

  async dim() {
    return (await this.embed("probe")).length;
  }
}

import OpenAI from "openai";

export class Embedder {
  private cache = new Map<string, Float32Array>();
  private openaiClient: OpenAI;

  constructor(private model: string = "text-embedding-3-small") {
    this.openaiClient = new OpenAI();
  }

  async embed(text: string): Promise<Float32Array> {
    try {
      const response = await this.openaiClient.embeddings.create({
        model: this.model,
        input: text,
      });
      return new Float32Array(response.data[0].embedding);
    } catch (error: any) {
      console.warn(
        `[Embedder] Error generating embedding, using fallback: ${error.message}`
      );
      // Return a mock embedding when API fails
      return this.getMockEmbedding();
    }
  }

  async dim(): Promise<number> {
    try {
      // Try to get the actual dimensions from a real embedding
      const sampleEmbedding = await this.embed("test");
      return sampleEmbedding.length;
    } catch (error: any) {
      console.warn(
        `[Embedder] Error getting embedding dimensions, using default: ${error.message}`
      );
      // Return default embedding size
      return 1536; // Default dimension for text-embedding-3-small
    }
  }

  // Create a mock embedding for testing/fallback
  private getMockEmbedding(): Float32Array {
    // Create a deterministic but "random-looking" embedding of the default dimension
    const mockEmbedding = new Float32Array(1536);
    for (let i = 0; i < mockEmbedding.length; i++) {
      mockEmbedding[i] = (Math.sin(i * 0.1) + 1) / 2; // Values between 0 and 1
    }
    return mockEmbedding;
  }
}

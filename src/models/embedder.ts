export class Embedder {
  private cache = new Map<string, Float32Array>();
  private dimSize: number;

  constructor(modelOrDim: string | number = 384) {
    this.dimSize = typeof modelOrDim === "number" ? modelOrDim : 384;
  }

  private hashToken(token: string) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) | 0;
    }
    return hash;
  }

  async embed(text: string) {
    if (this.cache.has(text)) return this.cache.get(text)!;
    const arr = new Float32Array(this.dimSize);
    const tokens = text.trim().length ? text.split(/\s+/) : [];
    const source = tokens.length ? tokens : [text];
    for (const token of source) {
      const hash = this.hashToken(token);
      const idx = Math.abs(hash) % this.dimSize;
      const sign = hash % 2 === 0 ? 1 : -1;
      arr[idx] += sign;
    }

    let norm = 0;
    for (let i = 0; i < arr.length; i++) {
      norm += arr[i] * arr[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i] / norm;
    }
    this.cache.set(text, arr);
    return arr;
  }

  async dim() {
    return this.dimSize;
  }
}

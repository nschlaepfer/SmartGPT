import { State, Action, Propose, Evaluate, Policy } from "../core/types.js";

export class DeepExplorer {
  private Nsa = new Map<string, number>();
  private Wsa = new Map<string, number>();
  private Ns = new Map<string, number>();
  private key = (s: string, a: string) => `${s}::${a}`;
  private ucb = (s: string, a: string, c = 1.414) => {
    const nSA = this.Nsa.get(this.key(s, a)) ?? 0.1;
    const wSA = this.Wsa.get(this.key(s, a)) ?? 0;
    const nS = this.Ns.get(s) ?? 1;
    return wSA / nSA + c * Math.sqrt(Math.log(nS) / nSA);
  };
  constructor(
    private propose: Propose,
    private evaluate: Evaluate,
    private rollout: Policy
  ) {}

  private back(path: { s: State; a?: Action }[], r: number) {
    for (const { s, a } of path) {
      this.Ns.set(s.hash(), (this.Ns.get(s.hash()) ?? 0) + 1);
      if (a) {
        const k = this.key(s.hash(), a.label);
        this.Nsa.set(k, (this.Nsa.get(k) ?? 0) + 1);
        this.Wsa.set(k, (this.Wsa.get(k) ?? 0) + r);
      }
    }
  }

  private async iter(root: State, maxDepth: number) {
    const path: { s: State; a?: Action }[] = [];
    let s = root;
    for (let d = 0; d < maxDepth; ++d) {
      if (s.terminal()) break;
      const acts = await this.propose(s, 16);
      let a = acts.find(
        (x: Action) => !this.Nsa.has(this.key(s.hash(), x.label))
      );
      if (!a)
        a = acts.sort(
          (x: Action, y: Action) =>
            this.ucb(s.hash(), y.label) - this.ucb(s.hash(), x.label)
        )[0];
      path.push({ s, a });
      s = a.apply(s);
      if (!this.Ns.has(s.hash())) {
        const r = await this.evaluate(s);
        this.back(path, r);
        return;
      }
    }
    let sr = s,
      depth = path.length;
    while (!sr.terminal() && depth++ < maxDepth)
      sr = (await this.rollout(sr)).apply(sr);
    this.back(path, await this.evaluate(sr));
  }

  async search(root: State, budget = 256, maxDepth = 8) {
    for (let i = 0; i < budget; ++i) await this.iter(root, maxDepth);
    const acts = await this.propose(root, 32);
    const best = acts.sort(
      (a: Action, b: Action) =>
        (this.Nsa.get(this.key(root.hash(), b.label)) ?? 0) -
        (this.Nsa.get(this.key(root.hash(), a.label)) ?? 0)
    )[0];
    return best ? best.apply(root) : root;
  }
}

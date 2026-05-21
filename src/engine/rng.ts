export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x9e3779b9 | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(limitInclusive: number): number {
    if (limitInclusive <= 0) return 0;
    const max = Math.min(limitInclusive | 0, 32767);
    return Math.floor(this.next() * (max + 1));
  }

  range(loInclusive: number, hiExclusive: number): number {
    if (hiExclusive <= loInclusive) return loInclusive;
    return loInclusive + Math.floor(this.next() * (hiExclusive - loInclusive));
  }
}

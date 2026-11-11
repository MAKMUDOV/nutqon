/** Oddiy xotiradagi cheklovchi (bitta server jarayoni uchun). Ko'p serverli joylashtirishda Redis kabi umumiy ombor kerak. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}
  /** true — ruxsat; false — limit tugagan. */
  take(key: string, now = Date.now()): boolean {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.limit) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
  retryAfterSec(key: string, now = Date.now()): number {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length < this.limit) return 0;
    return Math.ceil((this.windowMs - (now - arr[0])) / 1000);
  }
}

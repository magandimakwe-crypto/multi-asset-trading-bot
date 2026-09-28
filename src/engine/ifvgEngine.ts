// Faithful TypeScript port of the MQL5 "Inversion Fair Value Gaps" indicator engine.
// Bar arrays are indexed 0 = oldest (same as the MQL gO/gH/... arrays).
// Reverse accessors o(k)/h(k)/... mirror the MQL O(k)/H(k) helpers (k=0 = most recent closed bar).

export type Bar = { time: number; open: number; high: number; low: number; close: number };

export type Zone = {
  left: number;
  top: number;
  right: number;
  bot: number;
  mid: number;
  dir: number; // +1 support, -1 resistance (flips when the gap inverts)
  state: number; // 0 = just inverted, 1 = active inversion, -1 = filled and kept
  xval: number; // bar where the gap became an inversion
};

export type Lab = { zone: number; x: number; y: number; dir: number };
export type IfvgEvent = { type: number; n: number; z: number };

export const EV_CREATED = 0;
export const EV_INVERTED = 1;
export const EV_UP = 2;
export const EV_DOWN = 3;
export const EV_FILLED = 4;

export type EngineParams = {
  atrLength: number;
  atrMultiplier: number;
  bounce: 'close' | 'wick';
  removeFilled: boolean;
};

const BUFFER = 500; // caps each list at 500 entries
const INT_MIN = -2147483648;

export class IfvgEngine {
  O: number[] = [];
  H: number[] = [];
  L: number[] = [];
  C: number[] = [];
  CTop: number[] = [];
  CBot: number[] = [];
  T: number[] = [];
  count = 0;

  atr = 0;
  prevClose = 0;

  zones: Zone[] = [];
  bullFvg: number[] = [];
  bearFvg: number[] = [];
  bullInv: number[] = [];
  bearInv: number[] = [];
  labs: Lab[] = [];
  events: IfvgEvent[] = [];

  bounceSignal = 0;
  isIfvg = 0;

  params: EngineParams;

  constructor(params: EngineParams) {
    this.params = params;
  }

  // reverse accessors: k=0 is the most recent closed bar
  o(k: number) { return this.O[this.count - 1 - k]; }
  h(k: number) { return this.H[this.count - 1 - k]; }
  l(k: number) { return this.L[this.count - 1 - k]; }
  c(k: number) { return this.C[this.count - 1 - k]; }
  ctop(k: number) { return this.CTop[this.count - 1 - k]; }
  cbot(k: number) { return this.CBot[this.count - 1 - k]; }

  reset() {
    this.O = []; this.H = []; this.L = []; this.C = [];
    this.CTop = []; this.CBot = []; this.T = [];
    this.count = 0;
    this.atr = 0; this.prevClose = 0;
    this.zones = []; this.bullFvg = []; this.bearFvg = [];
    this.bullInv = []; this.bearInv = [];
    this.labs = []; this.events = [];
    this.bounceSignal = 0; this.isIfvg = 0;
  }

  private newZone(left: number, bot: number, right: number, top: number, mid: number, dir: number): number {
    this.zones.push({ left, top, right, bot, mid, dir, state: 0, xval: INT_MIN });
    return this.zones.length - 1;
  }

  private addLab(zone: number, x: number, y: number, dir: number) {
    this.labs.push({ zone, x, y, dir });
  }

  private emit(type: number, n: number, z: number) {
    this.events.push({ type, n, z });
  }

  // NinjaTrader-style ATR: seeded with the first range, then a running mean over min(bar+1, period)
  private updateAtr(high: number, low: number, close: number, n: number) {
    if (n === 0) { this.atr = high - low; this.prevClose = close; return; }
    const tr = Math.max(high - low, Math.max(Math.abs(high - this.prevClose), Math.abs(low - this.prevClose)));
    const p = Math.min(n + 1, Math.max(1, this.params.atrLength));
    this.atr = ((p - 1) * this.atr + tr) / p;
    this.prevClose = close;
  }

  // a gap whose body is crossed becomes an inversion and changes list
  private fvgManage(source: number[], inv: number[], n: number) {
    if (source.length >= BUFFER) source.splice(source.length - 1, 1);
    for (let i = source.length - 1; i >= 0; i--) {
      const g = source[i];
      if (this.zones[g].dir === 1 && this.cbot(0) < this.zones[g].bot) {
        this.zones[g].xval = n;
        inv.unshift(g);
        source.splice(i, 1);
        this.isIfvg = -1;
        this.emit(EV_INVERTED, n, g);
      } else if (this.zones[g].dir === -1 && this.ctop(0) > this.zones[g].top) {
        this.zones[g].xval = n;
        inv.unshift(g);
        source.splice(i, 1);
        this.isIfvg = 1;
        this.emit(EV_INVERTED, n, g);
      }
    }
  }

  // flip the polarity on the first pass, then look for bounces and for the fill that kills the zone
  private invManage(ary: number[], n: number) {
    if (ary.length >= BUFFER) ary.splice(ary.length - 1, 1);
    for (let i = ary.length - 1; i >= 0; i--) {
      const z = ary[i];
      const top = this.zones[z].top;
      const bot = this.zones[z].bot;
      const dirBefore = this.zones[z].dir;
      const stateBefore = this.zones[z].state;
      if (stateBefore === 0 && dirBefore === 1) { this.zones[z].state = 1; this.zones[z].dir = -1; }
      else if (stateBefore === 0 && dirBefore === -1) { this.zones[z].state = 1; this.zones[z].dir = 1; }
      const prevDir = dirBefore; // direction as it was before the flip
      const dir = this.zones[z].dir;
      const state = this.zones[z].state;
      if (state >= 1) this.zones[z].right = n;

      const refPrice = this.params.bounce === 'wick' ? this.h(0) : this.c(1);
      const refPriceLow = this.params.bounce === 'wick' ? this.l(0) : this.c(1);
      if (dir === -1 && prevDir === -1 && state === 1 && this.c(0) < bot && refPrice >= bot && refPrice < top) {
        this.addLab(z, n, top, -1);
        this.bounceSignal = -1;
        this.emit(EV_DOWN, n, z);
      } else if (dir === 1 && prevDir === 1 && state === 1 && this.c(0) > top && refPriceLow <= top && refPriceLow > bot) {
        this.addLab(z, n, bot, 1);
        this.bounceSignal = 1;
        this.emit(EV_UP, n, z);
      }

      if (state >= 1 &&
        ((this.zones[z].dir === -1 && this.ctop(0) > top && this.c(0) > this.o(0)) ||
         (this.zones[z].dir === 1 && this.cbot(0) < bot && this.o(0) > this.c(0)))) {
        this.emit(EV_FILLED, n, z);
        if (!this.params.removeFilled) { this.zones[z].state = -1; this.zones[z].right = n; }
        else ary.splice(i, 1);
      }
    }
  }

  feedBar(t: number, o: number, h: number, l: number, c: number) {
    const n = this.count;
    this.O.push(o); this.H.push(h); this.L.push(l); this.C.push(c);
    this.CTop.push(Math.max(o, c)); this.CBot.push(Math.min(o, c)); this.T.push(t);
    this.count = n + 1;

    this.updateAtr(h, l, c, n);
    this.bounceSignal = 0;
    if (n < 3) return;

    const filter = this.atr * this.params.atrMultiplier;
    this.isIfvg = 0;

    const bullGap = this.l(0) > this.h(2) && this.c(1) > this.h(2);
    const bearGap = this.h(0) < this.l(2) && this.c(1) < this.l(2);

    if (bullGap && Math.abs(this.l(0) - this.h(2)) > filter) {
      const g = this.newZone(n - 1, Math.min(this.l(0), this.h(2)), n, Math.max(this.l(0), this.h(2)), (this.l(0) + this.h(2)) / 2, 1);
      this.bullFvg.unshift(g);
      this.emit(EV_CREATED, n, g);
    }
    if (bearGap && Math.abs(this.l(2) - this.h(0)) > filter) {
      const g = this.newZone(n - 1, Math.min(this.l(2), this.h(0)), n, Math.max(this.l(2), this.h(0)), (this.h(0) + this.l(2)) / 2, -1);
      this.bearFvg.unshift(g);
      this.emit(EV_CREATED, n, g);
    }

    this.fvgManage(this.bullFvg, this.bullInv, n);
    this.fvgManage(this.bearFvg, this.bearInv, n);
    this.invManage(this.bullInv, n);
    this.invManage(this.bearInv, n);
  }

  run(bars: Bar[]) {
    this.reset();
    for (const b of bars) this.feedBar(b.time, b.open, b.high, b.low, b.close);
  }
}

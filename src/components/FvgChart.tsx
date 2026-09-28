import { useCallback, useEffect, useRef, useState } from 'react';
import type { IfvgEngine, Bar } from '../engine/ifvgEngine';

type Props = {
  bars: Bar[];
  engine: IfvgEngine;
  visibleBars: number;
  follow: boolean;
  bullColor: string;
  bearColor: string;
  lineColor: string;
  opacity: number; // 5-100
  showZones: boolean;
  showMidLine: boolean;
  showSignals: boolean;
  boxCount: number;
  extend: number;
};

const BG = '#0e1117';
const GRID = '#161b26';
const TEXT = '#9aa4b2';

function hexToRgb(h: string) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function blend(fg: string, alpha: number) {
  const f = hexToRgb(fg);
  const b = hexToRgb(BG);
  const r = Math.round(b.r + (f.r - b.r) * alpha);
  const g = Math.round(b.g + (f.g - b.g) * alpha);
  const bl = Math.round(b.b + (f.b - b.b) * alpha);
  return `rgb(${r},${g},${bl})`;
}

function clampView(v: { offset: number; bars: number }, n: number) {
  if (v.bars < 10) v.bars = 10;
  if (v.bars > n) v.bars = n;
  if (v.offset < 0) v.offset = 0;
  if (v.offset + v.bars > n) v.offset = n - v.bars;
}

export default function FvgChart(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 460 });
  const view = useRef({ offset: 0, bars: 600 });
  const drag = useRef<{ x: number; offset: number } | null>(null);
  const [tick, setTick] = useState(0);

  const realTotal = props.bars.length;
  const total = Math.min(realTotal, props.visibleBars);

  const fit = useCallback(() => {
    view.current = { offset: 0, bars: realTotal };
    setTick((t) => t + 1);
  }, [realTotal]);

  // observe wrapper size
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // fit all bars when the dataset itself changes
  useEffect(() => {
    view.current = { offset: 0, bars: realTotal };
    setTick((t) => t + 1);
  }, [realTotal]);

  // follow the latest bars while replaying
  useEffect(() => {
    if (!props.follow) return;
    const v = view.current;
    v.bars = Math.max(10, Math.min(80, total));
    v.offset = Math.max(0, total - v.bars);
    setTick((t) => t + 1);
  }, [props.visibleBars, props.follow, total]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = size.w;
    const H = size.h;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bars = props.bars;
    if (total === 0) return;

    const padL = 56;
    const padR = 10;
    const padT = 12;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const v = view.current;
    clampView(v, total);
    const i0 = Math.max(0, Math.floor(v.offset));
    const i1 = Math.min(total - 1, Math.ceil(v.offset + v.bars));
    const barW = plotW / v.bars;

    const xAt = (i: number) => padL + (i - v.offset) * barW;

    // price range from visible bars + visible zones
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = i0; i <= i1; i++) {
      if (bars[i].high > hi) hi = bars[i].high;
      if (bars[i].low < lo) lo = bars[i].low;
    }
    const eng = props.engine;
    const now = eng.count - 1;
    const shown = new Set<number>();
    const addShown = (list: number[]) => {
      for (let k = 0; k < list.length && k < props.boxCount; k++) shown.add(list[k]);
    };
    addShown(eng.bullInv);
    addShown(eng.bearInv);
    shown.forEach((id) => {
      const z = eng.zones[id];
      const xEnd = z.state < 1 ? z.right : now + (props.extend > 0 ? props.extend : 0);
      if (z.left <= i1 && xEnd >= i0) {
        if (z.top > hi) hi = z.top;
        if (z.bot < lo) lo = z.bot;
      }
    });
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;
    const range = hi - lo || 1;
    const yAt = (p: number) => padT + (1 - (p - lo) / range) * plotH;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // grid + price labels
    ctx.strokeStyle = GRID;
    ctx.fillStyle = TEXT;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ticks = 6;
    for (let t = 0; t <= ticks; t++) {
      const p = lo + (range * t) / ticks;
      const y = yAt(p);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(p.toFixed(2), padL - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const visCount = i1 - i0 + 1;
    const tstep = Math.max(1, Math.round(visCount / 6));
    for (let i = i0; i <= i1; i += tstep) {
      const d = new Date(bars[i].time * 1000);
      const lbl = `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}h`;
      ctx.fillText(lbl, xAt(i) + barW / 2, H - padB + 6);
    }

    const alpha = Math.max(0.05, Math.min(1, props.opacity / 100));

    // zones (behind candles)
    if (props.showZones) {
      const drawList = (list: number[], firstColor: string, secondColor: string) => {
        for (let k = 0; k < list.length && k < props.boxCount; k++) {
          const z = eng.zones[list[k]];
          if (z.xval === -2147483648) continue;
          const xEnd = z.state < 1 ? z.right : now;
          const rect = (x1: number, y1: number, x2: number, y2: number, col: string, a: number) => {
            if (x2 <= x1) x2 = x1 + 0.5;
            ctx.fillStyle = blend(col, a);
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          };
          rect(xAt(z.left), yAt(z.top), xAt(z.xval), yAt(z.bot), firstColor, alpha);
          rect(xAt(z.xval), yAt(z.top), xAt(xEnd), yAt(z.bot), secondColor, alpha);
          if (z.state >= 1 && props.extend > 0) {
            rect(xAt(now), yAt(z.top), xAt(now + props.extend), yAt(z.bot), secondColor, alpha * 0.45);
          }
          if (props.showMidLine) {
            ctx.save();
            ctx.strokeStyle = blend(props.lineColor, 0.78);
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xAt(z.left), yAt(z.mid));
            ctx.lineTo(xAt(xEnd), yAt(z.mid));
            ctx.stroke();
            if (z.state >= 1 && props.extend > 0) {
              ctx.beginPath();
              ctx.moveTo(xAt(now), yAt(z.mid));
              ctx.lineTo(xAt(now + props.extend), yAt(z.mid));
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      };
      drawList(eng.bullInv, props.bullColor, props.bearColor);
      drawList(eng.bearInv, props.bearColor, props.bullColor);
    }

    // candles
    for (let i = i0; i <= i1; i++) {
      const b = bars[i];
      const x = xAt(i) + barW / 2;
      const up = b.close >= b.open;
      const col = up ? '#26a69a' : '#ef5350';
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yAt(b.high));
      ctx.lineTo(x, yAt(b.low));
      ctx.stroke();
      const bw = Math.max(1, barW * 0.7);
      const yO = yAt(b.open);
      const yC = yAt(b.close);
      ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
    }

    // signals (above candles)
    if (props.showSignals) {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      for (const lab of eng.labs) {
        if (!shown.has(lab.zone)) continue;
        if (lab.x < i0 - 2 || lab.x > i1 + 2) continue;
        const x = xAt(lab.x) + barW / 2;
        if (lab.dir === 1) {
          ctx.fillStyle = props.bullColor;
          ctx.textBaseline = 'top';
          ctx.fillText('\u25B2', x, yAt(lab.y) + 2);
        } else {
          ctx.fillStyle = props.bearColor;
          ctx.textBaseline = 'bottom';
          ctx.fillText('\u25BC', x, yAt(lab.y) - 2);
        }
      }
    }
  }, [props, size, tick, total]);

  // wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      let nb = Math.round(v.bars * factor);
      nb = Math.max(20, Math.min(total, nb));
      const rect = c.getBoundingClientRect();
      const plotL = 56;
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left - plotL) / (rect.width - plotL - 10)));
      const barAt = v.offset + frac * v.bars;
      v.offset = barAt - frac * nb;
      v.bars = nb;
      clampView(v, total);
      setTick((t) => t + 1);
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [total]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, offset: view.current.offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const plotW = rect.width - 56 - 10;
    const dx = e.clientX - drag.current.x;
    const barsMoved = -dx / (plotW / view.current.bars);
    view.current.offset = drag.current.offset + barsMoved;
    clampView(view.current, total);
    setTick((t) => t + 1);
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <div className="legend">
        <span className="sw"><span className="dot" style={{ background: props.bullColor }} />Bull iFVG</span>
        <span className="sw"><span className="dot" style={{ background: props.bearColor }} />Bear iFVG</span>
      </div>
      <div className="chart-tools">
        <button onClick={fit}>Fit</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
}

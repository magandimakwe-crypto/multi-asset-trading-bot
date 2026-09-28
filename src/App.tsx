import { useMemo, useState } from 'react';
import { IfvgEngine, type Bar, EV_CREATED, EV_INVERTED, EV_UP, EV_DOWN, EV_FILLED } from './engine/ifvgEngine';
import { generateBars } from './data/sampleData';
import FvgChart from './components/FvgChart';
import Controls from './components/Controls';

export type Params = {
  boxCount: number;
  atrLength: number;
  atrMultiplier: number;
  bounce: 'close' | 'wick';
  removeFilled: boolean;
  extend: number;
  showZones: boolean;
  showMidLine: boolean;
  showSignals: boolean;
  bullColor: string;
  bearColor: string;
  lineColor: string;
  opacity: number;
};

const defaults: Params = {
  boxCount: 5,
  atrLength: 200,
  atrMultiplier: 0.25,
  bounce: 'close',
  removeFilled: true,
  extend: 50,
  showZones: true,
  showMidLine: true,
  showSignals: true,
  bullColor: '#006400',
  bearColor: '#800000',
  lineColor: '#888888',
  opacity: 40,
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="v">{value}</span>
      <span className="l">{label}</span>
    </div>
  );
}

export default function App() {
  const [params, setParams] = useState<Params>(defaults);
  const [seed, setSeed] = useState(42);

  const bars = useMemo<Bar[]>(() => generateBars(600, seed), [seed]);

  const engine = useMemo(() => {
    const eng = new IfvgEngine({
      atrLength: params.atrLength,
      atrMultiplier: params.atrMultiplier,
      bounce: params.bounce,
      removeFilled: params.removeFilled,
    });
    eng.run(bars);
    return eng;
  }, [bars, params.atrLength, params.atrMultiplier, params.bounce, params.removeFilled]);

  const stats = useMemo(() => {
    const ev = engine.events;
    return {
      gaps: ev.filter((e) => e.type === EV_CREATED).length,
      inversions: ev.filter((e) => e.type === EV_INVERTED).length,
      bounces: ev.filter((e) => e.type === EV_UP || e.type === EV_DOWN).length,
      filled: ev.filter((e) => e.type === EV_FILLED).length,
      active: engine.bullInv.length + engine.bearInv.length,
    };
  }, [engine]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>IFVG<span>Inversion Fair Value Gaps</span></h1>
        <div className="stats">
          <Stat label="Gaps" value={stats.gaps} />
          <Stat label="Invert" value={stats.inversions} />
          <Stat label="Bounce" value={stats.bounces} />
          <Stat label="Filled" value={stats.filled} />
          <Stat label="Active" value={stats.active} />
        </div>
      </header>
      <FvgChart
        bars={bars}
        engine={engine}
        bullColor={params.bullColor}
        bearColor={params.bearColor}
        lineColor={params.lineColor}
        opacity={params.opacity}
        showZones={params.showZones}
        showMidLine={params.showMidLine}
        showSignals={params.showSignals}
        boxCount={params.boxCount}
        extend={params.extend}
      />
      <Controls params={params} setParams={setParams} seed={seed} setSeed={setSeed} />
    </div>
  );
}

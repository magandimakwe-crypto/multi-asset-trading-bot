import { useEffect, useMemo, useRef, useState } from 'react';
import { IfvgEngine, type Bar, EV_CREATED, EV_INVERTED, EV_UP, EV_DOWN, EV_FILLED } from './engine/ifvgEngine';
import { generateBars } from './data/sampleData';
import FvgChart from './components/FvgChart';
import Controls from './components/Controls';
import Toasts from './components/Toasts';
import { alertService, type AlertSettings } from './alerts/alertService';

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

const SYMBOL = 'SAMPLE';
const BAR_COUNT = 600;

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
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({ ...alertService.settings });
  const [fedBars, setFedBars] = useState(BAR_COUNT);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(80); // ms per bar

  const bars = useMemo<Bar[]>(() => generateBars(BAR_COUNT, seed), [seed]);

  // reset to instant view when the dataset changes
  useEffect(() => {
    setFedBars(BAR_COUNT);
    setPlaying(false);
  }, [bars]);

  const engine = useMemo(() => {
    const eng = new IfvgEngine({
      atrLength: params.atrLength,
      atrMultiplier: params.atrMultiplier,
      bounce: params.bounce,
      removeFilled: params.removeFilled,
    });
    eng.run(bars.slice(0, fedBars));
    return eng;
  }, [bars, fedBars, params.atrLength, params.atrMultiplier, params.bounce, params.removeFilled]);

  // replay timer: feed one more bar per tick
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setFedBars((f) => {
        if (f >= bars.length) {
          setPlaying(false);
          return f;
        }
        return f + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [playing, speed, bars.length]);

  // keep the alert service in sync with the controls
  useEffect(() => {
    alertService.update(alertSettings);
  }, [alertSettings]);

  // fire an alert for every signal newly identified while replaying
  const prevCount = useRef(0);
  useEffect(() => {
    const evs = engine.events;
    if (playing) {
      for (const e of evs.slice(prevCount.current)) {
        const z = engine.zones[e.z];
        const span = `${z.bot.toFixed(2)} - ${z.top.toFixed(2)}`;
        const when = bars[e.n] ? new Date(bars[e.n].time * 1000).toLocaleTimeString() : '';
        if (e.type === EV_UP) {
          alertService.notify('bounce-up', `${SYMBOL} Bounce \u25B2`, `${when} \u00B7 bullish bounce off ${span}`);
        } else if (e.type === EV_DOWN) {
          alertService.notify('bounce-down', `${SYMBOL} Bounce \u25BC`, `${when} \u00B7 bearish bounce off ${span}`);
        } else if (e.type === EV_INVERTED) {
          alertService.notify('inversion', `${SYMBOL} Inversion`, `${when} \u00B7 zone ${span} inverted`);
        }
      }
    }
    prevCount.current = evs.length;
  }, [engine, playing, bars]);

  const startReplay = () => {
    setFedBars(3);
    setPlaying(true);
  };

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
        visibleBars={fedBars}
        follow={playing}
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
      <Toasts />
      <Controls
        params={params}
        setParams={setParams}
        seed={seed}
        setSeed={setSeed}
        alertSettings={alertSettings}
        setAlertSettings={setAlertSettings}
        playing={playing}
        setPlaying={setPlaying}
        startReplay={startReplay}
        fedBars={fedBars}
        totalBars={bars.length}
        speed={speed}
        setSpeed={setSpeed}
      />
    </div>
  );
}

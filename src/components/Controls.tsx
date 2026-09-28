import type { Params } from '../App';

type Props = {
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
  seed: number;
  setSeed: (n: number) => void;
};

export default function Controls({ params, setParams, seed, setSeed }: Props) {
  const set = (k: keyof Params, v: string | number | boolean) =>
    setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="controls">
      <div className="controls-title">Parameters &amp; Style</div>
      <div className="grid">
        <label>Show Last
          <input type="number" min={1} max={50} value={params.boxCount}
            onChange={(e) => set('boxCount', +e.target.value)} />
        </label>
        <label>ATR Length
          <input type="number" min={1} value={params.atrLength}
            onChange={(e) => set('atrLength', +e.target.value)} />
        </label>
        <label>ATR Multiplier
          <input type="number" step="0.05" value={params.atrMultiplier}
            onChange={(e) => set('atrMultiplier', +e.target.value)} />
        </label>
        <label>Bounce
          <select value={params.bounce} onChange={(e) => set('bounce', e.target.value)}>
            <option value="close">Close</option>
            <option value="wick">Wick</option>
          </select>
        </label>
        <label>Extend
          <input type="number" min={0} max={100} value={params.extend}
            onChange={(e) => set('extend', +e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={params.removeFilled}
            onChange={(e) => set('removeFilled', e.target.checked)} />Remove Filled
        </label>
        <label className="check">
          <input type="checkbox" checked={params.showZones}
            onChange={(e) => set('showZones', e.target.checked)} />Show Zones
        </label>
        <label className="check">
          <input type="checkbox" checked={params.showMidLine}
            onChange={(e) => set('showMidLine', e.target.checked)} />Mid Line
        </label>
        <label className="check">
          <input type="checkbox" checked={params.showSignals}
            onChange={(e) => set('showSignals', e.target.checked)} />Signals
        </label>
        <label>Bull
          <input type="color" value={params.bullColor}
            onChange={(e) => set('bullColor', e.target.value)} />
        </label>
        <label>Bear
          <input type="color" value={params.bearColor}
            onChange={(e) => set('bearColor', e.target.value)} />
        </label>
        <label>Line
          <input type="color" value={params.lineColor}
            onChange={(e) => set('lineColor', e.target.value)} />
        </label>
        <label>Opacity ({params.opacity}%)
          <input type="range" min={5} max={100} value={params.opacity}
            onChange={(e) => set('opacity', +e.target.value)} />
        </label>
      </div>
      <div className="actions">
        <button onClick={() => setSeed(Math.floor(Math.random() * 100000))}>
          Regenerate Data
        </button>
        <button onClick={() => setSeed(seed + 1)}>Next Seed ({seed})</button>
      </div>
    </div>
  );
}

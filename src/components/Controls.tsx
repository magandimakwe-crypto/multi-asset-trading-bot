import { useState } from 'react';
import type { Params } from '../App';
import type { AlertSettings } from '../alerts/alertService';
import { alertService } from '../alerts/alertService';

type Props = {
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
  seed: number;
  setSeed: (n: number) => void;
  alertSettings: AlertSettings;
  setAlertSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
  playing: boolean;
  setPlaying: (v: boolean) => void;
  startReplay: () => void;
  fedBars: number;
  totalBars: number;
  speed: number;
  setSpeed: (n: number) => void;
};

export default function Controls({
  params, setParams, seed, setSeed,
  alertSettings, setAlertSettings,
  playing, setPlaying, startReplay,
  fedBars, totalBars, speed, setSpeed,
}: Props) {
  const set = (k: keyof Params, v: string | number | boolean) =>
    setParams((p) => ({ ...p, [k]: v }));
  const setAlert = (k: keyof AlertSettings, v: boolean) =>
    setAlertSettings((s) => ({ ...s, [k]: v }));
  const [permGranted, setPermGranted] = useState(alertService.permissionGranted);

  const enableNotifications = async () => {
    const ok = await alertService.requestPermission();
    setPermGranted(ok);
  };

  const pct = totalBars > 0 ? Math.round((fedBars / totalBars) * 100) : 0;

  return (
    <div className="controls">
      <div className="controls-title">Replay &amp; Alerts</div>
      <div className="replay-row">
        {!playing ? (
          <button className="btn-primary" onClick={startReplay}>
            {'\u25B6'} Play
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setPlaying(false)}>{'\u23F8'} Pause</button>
        )}
        <button className="btn-ghost" onClick={startReplay}>Restart</button>
        <div className="progress">
          <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
          <span className="progress-label">{fedBars}/{totalBars}</span>
        </div>
        <label className="speed">Speed
          <input type="range" min={10} max={300} value={speed}
            onChange={(e) => setSpeed(+e.target.value)} />
        </label>
      </div>

      <div className="alert-row">
        <label className="check"><input type="checkbox" checked={alertSettings.enabled}
          onChange={(e) => setAlert('enabled', e.target.checked)} />Alerts</label>
        <label className="check"><input type="checkbox" checked={alertSettings.sound}
          onChange={(e) => setAlert('sound', e.target.checked)} />Sound</label>
        <label className="check"><input type="checkbox" checked={alertSettings.alertBounce}
          onChange={(e) => setAlert('alertBounce', e.target.checked)} />On Bounce</label>
        <label className="check"><input type="checkbox" checked={alertSettings.alertInversion}
          onChange={(e) => setAlert('alertInversion', e.target.checked)} />On Inversion</label>
        <button className="btn-ghost" onClick={enableNotifications} disabled={permGranted}>
          {permGranted ? 'Notifications On' : 'Enable Browser Notifications'}
        </button>
      </div>

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
        <button onClick={() => setSeed(Math.floor(Math.random() * 100000))}>Regenerate Data</button>
        <button onClick={() => setSeed(seed + 1)}>Next Seed ({seed})</button>
      </div>
    </div>
  );
}

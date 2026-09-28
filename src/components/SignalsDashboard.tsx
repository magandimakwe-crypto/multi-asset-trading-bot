import { useMemo } from 'react';
import type { Bar, IfvgEngine } from '../engine/ifvgEngine';
import { EV_UP, EV_DOWN } from '../engine/ifvgEngine';

type Props = { bars: Bar[]; engine: IfvgEngine };

type Signal = {
  dir: 'up' | 'down';
  time: Date | null;
  bot: number;
  top: number;
  close: number;
  role: string;
  idx: number;
};

export default function SignalsDashboard({ bars, engine }: Props) {
  const signals = useMemo<Signal[]>(() => {
    const out: Signal[] = [];
    for (const e of engine.events) {
      if (e.type !== EV_UP && e.type !== EV_DOWN) continue;
      const z = engine.zones[e.z];
      const b = bars[e.n];
      out.push({
        dir: e.type === EV_UP ? 'up' : 'down',
        time: b ? new Date(b.time * 1000) : null,
        bot: z.bot,
        top: z.top,
        close: b ? b.close : 0,
        role: z.dir === 1 ? 'Support' : 'Resistance',
        idx: e.n,
      });
    }
    return out.reverse(); // latest first
  }, [engine, bars]);

  const bull = signals.filter((s) => s.dir === 'up').length;
  const bear = signals.filter((s) => s.dir === 'down').length;
  const latest = signals[0];

  return (
    <div className="dashboard">
      <div className="dash-summary">
        <div className="dash-card">
          <span className="v">{signals.length}</span>
          <span className="l">Total Bounces</span>
        </div>
        <div className="dash-card up">
          <span className="v">{bull}</span>
          <span className="l">Bullish {'\u25B2'}</span>
        </div>
        <div className="dash-card down">
          <span className="v">{bear}</span>
          <span className="l">Bearish {'\u25BC'}</span>
        </div>
        <div className="dash-card">
          <span className="v small">{latest ? latest.time?.toLocaleTimeString() : '\u2014'}</span>
          <span className="l">Latest Signal</span>
        </div>
      </div>

      <div className="dash-list">
        <div className="dash-list-head">
          <span>Latest Bounce Signals</span>
          <span className="dash-count">{signals.length} signals</span>
        </div>
        {signals.length === 0 && (
          <div className="dash-empty">No bounce signals identified yet. Press Play to start the replay.</div>
        )}
        {signals.map((s, i) => (
          <div key={i} className={`signal-card ${s.dir}`}>
            <div className="sig-dir">{s.dir === 'up' ? '\u25B2' : '\u25BC'}</div>
            <div className="sig-main">
              <div className="sig-title">
                {s.dir === 'up' ? 'Bullish Bounce' : 'Bearish Bounce'}
                <span className={`sig-role ${s.role.toLowerCase()}`}>{s.role}</span>
              </div>
              <div className="sig-meta">
                Zone {s.bot.toFixed(2)} - {s.top.toFixed(2)} &middot; Close {s.close.toFixed(2)}
              </div>
            </div>
            <div className="sig-time">
              {s.time ? s.time.toLocaleDateString() : ''}
              <span>{s.time ? s.time.toLocaleTimeString() : ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

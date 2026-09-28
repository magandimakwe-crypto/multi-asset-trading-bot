// Automated alert system: fires browser notifications, in-app toasts (via subscribers)
// and an optional sound beep whenever a new signal is identified.

export type AlertKind = 'bounce-up' | 'bounce-down' | 'inversion';

export type AlertSettings = {
  enabled: boolean;
  sound: boolean;
  alertBounce: boolean;
  alertInversion: boolean;
};

export type AlertEvent = { id: number; kind: AlertKind; title: string; body: string; ts: number };

const DEFAULTS: AlertSettings = {
  enabled: true,
  sound: true,
  alertBounce: true,
  alertInversion: false,
};

let audioCtx: AudioContext | null = null;

function playBeep(freq: number) {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.start(t0);
    o.stop(t0 + 0.3);
  } catch {
    /* audio not available */
  }
}

let counter = 0;
const listeners = new Set<(e: AlertEvent) => void>();

export const alertService = {
  settings: { ...DEFAULTS } as AlertSettings,

  subscribe(fn: (e: AlertEvent) => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  update(s: Partial<AlertSettings>) {
    this.settings = { ...this.settings, ...s };
  },

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  },

  get permissionGranted(): boolean {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  },

  notify(kind: AlertKind, title: string, body: string) {
    if (!this.settings.enabled) return;
    const want = kind === 'inversion' ? this.settings.alertInversion : this.settings.alertBounce;
    if (!want) return;

    const evt: AlertEvent = { id: ++counter, kind, title, body, ts: Date.now() };
    listeners.forEach((fn) => fn(evt));

    if (this.settings.sound) {
      playBeep(kind === 'bounce-up' ? 880 : kind === 'bounce-down' ? 440 : 660);
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, tag: 'ifvg-' + evt.id });
      } catch {
        /* ignore */
      }
    }
  },
};

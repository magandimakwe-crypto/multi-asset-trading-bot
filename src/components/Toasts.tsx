import { useEffect, useState } from 'react';
import { alertService, type AlertEvent } from '../alerts/alertService';

export default function Toasts() {
  const [items, setItems] = useState<AlertEvent[]>([]);

  useEffect(() => {
    return alertService.subscribe((e) => {
      setItems((prev) => [...prev, e].slice(-4));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((p) => p.id !== e.id));
      }, 5000);
    });
  }, []);

  return (
    <div className="toasts">
      {items.map((e) => (
        <div key={e.id} className={`toast toast-${e.kind}`}>
          <div className="toast-title">{e.title}</div>
          <div className="toast-body">{e.body}</div>
        </div>
      ))}
    </div>
  );
}

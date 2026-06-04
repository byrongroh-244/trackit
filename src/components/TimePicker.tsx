import React from 'react';
import { Colors } from '../theme';

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const selStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: Colors.forest,
  background: '#fff', border: 'none', outline: 'none',
  fontFamily: 'inherit', cursor: 'pointer',
  letterSpacing: '-0.02em', padding: '4px 2px',
  WebkitAppearance: 'none', appearance: 'none',
  textAlign: 'center',
};

function clockTo24(clockH: number, pm: boolean): number {
  if (clockH === 12) return pm ? 12 : 0;
  return pm ? clockH + 12 : clockH;
}
function hour24ToClock(h24: number): number {
  if (h24 === 0) return 12;
  if (h24 > 12) return h24 - 12;
  return h24;
}

export default function TimePicker({ label, hour, minute, onChange }: {
  label: string;
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}) {
  const isPm     = hour >= 12;
  const clockVal = hour24ToClock(hour);
  const clockHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F7F6', borderRadius: 14, padding: '10px 16px', width: 'fit-content' }}>
        <select value={clockVal} onChange={e => onChange(clockTo24(Number(e.target.value), isPm), minute)} style={selStyle}>
          {clockHours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span style={{ fontSize: 22, fontWeight: 800, color: Colors.forest }}>:</span>
        <select value={minute} onChange={e => onChange(hour, Number(e.target.value))} style={selStyle}>
          {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
        <select value={isPm ? 'pm' : 'am'} onChange={e => {
          const pm  = e.target.value === 'pm';
          const newH = clockTo24(clockVal, pm);
          onChange(newH, minute);
        }} style={{ ...selStyle, fontSize: 16, color: Colors.textSecondary }}>
          <option value="am">am</option>
          <option value="pm">pm</option>
        </select>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Colors, CLASS_COLORS } from '../theme';
import type { CalendarEvent, EventRecurrence, Course } from '../types';
import { uid } from '../data/store';

const RECURRENCE_LABELS: { value: EventRecurrence; label: string }[] = [
  { value: 'none',      label: 'One time'  },
  { value: 'daily',     label: 'Daily'     },
  { value: 'weekly',    label: 'Weekly'    },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Monthly'   },
];

const EVENT_COLORS = [
  '#534AB7', '#1D9E75', '#E24B4A',
  '#378ADD', '#BA7517', '#D4537E',
  '#639922', '#993C1D',
];

const sel: React.CSSProperties = {
  padding: '8px 4px', borderRadius: 10, border: '1.5px solid #E3EBEA',
  background: '#fff', fontSize: 15, fontFamily: 'inherit',
  color: Colors.textPrimary, textAlign: 'center',
  WebkitAppearance: 'none', appearance: 'none',
};

function TimeSelect({ label, hour, min, onChange }: {
  label: string; hour: number; min: number;
  onChange: (h: number, m: number) => void;
}) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: Colors.textHint, width: 36 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select value={h12} onChange={e => {
          const v = Number(e.target.value);
          onChange(ampm === 'PM' ? (v === 12 ? 12 : v + 12) : (v === 12 ? 0 : v), min);
        }} style={{ ...sel, width: 52 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ fontSize: 18, fontWeight: 800, color: Colors.forest }}>:</span>
        <select value={min} onChange={e => onChange(hour, Number(e.target.value))} style={{ ...sel, width: 52 }}>
          {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
            <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
          ))}
        </select>
        <select value={ampm} onChange={e => {
          if (e.target.value === 'AM' && hour >= 12) onChange(hour - 12, min);
          if (e.target.value === 'PM' && hour < 12)  onChange(hour + 12, min);
        }} style={{ ...sel, width: 56 }}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
    </div>
  );
}

interface Props {
  initial:    CalendarEvent | null;
  anchorDate: string;
  courses:    Course[];
  onSave:     (e: CalendarEvent) => void;
  onDelete?:  (e: CalendarEvent) => void;
  onCancel:   () => void;
}

export default function EventEditor({ initial, anchorDate, courses, onSave, onDelete, onCancel }: Props) {
  const [name,       setName]       = useState(initial?.name       ?? '');
  const [startH,     setStartH]     = useState(initial?.startHour  ?? 8);
  const [startM,     setStartM]     = useState(initial?.startMin   ?? 0);
  const [endH,       setEndH]       = useState(initial?.endHour    ?? 9);
  const [endM,       setEndM]       = useState(initial?.endMin     ?? 0);
  const [color,      setColor]      = useState(initial?.color      ?? EVENT_COLORS[0]);
  const [recurrence, setRecurrence] = useState<EventRecurrence>(initial?.recurrence ?? 'none');
  const [linkedId,   setLinkedId]   = useState(initial?.classId    ?? '');

  const linkedCourse = courses.find(c => c.id === linkedId);
  const effectiveColor = linkedCourse?.color ?? color;

  const canSave = name.trim().length > 0 && (endH * 60 + endM) > (startH * 60 + startM);

  function save() {
    if (!canSave) return;
    onSave({
      id:         initial?.id ?? uid(),
      name:       name.trim(),
      startHour:  startH,
      startMin:   startM,
      endHour:    endH,
      endMin:     endM,
      color:      effectiveColor,
      recurrence,
      anchorDate: initial?.anchorDate ?? anchorDate,
      classId:    linkedCourse?.id,
      className:  linkedCourse?.name,
      classColor: linkedCourse?.color,
    });
  }

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: Colors.textHint,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 8,
  };
  const input: React.CSSProperties = {
    width: '100%', fontSize: 15, padding: '11px 13px', borderRadius: 12,
    border: '1.5px solid #E3EBEA', outline: 'none',
    fontFamily: 'inherit', color: Colors.textPrimary,
    background: '#fff', boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`@keyframes ev-bg{from{opacity:0}to{opacity:1}} @keyframes ev-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      {/* Backdrop */}
      <div onClick={onCancel} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100, animation: 'ev-bg 0.2s ease',
      }} />
      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 101, animation: 'ev-up 0.28s cubic-bezier(.32,.72,0,1)',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Header */}
        <div style={{ background: Colors.forest, borderRadius: '20px 20px 0 0', padding: '16px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onCancel} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <span style={{ flex: 1, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {initial ? 'Edit event' : 'New event'}
            </span>
            <button onClick={save} disabled={!canSave} style={{
              background: canSave ? '#B8E04A' : 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: 10, padding: '7px 18px',
              cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              color: canSave ? Colors.forest : 'rgba(255,255,255,0.4)',
            }}>
              {initial ? 'Save' : 'Add'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={label}>Event name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Study group, Practice, Club meeting"
              style={input}
            />
          </div>

          {/* Times */}
          <div>
            <label style={label}>Time</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <TimeSelect label="Start" hour={startH} min={startM} onChange={(h, m) => { setStartH(h); setStartM(m); }} />
              <TimeSelect label="End"   hour={endH}   min={endM}   onChange={(h, m) => { setEndH(h);   setEndM(m);   }} />
              {(endH * 60 + endM) <= (startH * 60 + startM) && (
                <div style={{ fontSize: 12, color: Colors.red }}>End time must be after start time</div>
              )}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label style={label}>Repeats</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {RECURRENCE_LABELS.map(r => (
                <button key={r.value} onClick={() => setRecurrence(r.value)} style={{
                  padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${recurrence === r.value ? Colors.forest : '#E3EBEA'}`,
                  background: recurrence === r.value ? Colors.forest : '#fff',
                  color: recurrence === r.value ? '#fff' : Colors.textSecondary,
                  fontSize: 13, fontWeight: recurrence === r.value ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link to class */}
          <div>
            <label style={label}>Link to class <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div onClick={() => setLinkedId('')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${!linkedId ? Colors.forest : '#E3EBEA'}`, background: !linkedId ? `${Colors.forest}12` : '#fff', cursor: 'pointer' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: Colors.textHint, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: !linkedId ? 700 : 400, color: !linkedId ? Colors.forest : Colors.textPrimary }}>None</span>
                {!linkedId && <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              {courses.map(c => (
                <div key={c.id} onClick={() => setLinkedId(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${linkedId === c.id ? c.color : '#E3EBEA'}`, background: linkedId === c.id ? `${c.color}12` : '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: linkedId === c.id ? 700 : 400, color: linkedId === c.id ? c.color : Colors.textPrimary }}>{c.name}</span>
                  {linkedId === c.id && <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              ))}
            </div>
          </div>

          {/* Color — only shown when not linked to a class */}
          {!linkedId && (
            <div>
              <label style={label}>Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: color === c ? `3px solid ${Colors.forest}` : '3px solid transparent',
                    cursor: 'pointer', outline: 'none', padding: 0,
                    boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${Colors.forest}` : 'none',
                  }} aria-label={c} />
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          {initial && onDelete && (
            <button onClick={() => onDelete(initial)} style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: Colors.redLight, border: 'none',
              color: Colors.redDark, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
            }}>
              Delete event
            </button>
          )}
        </div>
      </div>
    </>
  );
}

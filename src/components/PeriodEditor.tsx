import { useState } from 'react';
import { Colors } from '../theme';
import type { Course } from '../types';
import type { ClassPeriod } from '../screens/CalendarScreen';

interface Props {
  initial:      ClassPeriod | null;
  courses:      Course[];
  scheduleType: 'standard' | 'block';
  onSave:       (p: ClassPeriod) => void;
  onCancel:     () => void;
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ── Native wheel time picker — triggers OS clock wheel on mobile ─────────────
const HOURS   = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function fmt(h: number, m: number) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}
function durLabel(sh: number, sm: number, eh: number, em: number) {
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
}

const selStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: Colors.forest,
  background: '#fff', border: 'none', outline: 'none',
  fontFamily: 'inherit', cursor: 'pointer',
  letterSpacing: '-0.02em', padding: '4px 2px',
  WebkitAppearance: 'none', appearance: 'none',
  textAlign: 'center',
};

function TimePicker({ label, hour, minute, onChange }: {
  label: string; hour: number; minute: number;
  onChange: (h: number, m: number) => void;
}) {
  const isPm = hour >= 12;
  // Clock-order hours for current AM/PM: 12, 1, 2 ... 11
  // AM: 12(=0), 1-11 maps to 0, 1-11 (24h)
  // PM: 12(=12), 1-11 maps to 12, 13-23 (24h)
  const clockHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  function clockTo24(clockH: number, pm: boolean): number {
    if (clockH === 12) return pm ? 12 : 0;
    return pm ? clockH + 12 : clockH;
  }
  function hour24ToClock(h24: number): number {
    if (h24 === 0) return 12;
    if (h24 > 12) return h24 - 12;
    return h24;
  }
  const clockVal = hour24ToClock(hour);

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F7F6', borderRadius: 14, padding: '10px 16px', width: 'fit-content' }}>
        {/* Hour — clock order 12,1,2...11 */}
        <select value={clockVal} onChange={e => onChange(clockTo24(Number(e.target.value), isPm), minute)} style={selStyle}>
          {clockHours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span style={{ fontSize: 22, fontWeight: 800, color: Colors.forest }}>:</span>
        {/* Minute */}
        <select value={minute} onChange={e => onChange(hour, Number(e.target.value))} style={selStyle}>
          {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
        {/* AM/PM */}
        <select value={isPm ? 'pm' : 'am'} onChange={e => {
          const pm = e.target.value === 'pm';
          const newH = clockTo24(clockVal, pm);
          if (newH >= 7 && newH <= 21) onChange(newH, minute);
        }} style={{ ...selStyle, fontSize: 16, color: Colors.textSecondary }}>
          <option value="am">am</option>
          <option value="pm">pm</option>
        </select>
      </div>
    </div>
  );
}

export default function PeriodEditor({ initial, courses, scheduleType, onSave, onCancel }: Props) {
  const [course,      setCourse]      = useState<Course | null>(initial ? courses.find(c => c.name === initial.name) ?? null : null);
  const [customName,  setCustomName]  = useState(
    // If editing a period whose class isn't in courses list, prefill custom name
    initial && !courses.find(c => c.name === initial.name) ? initial.name : ''
  );
  const [customTeacher, setCustomTeacher] = useState('');
  const [customRoom,    setCustomRoom]    = useState('');
  const [showCustom,  setShowCustom]  = useState(
    !!(initial && !courses.find(c => c.name === initial.name))
  );
  const [days,     setDays]     = useState<number[]>(
    initial?.days ?? (scheduleType === 'block' ? [1,2,3,4,5] : [])
  );
  const [startH,   setStartH]   = useState(initial?.startHour ?? 8);
  const [startM,   setStartM]   = useState(initial?.startMin  ?? 0);
  const [endH,     setEndH]     = useState(initial?.endHour   ?? 8);
  const [endM,     setEndM]     = useState(initial?.endMin    ?? 50);
  const [room,     setRoom]     = useState(initial?.room      ?? '');
  const [blockDay,   setBlockDay]   = useState<'A' | 'B' | null>(initial?.blockDay ?? null);
  // Alt day times (late start / early release variant times)
  const [altTimesSet, setAltTimesSet] = useState(!!(initial?.altStartHour));
  const [altStartH,  setAltStartH]  = useState(initial?.altStartHour ?? 9);
  const [altStartM,  setAltStartM]  = useState(initial?.altStartMin  ?? 0);
  const [altEndH,    setAltEndH]    = useState(initial?.altEndHour   ?? 14);
  const [altEndM,    setAltEndM]    = useState(initial?.altEndMin    ?? 0);

  function toggleDay(d: number) {
    setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort());
  }

  const dur     = durLabel(startH, startM, endH, endM);
  const effectiveName    = course?.name    ?? customName.trim();
  const effectiveColor   = course?.color   ?? '#1c4a4f';
  const effectiveTeacher = course?.teacherName ?? customTeacher.trim();
  const effectiveRoom    = course ? (room.trim() || undefined) : (customRoom.trim() || undefined);
  const canSave = !!effectiveName && (scheduleType === 'block' || days.length > 0) && (endH * 60 + endM) > (startH * 60 + startM);

  function save() {
    if (!canSave || !effectiveName) return;
    onSave({ name: effectiveName, color: effectiveColor, days, startHour: startH, startMin: startM, endHour: endH, endMin: endM, room: effectiveRoom, blockDay: scheduleType === 'block' ? blockDay : null, ...(altTimesSet ? { altStartHour: altStartH, altStartMin: altStartM, altEndHour: altEndH, altEndMin: altEndM } : {}) });
  }

  return (
    <>
      <style>{`@keyframes pe-bg{from{opacity:0}to{opacity:1}} @keyframes pe-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onCancel} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(28,74,79,0.5)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',animation:'pe-bg .2s ease both' }} />
      <div style={{ position:'fixed',left:0,right:0,bottom:0,zIndex:301,background:'#fff',borderRadius:'22px 22px 0 0',maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'pe-up .3s cubic-bezier(.22,1,.36,1) both',paddingBottom:'env(safe-area-inset-bottom)' }}>

        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 0' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'#E3EBEA' }} />
        </div>

        <div style={{ background: Colors.forest, borderRadius:'22px 22px 0 0', padding:'16px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <button onClick={onCancel} aria-label="Cancel"
            style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex:1, fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.02em' }}>
            {initial ? 'Edit period' : 'Add class period'}
          </div>
          <button onClick={save} disabled={!canSave} aria-label="Save"
            style={{ background: canSave ? '#B8E04A' : 'rgba(255,255,255,0.15)', border:'none', borderRadius:10, padding:'7px 16px', cursor: canSave ? 'pointer' : 'default', fontFamily:'inherit', fontSize:13, fontWeight:700, color: canSave ? Colors.forest : 'rgba(255,255,255,0.4)' }}>
            {initial ? 'Save' : 'Add'}
          </button>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'20px 20px 28px',display:'flex',flexDirection:'column',gap:22 }}>

          {/* Class */}
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10 }}>Class</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              {courses.map(c => {
                const on = course?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setCourse(on ? null : c)}
                    style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:14,border:`1.5px solid ${on ? c.color : '#E3EBEA'}`,background: on ? `${c.color}18` : '#fff',cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .15s' }}>
                    <div style={{ width:12,height:12,borderRadius:'50%',background:c.color,flexShrink:0 }} />
                    <span style={{ fontSize:14,fontWeight: on ? 700 : 500,color: on ? c.color : Colors.textPrimary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name}</span>
                    {on && <svg style={{ marginLeft:'auto',flexShrink:0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
            </div>

          {/* New class — shown when no existing class matches */}
          {!showCustom ? (
            <button onClick={() => { setShowCustom(true); setCourse(null); }}
              style={{ width: '100%', marginTop: 4, padding: '10px', borderRadius: 12, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + New class not in list
            </button>
          ) : (
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>New class name</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input autoFocus value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. AP Chemistry"
                  style={{ flex: 1, fontSize: 14, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: Colors.background }} />
                <button onClick={() => { setShowCustom(false); setCustomName(''); }}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E3EBEA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: Colors.textSecondary }}>
                  Cancel
                </button>
              </div>
              <input value={customTeacher} onChange={e => setCustomTeacher(e.target.value)}
                placeholder="Teacher name (optional)"
                style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E3EBEA', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: Colors.background, boxSizing: 'border-box', marginBottom: 8 }} />
              <input value={customRoom} onChange={e => setCustomRoom(e.target.value)}
                placeholder="Room number (optional)"
                style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E3EBEA', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: Colors.background, boxSizing: 'border-box' }} />
            </div>
          )}
          </div>

          {/* Days — hidden for block schedule (all weekdays implied) */}
          {scheduleType !== 'block' && (
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10 }}>Days it meets</div>
            <div style={{ display:'flex',gap:6 }}>
              {DAY_NAMES.map((n, i) => {
                const on = days.includes(i);
                return (
                  <button key={i} onClick={() => toggleDay(i)}
                    style={{ flex:1,height:42,borderRadius:12,border:`1.5px solid ${on ? Colors.forest : '#E3EBEA'}`,background: on ? Colors.forest : '#fff',color: on ? '#fff' : Colors.textHint,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* Block rotation */}
          {scheduleType === 'block' && (() => {
            // Load adjusted day label from onboarding (e.g. "Late Start Wednesday")
            let adjLabel = 'Alternate day';
            try {
              const adj = JSON.parse(localStorage.getItem('trackit_adjusted_days') ?? '[]');
              if (adj.length > 0) adjLabel = adj[0].label;
            } catch {}
            return (
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>Rotation day</div>
                <div style={{ fontSize:11,color:Colors.textHint,marginBottom:10,lineHeight:1.4 }}>
                  A-day and B-day classes alternate. "Every day" classes meet regardless of rotation — e.g. homeroom or study hall.
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  {(['A','B',null] as const).map(opt => {
                    const on = blockDay === opt;
                    return (
                      <button key={String(opt)} onClick={() => setBlockDay(opt)}
                        style={{ flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${on ? Colors.forest : '#E3EBEA'}`,background: on ? Colors.forest : '#fff',color: on ? '#fff' : Colors.textSecondary,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}>
                        {opt === null ? 'Every day' : `${opt}-day`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Time — two side-by-side bins */}
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10 }}>Class times</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>

              {/* Regular day */}
              <div style={{ background:'#F5F7F6',borderRadius:14,padding:'14px 14px 10px' }}>
                <div style={{ fontSize:11,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10 }}>Regular</div>
                <TimePicker label="Start" hour={startH} minute={startM} onChange={(h, m) => {
                  setStartH(h); setStartM(m);
                  if (h * 60 + m >= endH * 60 + endM) {
                    const e = h * 60 + m + 50;
                    setEndH(Math.min(21, Math.floor(e/60)));
                    setEndM(e%60 > 55 ? 55 : Math.round((e%60)/5)*5);
                  }
                }} />
                <div style={{ height:10 }} />
                <TimePicker label="End" hour={endH} minute={endM} onChange={(h,m) => { setEndH(h); setEndM(m); }} />
                {dur && <div style={{ fontSize:11,fontWeight:600,color:Colors.forest,marginTop:6,textAlign:'center' }}>{dur}</div>}
              </div>

              {/* Alt day (late start / early release) */}
              <div style={{ background:'#F5F7F6',borderRadius:14,padding:'14px 14px 10px' }}>
                <div style={{ fontSize:11,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10 }}>Alt day</div>
                <TimePicker label="Start" hour={altStartH} minute={altStartM} onChange={(h,m) => {
                  setAltTimesSet(true); setAltStartH(h); setAltStartM(m);
                  if (h * 60 + m >= altEndH * 60 + altEndM) {
                    const e = h * 60 + m + 50;
                    setAltEndH(Math.min(21, Math.floor(e/60)));
                    setAltEndM(e%60 > 55 ? 55 : Math.round((e%60)/5)*5);
                  }
                }} />
                <div style={{ height:10 }} />
                <TimePicker label="End" hour={altEndH} minute={altEndM} onChange={(h,m) => { setAltTimesSet(true); setAltEndH(h); setAltEndM(m); }} />
                {(() => { const m = altEndH*60+altEndM-(altStartH*60+altStartM); if(m<=0) return null; const h=Math.floor(m/60),mn=m%60; return <div style={{ fontSize:11,fontWeight:600,color:Colors.forest,marginTop:6,textAlign:'center' }}>{`${h>0?h+'h ':''}`}{mn>0?`${mn}m`:''}</div>; })()}
              </div>
            </div>
          </div>

          {/* Room — only shown when adding a new class */}
          {showCustom && (
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 }}>
                Room <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:11,opacity:.7 }}>(optional)</span>
              </div>
              <input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Rm 204"
                style={{ width:'100%',fontSize:15,padding:'12px 14px',borderRadius:12,border:'1.5px solid #E3EBEA',outline:'none',fontFamily:'inherit',color:Colors.textPrimary,background:'#fff',boxSizing:'border-box' }} />
            </div>
          )}


        </div>
      </div>
    </>
  );
}

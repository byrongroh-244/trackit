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
const HOURS   = Array.from({ length: 16 }, (_, i) => i + 6); // 6–21
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
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F7F6', borderRadius: 14, padding: '10px 16px', width: 'fit-content' }}>
        <select value={hour} onChange={e => onChange(Number(e.target.value), minute)} style={selStyle}>
          {HOURS.map(h => <option key={h} value={h}>{h > 12 ? h - 12 : h === 0 ? 12 : h}</option>)}
        </select>
        <span style={{ fontSize: 22, fontWeight: 800, color: Colors.forest, marginBottom: 2 }}>:</span>
        <select value={minute} onChange={e => onChange(hour, Number(e.target.value))} style={selStyle}>
          {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
        </select>
        <select value={hour >= 12 ? 'pm' : 'am'} onChange={e => {
          const pm = e.target.value === 'pm';
          if (pm && hour < 12) onChange(hour + 12, minute);
          if (!pm && hour >= 12) onChange(hour - 12, minute);
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
  const [blockDay, setBlockDay] = useState<'A' | 'B' | null>(initial?.blockDay ?? null);

  function toggleDay(d: number) {
    setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort());
  }

  const dur     = durLabel(startH, startM, endH, endM);
  const effectiveName  = course?.name ?? customName.trim();
  const effectiveColor = course?.color ?? '#1c4a4f';
  const canSave = !!effectiveName && (scheduleType === 'block' || days.length > 0) && (endH * 60 + endM) > (startH * 60 + startM);

  function save() {
    if (!canSave || !effectiveName) return;
    onSave({ name: effectiveName, color: effectiveColor, days, startHour: startH, startMin: startM, endHour: endH, endMin: endM, room: room.trim() || undefined, blockDay: scheduleType === 'block' ? blockDay : null });
  }

  return (
    <>
      <style>{`@keyframes pe-bg{from{opacity:0}to{opacity:1}} @keyframes pe-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={onCancel} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(28,74,79,0.5)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',animation:'pe-bg .2s ease both' }} />
      <div style={{ position:'fixed',left:0,right:0,bottom:0,zIndex:301,background:'#fff',borderRadius:'22px 22px 0 0',maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'pe-up .3s cubic-bezier(.22,1,.36,1) both',paddingBottom:'env(safe-area-inset-bottom)' }}>

        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 0' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'#E3EBEA' }} />
        </div>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px 14px',borderBottom:'0.5px solid #E3EBEA' }}>
          <span style={{ fontSize:17,fontWeight:800,color:Colors.textPrimary,letterSpacing:'-.02em' }}>
            {initial ? 'Edit period' : 'Add class period'}
          </span>
          <button onClick={onCancel} aria-label="Close" style={{ background:'none',border:'none',cursor:'pointer',padding:4,color:Colors.textHint }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. AP Chemistry"
                  style={{ flex: 1, fontSize: 14, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: Colors.background }} />
                <button onClick={() => { setShowCustom(false); setCustomName(''); }}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E3EBEA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: Colors.textSecondary }}>
                  Cancel
                </button>
              </div>
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
          {scheduleType === 'block' && (
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10 }}>Rotation</div>
              <div style={{ display:'flex',gap:8 }}>
                {(['A','B',null] as const).map(opt => {
                  const on = blockDay === opt;
                  return (
                    <button key={String(opt)} onClick={() => setBlockDay(opt)}
                      style={{ flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${on ? Colors.forest : '#E3EBEA'}`,background: on ? Colors.forest : '#fff',color: on ? '#fff' : Colors.textSecondary,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}>
                      {opt === null ? 'Both' : `${opt}-day`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time */}
          <div style={{ background:'#F5F7F6',borderRadius:18,padding:'18px 18px 14px',display:'flex',flexDirection:'column',gap:16 }}>
            <TimePicker label="Start" hour={startH} minute={startM} onChange={(h, m) => {
              setStartH(h); setStartM(m);
              if (h * 60 + m >= endH * 60 + endM) {
                const e = h * 60 + m + 50;
                setEndH(Math.min(21, Math.floor(e / 60)));
                setEndM(e % 60 > 55 ? 55 : Math.round((e % 60) / 5) * 5);
              }
            }} />
            <TimePicker label="End" hour={endH} minute={endM} onChange={(h, m) => { setEndH(h); setEndM(m); }} />
            {dur && (
              <div style={{ textAlign:'center',fontSize:13,fontWeight:600,color:Colors.forest }}>{dur} class period</div>
            )}
          </div>

          {/* Room */}
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:Colors.textHint,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 }}>
              Room <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:11,opacity:.7 }}>(optional)</span>
            </div>
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Rm 204"
              style={{ width:'100%',fontSize:15,padding:'12px 14px',borderRadius:12,border:'1.5px solid #E3EBEA',outline:'none',fontFamily:'inherit',color:Colors.textPrimary,background:'#fff',boxSizing:'border-box' }} />
          </div>

          <button onClick={save} disabled={!canSave}
            style={{ width:'100%',padding:'15px',borderRadius:14,border:'none',background: canSave ? Colors.forest : '#E3EBEA',color: canSave ? '#fff' : Colors.textHint,fontSize:16,fontWeight:800,cursor: canSave ? 'pointer' : 'default',fontFamily:'inherit',letterSpacing:'-.01em',transition:'background .2s' }}>
            {initial ? 'Save changes' : 'Add to schedule'}
          </button>
        </div>
      </div>
    </>
  );
}

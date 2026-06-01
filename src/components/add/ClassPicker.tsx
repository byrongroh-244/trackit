import { useState } from 'react';
import { uid } from '../../data/store';
import { Colors, CLASS_COLORS } from '../../theme';
import { IconCheck, IconArrowLeft } from '../Icons';
import type { Course } from '../../types';

function SubHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div style={{ background: Colors.forest, padding: '18px 20px 20px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: subtitle ? 10 : 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{title}</div>
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, paddingLeft: 44 }}>{subtitle}</div>
      )}
    </div>
  );
}


interface Props {
  courses: Course[];
  updateCourses: (c: Course[]) => void;
  onPick: (cls: Course) => void;
  onCancel: () => void;
}

export default function ClassPicker({ courses, updateCourses, onPick, onCancel }: Props) {
  const [creating,      setCreating]      = useState(courses.length === 0);
  const [newName,       setNewName]       = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);

  function createAndPick() {
    if (!newName.trim()) return;
    const newClass: Course = { id: uid(), name: newName.trim(), color: selectedColor };
    updateCourses([...courses, newClass]);
    onPick(newClass);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Which class?" subtitle="All extracted assignments go to this class" onBack={onCancel} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {courses.length > 0 && !creating && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {courses.map(c => (
              <div
                key={c.id}
                onClick={() => onPick(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  background: '#fff', borderRadius: 16, border: '1.5px solid #E3EBEA',
                  padding: '13px 16px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = Colors.forest)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color }} />
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: Colors.textPrimary, letterSpacing: '-0.01em' }}>{c.name}</div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{ width: '100%', padding: 13, borderRadius: 14, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
          >
            + Create a new class
          </button>
        </>
      )}

      {creating && (
        <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${Colors.forest}`, padding: 18, marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Class name</label>
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createAndPick(); }}
            placeholder="e.g. AP Biology"
            style={{ width: '100%', fontSize: 15, color: Colors.textPrimary, background: Colors.background, border: '1.5px solid #E3EBEA', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
          />
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {CLASS_COLORS.map((col: string) => (
              <button
                key={col}
                onClick={() => setSelectedColor(col)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: col, cursor: 'pointer', border: `2px solid ${selectedColor === col ? '#fff' : 'transparent'}`, boxShadow: selectedColor === col ? `0 0 0 2px ${Colors.forest}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s' }}
              >
                {selectedColor === col ? <IconCheck size={13} color="#fff" /> : null}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {courses.length > 0 && (
              <button onClick={() => setCreating(false)} style={{ flex: 1, border: '1.5px solid #E3EBEA', background: '#fff', borderRadius: 10, padding: 11, fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back
              </button>
            )}
            <button
              onClick={createAndPick}
              disabled={!newName.trim()}
              style={{ flex: 1, background: newName.trim() ? Colors.forest : Colors.grayLight, color: newName.trim() ? '#fff' : Colors.textHint, border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
            >
              Create & continue
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

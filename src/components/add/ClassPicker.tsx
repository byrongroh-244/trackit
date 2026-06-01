import { useState } from 'react';
import { uid } from '../../data/store';
import { Colors, CLASS_COLORS } from '../../theme';
import type { Course } from '../../types';

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
    <div style={{ padding: '0 18px 18px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, marginBottom: 4 }}>Which class is this for?</div>
      <div style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>All extracted assignments will go to this class.</div>

      {courses.length > 0 && !creating && (
        <>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 10 }}>
            {courses.map((c, i) => (
              <div key={c.id} onClick={() => onPick(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < courses.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer' }} onMouseOver={e => (e.currentTarget.style.background = Colors.background)} onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: Colors.textPrimary }}>{c.name}</div>
                <span style={{ fontSize: 18, color: Colors.textHint }}>›</span>
              </div>
            ))}
          </div>
          <button onClick={() => setCreating(true)} style={{ width: '100%', padding: 13, borderRadius: 12, border: `1px dashed ${Colors.purple}`, background: 'transparent', color: Colors.purple, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>+ Create a new class</button>
        </>
      )}

      {creating && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${Colors.purple}`, padding: 16, marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Class name</label>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createAndPick(); }} placeholder="e.g. AP Biology" style={{ width: '100%', fontSize: 15, color: Colors.textPrimary, background: Colors.surface, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            {CLASS_COLORS.map((col: string) => (
              <button key={col} onClick={() => setSelectedColor(col)} style={{ width: 32, height: 32, borderRadius: '50%', background: col, cursor: 'pointer', border: `2px solid ${selectedColor === col ? '#fff' : 'transparent'}`, boxShadow: selectedColor === col ? `0 0 0 2px ${Colors.purple}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', transition: 'box-shadow 0.15s' }}>
                {selectedColor === col ? '✓' : ''}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {courses.length > 0 && <button onClick={() => setCreating(false)} style={{ flex: 1, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', borderRadius: 8, padding: 11, fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>}
            <button onClick={createAndPick} disabled={!newName.trim()} style={{ flex: 1, background: newName.trim() ? Colors.purple : Colors.grayLight, color: newName.trim() ? '#fff' : Colors.textHint, border: 'none', borderRadius: 8, padding: 11, fontSize: 14, fontWeight: 500, cursor: newName.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Create & continue</button>
          </div>
        </div>
      )}

      <button onClick={onCancel} style={{ width: '100%', padding: 12, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 14, color: Colors.textSecondary, fontFamily: 'inherit' }}>← Back</button>
    </div>
  );
}

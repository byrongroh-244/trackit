import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { uid, daysUntil } from '../data/store';
import { Colors, CLASS_COLORS, SECTION_META, getSectionForDays, getSubjectIconPaths, type Section } from '../theme';
import AssignmentCard from '../components/AssignmentCard';
import { Screen, ScrollBody, BottomNav, SectionLabel, EmptyState, ConfirmSheet } from '../components/UI';
import { IconClipboard, IconBook, IconCircleCheck, IconChevronDown, IconChevronUp, IconChevronRight, IconCheck, IconArrowLeft } from '../components/Icons';
import type { Course, Assignment } from '../types';

const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
];

// ── Subject icon squircle — same pattern as AssignmentCard ───────────────────
function ClassIcon({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const paths = getSubjectIconPaths(name);
  // Light tint of the class color for background
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.23,
      background: `${color}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  );
}

export default function ClassesScreen() {
  const { courses, assignments, updateCourses, updateAssignments, navigate, patchAssignment } = useApp();
  const [adding,        setAdding]        = useState(false);
  const [newName,       setNewName]       = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);
  const [selectedClass, setSelectedClass] = useState<Course | null>(null);
  const [showDone,      setShowDone]      = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editName,      setEditName]      = useState('');
  const [editColor,     setEditColor]     = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(c: Course, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(c.id); setEditName(c.name); setEditColor(c.color);
  }
  function saveEdit() {
    if (!editName.trim() || !editingId) return;
    const updated = courses.map(c => c.id === editingId ? { ...c, name: editName.trim(), color: editColor } : c);
    updateCourses(updated);
    const updatedAssignments = assignments.map(a =>
      a.classId === editingId ? { ...a, className: editName.trim(), classColor: editColor } : a
    );
    updateAssignments(updatedAssignments, updatedAssignments.filter(a => a.classId === editingId));
    setEditingId(null);
  }
  function cancelEdit() { setEditingId(null); }

  function addCourse() {
    if (!newName.trim()) return;
    updateCourses([...courses, { id: uid(), name: newName.trim(), color: selectedColor }]);
    setNewName(''); setAdding(false);
  }
  function deleteCourse(id: string) { setConfirmDeleteId(id); }
  function confirmDeleteCourse() {
    if (!confirmDeleteId) return;
    updateCourses(courses.filter(c => c.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    if (selectedClass?.id === confirmDeleteId) setSelectedClass(null);
  }
  function toggleDone(id: string) {
    const a = assignments.find(x => x.id === id);
    if (a) patchAssignment({ ...a, done: !a.done });
  }

  // ── Class detail view ──────────────────────────────────────────────────────
  if (selectedClass) {
    const liveClass        = courses.find(c => c.id === selectedClass.id) ?? selectedClass;
    const classAssignments = assignments.filter(a => a.classId === liveClass.id);
    const active           = classAssignments.filter(a => !a.done);
    const done             = classAssignments.filter(a => a.done);

    const grouped: Record<Section, Assignment[]> = { needs_attention: [], coming_up: [], on_track: [] };
    active.forEach(a => { grouped[getSectionForDays(daysUntil(a.dueDate))].push(a); });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate)));

    return (
      <Screen>
        {/* Dark header with class color accent bar at bottom */}
        <div style={{ background: Colors.forest, padding: '22px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => { setSelectedClass(null); setShowDone(false); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
              </button>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {liveClass.name}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {active.length} active{done.length > 0 ? ` · ${done.length} done` : ''}
                </div>
              </div>
            </div>
            <ClassIcon name={liveClass.name} color="rgba(255,255,255,0.6)" size={40} />
          </div>
          {/* Class color accent bar */}
          <div style={{ height: 3, background: liveClass.color, borderRadius: '2px 2px 0 0', margin: '0 -0px' }} />
        </div>

        <ScrollBody hasNav>
          {classAssignments.length === 0 ? (
            <EmptyState icon={<IconClipboard size={48} color={Colors.textHint} />} title="No assignments" body="Nothing added for this class yet." />
          ) : (
            <>
              {active.length === 0 && done.length > 0 && (
                <EmptyState icon={<IconCircleCheck size={48} color={Colors.teal} />} title="All done!" body="Every assignment for this class is complete." />
              )}
              {(Object.entries(grouped) as [Section, Assignment[]][]).map(([key, items]) =>
                items.length > 0 ? (
                  <div key={key}>
                    <SectionLabel color={SECTION_META[key].color}>{SECTION_META[key].label}</SectionLabel>
                    {items.map(a => (
                      <AssignmentCard key={a.id} assignment={a} onPress={() => navigate('detail', a.id)} onToggleDone={() => toggleDone(a.id)} />
                    ))}
                  </div>
                ) : null
              )}
              {done.length > 0 && (
                <>
                  <button onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, background: 'none', border: 'none', color: Colors.textSecondary, fontSize: 13, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                    {showDone ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    {showDone ? 'Hide' : 'Show'} {done.length} completed
                  </button>
                  {showDone && (
                    <>
                      <SectionLabel color={Colors.gray}>Completed</SectionLabel>
                      {done.map(a => (
                        <AssignmentCard key={a.id} assignment={a} onPress={() => navigate('detail', a.id)} onToggleDone={() => toggleDone(a.id)} />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </ScrollBody>
        <BottomNav current="classes" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── Class list view ────────────────────────────────────────────────────────
  return (
    <>
      {confirmDeleteId && (() => {
        const count = assignments.filter(a => a.classId === confirmDeleteId && !a.done).length;
        const body = count > 0
          ? `This class has ${count} active assignment${count !== 1 ? 's' : ''}. They will not be deleted, but will lose their class label.`
          : undefined;
        return (
          <ConfirmSheet
            title="Remove this class?"
            body={body}
            confirmLabel="Remove"
            danger
            onConfirm={confirmDeleteCourse}
            onCancel={() => setConfirmDeleteId(null)}
          />
        );
      })()}

      <Screen>
        {/* Dark forest header */}
        <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>Classes</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {courses.length} course{courses.length !== 1 ? 's' : ''} this semester
              </div>
            </div>
            <IconBook size={22} color="rgba(255,255,255,0.3)" />
          </div>
        </div>

        <ScrollBody hasNav>

          {/* Canvas connect banner */}
          <div
            onClick={() => navigate('canvas')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '14px 14px 6px', padding: '14px 16px', background: Colors.tealLight, border: `1.5px solid ${Colors.teal}28`, borderRadius: 18, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ width: 42, height: 42, borderRadius: 11, background: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: Colors.tealDark }}>Connect Canvas</div>
              <div style={{ fontSize: 12, color: Colors.tealDark, marginTop: 2, opacity: 0.75 }}>Auto-import all your courses and assignments</div>
            </div>
            <IconChevronRight size={18} color={Colors.teal} />
          </div>

          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '14px 18px 8px' }}>
            Your courses
          </div>

          {courses.length === 0 && (
            <EmptyState icon={<IconBook size={48} color={Colors.textHint} />} title="No classes yet" body="Connect Canvas above or add a class manually below." />
          )}

          {courses.map(c => {
            const activeCount = assignments.filter(a => a.classId === c.id && !a.done).length;
            const isEditing   = editingId === c.id;

            // ── Edit form ──
            if (isEditing) {
              return (
                <div key={c.id} style={{ background: '#fff', border: `1.5px solid ${Colors.forest}`, borderRadius: 18, padding: 16, margin: '0 14px 8px' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Class name</label>
                  <input
                    autoFocus value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    style={{ width: '100%', fontSize: 15, color: Colors.textPrimary, background: Colors.background, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ marginTop: 14, marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Color</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {CLASS_COLORS.map(col => (
                        <button key={col} onClick={() => setEditColor(col)} style={{ width: 32, height: 32, borderRadius: '50%', background: col, cursor: 'pointer', border: `2px solid ${editColor === col ? '#fff' : 'transparent'}`, boxShadow: editColor === col ? `0 0 0 2px ${Colors.forest}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s' }}>
                          {editColor === col ? <IconCheck size={14} color="#fff" /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={cancelEdit} style={{ flex: 1, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', borderRadius: 10, padding: 11, fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveEdit} style={{ flex: 1, background: Colors.forest, color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                  </div>
                </div>
              );
            }

            // ── Class row ──
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClass(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', margin: '0 14px 8px', padding: '13px 14px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8D5D3')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
              >
                {/* Subject icon squircle */}
                <ClassIcon name={c.name} color={c.color} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary, letterSpacing: '-0.01em' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>
                    {activeCount > 0 ? `${activeCount} active assignment${activeCount !== 1 ? 's' : ''}` : 'No active assignments'}
                  </div>
                </div>

                {/* Edit + delete — spaced, not crammed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={e => startEdit(c, e)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: Colors.textHint, transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = Colors.background)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Edit class"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteCourse(c.id); }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: Colors.textHint, transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = Colors.redLight; e.currentTarget.style.color = Colors.red; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = Colors.textHint; }}
                    title="Remove class"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <IconChevronRight size={16} color={Colors.textHint} />
                </div>
              </div>
            );
          })}

          {/* Add form / button */}
          {adding ? (
            <div style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, padding: 16, margin: '4px 14px' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Class name</label>
              <input
                autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCourse(); if (e.key === 'Escape') setAdding(false); }}
                placeholder="e.g. AP Chemistry"
                style={{ width: '100%', fontSize: 15, color: Colors.textPrimary, background: Colors.background, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 14, marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {CLASS_COLORS.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${selectedColor === c ? '#fff' : 'transparent'}`, boxShadow: selectedColor === c ? `0 0 0 2px ${Colors.forest}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s' }}>
                      {selectedColor === c ? <IconCheck size={14} color="#fff" /> : null}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => setAdding(false)} style={{ flex: 1, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', borderRadius: 10, padding: 11, fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addCourse} style={{ flex: 1, background: Colors.forest, color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add class</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAdding(true); setSelectedColor(CLASS_COLORS[0]); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, padding: 14, margin: '4px 14px', cursor: 'pointer', color: Colors.forest, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s', width: 'calc(100% - 28px)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = Colors.forest; e.currentTarget.style.background = '#E8F4F5'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E3EBEA'; e.currentTarget.style.background = '#fff'; }}
            >
              + Add a class manually
            </button>
          )}
        </ScrollBody>
        <BottomNav current="classes" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    </>
  );
}

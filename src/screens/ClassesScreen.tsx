import { useState } from 'react';
import { NAV } from '../data/nav';
import { useApp } from '../hooks/useApp';
import { uid, daysUntil } from '../data/store';
import { Colors, CLASS_COLORS, SECTION_META, getSectionForDays, getSubjectIconPaths, type Section } from '../theme';
import AssignmentCard from '../components/AssignmentCard';
import { Screen, ScrollBody, BottomNav, SectionLabel, EmptyState, ConfirmSheet } from '../components/UI';
import { IconClipboard, IconBook, IconCircleCheck, IconChevronDown, IconChevronUp, IconChevronRight, IconCheck, IconArrowLeft } from '../components/Icons';
import type { Course, Assignment } from '../types';
import { SUPABASE_ANON_KEY, CANVAS_PROXY_URL, supabase as supabaseClient } from '../lib/supabase';
import { getCanvasDomain, getCanvasToken, getCanvasSelectedIds } from '../data/scheduleStorage';


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
  const { courses, assignments, settings, updateCourses, updateAssignments, upsertAssignments, navigate, patchAssignment } = useApp();
  const normName = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const matchesClass = (a: import('../types').Assignment, c: import('../types').Course) =>
    a.classId === c.id || (!a.classId && normName(a.className) === normName(c.name));

  const [adding,        setAdding]        = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState('');

  const canvasDomain = getCanvasDomain();
  const canvasToken  = getCanvasToken();
  const canvasIds    = getCanvasSelectedIds();
  const canvasConnected = !!(canvasDomain && canvasToken);

  async function quickSync() {
    if (!canvasDomain || !canvasToken) { navigate('canvas'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      const clean = canvasDomain.replace(/https?:\/\//, '').replace(/\/$/, '');
      const { data: { session } } = await supabaseClient.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_ANON_KEY}`;

      async function canvasFetch(path: string) {
        const res = await fetch(CANVAS_PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader, 'apikey': authHeader.replace('Bearer ', '') },
          body: JSON.stringify({ domain: clean, token: canvasToken, path }),
        });
        if (!res.ok) throw new Error(`Canvas error ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
      }

      // Only sync courses that are already in the app (matched by canvasId)
      // Do NOT add new courses here — user must go through CanvasScreen for that
      const knownCourses = courses.filter(c => c.canvasId && (
        canvasIds.length === 0 || canvasIds.includes(c.canvasId)
      ));

      if (knownCourses.length === 0) {
        setSyncMsg('No Canvas classes to sync — open Canvas settings first');
        setTimeout(() => setSyncMsg(''), 3000);
        setSyncing(false);
        return;
      }

      const newAssignments: import('../types').Assignment[] = [];
      for (const appCourse of knownCourses) {
        if (!appCourse.canvasId) continue;
        const asgns = await canvasFetch(
          `courses/${appCourse.canvasId}/assignments?per_page=50&order_by=due_at`
        ) as Array<{ name: string; due_at?: string; description?: string; submission_types?: string[] }>;

        if (!Array.isArray(asgns)) continue;
        for (const a of asgns) {
          if (!a.due_at) continue;
          if (a.submission_types?.includes('not_graded') && a.submission_types.length === 1) continue;
          const dueDate = a.due_at.split('T')[0];
          newAssignments.push({
            id: uid(), name: a.name,
            classId: null as any, className: appCourse.name, classColor: appCourse.color,
            dueDate, done: false,
            notes: (a.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
            type: 'homework' as any, effort: null, subtasks: [],
          });
        }
      }

      await upsertAssignments(newAssignments);
      setSyncMsg(`Synced ${newAssignments.length} assignment${newAssignments.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSyncMsg(''), 3000);
    } catch (err: any) {
      setSyncMsg('Sync failed — check Canvas settings');
    } finally {
      setSyncing(false);
    }
  }
  const [newName,       setNewName]       = useState('');
  const [newTeacher,    setNewTeacher]    = useState('');
  const [newRoom,       setNewRoom]       = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);
  const [selectedClass, setSelectedClass] = useState<Course | null>(null);
  const [showDone,      setShowDone]      = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editingClass,  setEditingClass]  = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editTeacher,   setEditTeacher]   = useState('');
  const [editRoom,      setEditRoom]      = useState('');
  const [editColor,     setEditColor]     = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(c: Course, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(c.id); setEditName(c.name); setEditColor(c.color); setEditTeacher(c.teacherName ?? ''); setEditRoom(c.room ?? '');
  }
  function saveEdit() {
    if (!editName.trim() || !editingId) return;
    const oldCourse = courses.find(c => c.id === editingId);
    // Match assignments by classId OR old display name OR original canvas name
    const updatedAssignments = assignments.map(a =>
      (a.classId === editingId ||
       (!a.classId && a.className === (oldCourse?.name ?? '')) ||
       (!a.classId && a.className === (oldCourse?.canvasName ?? ''))
      ) ? { ...a, className: editName.trim(), classColor: editColor } : a
    );
    const updated = courses.map(c => c.id === editingId
      ? { ...c, name: editName.trim(), color: editColor, teacherName: editTeacher.trim(), room: editRoom.trim() }
      : c
    );
    updateCourses(updated);
    updateAssignments(updatedAssignments, updatedAssignments.filter(a =>
      a.classId === editingId || (!a.classId && a.className === editName.trim())
    ));
    setEditingId(null);
  }
  function cancelEdit() { setEditingId(null); }

  function addCourse() {
    if (!newName.trim()) return;
    updateCourses([...courses, { id: uid(), name: newName.trim(), color: selectedColor, teacherName: newTeacher.trim(), room: newRoom.trim() }]);
    setNewName(''); setNewTeacher(''); setNewRoom(''); setAdding(false);
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
    const classAssignments = assignments.filter(a => matchesClass(a, liveClass));
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
                aria-label="Go back" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
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
            <button
              onClick={() => { setEditingId(liveClass.id); setEditName(liveClass.name); setEditColor(liveClass.color); setEditTeacher(liveClass.teacherName ?? ''); setEditingClass(true); }}
              aria-label="Edit class"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          {/* Class color accent bar */}
          <div style={{ height: 3, background: liveClass.color, borderRadius: '2px 2px 0 0', margin: '0 -0px' }} />
        </div>

        {/* Inline edit sheet — slides in below header */}
        {editingClass && editingId === liveClass.id && (
          <div style={{ background: '#fff', borderBottom: '1.5px solid #E3EBEA', padding: '16px 18px', flexShrink: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>Class name</label>
              <input
                autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { saveEdit(); setEditingClass(false); } if (e.key === 'Escape') { cancelEdit(); setEditingClass(false); } }}
                style={{ width: '100%', fontSize: 15, color: Colors.textPrimary, background: Colors.background, border: '1.5px solid #E3EBEA', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>Teacher <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: 0.7 }}>(optional)</span></label>
              <input
                value={editTeacher} onChange={e => setEditTeacher(e.target.value)}
                placeholder="e.g. Ms. Johnson"
                style={{ width: '100%', fontSize: 14, color: Colors.textPrimary, background: Colors.background, border: '1.5px solid #E3EBEA', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CLASS_COLORS.map(col => (
                  <button key={col} onClick={() => setEditColor(col)} style={{ width: 30, height: 30, borderRadius: '50%', background: col, cursor: 'pointer', border: `2px solid ${editColor === col ? '#fff' : 'transparent'}`, boxShadow: editColor === col ? `0 0 0 2px ${Colors.forest}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s' }}>
                    {editColor === col ? <IconCheck size={13} color="#fff" /> : null}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { cancelEdit(); setEditingClass(false); }} style={{ flex: 1, border: '1.5px solid #E3EBEA', background: '#fff', borderRadius: 10, padding: 11, fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { saveEdit(); setEditingClass(false); }} style={{ flex: 1, background: Colors.forest, color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            </div>
          </div>
        )}

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
        const count = assignments.filter(a => (a.classId === confirmDeleteId || (!a.classId && a.className === (courses.find(x => x.id === confirmDeleteId)?.name ?? ''))) && !a.done).length;
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

          {/* Canvas banner — sync button if connected, connect prompt if not */}
          <div style={{ margin: '14px 14px 6px', background: Colors.tealLight, border: `1.5px solid ${Colors.teal}28`, borderRadius: 18, overflow: 'hidden' }}>
            <div onClick={() => navigate('canvas')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: Colors.tealDark }}>
                  {canvasConnected ? canvasDomain : 'Connect Canvas'}
                </div>
                <div style={{ fontSize: 12, color: Colors.tealDark, marginTop: 2, opacity: 0.75 }}>
                  {syncMsg || (canvasConnected ? `${canvasIds.length || 'All'} course${canvasIds.length !== 1 ? 's' : ''} selected` : 'Auto-import courses and assignments')}
                </div>
              </div>
              {canvasConnected ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {/* Quick sync button */}
                  <button
                    onClick={quickSync}
                    disabled={syncing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', background: syncing ? Colors.grayLight : Colors.teal, color: syncing ? Colors.textHint : '#fff', fontSize: 13, fontWeight: 700, cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    {syncing ? 'Syncing…' : 'Sync'}
                  </button>
                  {/* Settings link */}
                  <button
                    onClick={() => navigate('canvas')}
                    style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: `${Colors.teal}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={Colors.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => navigate('canvas')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <IconChevronRight size={18} color={Colors.teal} />
                </button>
              )}
            </div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '14px 18px 8px' }}>
            Your courses
          </div>

          {courses.length === 0 && (
            <EmptyState icon={<IconBook size={48} color={Colors.textHint} />} title="No classes yet" body="Connect Canvas above or add a class manually below." />
          )}

          {courses.map(c => {
            const activeCount = assignments.filter(a => matchesClass(a, c) && !a.done).length;
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
                    <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>Teacher name <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(optional)</span></label>
                  <input
                    value={editTeacher}
                    onChange={e => setEditTeacher(e.target.value)}
                    placeholder="e.g. Ms. Johnson"
                    style={{ width: '100%', fontSize: 14, color: Colors.textPrimary, background: Colors.background, border: '1.5px solid #E3EBEA', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                  />
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

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { daysUntil, formatShortDate, uid, inferType, rescheduleSubtasks, generateSubtasks } from '../data/store';
import { Colors, getUrgencyConfig } from '../theme';
import { Screen, ScrollBody, CheckCircle, SaveButton, ConfirmSheet, useToast } from '../components/UI';
import { IconTrash, IconZap, IconClock, IconBattery, IconParty, IconCircleCheck, IconRefreshCw, IconArrowLeft } from '../components/Icons';
import FocusTimer from '../components/FocusTimer';
import DeadlineRecovery from '../components/DeadlineRecovery';
import { Styles } from '../styles';
import type { Assignment, AssignmentType, AssignmentEffort, Subtask } from '../types';

const TYPE_OPTIONS: AssignmentType[] = ['homework', 'test', 'quiz', 'project', 'other'];

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function DetailScreen() {
  const { assignments, courses, detailId, navigate, patchAssignment, deleteAssignment, settings } = useApp();
  const { showToast } = useToast();
  const microsteps  = settings.microstepsEnabled !== false;
  const assignment  = assignments.find(a => a.id === detailId);

  const [editingDateId,       setEditingDateId]       = useState<string | null>(null);
  const [newStepText,         setNewStepText]         = useState('');
  const [addingStep,          setAddingStep]          = useState(false);
  const [editing,             setEditing]             = useState(false);
  const [focusing,            setFocusing]            = useState(false);
  const [stepsExpanded,       setStepsExpanded]       = useState(false);
  const [confirmDelete,       setConfirmDelete]       = useState(false);
  const [showPostFocusPanel,  setShowPostFocusPanel]  = useState(false);
  const [allStepsDone,        setAllStepsDone]        = useState(false);
  const [subtaskAnimKey,      setSubtaskAnimKey]       = useState<Record<string, number>>({});
  const [generatingSteps,     setGeneratingSteps]     = useState(false);

  // Tracks which subtask was active when a focus session started,
  // so the post-focus panel knows what to mark done.
  const focusedSubtaskIdRef = useRef<string | null>(null);

  // Auto-launch the timer if TodayScreen's "Start Now" button set the flag.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('trackit_autofocus') === 'true') {
        sessionStorage.removeItem('trackit_autofocus');
        setFocusing(true);
      }
    } catch {}
  }, []);

  // If the assignment loaded with no subtasks (e.g. imported before AI fallback
  // was available), generate them now and patch silently.
  useEffect(() => {
    if (!assignment || assignment.subtasks.length > 0 || generatingSteps || assignment.type === 'task' || !microsteps) return;
    setGeneratingSteps(true);
    generateSubtasks(assignment.name, assignment.dueDate, '', assignment.effort ?? null)
      .then(subtasks => {
        patchAssignment({ ...assignment, subtasks });
      })
      .finally(() => setGeneratingSteps(false));
    // Only run when detailId changes (i.e. a new assignment is opened)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  // Edit form state
  const [editName,   setEditName]   = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editClass,  setEditClass]  = useState('');
  const [editNotes,  setEditNotes]  = useState('');
  const [editType,   setEditType]   = useState<AssignmentType>('homework');
  const [editEffort, setEditEffort] = useState<AssignmentEffort>(null);

  if (!assignment) return null;

  const a         = assignment as Assignment;
  const days      = daysUntil(a.dueDate);
  const urgency   = getUrgencyConfig(days);
  const subtasks  = a.subtasks ?? [];
  const completed = subtasks.filter(s => s.done).length;
  const total     = subtasks.length;
  const progress  = total > 0 ? completed / total : 0;
  const isPastDue = !a.done && days < 0;

  const workMins  = settings.focusWorkMinutes  ?? 10;
  const breakMins = settings.focusBreakMinutes ?? 3;

  // Show first 3 steps visible, rest collapsed
  const VISIBLE_COUNT   = 3;
  const visibleSteps    = subtasks.slice(0, VISIBLE_COUNT);
  const hiddenSteps     = subtasks.slice(VISIBLE_COUNT);
  const hasHidden       = hiddenSteps.length > 0 && !stepsExpanded;
  const displayedSteps  = stepsExpanded ? subtasks : visibleSteps;

  function openEdit() {
    setEditName(a.name);
    setEditDate(a.dueDate);
    setEditClass(a.classId);
    setEditNotes(a.notes ?? '');
    setEditType(a.type ?? inferType(a.name));
    setEditEffort(a.effort ?? null);
    setEditing(true);
  }

  function saveEdit() {
    const cls = courses.find(c => c.id === editClass) ?? courses[0];
    patchAssignment({
      ...a,
      name: editName.trim() || a.name,
      dueDate: editDate || a.dueDate,
      classId: cls?.id ?? a.classId,
      className: cls?.name ?? a.className,
      classColor: cls?.color ?? a.classColor,
      notes: editNotes.trim(),
      type: editType,
      effort: editEffort,
    });
    setEditing(false);
  }

  function update(patch: Partial<Assignment>) {
    patchAssignment({ ...a, ...patch } as Assignment);
  }

  function toggleSubtask(id: string) {
    const isChecking = !subtasks.find(s => s.id === id)?.done;
    const updated = subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s);

    if (isChecking) {
      // Trigger slide-out animation (-1 = completing), then commit after animation
      setSubtaskAnimKey(prev => ({ ...prev, [id]: -1 }));
      setTimeout(() => {
        update({ subtasks: updated });
        // Mark next step as new-first after a moment
        const nextStep = updated.find(s => !s.done);
        if (nextStep) {
          setSubtaskAnimKey(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1, [nextStep.id]: (prev[nextStep.id] ?? 0) + 1 }));
        } else {
          setSubtaskAnimKey(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
        }
        const allDone = updated.every(s => s.done);
        setAllStepsDone(allDone);
      }, 380);
    } else {
      update({ subtasks: updated });
      setAllStepsDone(false);
    }
  }

  function setSubtaskDate(id: string, date: string | null) {
    update({ subtasks: subtasks.map(s => s.id === id ? { ...s, dueDate: date } : s) });
    setEditingDateId(null);
  }

  function addStep() {
    if (!newStepText.trim()) return;
    const newSubtask: Subtask = { id: uid(), text: newStepText.trim(), done: false, dueDate: null };
    update({ subtasks: [...subtasks, newSubtask] });
    setNewStepText('');
    setAddingStep(false);
    setStepsExpanded(true);
  }

  function handleReschedule() {
    const rescheduled = rescheduleSubtasks(subtasks, a.dueDate);
    update({ subtasks: rescheduled });
    showToast('Steps rescheduled to fit your timeline', 'info');
  }

  function handleToggleDone() {
    const wasDone = a.done;
    patchAssignment({ ...a, done: !a.done } as Assignment);
    if (!wasDone) navigate('today');
  }

  function handleDelete() {
    setConfirmDelete(true);
  }

  async function confirmAndDelete() {
    await deleteAssignment(a.id);
    navigate('today');
  }

  function handleFocusEnd(totalFocusSeconds: number) {
    setFocusing(false);
    if (totalFocusSeconds > 30) {
      const mins = Math.floor(totalFocusSeconds / 60);
      const secs = totalFocusSeconds % 60;
      const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      showToast(`${label} focused on "${a.name}"`, 'success');
      setShowPostFocusPanel(true);
    }
  }

  // Days label
  const daysLabel = days < 0
    ? `${Math.abs(days)}d late`
    : days === 0
    ? 'Due today'
    : days === 1
    ? 'Due tomorrow'
    : `${days} days`;


  const inputStyle = { ...Styles.inputBase } as React.CSSProperties;

  return (
    <>
      <style>{`
        @keyframes step-slide-out {
          0%   { opacity: 1; transform: translateY(0) scale(1); max-height: 80px; }
          40%  { opacity: 0; transform: translateY(-14px) scale(0.97); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.97); max-height: 0; padding: 0; margin: 0; }
        }
        @keyframes step-slide-in {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .step-completing {
          animation: step-slide-out 0.42s cubic-bezier(0.4,0,0.2,1) forwards;
          overflow: hidden;
        }
        .step-new-first {
          animation: step-slide-in 0.32s cubic-bezier(0.34,1.56,0.64,1) both;
          animation-delay: 0.18s;
        }
      `}</style>
      {focusing && (
        <FocusTimer
          assignmentName={a.name}
          activeStepText={
            focusedSubtaskIdRef.current
              ? (subtasks.find(s => s.id === focusedSubtaskIdRef.current)?.text ?? null)
              : (subtasks.find(s => !s.done)?.text ?? null)
          }
          workMinutes={workMins}
          breakMinutes={breakMins}
          onClose={handleFocusEnd}
        />
      )}

      {confirmDelete && (
        <ConfirmSheet
          title="Delete this assignment?"
          body="This will permanently remove the assignment and all its steps."
          confirmLabel="Delete"
          danger
          onConfirm={confirmAndDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <Screen>
        {/* Unified dark forest header — nav + title + pills + progress */}
        <div style={{ background: Colors.forest, padding: '18px 20px 16px', flexShrink: 0 }}>
          {/* Nav row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={() => navigate('today')}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!editing && (
                <button onClick={openEdit} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <EditIcon />
                </button>
              )}
              <button onClick={handleDelete} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <IconTrash size={16} color="rgba(255,255,255,0.7)" />
              </button>
            </div>
          </div>

          {/* Assignment title */}
          {!editing && (
            <>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.03em' }}>
                {a.name}
              </div>

              {/* Pills — white frosted */}
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: total > 0 ? 14 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                  {daysLabel}
                </span>
                {a.className && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                    {a.className}
                  </span>
                )}
                {a.type && a.type !== 'homework' && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                    {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                  </span>
                )}
                {a.effort && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {a.effort === 'quick'  ? <IconZap size={12} color="#fff" />    :
                     a.effort === 'medium' ? <IconClock size={12} color="#fff" />  :
                                             <IconBattery size={12} color="#fff" />}
                    {a.effort === 'quick' ? 'Quick' : a.effort === 'medium' ? 'Medium' : 'Long'}
                  </span>
                )}
              </div>

              {/* Progress bar inside header */}
              {total > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{completed} of {total} steps</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: '#B8E04A', borderRadius: 2, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ScrollBody>
          {editing ? (
            // ── Edit form ──
            <div style={{ padding: '16px 18px', background: Colors.surface }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: Colors.forest, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit assignment</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Name</label>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Due date</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
              </div>
              {courses.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Class</label>
                  <select value={editClass} onChange={e => setEditClass(e.target.value)} style={{ ...inputStyle, background: Colors.surface }}>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Type</label>
                <select value={editType} onChange={e => setEditType(e.target.value as AssignmentType)} style={{ ...inputStyle, background: Colors.surface }}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Effort</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { value: 'quick', label: 'Quick', sub: '< 30 min' },
                    { value: 'medium', label: 'Medium', sub: '1–2 hrs' },
                    { value: 'long',  label: 'Long',  sub: '2+ hrs' },
                  ] as const).map(opt => {
                    const active = editEffort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditEffort(active ? null : opt.value)}
                        style={{
                          flex: 1, padding: '9px 4px', borderRadius: 10,
                          border: `1.5px solid ${active ? Colors.forest : 'rgba(0,0,0,0.15)'}`,
                          background: active ? '#E8F4F5' : 'transparent',
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? Colors.forest : Colors.textPrimary }}>{opt.label}</span>
                        <span style={{ fontSize: 11, color: active ? Colors.forest : Colors.textHint, opacity: active ? 0.8 : 1 }}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Requirements, page count, format…" style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(false)} style={{ ...Styles.secondaryButton, flex: 1, padding: 11, borderRadius: 10, fontSize: 14 }}>Cancel</button>
                <button onClick={saveEdit} style={{ ...Styles.primaryButton, flex: 1, padding: 11, borderRadius: 10, fontSize: 14, background: Colors.forest }}>Save changes</button>
              </div>
            </div>
          ) : (
            <>


              {/* ── Deadline recovery ── */}
              {isPastDue && (
                <DeadlineRecovery
                  assignment={a}
                  studentName={settings.gradeLevel ? `Student` : 'Student'}
                  onLogCommunication={log => {
                    patchAssignment({
                      ...a,
                      communications: [...(a.communications ?? []), log],
                    });
                  }}
                  onNewDeadline={date => {
                    patchAssignment({ ...a, dueDate: date });
                    showToast('New deadline saved', 'success');
                  }}
                />
              )}

              {/* ── Post-focus panel ── */}
              {showPostFocusPanel && (() => {
                const focusedStep = focusedSubtaskIdRef.current
                  ? subtasks.find(s => s.id === focusedSubtaskIdRef.current)
                  : null;
                const nextIncomplete = subtasks.find(s => !s.done);

                function markDoneAndContinue() {
                  if (focusedStep && !focusedStep.done) {
                    update({ subtasks: subtasks.map(s => s.id === focusedStep.id ? { ...s, done: true } : s) });
                  }
                  setShowPostFocusPanel(false);
                  focusedSubtaskIdRef.current = null;
                }

                return (
                  <div style={{
                    margin: '12px 18px 4px',
                    background: Colors.tealLight,
                    border: `1.5px solid ${Colors.teal}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: Colors.tealDark, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconParty size={18} color={Colors.teal} />
                      Session complete
                    </div>
                    <div style={{ fontSize: 13, color: Colors.tealDark, opacity: 0.8, marginBottom: 12, lineHeight: 1.4 }}>
                      {nextIncomplete
                        ? `Next up: ${nextIncomplete.text}`
                        : 'All steps complete — ready to mark this done?'}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={markDoneAndContinue}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                          background: Colors.teal, color: '#fff',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {focusedStep && !focusedStep.done ? 'Mark done & continue' : 'Got it'}
                      </button>
                      <button
                        onClick={() => { setShowPostFocusPanel(false); focusedSubtaskIdRef.current = null; }}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: 9,
                          border: `0.5px solid ${Colors.teal}`,
                          background: 'transparent', color: Colors.tealDark,
                          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Done for now
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── All steps done celebration ── */}
              {allStepsDone && total > 0 && (
                <div style={{
                  margin: '12px 18px 4px',
                  background: Colors.tealLight,
                  border: `1.5px solid ${Colors.teal}`,
                  borderRadius: 16,
                  padding: '18px 18px 14px',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <IconParty size={32} color={Colors.teal} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: Colors.tealDark, marginBottom: 4 }}>
                    All steps done!
                  </div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 1.45 }}>
                    Ready to mark this assignment complete?
                  </div>
                  <button
                    onClick={handleToggleDone}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                      background: Colors.teal, color: '#fff',
                      fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Mark complete →
                  </button>
                </div>
              )}

              {/* ── Steps ── */}
              <div style={{ padding: '12px 18px 4px', background: Colors.surface, borderBottom: `0.5px solid rgba(0,0,0,0.08)` }}>
                {/* Header row: label + reschedule button */}
                <div style={{ ...Styles.spreadRow, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Break it down</div>
                  {(() => {
                    // Show reschedule button only when there are stale (past-due) undone steps
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const todayStr = today.toISOString().split('T')[0];
                    const hasStaleSteps = subtasks.some(s =>
                      !s.done && s.dueDate !== null && s.dueDate < todayStr
                    );
                    if (!hasStaleSteps || subtasks.every(s => s.done)) return null;
                    return (
                      <button
                        onClick={handleReschedule}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontSize: 12, fontWeight: 500, color: Colors.forest,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Reschedule steps →
                      </button>
                    );
                  })()}
                </div>

                {/* ── Generating skeleton ── */}
                {generatingSteps && (
                  <div style={{ padding: '4px 0 8px' }}>
                    {[80, 65, 75, 55].map((w, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                        borderBottom: i < 3 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.grayLight, flexShrink: 0 }} />
                        <div style={{
                          height: 14, borderRadius: 7,
                          background: Colors.grayLight,
                          width: `${w}%`,
                          animation: 'shimmer 1.4s ease-in-out infinite',
                        }} />
                      </div>
                    ))}
                    <style>{`
                      @keyframes shimmer {
                        0%, 100% { opacity: 1; }
                        50%       { opacity: 0.4; }
                      }
                    `}</style>
                  </div>
                )}

                {displayedSteps.map((s, idx) => {
                  const sd = s.dueDate ? daysUntil(s.dueDate) : null;
                  let dateLabel = s.dueDate ? formatShortDate(s.dueDate) : '+ set date';
                  let dateColor: string = Colors.textHint;
                  if (s.dueDate && sd !== null) {
                    if (sd < 0)        { dateColor = Colors.red;   dateLabel += ' · late'; }
                    else if (sd === 0) { dateColor = Colors.red;   dateLabel = 'Today'; }
                    else if (sd <= 2)  { dateColor = Colors.amber; }
                  }
                  // Label first step "Start here"
                  const isFirst = idx === 0 && !s.done;

                  const isNewFirst = idx === 0 && !s.done && subtasks.filter(x => !x.done).indexOf(s) === 0 && subtaskAnimKey[subtasks[idx > 0 ? idx - 1 : 0]?.id ?? ''] > 0;
                  return (
                    <div
                      key={s.id}
                      className={subtaskAnimKey[s.id] === -1 ? 'step-completing' : isNewFirst ? 'step-new-first' : undefined}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0' }}>
                        <CheckCircle checked={s.done} onToggle={() => toggleSubtask(s.id)} size={22} animationKey={subtaskAnimKey[s.id]} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, color: s.done ? Colors.textSecondary : Colors.textPrimary, textDecoration: s.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{s.text}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {isFirst && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: Colors.forest, background: '#E8F4F5', padding: '1px 6px', borderRadius: 10 }}>start here</span>
                            )}
                            <button onClick={() => setEditingDateId(editingDateId === s.id ? null : s.id)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 500, color: dateColor, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {dateLabel}
                            </button>
                          </div>
                        </div>
                      </div>
                      {editingDateId === s.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 32, marginBottom: 6, padding: '6px 10px', background: '#E8F4F5', borderRadius: 8 }}>
                          <input type="date" defaultValue={s.dueDate ?? ''} onChange={e => setSubtaskDate(s.id, e.target.value || null)} style={{ flex: 1, fontSize: 13, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary }} />
                          <button onClick={() => setSubtaskDate(s.id, null)} style={{ fontSize: 12, color: Colors.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>clear</button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Expand toggle */}
                {hasHidden && (
                  <button
                    onClick={() => setStepsExpanded(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', margin: '6px 0', background: Colors.background, border: `0.5px solid rgba(0,0,0,0.1)`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500 }}>+ {hiddenSteps.length} more step{hiddenSteps.length !== 1 ? 's' : ''}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                )}

                {stepsExpanded && hiddenSteps.length > 0 && (
                  <button onClick={() => setStepsExpanded(false)} style={{ fontSize: 12, color: Colors.textHint, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
                    ▴ Show less
                  </button>
                )}

                {/* Add step */}
                {addingStep ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                    <input autoFocus value={newStepText} onChange={e => setNewStepText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addStep(); if (e.key === 'Escape') { setAddingStep(false); setNewStepText(''); } }} placeholder="Describe this step…" style={{ flex: 1, fontSize: 14, border: 'none', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary }} />
                    <button onClick={addStep} style={{ background: Colors.forest, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingStep(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 12px', background: 'none', border: 'none', color: Colors.forest, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Add a step
                  </button>
                )}
              </div>

              {/* ── Notes ── */}
              {a.notes ? (
                <div style={{ padding: '12px 18px', background: Colors.surface, borderBottom: `0.5px solid rgba(0,0,0,0.08)` }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.5 }}>{a.notes}</div>
                </div>
              ) : null}
            </>
          )}
        </ScrollBody>

        {/* ── Footer buttons ── */}
        {!editing && (
            <div style={{ padding: '8px 18px calc(12px + env(safe-area-inset-bottom))', background: Colors.surface, borderTop: `0.5px solid rgba(0,0,0,0.08)`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>            {!a.done && (
              <button
                onClick={() => {
                  const nextStep = subtasks.find(s => !s.done) ?? null;
                  focusedSubtaskIdRef.current = nextStep?.id ?? null;
                  setFocusing(true);
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px', borderRadius: 16, border: 'none', background: Colors.forest, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}
              >
                {/* Lime play squircle */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#B8E04A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={Colors.forest} stroke="none">
                    <polygon points="5,3 21,12 5,21"/>
                  </svg>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#B8E04A', letterSpacing: '-0.02em' }}>
                  Start focusing
                </span>
              </button>
            )}
            {/* Mark as done — green */}
            <button
              onClick={handleToggleDone}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, border: 'none', background: a.done ? Colors.grayLight : Colors.forest, color: a.done ? Colors.textSecondary : '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}
            >
              {a.done
                ? <><IconRefreshCw size={16} color={Colors.textSecondary} /> Mark as not done</>
                : <><IconCircleCheck size={16} color="#fff" /> Mark as done</>}
            </button>
          </div>
        )}
      </Screen>
    </>
  );
}

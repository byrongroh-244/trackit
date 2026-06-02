import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme';
import PeriodEditor from '../components/PeriodEditor';
import { Screen, ScrollBody, ConfirmSheet } from '../components/UI';
import { IconChevronDown, IconChevronUp, IconChevronRight, IconArrowLeft } from '../components/Icons';

const LOOKAHEAD_OPTIONS = [
  { value: 3,  label: '3 days' },
  { value: 7,  label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 0,  label: 'All'    },
];

const WORK_OPTIONS  = [5, 10, 15, 20, 25, 30];
const BREAK_OPTIONS = [2, 3, 5, 7, 10];
const HIGHLIGHT_KEY          = 'trackit_highlight_lookahead';
const HIGHLIGHT_SCHEDULE_KEY = 'trackit_highlight_schedule';

// ── Inline icons ──────────────────────────────────────────────────────────────
const KeyIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const SignOutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const TrashIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const SemesterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
);

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, margin: '0 16px', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

// ── Icon row ──────────────────────────────────────────────────────────────────
function IconRow({ icon, label, sub, onClick, iconBg, iconColor, labelColor, right, borderBottom = true }: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  iconBg: string;
  iconColor?: string;
  labelColor?: string;
  right?: React.ReactNode;
  borderBottom?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        borderBottom: borderBottom ? '0.5px solid #E3EBEA' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = Colors.background)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: iconColor ?? '#fff',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: labelColor ?? Colors.textPrimary }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>{sub}</div>}
      </div>
      {right ?? (onClick && <IconChevronRight size={16} color={Colors.textHint} />)}
    </div>
  );
}

// ── Pill selector — active state now uses forest ──────────────────────────────
function PillSelector({ options, value, onChange, activeColor, activeBg }: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  activeColor: string;
  activeBg: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            border: `1.5px solid ${value === opt.value ? activeColor : 'rgba(0,0,0,0.1)'}`,
            background: value === opt.value ? activeBg : 'transparent',
            color: value === opt.value ? activeColor : Colors.textSecondary,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section label — heavier for Settings context ──────────────────────────────
function SettingsSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: Colors.forest,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      padding: '20px 20px 8px',
    }}>
      {children}
    </div>
  );
}

export default function SettingsScreen() {
  const { navigate, reset, settings, updateSettings, signOut, userEmail, courses } = useApp();

  // ── Class schedule ──────────────────────────────────────────────────────────
  const SCHEDULE_KEY  = 'trackit_class_schedule';
  const SCHED_TYPE_KEY = 'trackit_schedule_type';

  function loadSchedule(): import('../screens/CalendarScreen').ClassPeriod[] {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '[]'); } catch { return []; }
  }
  function saveSchedule(s: import('../screens/CalendarScreen').ClassPeriod[]) {
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); } catch {}
  }
  function loadSchedType(): 'standard' | 'block' {
    try { return (localStorage.getItem(SCHED_TYPE_KEY) as any) ?? 'standard'; } catch { return 'standard'; }
  }

  const [scheduleType,  setSchedType]     = useState<'standard' | 'block'>(loadSchedType);
  const [schedule,      setSchedule]      = useState(loadSchedule);
  const [editingPeriod, setEditingPeriod] = useState<import('../screens/CalendarScreen').ClassPeriod | null>(null);
  const [addingPeriod,  setAddingPeriod]  = useState(false);

  const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const DAY_FULL  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function fmtTime(h: number, m: number) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
  }

  function deletePeriod(idx: number) {
    const updated = schedule.filter((_, i) => i !== idx);
    setSchedule(updated); saveSchedule(updated);
  }

  function savePeriod(p: import('../screens/CalendarScreen').ClassPeriod) {
    const updated = editingPeriod
      ? schedule.map(s => s === editingPeriod ? p : s)
      : [...schedule, p];
    setSchedule(updated); saveSchedule(updated);
    setEditingPeriod(null); setAddingPeriod(false);
  }
  const [highlight,         setHighlight]         = useState(false);
  const [highlightSchedule, setHighlightSchedule] = useState(false);
  const [showChangePw,  setShowChangePw]  = useState(false);
  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwStatus,      setPwStatus]      = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwMessage,     setPwMessage]     = useState('');
  const [deletingAcct,  setDeletingAcct]  = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStatus,  setDeleteStatus]  = useState<'idle' | 'loading' | 'error'>('idle');
  const [deleteMsg,     setDeleteMsg]     = useState('');
  const [confirmReset,  setConfirmReset]  = useState(false);

  useEffect(() => {
    try {
      const flag = localStorage.getItem(HIGHLIGHT_KEY);
      if (flag === '1') {
        setHighlight(true);
        localStorage.removeItem(HIGHLIGHT_KEY);
        setTimeout(() => setHighlight(false), 3000);
      }
      const schedFlag = localStorage.getItem(HIGHLIGHT_SCHEDULE_KEY);
      if (schedFlag === '1') {
        setHighlightSchedule(true);
        localStorage.removeItem(HIGHLIGHT_SCHEDULE_KEY);
        setTimeout(() => setHighlightSchedule(false), 3000);
      }
    } catch {}
  }, []);

  async function handleChangePassword() {
    if (!newPassword.trim()) { setPwStatus('error'); setPwMessage('Please enter a new password.'); return; }
    if (newPassword.length < 6) { setPwStatus('error'); setPwMessage('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPw) { setPwStatus('error'); setPwMessage('Passwords do not match.'); return; }
    setPwStatus('loading');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPwStatus('error'); setPwMessage(error.message); }
    else {
      setPwStatus('success'); setPwMessage('Password updated successfully.');
      setNewPassword(''); setConfirmPw('');
      setTimeout(() => { setShowChangePw(false); setPwStatus('idle'); setPwMessage(''); }, 2000);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') { setDeleteStatus('error'); setDeleteMsg('Type DELETE to confirm.'); return; }
    setDeleteStatus('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        // Delete all user data rows
        await Promise.all([
          supabase.from('assignments').delete().eq('user_id', uid),
          supabase.from('courses').delete().eq('user_id', uid),
          supabase.from('settings').delete().eq('user_id', uid),
        ]);
        // Call the delete_user RPC which removes the auth.users record server-side
        await supabase.rpc('delete_user');
      }
      // Clear all local state
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      await supabase.auth.signOut();
    } catch {
      setDeleteStatus('error');
      setDeleteMsg('Something went wrong. Please contact support.');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 14, padding: '10px 40px 10px 12px',
    borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)',
    outline: 'none', fontFamily: 'inherit',
    color: Colors.textPrimary, background: Colors.surface,
    boxSizing: 'border-box',
  };

  const workMins      = settings.focusWorkMinutes  ?? 10;
  const breakMins     = settings.focusBreakMinutes ?? 3;
  const lookahead     = settings.agendaLookaheadDays ?? 0;
  const semesterLabel = settings.currentSemester
    ? settings.currentSemester.charAt(0).toUpperCase() + settings.currentSemester.slice(1)
    : 'Not set';

  // Forest-tinted light bg for the lookahead highlight flash
  const forestLight = '#E8F4F5';

  return (
    <>
      {confirmReset && (
        <ConfirmSheet
          title="Reset all data?"
          body="This permanently deletes all assignments and classes. Your account is kept."
          confirmLabel="Reset"
          danger
          onConfirm={() => { reset(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      <Screen>

        {/* Dark forest header — matches Today & Calendar */}
        <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate('today')}
              aria-label="Go back" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
            </button>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Settings
            </div>
          </div>
        </div>

        <ScrollBody style={{ paddingBottom: 40 }}>

          {/* ── Agenda ── */}
          <SettingsSectionLabel>Agenda</SettingsSectionLabel>
          <Card>
            <div style={{
              padding: '16px 18px',
              background: highlight ? forestLight : 'transparent',
              transition: 'background 0.3s', borderRadius: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: highlight ? Colors.forest : Colors.textPrimary }}>
                    Show assignments due within
                  </div>
                  <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>
                    Hides far-off items to reduce overwhelm
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: Colors.forest }}>
                  {LOOKAHEAD_OPTIONS.find(o => o.value === lookahead)?.label ?? 'All'}
                </span>
              </div>
              <PillSelector
                options={LOOKAHEAD_OPTIONS}
                value={lookahead}
                onChange={v => updateSettings({ ...settings, agendaLookaheadDays: v })}
                activeColor={Colors.forest}
                activeBg={forestLight}
              />
            </div>
          </Card>

          {/* ── AI features ── */}
          <SettingsSectionLabel>AI features</SettingsSectionLabel>
          <Card>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>AI micro-steps</div>
                <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2, lineHeight: 1.5 }}>
                  Automatically break assignments into small steps
                </div>
              </div>
              <button
                onClick={() => updateSettings({ ...settings, microstepsEnabled: !(settings.microstepsEnabled !== false) })}
                style={{
                  width: 48, height: 28, borderRadius: 14,
                  background: settings.microstepsEnabled !== false ? Colors.forest : Colors.grayLight,
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: settings.microstepsEnabled !== false ? 22 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </Card>

          {/* ── Focus timer ── */}
          <SettingsSectionLabel>Focus timer</SettingsSectionLabel>
          <Card>
            <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E3EBEA' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>Work interval</div>
                  <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>Focus time before a break</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: Colors.forest }}>{workMins}m</span>
              </div>
              <PillSelector
                options={WORK_OPTIONS.map(m => ({ value: m, label: `${m}m` }))}
                value={workMins}
                onChange={v => updateSettings({ ...settings, focusWorkMinutes: v })}
                activeColor={Colors.forest}
                activeBg={forestLight}
              />
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>Break interval</div>
                  <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>Rest time between work intervals</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: Colors.teal }}>{breakMins}m</span>
              </div>
              <PillSelector
                options={BREAK_OPTIONS.map(m => ({ value: m, label: `${m}m` }))}
                value={breakMins}
                onChange={v => updateSettings({ ...settings, focusBreakMinutes: v })}
                activeColor={Colors.teal}
                activeBg={Colors.tealLight}
              />
            </div>
          </Card>

          {/* ── Integrations ── */}
          {/* ── Class schedule ── */}
          <div id="class-schedule-section" style={{ scrollMarginTop: 80 }} />
          <SettingsSectionLabel>
            <span style={{ color: highlightSchedule ? Colors.forest : Colors.textPrimary, fontWeight: highlightSchedule ? 700 : 600, transition: 'color 0.3s, font-weight 0.3s' }}>Class schedule</span>
          </SettingsSectionLabel>
          <Card style={{ border: highlightSchedule ? `1.5px solid ${Colors.forest}` : '1.5px solid #E3EBEA', background: highlightSchedule ? forestLight : '#fff', transition: 'border-color 0.4s, background 0.4s' }}>
            {/* Schedule type toggle */}
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E3EBEA' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Schedule type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['standard', 'block'] as const).map(type => (
                  <button key={type} onClick={() => { setSchedType(type); try { localStorage.setItem(SCHED_TYPE_KEY, type); } catch {} }}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1.5px solid ${scheduleType === type ? Colors.forest : '#E3EBEA'}`, background: scheduleType === type ? Colors.forest : '#fff', color: scheduleType === type ? '#fff' : Colors.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {type === 'standard' ? 'Standard' : 'Block (A/B)'}
                  </button>
                ))}
              </div>
              {scheduleType === 'block' && (
                <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 7, lineHeight: 1.6 }}>
                  Block schedules rotate A and B days. Mark specific calendar days as A, B, or off from the Day view in Calendar.
                </div>
              )}
            </div>
            {schedule.length === 0 && (
              <div style={{ padding: '12px 16px 10px', fontSize: 13, color: Colors.textHint, lineHeight: 1.5 }}>
                Add your class times to unlock the Day view in Calendar — see free windows, next class countdowns, and study suggestions.
              </div>
            )}
            {schedule.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '0.5px solid #E3EBEA' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>
                    {p.days.map(d => DAY_FULL[d]).join(', ')} · {fmtTime(p.startHour, p.startMin)}–{fmtTime(p.endHour, p.endMin)}{p.room ? ` · ${p.room}` : ''}
                  </div>
                </div>
                <button onClick={() => { setEditingPeriod(p); setAddingPeriod(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.textHint }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => deletePeriod(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.red }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => { setEditingPeriod(null); setAddingPeriod(true); }}
              style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: Colors.forest, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add a class period
            </button>
          </Card>

          {/* Period editor sheet */}
          {addingPeriod && (
            <PeriodEditor
              initial={editingPeriod}
              courses={courses}
              scheduleType={scheduleType}
              onSave={savePeriod}
              onCancel={() => { setAddingPeriod(false); setEditingPeriod(null); }}
            />
          )}

          <SettingsSectionLabel>Integrations</SettingsSectionLabel>
          <Card>
            <IconRow
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
              label="Connect Canvas"
              sub="Auto-import courses and assignments"
              iconBg={Colors.teal}
              onClick={() => navigate('canvas')}
            />
            <IconRow
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              label="Google Calendar + Tasks"
              sub="Sync due dates and reminders"
              iconBg={Colors.grayLight}
              labelColor={Colors.textHint}
              borderBottom={false}
              right={<span style={{ fontSize: 11, fontWeight: 600, color: Colors.textHint, background: Colors.grayLight, padding: '3px 8px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>Soon</span>}
            />
          </Card>

          {/* ── Account ── */}
          <SettingsSectionLabel>Account</SettingsSectionLabel>
          <Card>
            {/* Logged-in email */}
            {userEmail && (
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E3EBEA', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Signed in as</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                </div>
              </div>
            )}
            <IconRow
              icon={<KeyIcon />}
              label="Change password"
              iconBg='#E8F4F5'
              iconColor={Colors.forest}
              onClick={() => { setShowChangePw(v => !v); setPwStatus('idle'); setPwMessage(''); }}
              right={showChangePw ? <IconChevronUp size={16} color={Colors.textHint} /> : <IconChevronDown size={16} color={Colors.textHint} />}
            />
            {showChangePw && (
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #E3EBEA', background: Colors.background }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 6 }}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} />
                    <button onClick={() => setShowNewPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, display: 'flex', padding: 4 }}><EyeIcon open={showNewPw} /></button>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 6 }}>Confirm new password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChangePassword()} placeholder="Re-enter new password" style={inputStyle} />
                    <button onClick={() => setShowConfirmPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: Colors.textHint, display: 'flex', padding: 4 }}><EyeIcon open={showConfirmPw} /></button>
                  </div>
                </div>
                {pwMessage && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 10, background: pwStatus === 'error' ? Colors.redLight : Colors.tealLight, color: pwStatus === 'error' ? Colors.red : Colors.tealDark }}>
                    {pwMessage}
                  </div>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={pwStatus === 'loading'}
                  style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: pwStatus === 'loading' ? Colors.grayLight : Colors.forest, color: pwStatus === 'loading' ? Colors.textHint : '#fff', fontSize: 14, fontWeight: 700, cursor: pwStatus === 'loading' ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  {pwStatus === 'loading' ? 'Updating…' : 'Update password'}
                </button>
              </div>
            )}
            <IconRow
              icon={<SignOutIcon />}
              label="Sign out"
              iconBg={Colors.grayLight}
              iconColor={Colors.textSecondary}
              labelColor={Colors.textSecondary}
              onClick={() => signOut()}
              borderBottom={false}
            />
          </Card>

          {/* ── Danger zone — visually separated red card ── */}
          <SettingsSectionLabel>Danger zone</SettingsSectionLabel>
          <Card>
            <IconRow
              icon={<SemesterIcon />}
              label="Start new semester"
              sub={`Current: ${semesterLabel} · ${settings.gradeLevel ? settings.gradeLevel.replace('hs_', 'Grade ').replace('col_', 'Year ') : 'Grade not set'}`}
              iconBg={Colors.redLight}
              iconColor={Colors.red}
              labelColor={Colors.red}
              onClick={() => navigate('onboarding' as any)}
            />
            <IconRow
              icon={<TrashIcon color={Colors.red} />}
              label="Reset all data"
              sub="Clears assignments and classes, keeps your account"
              iconBg={Colors.redLight}
              labelColor={Colors.red}
              onClick={() => setConfirmReset(true)}
            />
            <IconRow
              icon={<TrashIcon color={Colors.red} />}
              label="Delete account"
              sub="Permanently removes your account and all data"
              iconBg={Colors.redLight}
              labelColor={Colors.red}
              onClick={() => setDeletingAcct(v => !v)}
              borderBottom={deletingAcct}
              right={deletingAcct ? <IconChevronUp size={16} color={Colors.red} /> : <IconChevronDown size={16} color={Colors.red} />}
            />
            {deletingAcct && (
              <div style={{ padding: '14px 18px', background: Colors.redLight }}>
                <p style={{ fontSize: 13, color: Colors.redDark, marginBottom: 12, lineHeight: 1.5 }}>
                  This permanently deletes your account and all assignments, classes, and settings. This cannot be undone.
                </p>
                <label style={{ fontSize: 12, fontWeight: 500, color: Colors.redDark, display: 'block', marginBottom: 6 }}>Type DELETE to confirm</label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  style={{ ...inputStyle, border: `1px solid ${Colors.red}`, marginBottom: 10 }}
                />
                {deleteMsg && <div style={{ fontSize: 13, color: Colors.red, marginBottom: 10 }}>{deleteMsg}</div>}
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteStatus === 'loading' || deleteConfirm !== 'DELETE'}
                  style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: deleteConfirm === 'DELETE' ? Colors.red : Colors.grayLight, color: deleteConfirm === 'DELETE' ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  {deleteStatus === 'loading' ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            )}
          </Card>

          <div style={{ textAlign: 'center', fontSize: 12, color: Colors.textHint, marginTop: 28 }}>TrackIt · v2.0.0</div>
        </ScrollBody>
      </Screen>
    </>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../hooks/useApp';
import { daysUntil } from '../data/store';
import { Colors, SECTION_META, getSectionForDays, type Section } from '../theme';
import { IconPlay, IconChevronDown, IconChevronUp, IconChevronRight, IconCircleCheck } from '../components/Icons';
import AssignmentCard from '../components/AssignmentCard';
import QuickLaunch from '../components/QuickLaunch';
import { Screen, ScrollBody, BottomNav, SectionLabel, EmptyState } from '../components/UI';
import type { Assignment } from '../types';

const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
];

const COLLAPSED_KEY = 'trackit_section_collapsed';
const AUTOFOCUS_KEY = 'trackit_autofocus';
const CALENDAR_DATE_KEY = 'trackit_calendar_date';

const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function readCollapsed(): Record<Section, boolean> {
  const defaults: Record<Section, boolean> = {
    needs_attention: false,
    coming_up: false,
    on_track: false,
  };
  try {
    const raw = sessionStorage.getItem(COLLAPSED_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

function writeCollapsed(state: Record<Section, boolean>) {
  try { sessionStorage.setItem(COLLAPSED_KEY, JSON.stringify(state)); } catch {}
}

// Returns YYYY-MM-DD for a date offset `n` days from today
function dateKeyOffset(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function TodayScreen() {
  const { assignments, navigate, patchAssignment, settings } = useApp();
  const [showDone,     setShowDone]     = useState(false);
  const [collapsed,    setCollapsed]    = useState<Record<Section, boolean>>(readCollapsed);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => { writeCollapsed(collapsed); }, [collapsed]);

  const toggleSection = useCallback((key: Section) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const lookahead = settings.agendaLookaheadDays;
  const active = assignments.filter(a => {
    if (a.done) return false;
    if (lookahead === 0) return true;
    return daysUntil(a.dueDate) <= lookahead;
  });
  const done = assignments.filter(a => a.done);
  const hiddenCount = lookahead > 0
    ? assignments.filter(a => !a.done && daysUntil(a.dueDate) > lookahead).length
    : 0;

  const grouped: Record<Section, Assignment[]> = {
    needs_attention: [], coming_up: [], on_track: [],
  };
  active.forEach(a => {
    const d = daysUntil(a.dueDate);
    grouped[getSectionForDays(d)].push(a);
  });
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
  );

  // ── Week strip data ───────────────────────────────────────────────────────────
  // Build a map of dateKey → assignments due that day (non-done only)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dateKey = dateKeyOffset(i);
    const d       = new Date(dateKey + 'T00:00:00');
    const items   = assignments.filter(a => !a.done && a.dueDate === dateKey);
    return {
      dateKey,
      dayLabel:  DAY_LABELS[d.getDay()],
      dateNum:   d.getDate(),
      monthLabel: MONTH_SHORT[d.getMonth()],
      items,
      isToday: i === 0,
    };
  });
  const showWeekStrip = assignments.length > 0;

  // ── Start Now target ──────────────────────────────────────────────────────────
  const startTarget = (() => {
    if (active.length === 0) return null;
    const sorted     = [...active].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
    const assignment = sorted[0];
    const nextStep   = (assignment.subtasks ?? []).find(s => !s.done) ?? null;
    return { assignment, nextStep };
  })();

  function handleStartNow() {
    if (!startTarget) return;
    try { sessionStorage.setItem(AUTOFOCUS_KEY, 'true'); } catch {}
    navigate('detail', startTarget.assignment.id);
  }

  function handleDayPress(dateKey: string) {
    try { sessionStorage.setItem(CALENDAR_DATE_KEY, dateKey); } catch {}
    navigate('calendar');
  }

  // QuickLaunch: Focus tile auto-selects the most urgent assignment
  function handleQuickFocus() {
    if (!startTarget) { navigate('add'); return; }
    try { sessionStorage.setItem(AUTOFOCUS_KEY, 'true'); } catch {}
    navigate('detail', startTarget.assignment.id);
  }

  // ── Date string ──────────────────────────────────────────────────────────────
  const now     = new Date();
  const days    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const mons    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${days[now.getDay()]}, ${mons[now.getMonth()]} ${now.getDate()}`;

  function toggleDone(id: string) {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    if (!a.done) {
      setCompletingId(id);
    } else {
      patchAssignment({ ...a, done: false });
    }
  }

  function handleCardAnimationEnd(id: string) {
    setCompletingId(null);
    const a = assignments.find(x => x.id === id);
    if (a) patchAssignment({ ...a, done: true });
  }

  function goToLookaheadSettings() {
    try { localStorage.setItem('trackit_highlight_lookahead', '1'); } catch {}
    navigate('settings');
  }

  function lookaheadLabel(): string {
    if (lookahead === 7)  return '1 week';
    if (lookahead === 14) return '2 weeks';
    if (lookahead === 21) return '3 weeks';
    if (lookahead === 30) return '1 month';
    if (lookahead === 60) return '2 months';
    return `${lookahead} days`;
  }

  const showFooter = hiddenCount > 0 || done.length > 0;

  const startSubtitle = (() => {
    if (!startTarget) return '';
    const aName = startTarget.assignment.name.slice(0, 35) +
      (startTarget.assignment.name.length > 35 ? '…' : '');
    if (!startTarget.nextStep) return aName;
    const sText = startTarget.nextStep.text.slice(0, 30) +
      (startTarget.nextStep.text.length > 30 ? '…' : '');
    return `${aName}  ·  ${sText}`;
  })();

  return (
    <>
      <QuickLaunch
        onAdd={(type) => {
          try { sessionStorage.setItem('trackit_add_type', type); } catch {}
          navigate('add');
        }}
        onFocus={handleQuickFocus}
        onAgenda={()  => { /* dismisses itself — already on agenda */ }}
        onWeekly={()  => navigate('calendar')}
      />
      <Screen>
      {/* Today-specific dark header — Forest Deep per CLAUDE.md spec */}
      <div style={{
        background: Colors.forest,
        padding: '22px 20px 0',
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Agenda
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              {dateStr} &middot; {active.length} assignment{active.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Week strip — inside header, full width, no scroll */}
        {showWeekStrip && (
          <div style={{
            display: 'flex',
            gap: 4,
            paddingBottom: 16,
          }}>
            {weekDays.map(day => {
              const hasDue = day.items.length > 0;
              const visibleDots = day.items.slice(0, 3);
              const overflow    = day.items.length - 3;

              return (
                <button
                  key={day.dateKey}
                  onClick={() => handleDayPress(day.dateKey)}
                  style={{
                    flex: 1,
                    minHeight: 64,
                    borderRadius: 10,
                    border: day.isToday
                      ? '2px solid rgba(184,224,74,0.8)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: day.isToday ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 2px 6px',
                    gap: 3,
                  }}
                >
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: day.isToday ? '#B8E04A' : 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {day.dayLabel}
                  </span>

                  <span style={{
                    fontSize: 17,
                    fontWeight: day.isToday ? 800 : 400,
                    color: day.isToday ? '#fff' : 'rgba(255,255,255,0.7)',
                    lineHeight: 1,
                    letterSpacing: day.isToday ? '-0.02em' : 0,
                  }}>
                    {day.dateNum}
                  </span>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    minHeight: 7,
                  }}>
                    {hasDue ? (
                      <>
                        {visibleDots.map(a => (
                          <span key={a.id} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: day.isToday ? '#B8E04A' : 'rgba(255,255,255,0.5)',
                            flexShrink: 0,
                          }} />
                        ))}
                        {overflow > 0 && (
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', lineHeight: 1, marginLeft: 1 }}>
                            +{overflow}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ width: 5, height: 5 }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Start Next Task — fully rounded card inside header */}
        {startTarget && (
          <button
            onClick={handleStartNow}
            style={{
              width: '100%',
              minHeight: 58,
              borderRadius: 16,
              border: 'none',
              background: 'rgba(255,255,255,0.10)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'background 0.15s',
              marginTop: showWeekStrip ? 4 : 8,
              marginBottom: 16,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#B8E04A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={Colors.forest} stroke="none">
                <polygon points="5,3 21,12 5,21" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#B8E04A', letterSpacing: '-0.01em' }}>
                Start next task
              </div>
              {startSubtitle && (
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {startSubtitle}
                </div>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        )}
      </div>

      <ScrollBody hasNav>
        <div style={{ paddingTop: 0 }}>

        {/* ── Main list ── */}
        {assignments.length === 0 ? (
          <EmptyState icon={<IconCircleCheck size={48} color={Colors.teal} />} title="All clear!" body="No assignments yet. Tap Add to get started." />
        ) : active.length === 0 && hiddenCount === 0 && done.length === 0 ? (
          <EmptyState icon={<IconCircleCheck size={48} color={Colors.teal} />} title="All caught up!" body="Nothing due in this window." />
        ) : (
          <>
            {(Object.entries(grouped) as [Section, Assignment[]][]).map(([key, items]) =>
              items.length > 0 ? (
                <div key={key}>
                  <button
                    onClick={() => toggleSection(key)}
                    style={{
                      width: '100%', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', cursor: 'pointer', fontFamily: 'inherit',
                      background: Colors.grayLight,
                      borderTop: '0.5px solid rgba(0,0,0,0.08)',
                      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                      marginTop: 24,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: SECTION_META[key].color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {SECTION_META[key].label}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: collapsed[key] ? Colors.textHint : SECTION_META[key].color,
                        background: collapsed[key] ? 'rgba(0,0,0,0.06)' : `${SECTION_META[key].color}18`,
                        padding: '1px 7px', borderRadius: 20,
                        transition: 'all 0.2s',
                      }}>
                        {items.length}
                      </span>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      color: Colors.textHint,
                      transform: collapsed[key] ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}>
                      <IconChevronDown size={16} />
                    </span>
                  </button>

                  {!collapsed[key] && (
                    <div style={{ paddingBottom: 6, paddingTop: 10 }}>
                      {items.map(a => (
                        <AssignmentCard
                          key={a.id}
                          assignment={a}
                          onPress={() => navigate('detail', a.id)}
                          onToggleDone={() => toggleDone(a.id)}
                          completing={completingId === a.id}
                          onAnimationEnd={() => handleCardAnimationEnd(a.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null
            )}

            {/* ── Footer row ── */}
            {showFooter && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '16px 18px 8px', flexWrap: 'wrap',
              }}>
                {hiddenCount > 0 && (
                  <button
                    onClick={goToLookaheadSettings}
                    style={{
                      background: Colors.purpleLight,
                      border: `0.5px solid ${Colors.purple}33`,
                      borderRadius: 20, padding: '5px 12px',
                      display: 'flex', alignItems: 'center', gap: 5,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 12, color: Colors.purple, fontWeight: 500 }}>
                      +{hiddenCount} later
                    </span>
                    <span style={{ fontSize: 11, color: Colors.purple, opacity: 0.6 }}>
                      · {lookaheadLabel()} view
                    </span>
                  </button>
                )}

                {done.length > 0 && (
                  <button
                    onClick={() => setShowDone(v => !v)}
                    style={{
                      background: showDone ? Colors.grayLight : 'transparent',
                      border: `0.5px solid rgba(0,0,0,0.12)`,
                      borderRadius: 20, padding: '5px 12px',
                      display: 'flex', alignItems: 'center', gap: 5,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: Colors.textHint }}>
                      {showDone ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: Colors.textSecondary }}>
                      {done.length} completed
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ── Completed list ── */}
            {showDone && (
              <>
                <SectionLabel color={Colors.gray}>Completed</SectionLabel>
                {done.map(a => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onPress={() => navigate('detail', a.id)}
                    onToggleDone={() => toggleDone(a.id)}
                    completing={completingId === a.id}
                    onAnimationEnd={() => handleCardAnimationEnd(a.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
        </div>
      </ScrollBody>

      <BottomNav current="today" onNavigate={s => navigate(s as any)} items={NAV} />
    </Screen>
    </>
  );
}

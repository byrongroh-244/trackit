import { useEffect, useRef, useState } from 'react';
import { Colors } from '../theme';

type Phase = 'work' | 'break';

const BREAK_ACTIVITIES = [
  'Stand up and stretch your arms above your head',
  'Walk to another room and back',
  'Get a glass of water',
  'Look out a window for 20 seconds',
  'Do 5 slow neck rolls each side',
  'Take 5 deep breaths',
  'Shake out your hands and shoulders',
];

function randomActivity(): string {
  return BREAK_ACTIVITIES[Math.floor(Math.random() * BREAK_ACTIVITIES.length)];
}

function RingTimer({ progress, phase, secondsLeft }: {
  progress: number;
  phase: Phase;
  secondsLeft: number;
}) {
  const size   = 220;
  const stroke = 10;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const color  = phase === 'work' ? Colors.forest : Colors.teal;
  const trackColor = phase === 'work' ? 'rgba(255,255,255,0.15)' : 'rgba(28,74,79,0.12)';

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={phase === 'work' ? '#B8E04A' : Colors.teal}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <span style={{
          fontSize: 48, fontWeight: 800,
          color: phase === 'work' ? '#fff' : Colors.tealDark,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          letterSpacing: '-0.03em',
        }}>
          {timeStr}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: phase === 'work' ? 'rgba(255,255,255,0.5)' : Colors.teal,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {phase === 'work' ? 'focus' : 'break'}
        </span>
      </div>
    </div>
  );
}

interface Props {
  assignmentName: string;
  activeStepText?: string | null;
  workMinutes: number;
  breakMinutes: number;
  onClose: (totalFocusSeconds: number) => void;
}

export default function FocusTimer({ assignmentName, activeStepText, workMinutes, breakMinutes, onClose }: Props) {
  const workSecs  = workMinutes * 60;
  const breakSecs = breakMinutes * 60;

  const [phase,         setPhase]         = useState<Phase>('work');
  const [secondsLeft,   setSecondsLeft]   = useState(workSecs);
  const [running,       setRunning]       = useState(false);
  const [started,       setStarted]       = useState(false);
  const [intervals,     setIntervals]     = useState(0);
  const [totalFocus,    setTotalFocus]    = useState(0);
  const [activity,      setActivity]      = useState(randomActivity());
  const [phaseComplete, setPhaseComplete] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === 'work' ? workSecs : breakSecs;
  const progress     = secondsLeft / totalSeconds;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setPhaseComplete(true);
            return 0;
          }
          return s - 1;
        });
        if (phase === 'work') setTotalFocus(t => t + 1);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase]);

  function handleStart()      { setStarted(true); setRunning(true); setPhaseComplete(false); }
  function handlePause()      { setRunning(false); }
  function handleResume()     { setRunning(true); setPhaseComplete(false); }
  function handleEnd()        { onClose(totalFocus); }
  function handleKeepGoing()  { setPhase('work'); setSecondsLeft(workSecs); setPhaseComplete(false); setRunning(true); }
  function handleNextPhase()  {
    if (phase === 'work') {
      setIntervals(i => i + 1); setPhase('break');
      setSecondsLeft(breakSecs); setActivity(randomActivity());
    } else {
      setPhase('work'); setSecondsLeft(workSecs);
    }
    setPhaseComplete(false); setRunning(true);
  }

  const totalFocusMins = Math.floor(totalFocus / 60);
  const totalFocusSecs = totalFocus % 60;
  const focusLabel = totalFocus > 0
    ? totalFocusMins > 0 ? `${totalFocusMins}m ${totalFocusSecs}s` : `${totalFocusSecs}s`
    : null;

  // Work phase: deep forest bg. Break: canvas bg.
  const bg = phase === 'work' ? Colors.forest : Colors.background;
  const isWork = phase === 'work';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '52px 28px 44px',
      transition: 'background 0.6s',

    }}>

      {/* Top bar */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: isWork ? 'rgba(255,255,255,0.4)' : Colors.textHint,
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3,
          }}>
            Working on
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: isWork ? '#fff' : Colors.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 220, letterSpacing: '-0.01em',
          }}>
            {assignmentName}
          </div>

          {/* Active micro-step */}
          {activeStepText && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 8,
              background: isWork ? 'rgba(184,224,74,0.15)' : 'rgba(28,74,79,0.07)',
              borderRadius: 8, padding: '5px 10px',
              maxWidth: 240,
            }}>
              {/* Small lime pip */}
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isWork ? '#B8E04A' : Colors.forest,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                color: isWork ? 'rgba(255,255,255,0.85)' : Colors.textPrimary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {activeStepText}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleEnd}
          style={{
            background: isWork ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            border: 'none', borderRadius: 10,
            padding: '7px 14px', fontSize: 13, fontWeight: 600,
            color: isWork ? 'rgba(255,255,255,0.7)' : Colors.textSecondary,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: 8,
          }}
        >
          End
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: isWork ? '#B8E04A' : Colors.forest, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {intervals}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: isWork ? 'rgba(255,255,255,0.4)' : Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            interval{intervals !== 1 ? 's' : ''}
          </div>
        </div>
        {focusLabel && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: isWork ? '#B8E04A' : Colors.forest, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {focusLabel}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: isWork ? 'rgba(255,255,255,0.4)' : Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              focused
            </div>
          </div>
        )}
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <RingTimer progress={progress} phase={phase} secondsLeft={secondsLeft} />

        {/* Context text */}
        <div style={{ textAlign: 'center', maxWidth: 260 }}>
          {isWork ? (
            <p style={{ fontSize: 15, fontWeight: 600, color: isWork ? 'rgba(255,255,255,0.65)' : Colors.textSecondary, margin: 0 }}>
              {!started ? 'Ready to focus?' : running ? 'Stay with it.' : 'Paused'}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: Colors.tealDark, margin: '0 0 5px' }}>
                Break time
              </p>
              <p style={{ fontSize: 13, color: Colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
                {activity}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}>

        {/* Phase complete — work done */}
        {phaseComplete && isWork && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#B8E04A', letterSpacing: '-0.02em' }}>
                Interval complete!
              </div>
            </div>
            <button
              onClick={handleNextPhase}
              style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: Colors.teal, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Take a {breakMinutes}-min break
            </button>
            <button
              onClick={handleKeepGoing}
              style={{ width: '100%', padding: 15, borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Keep going
            </button>
          </>
        )}

        {/* Phase complete — break done */}
        {phaseComplete && !isWork && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: Colors.forest, letterSpacing: '-0.02em' }}>
                Break over — ready?
              </div>
            </div>
            <button
              onClick={handleNextPhase}
              style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Start next interval
            </button>
          </>
        )}

        {/* Not started */}
        {!phaseComplete && !started && (
          <button
            onClick={handleStart}
            style={{ width: '100%', padding: 18, borderRadius: 14, border: 'none', background: '#B8E04A', color: Colors.forest, fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.02em' }}
          >
            Just start
          </button>
        )}

        {/* Running */}
        {!phaseComplete && started && running && (
          <button
            onClick={handlePause}
            style={{ width: '100%', padding: 15, borderRadius: 14, border: isWork ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #E3EBEA', background: 'transparent', color: isWork ? 'rgba(255,255,255,0.8)' : Colors.textSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Pause
          </button>
        )}

        {/* Paused */}
        {!phaseComplete && started && !running && (
          <button
            onClick={handleResume}
            style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: isWork ? '#B8E04A' : Colors.forest, color: isWork ? Colors.forest : '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
}

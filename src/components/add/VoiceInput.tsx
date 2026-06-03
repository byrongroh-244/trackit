import { useRef, useState } from 'react';
import { Colors } from '../../theme';
import { IconLoader, IconStop, IconArrowLeft } from '../Icons';
import type { AssignmentType, Course } from '../../types';
import { SUPABASE_ANON_KEY, AI_FUNCTION_URL as SUPABASE_FUNCTION_URL, supabase as supabaseClient } from '../../lib/supabase';

async function getSessionToken(): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token ?? SUPABASE_ANON_KEY;
}

const TYPE_OPTIONS: AssignmentType[] = ['homework', 'test', 'quiz', 'project', 'other'];

function toTitleCase(str: string): string {
  const minors = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up','as','is']);
  return str.toLowerCase().replace(/_/g, ' ').split(' ').map((word, i) => {
    if (!word) return word;
    if (i === 0 || !minors.has(word)) return word.charAt(0).toUpperCase() + word.slice(1);
    return word;
  }).join(' ');
}

export interface ParsedItem {
  name: string; dueDate: string; type: AssignmentType; selected: boolean;
}

interface Props {
  courses: Course[];
  onDone: (item: ParsedItem, className: string) => void;
  onCancel: () => void;
}

// ── Shared sub-page header ────────────────────────────────────────────────────
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

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, padding: '11px 13px',
  borderRadius: 10, border: '1.5px solid #E3EBEA',
  outline: 'none', fontFamily: 'inherit',
  color: Colors.textPrimary, background: '#fff',
  boxSizing: 'border-box',
};

export default function VoiceInput({ courses, onDone, onCancel }: Props) {
  const [stage,      setStage]      = useState<'guide' | 'recording' | 'processing' | 'review' | 'error'>('guide');
  const [recording,  setRecording]  = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result,     setResult]     = useState<any>(null);
  const [error,      setError]      = useState('');
  const [editName,   setEditName]   = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editType,   setEditType]   = useState<AssignmentType>('homework');
  const [editClass,  setEditClass]  = useState('');

  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await processAudio(); };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true); setStage('recording');
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.');
      setStage('error');
    }
  }

  function stopRecording() { mediaRef.current?.stop(); setRecording(false); setStage('processing'); }

  async function processAudio() {
    setStage('processing');
    try {
      const blob   = new Blob(chunksRef.current, { type: 'audio/webm' });
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Could not read audio'));
        reader.readAsDataURL(blob);
      });
      const today    = new Date().toISOString().split('T')[0];
      const sessionToken = await getSessionToken();
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ mode: 'audio', data: base64, mimeType: 'audio/webm', today }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? 'Parsing failed');
      setTranscript(data.transcript);
      setResult(data.assignment);
      setEditName(toTitleCase(data.assignment.name ?? ''));
      setEditDate(data.assignment.dueDate ?? '');
      setEditType(data.assignment.type ?? 'homework');
      setEditClass(data.assignment.className ?? '');
      setStage('review');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStage('error');
    }
  }

  function confirmAssignment() {
    const cls  = courses.find(c => c.name.toLowerCase().includes(editClass.toLowerCase())) ?? courses[0];
    const item: ParsedItem = { name: editName.trim() || result?.name || 'Assignment', dueDate: editDate, type: editType, selected: true };
    onDone(item, cls?.name ?? editClass);
  }

  const backToGuide = () => { setStage('guide'); setError(''); };

  // ── Guide ──
  if (stage === 'guide') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Say it out loud" subtitle="Speak naturally — AI fills in the details" onBack={onCancel} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#E8F4F5', borderRadius: 16, padding: '16px 18px' }}>
          {[
            { num: '1', label: 'Assignment type', ex: 'test, quiz, homework, project' },
            { num: '2', label: 'Class name',       ex: 'Bio, Calc, English 101' },
            { num: '3', label: 'Due date',          ex: 'tomorrow, next Friday, June 5th' },
            { num: '4', label: 'Any notes',         ex: 'chapters 4-6, 500 words (optional)' },
          ].map(item => (
            <div key={item.num} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: Colors.forest }}>{item.label}</div>
                <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>{item.ex}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Example</div>
          <div style={{ fontSize: 14, color: Colors.textPrimary, lineHeight: 1.6, fontStyle: 'italic' }}>
            "I have a <span style={{ color: Colors.forest, fontStyle: 'normal', fontWeight: 700 }}>bio test</span> due <span style={{ color: Colors.forest, fontStyle: 'normal', fontWeight: 700 }}>next Friday</span>. It covers <span style={{ color: Colors.forest, fontStyle: 'normal', fontWeight: 700 }}>chapters 4 through 6</span>."
          </div>
        </div>
        <button
          onClick={startRecording}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          Start recording
        </button>
      </div>
    </div>
  );

  // ── Recording ──
  if (stage === 'recording') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Listening…" onBack={() => { mediaRef.current?.stop(); setRecording(false); setStage('guide'); }} />
      <div style={{ padding: '40px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', background: `${Colors.red}18`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 86, height: 86, borderRadius: '50%', background: `${Colors.red}28`, animation: 'pulse 1.5s ease-in-out infinite 0.3s' }} />
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: Colors.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 0.3; } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: Colors.textPrimary, marginBottom: 6 }}>Recording…</div>
          <div style={{ fontSize: 13, color: Colors.textHint, lineHeight: 1.5 }}>"I have a <strong>bio test</strong> due <strong>next Friday</strong>…"</div>
        </div>
        <button onClick={stopRecording} style={{ width: '100%', maxWidth: 300, padding: 15, borderRadius: 14, border: 'none', background: Colors.red, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconStop size={14} color="#fff" /> Stop recording
        </button>
      </div>
    </div>
  );

  // ── Processing ──
  if (stage === 'processing') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Processing…" onBack={onCancel} />
      <div style={{ padding: '60px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: Colors.forest }}>
          <IconLoader size={40} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: Colors.textPrimary, marginBottom: 6 }}>Transcribing your recording…</div>
        <div style={{ fontSize: 13, color: Colors.textHint }}>Usually takes 2–4 seconds.</div>
      </div>
    </div>
  );

  // ── Error ──
  if (stage === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Something went wrong" onBack={backToGuide} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: Colors.redLight, borderRadius: 14, border: `1px solid ${Colors.red}30`, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Colors.red, marginBottom: 4 }}>Could not process recording</div>
          <div style={{ fontSize: 13, color: Colors.redDark, lineHeight: 1.5 }}>{error}</div>
        </div>
        <button onClick={backToGuide} style={{ width: '100%', padding: 14, borderRadius: 14, background: Colors.forest, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
      </div>
    </div>
  );

  // ── Review ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Review & confirm" subtitle="AI filled these in — edit anything that's off" onBack={backToGuide} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {transcript && (
          <div style={{ background: Colors.grayLight, borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>You said</div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5, fontStyle: 'italic' }}>"{transcript}"</div>
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Assignment name</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Class</label>
          {courses.length > 0 ? (
            <select value={editClass} onChange={e => setEditClass(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
              {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="">Not in my list</option>
            </select>
          ) : (
            <input value={editClass} onChange={e => setEditClass(e.target.value)} placeholder="Class name" style={inputStyle} />
          )}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Due date</label>
          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Type</label>
          <select value={editType} onChange={e => setEditType(e.target.value as AssignmentType)} style={{ ...inputStyle, background: '#fff' }}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={backToGuide} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Re-record</button>
          <button
            onClick={confirmAssignment}
            disabled={!editName.trim() || !editDate}
            style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: editName.trim() && editDate ? Colors.forest : Colors.grayLight, color: editName.trim() && editDate ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: editName.trim() && editDate ? 'pointer' : 'default', fontFamily: 'inherit' }}
          >
            Save assignment
          </button>
        </div>
      </div>
    </div>
  );
}

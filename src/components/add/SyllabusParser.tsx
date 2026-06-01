import { useRef, useState } from 'react';
import { Colors } from '../../theme';
import { IconLoader, IconArrowLeft } from '../Icons';
import type { AssignmentType, Course } from '../../types';
import type { AppSettings } from '../../data/store';

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


const SUPABASE_FUNCTION_URL = 'https://vnofpgowelblwkonkeab.supabase.co/functions/v1/parse-assignment';
const SUPABASE_ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZwZ293ZWxibHdrb25rZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTIzNDEsImV4cCI6MjA5NTQ4ODM0MX0.WPHYoSzUjlXlB8ezsh_IrnFqWt_F33HL36tZgk0vjZc';

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
  name: string;
  dueDate: string;
  type: AssignmentType;
  selected: boolean;
}

interface Props {
  targetClass: Course;
  settings: AppSettings;
  onDone: (items: ParsedItem[]) => void;
  onCancel: () => void;
}

export default function SyllabusParser({ targetClass, settings: _settings, onDone, onCancel }: Props) {
  const [status,     setStatus]     = useState<'idle' | 'parsing' | 'review' | 'error'>('idle');
  const [items,      setItems]      = useState<ParsedItem[]>([]);
  const [error,      setError]      = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function parseFile(file: File) {
    setStatus('parsing');
    setError('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      const today = new Date().toISOString().split('T')[0];
      const isPdf = file.type === 'application/pdf';
      let parsed: { name: string; dueDate: string; type: AssignmentType }[] = [];

      if (isPdf) {
        const edgeRes = await fetch(SUPABASE_FUNCTION_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ mode: 'pdf', data: base64, today }),
        });
        if (edgeRes.ok) {
          const edgeData = await edgeRes.json();
          if (edgeData.success && edgeData.source === 'text' && Array.isArray(edgeData.assignments)) {
            parsed = edgeData.assignments;
          } else {
            parsed = await parseWithClaudeVision(base64, file.type, today);
          }
        } else {
          parsed = await parseWithClaudeVision(base64, file.type, today);
        }
      } else {
        parsed = await parseWithClaudeVision(base64, file.type, today);
      }

      if (!Array.isArray(parsed) || parsed.length === 0)
        throw new Error('No assignments found. Try a clearer photo or different file.');

      setItems(parsed.map(p => ({ ...p, name: toTitleCase(p.name), selected: true })));
      setStatus('review');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  async function parseWithClaudeVision(base64: string, mimeType: string, today: string) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No API key configured.');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: mimeType === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: `Today is ${today}. Extract all assignments, tests, quizzes, and projects from this syllabus. Return ONLY a JSON array, no other text. Each item: name (string), dueDate (YYYY-MM-DD, skip if no date), type (homework|test|quiz|project|other). Only include items with a due date.` },
          ],
        }],
      }),
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message ?? `API error ${response.status}`); }
    const data  = await response.json();
    const text  = data.content.map((b: any) => b.text ?? '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  function toggleItem(i: number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item));
  }
  function updateItem(i: number, patch: Partial<ParsedItem>) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }

  const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );

  if (status === 'idle') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Upload syllabus" subtitle="AI reads your PDF or photo" onBack={onCancel} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: Colors.surface, borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: targetClass.color, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: Colors.textSecondary }}>Importing into <strong style={{ color: Colors.textPrimary }}>{targetClass.name}</strong></div>
      </div>
      <div style={{ background: '#E8F4F5', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: Colors.forest, marginBottom: 4 }}>AI Syllabus Parser</div>
        <div style={{ fontSize: 13, color: Colors.forest, lineHeight: 1.5 }}>Upload a PDF or photo. AI extracts all assignments and due dates for you to confirm before saving. Text-based PDFs are processed faster and at lower cost.</div>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }} />
      <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 14, borderRadius: 12, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: Colors.forest, fontFamily: 'inherit', marginBottom: 10 }}>
        Upload PDF or image
      </button>
      </div>
    </div>
  );

  if (status === 'parsing') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Reading syllabus…" onBack={onCancel} />
      <div style={{ padding: '60px 18px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: Colors.purple }}>
        <IconLoader size={40} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: Colors.textPrimary, marginBottom: 6 }}>Reading your syllabus…</div>
      <div style={{ fontSize: 13, color: Colors.textHint }}>This usually takes 5–10 seconds.</div>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Something went wrong" onBack={onCancel} />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: Colors.redLight, borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: Colors.red, marginBottom: 4 }}>Could not parse syllabus</div>
        <div style={{ fontSize: 13, color: Colors.redDark, lineHeight: 1.5 }}>{error}</div>
      </div>
      <button onClick={() => setStatus('idle')} style={{ width: '100%', padding: 13, borderRadius: 14, background: Colors.forest, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>Try again</button>
      </div>
    </div>
  );

  const selectedCount = items.filter(i => i.selected).length;
  const allSelected   = items.every(i => i.selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <SubHeader title="Review assignments" subtitle={`Found ${items.length} — uncheck to skip`} onBack={onCancel} />
      <div style={{ padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: Colors.surface, borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: targetClass.color, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: Colors.textSecondary }}>Importing into <strong style={{ color: Colors.textPrimary }}>{targetClass.name}</strong></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary }}>Found {items.length} assignment{items.length !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>Tap pencil to edit · uncheck to skip</div>
        </div>
        <button onClick={() => setItems(prev => prev.map(i => ({ ...i, selected: !allSelected })))} style={{ fontSize: 13, color: Colors.forest, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E3EBEA', overflow: 'hidden', marginBottom: 14 }}>
        {items.map((item, i) => {
          if (editingIdx === i) return (
            <div key={i} style={{ padding: '14px 16px', borderBottom: i < items.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', background: '#E8F4F5' }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.forest, display: 'block', marginBottom: 4 }}>Name</label>
                <input autoFocus value={item.name} onChange={e => updateItem(i, { name: e.target.value })} style={{ width: '100%', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.forest, display: 'block', marginBottom: 4 }}>Due date</label>
                <input type="date" value={item.dueDate} onChange={e => updateItem(i, { dueDate: e.target.value })} style={{ width: '100%', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: Colors.forest, display: 'block', marginBottom: 4 }}>Type</label>
                <select value={item.type} onChange={e => updateItem(i, { type: e.target.value as AssignmentType })} style={{ width: '100%', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <button onClick={() => setEditingIdx(null)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: Colors.forest, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Done editing</button>
            </div>
          );
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < items.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', background: item.selected ? '#fff' : Colors.background }}>
              <div onClick={() => toggleItem(i)} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${item.selected ? Colors.purple : 'rgba(0,0,0,0.2)'}`, background: item.selected ? Colors.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {item.selected && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleItem(i)}>
                <div style={{ fontSize: 14, fontWeight: 500, color: item.selected ? Colors.textPrimary : Colors.textHint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>{item.dueDate} · {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
              </div>
              {(item.type === 'test' || item.type === 'quiz') && (
                <span style={{ fontSize: 11, fontWeight: 600, color: Colors.red, background: Colors.redLight, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {item.type === 'test' ? 'Test' : 'Quiz'}
                </span>
              )}
              <button onClick={() => setEditingIdx(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: Colors.textHint, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <PencilIcon />
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={() => onDone(items.filter(i => i.selected))} disabled={selectedCount === 0} style={{ width: '100%', padding: 14, borderRadius: 12, background: selectedCount > 0 ? Colors.forest : Colors.grayLight, color: selectedCount > 0 ? '#fff' : Colors.textHint, border: 'none', fontSize: 14, fontWeight: 700, cursor: selectedCount > 0 ? 'pointer' : 'default', fontFamily: 'inherit', marginBottom: 10 }}>
        Save {selectedCount} assignment{selectedCount !== 1 ? 's' : ''}
      </button>
      </div>
    </div>
  );
}

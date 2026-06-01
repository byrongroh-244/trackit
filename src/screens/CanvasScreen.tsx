import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { importFromCanvas } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import { Screen, ScrollBody, SaveButton, Field, TextInput } from '../components/UI';
import { IconCircleCheck, IconArrowLeft } from '../components/Icons';

const CANVAS_DOMAIN_KEY = 'trackit_canvas_domain';
const CANVAS_TOKEN_KEY  = 'trackit_canvas_token';

function loadSaved(): { domain: string; token: string } {
  try {
    return {
      domain: localStorage.getItem(CANVAS_DOMAIN_KEY) ?? '',
      token:  localStorage.getItem(CANVAS_TOKEN_KEY)  ?? '',
    };
  } catch { return { domain: '', token: '' }; }
}
function saveCredentials(domain: string, token: string) {
  try { localStorage.setItem(CANVAS_DOMAIN_KEY, domain); localStorage.setItem(CANVAS_TOKEN_KEY, token); } catch {}
}
function clearCredentials() {
  try { localStorage.removeItem(CANVAS_DOMAIN_KEY); localStorage.removeItem(CANVAS_TOKEN_KEY); } catch {}
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function CanvasScreen() {
  const { courses, navigate, updateCourses, upsertAssignments } = useApp();

  const saved = loadSaved();
  const [domain,   setDomain]   = useState(saved.domain);
  const [token,    setToken]    = useState(saved.token);
  const [status,   setStatus]   = useState<Status>('idle');
  const [message,  setMessage]  = useState('');
  const [imported, setImported] = useState({ courses: 0, assignments: 0 });

  const isReconnecting = !!saved.domain && !!saved.token;

  async function connect() {
    if (!domain.trim() || !token.trim()) {
      setStatus('error'); setMessage('Please enter your Canvas URL and access token.'); return;
    }
    setStatus('loading'); setMessage('');
    try {
      const result = await importFromCanvas(domain.trim(), token.trim(), courses.map(c => c.color), CLASS_COLORS);
      saveCredentials(domain.trim(), token.trim());
      updateCourses([...courses, ...result.courses]);
      upsertAssignments(result.assignments);
      setImported({ courses: result.courses.length, assignments: result.assignments.length });
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message ?? 'Connection failed. Check your URL and token.');
    }
  }

  function disconnect() {
    if (!window.confirm('Remove your saved Canvas credentials? Your imported assignments will stay.')) return;
    clearCredentials(); setDomain(''); setToken(''); setStatus('idle');
  }

  // ── Success state ──
  if (status === 'success') {
    return (
      <Screen>
        <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
          <button onClick={() => navigate('today')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: Colors.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCircleCheck size={36} color="#fff" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: Colors.textPrimary, margin: 0, letterSpacing: '-0.03em' }}>Canvas connected!</h2>
          <p style={{ color: Colors.textSecondary, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Imported {imported.courses} course{imported.courses !== 1 ? 's' : ''} and {imported.assignments} assignment{imported.assignments !== 1 ? 's' : ''}.
          </p>
          <p style={{ color: Colors.textHint, fontSize: 12, margin: 0 }}>
            Your credentials are saved — you won't need to re-enter them.
          </p>
          <SaveButton label="View my assignments" onClick={() => navigate('today')} color={Colors.forest} />
        </div>
      </Screen>
    );
  }

  // ── Loading state ──
  if (status === 'loading') {
    return (
      <Screen>
        <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
          <button onClick={() => navigate('add')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: Colors.textSecondary, fontSize: 15 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: Colors.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={Colors.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </div>
          Connecting to Canvas…
        </div>
      </Screen>
    );
  }

  // ── Main form ──
  return (
    <Screen>
      {/* Dark forest header */}
      <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('add')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
            {isReconnecting ? 'Canvas connected' : 'Connect Canvas'}
          </div>
        </div>
      </div>

      <ScrollBody>
        <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: Colors.tealLight, border: '1.5px solid #E3EBEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={Colors.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          </div>

          <p style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 1.55, margin: 0 }}>
            {isReconnecting
              ? 'Re-sync to import the latest assignments from Canvas.'
              : 'Import all your courses and assignments automatically.'}
          </p>

          {/* Saved connection badge */}
          {isReconnecting && (
            <div style={{ background: Colors.tealLight, border: '1.5px solid #E3EBEA', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: Colors.tealDark }}>Saved connection</div>
                <div style={{ fontSize: 12, color: Colors.teal, marginTop: 2 }}>{domain}</div>
              </div>
              <button onClick={disconnect} style={{ background: 'none', border: 'none', fontSize: 12, color: Colors.red, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Disconnect
              </button>
            </div>
          )}

          {/* How-to steps */}
          {!isReconnecting && (
            <div style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: Colors.textPrimary, marginBottom: 14, letterSpacing: '-0.01em' }}>
                How to get your Canvas token
              </div>
              {[
                'Open Canvas and go to Account → Settings',
                'Scroll to "Approved Integrations" and click "+ New Access Token"',
                'Name it "TrackIt" and copy the token shown',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5, flex: 1, paddingTop: 2 }}>{step}</div>
                </div>
              ))}
            </div>
          )}

          <Field label="Canvas URL">
            <TextInput
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="university.instructure.com"
              autoCapitalize="none"
            />
          </Field>

          <Field label="Access token">
            <TextInput
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={isReconnecting ? '••••••••••••••••' : 'Paste your token here'}
            />
          </Field>

          {status === 'error' && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: Colors.redLight, border: `1px solid ${Colors.red}30`, fontSize: 13, color: Colors.red, lineHeight: 1.5 }}>
              {message}
            </div>
          )}

          <SaveButton
            label={isReconnecting ? 'Re-sync Canvas' : 'Connect Canvas'}
            onClick={connect}
            color={Colors.forest}
          />

          <p style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            Your token is saved locally on this device and never sent to our servers.
          </p>
        </div>
      </ScrollBody>
    </Screen>
  );
}

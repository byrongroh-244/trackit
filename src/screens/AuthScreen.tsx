import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme';
import TrackItLogo from '../components/TrackItLogo';

type Mode = 'login' | 'signup' | 'forgot';

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
);

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode,     setMode]     = useState<Mode>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [message,  setMessage]  = useState('');

  async function handleSubmit() {
    if (!email.trim() || (!password.trim() && mode !== 'forgot')) {
      setStatus('error'); setMessage('Please fill in all fields.'); return;
    }
    setStatus('loading'); setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setStatus('error'); setMessage(error.message); }
      else { setStatus('success'); /* auth state update handled by onAuthStateChange in useApp */ }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: 'https://byrongroh-244.github.io/trackit' },
      });
      if (error) { setStatus('error'); setMessage(error.message); }
      else {
        setStatus('success');
        setMessage('Account created! Check your email to confirm, then log in.');
        setMode('login'); setPassword('');
      }
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://byrongroh-244.github.io/trackit',
      });
      if (error) { setStatus('error'); setMessage(error.message); }
      else { setStatus('success'); setMessage('Password reset email sent. Check your inbox.'); }
    }
  }

  function switchMode(m: Mode) {
    setMode(m); setMessage(''); setStatus('idle'); setPassword(''); setShowPass(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 15,
    padding: '13px 14px', borderRadius: 12,
    border: '1.5px solid #E3EBEA',
    outline: 'none', fontFamily: 'inherit',
    color: Colors.textPrimary, background: '#fff',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  const titles: Record<Mode, string> = {
    login:  'Sign in',
    signup: 'Create account',
    forgot: 'Reset password',
  };
  const subs: Record<Mode, string> = {
    login:  'Welcome back',
    signup: 'Start tracking smarter',
    forgot: 'We\'ll email you a reset link',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: Colors.forest,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Logo mark */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <TrackItLogo size={68} style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.04em' }}>TrackIt</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {subs[mode]}
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 24,
        border: '1.5px solid #E3EBEA',
        padding: '28px 24px', width: '100%', maxWidth: 390,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
          {titles[mode]}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Email</label>
            <input
              autoFocus type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@university.edu"
              style={inputStyle}
              autoCapitalize="none" autoCorrect="off"
            />
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  style={{ ...inputStyle, paddingRight: 46 }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: Colors.textHint, display: 'flex', alignItems: 'center' }}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>
          )}

          {/* Message banner */}
          {message && (
            <div
              role="alert"
              style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                background: status === 'error' ? Colors.redLight : '#D9F5E5',
                color: status === 'error' ? Colors.red : '#145C38',
                border: `1px solid ${status === 'error' ? Colors.red + '30' : '#1E8A5530'}`,
              }}>
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={status === 'loading'}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 12, border: 'none',
              background: status === 'loading' ? Colors.grayLight : Colors.forest,
              color: status === 'loading' ? Colors.textHint : '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: status === 'loading' ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            {status === 'loading' ? 'Please wait…' :
             mode === 'login'  ? 'Sign in'        :
             mode === 'signup' ? 'Create account'  :
             'Send reset email'}
          </button>
        </div>

        {/* Mode switcher */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('forgot')}
                style={{ background: 'none', border: 'none', fontSize: 13, color: Colors.textHint, cursor: 'pointer', fontFamily: 'inherit' }}>
                Forgot password?
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: Colors.textSecondary }}>Don't have an account?</span>
                <button onClick={() => switchMode('signup')}
                  style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: Colors.forest, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Sign up
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: Colors.textSecondary }}>Already have an account?</span>
              <button onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: Colors.forest, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign in
              </button>
            </div>
          )}
          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', fontSize: 13, color: Colors.forest, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              ← Back to sign in
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 20, textAlign: 'center', lineHeight: 1.5 }}>
        Your data is private and stored securely.
      </p>
    </div>
  );
}

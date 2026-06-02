import { useState } from 'react';
import { Colors } from '../theme';
import TrackItLogo from '../components/TrackItLogo';

interface Props {
  onAccept: () => void;
}

const SECTIONS = [
  {
    title: 'What TrackIt does',
    body: `TrackIt is an AI-assisted assignment tracking tool designed to help students — particularly those with learning differences — organize schoolwork, manage deadlines, and break assignments into manageable steps. It is intended as a productivity aid, not a substitute for professional educational, medical, or therapeutic support.`,
  },
  {
    title: 'Who can use TrackIt',
    body: `TrackIt is designed for students in grades 9–12 and post-secondary education. Students under 13 must have verifiable parental consent before creating an account. By creating an account, you confirm you meet this requirement or that a parent or guardian has authorized your use.`,
  },
  {
    title: 'Data we collect and store',
    body: `TrackIt stores your email address, assignment and course data you enter or import, and app preferences. If you connect Canvas, your Canvas access token is stored locally on your device and is never sent to our servers. AI-generated micro-steps are created using your assignment name and due date — no other personal information is transmitted to AI providers.`,
  },
  {
    title: 'AI-generated content disclaimer',
    body: `TrackIt uses artificial intelligence to generate suggested assignment steps and strategies. These suggestions are provided for organizational purposes only. They may be incomplete, inaccurate, or inappropriate for your specific assignment. Always verify AI-generated content with your teacher or course materials. TrackIt and its developers accept no responsibility for academic outcomes based on AI-generated suggestions.`,
  },
  {
    title: 'Canvas integration',
    body: `When you connect Canvas, TrackIt imports your course and assignment data using your personal access token. This token grants read access to your Canvas account. You may disconnect at any time from the Settings page. TrackIt does not modify, submit, or interact with assignments on your behalf.`,
  },
  {
    title: 'Educational disclaimer',
    body: `TrackIt is not a licensed educational service, special education provider, or therapeutic tool. It does not constitute an Individualized Education Program (IEP), 504 Plan accommodation, or medical advice. Students with identified disabilities should continue to work with their school-based support teams. TrackIt is a supplemental organizational tool only.`,
  },
  {
    title: 'Data security',
    body: `Your data is stored in Supabase, a third-party database provider, with row-level security enabled so only you can access your records. We use industry-standard encryption in transit (HTTPS). No data is sold or shared with third parties for advertising purposes. We recommend not entering sensitive personal information beyond what is necessary for assignment tracking.`,
  },
  {
    title: 'Your rights',
    body: `You may delete your account and all associated data at any time from the Settings page. You may export your assignment data by contacting us. If you are a student covered under FERPA, you retain rights over your educational records as defined by applicable law. Parents of minor students may request data access or deletion on their child's behalf.`,
  },
  {
    title: 'Changes to these terms',
    body: `We may update these terms as TrackIt evolves. You will be notified and asked to re-accept updated terms before continuing to use the app. Continued use after acceptance constitutes agreement to the updated terms.`,
  },
  {
    title: 'Contact',
    body: `Questions about these terms or your data? Contact us at support@trackit.app. For urgent data or privacy concerns, we will respond within 5 business days.`,
  },
];

export default function TermsScreen({ onAccept }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked,          setChecked]          = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (atBottom) setScrolledToBottom(true);
  }

  const canAccept = scrolledToBottom && checked;

  return (
    <div style={{
      minHeight: '100vh',
      background: Colors.forest,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 0 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '0 24px' }}>
        <TrackItLogo size={52} style={{ margin: '0 auto 14px' }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.04em' }}>
          Before you continue
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 500 }}>
          Please read and accept our Terms of Use
        </p>
      </div>

      {/* Scrollable card */}
      <div style={{
        flex: 1,
        width: '100%', maxWidth: 430,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Scroll hint */}
        {!scrolledToBottom && (
          <div style={{
            textAlign: 'center', padding: '10px 0 6px',
            fontSize: 11, fontWeight: 600, color: Colors.textHint,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            borderBottom: '0.5px solid #E3EBEA',
          }}>
            Scroll to read all terms
          </div>
        )}

        {/* Terms content */}
        <div
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px', WebkitOverflowScrolling: 'touch' as any }}
        >
          {/* Effective date */}
          <p style={{ fontSize: 11, fontWeight: 600, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
            Effective June 1, 2026 · Version 1.0
          </p>

          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {i + 1}. {s.title}
              </h2>
              <p style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.65, margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}

          {/* Disclaimer box */}
          <div style={{ background: '#FEF0DC', borderRadius: 14, border: '1.5px solid #B86B1228', padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7A4608', marginBottom: 6 }}>Important disclaimer</div>
            <p style={{ fontSize: 12, color: '#956010', lineHeight: 1.6, margin: 0 }}>
              TrackIt is provided "as is" without warranty of any kind. We are not liable for missed deadlines, academic consequences, or any harm arising from use or inability to use this app. Always maintain your own records and communicate directly with your instructors.
            </p>
          </div>

          <div style={{ height: 8 }} />
        </div>

        {/* Footer — accept */}
        <div style={{
          padding: '16px 24px',
          borderTop: '0.5px solid #E3EBEA',
          background: '#fff',
          flexShrink: 0,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}>
          {/* Checkbox */}
          <div
            onClick={() => setChecked(v => !v)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, cursor: 'pointer' }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${checked ? Colors.forest : 'rgba(0,0,0,0.2)'}`,
              background: checked ? Colors.forest : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {checked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <p style={{ fontSize: 13, color: Colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              I have read and agree to the TrackIt Terms of Use, including the AI content disclaimer and data storage practices.
            </p>
          </div>

          {/* Accept button */}
          <button
            onClick={canAccept ? onAccept : undefined}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: canAccept ? Colors.forest : Colors.grayLight,
              color: canAccept ? '#fff' : Colors.textHint,
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
              cursor: canAccept ? 'pointer' : 'default',
              fontFamily: 'inherit',
              transition: 'background 0.2s, color 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {canAccept ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                I agree — continue to TrackIt
              </>
            ) : (
              scrolledToBottom ? 'Check the box to continue' : 'Scroll to read all terms'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

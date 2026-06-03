import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './hooks/useApp';
import TrackItLogo from './components/TrackItLogo';

// ── Eager — shown immediately on load ────────────────────────────────────────
import AuthScreen       from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import TodayScreen      from './screens/TodayScreen';
import TermsScreen      from './screens/TermsScreen';

// ── Lazy — split into separate chunks, loaded on first visit ─────────────────
const AddScreen      = lazy(() => import('./screens/AddScreen'));
const ClassesScreen  = lazy(() => import('./screens/ClassesScreen'));
const DetailScreen   = lazy(() => import('./screens/DetailScreen'));
const CanvasScreen   = lazy(() => import('./screens/CanvasScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const CalendarScreen = lazy(() => import('./screens/CalendarScreen'));
const ScheduleScreen = lazy(() => import('./screens/ScheduleScreen'));

// ── Minimal screen-level loading fallback ────────────────────────────────────
function ScreenFallback() {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F7F6', minHeight: '100vh',
    }}>
      <TrackItLogo size={48} style={{ opacity: 0.5 }} />
    </div>
  );
}

function Router() {
  const { screen, settings, navigate, updateSettings, authed, loading } = useApp();

  // Auth not yet resolved — show splash
  if (authed === null || (authed && loading)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c4a4f' }}>
        <TrackItLogo size={64} />
      </div>
    );
  }

  // Not logged in
  if (!authed) return <AuthScreen onAuth={() => {/* handled by onAuthStateChange in useApp */}} />;

  // Needs terms acceptance
  if (!settings.termsAccepted) {
    return (
      <TermsScreen
        onAccept={() => updateSettings({ ...settings, termsAccepted: true })}
      />
    );
  }

  // Needs onboarding
  if (!settings.onboardingComplete) {
    return <OnboardingScreen onComplete={() => navigate('today')} />;
  }

  // New semester
  if (screen === 'onboarding') {
    return <OnboardingScreen isNewSemester onComplete={() => navigate('today')} />;
  }

  // Main app — lazy screens wrapped in Suspense
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: '100vh',
      background: '#fff', display: 'flex', flexDirection: 'column',
      position: 'relative',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      {screen === 'today' && <TodayScreen />}
      <Suspense fallback={<ScreenFallback />}>
        {screen === 'add'      && <AddScreen />}
        {screen === 'classes'  && <ClassesScreen />}
        {screen === 'detail'   && <DetailScreen />}
        {screen === 'canvas'   && <CanvasScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'calendar' && <CalendarScreen />}
        {screen === 'schedule' && <ScheduleScreen />}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}

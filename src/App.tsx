import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AppProvider, useApp } from './hooks/useApp';
import AuthScreen      from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import TodayScreen     from './screens/TodayScreen';
import AddScreen       from './screens/AddScreen';
import ClassesScreen   from './screens/ClassesScreen';
import DetailScreen    from './screens/DetailScreen';
import CanvasScreen    from './screens/CanvasScreen';
import SettingsScreen  from './screens/SettingsScreen';
import CalendarScreen  from './screens/CalendarScreen';

function Router() {
  const { screen, settings, updateSettings, navigate } = useApp();
  const [authed,  setAuthed]  = useState<boolean | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setAuthed(false), 4000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setAuthed(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  // Loading
  if (authed === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F4EE' }}>
        <div style={{ fontSize: 14, color: '#9B9A94' }}>Loading…</div>
      </div>
    );
  }

  // Not logged in
  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  // Needs onboarding
  if (!settings.onboardingComplete) {
  return (
    <OnboardingScreen
      onComplete={() => navigate('today')}
    />
  );
}

  // New semester onboarding triggered from settings
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        isNewSemester
        onComplete={() => navigate('today')}
      />
    );
  }

  // Main app
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
      {screen === 'today'    && <TodayScreen />}
      {screen === 'add'      && <AddScreen />}
      {screen === 'classes'  && <ClassesScreen />}
      {screen === 'detail'   && <DetailScreen />}
      {screen === 'canvas'   && <CanvasScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'calendar' && <CalendarScreen />}
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

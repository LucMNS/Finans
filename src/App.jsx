import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true);
    });

    return () => subscription.unsubscribe();
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen transition-colors duration-500">
      {(!session || isRecovering) ? (
        <Login 
          modeOverride={isRecovering ? 'update' : null} 
          onFinishedUpdate={() => setIsRecovering(false)}
        />
      ) : (
        <Dashboard 
          userName={session.user.user_metadata?.display_name || session.user.email.split('@')[0]} 
          toggleDarkMode={toggleDarkMode} 
          isDarkMode={isDarkMode}
          onLogout={() => supabase.auth.signOut()} 
        />
      )}
    </div>
  );
}

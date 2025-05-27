// src/App.tsx
import { useState, useEffect } from 'react';
import { LineChart, BookOpen, Home, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import MoodTracker from './components/MoodTracker';
import Journal from './components/Journal';
import Dashboard from './components/Dashboard';
import SettingsPanel from './components/Settings';
import Login from './components/Login';
import NewJournalEntry from './components/NewJournalEntry';
import FamilyRegisterPage from './components/FamilyRegisterPage';
import MoodTrackerAlert from './components/MoodTrackerAlert';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, signOut } = useAuth();
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  const [showMoodAlert, setShowMoodAlert] = useState(false);
  const [moodChecked, setMoodChecked] = useState(false);

  // Função para verificar se o usuário já registrou humor hoje
  useEffect(() => {
    const checkTodayMoodEntry = async () => {
      if (!user) return;
      
      try {
        // Formato da data atual para comparação (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('entry_date', today)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao verificar registro de humor:', error);
          return;
        }
        
        // Se não há registro para hoje, mostrar o alerta
        setShowMoodAlert(!data);
        setMoodChecked(true);
      } catch (err) {
        console.error('Erro ao verificar histórico de humor:', err);
      }
    };
    
    if (user && !moodChecked) {
      checkTodayMoodEntry();
    }
  }, [user, moodChecked]);

  // Resetar o estado quando o usuário faz logout
  useEffect(() => {
    if (!user) {
      setMoodChecked(false);
      setShowMoodAlert(false);
    }
  }, [user]);
  
  const handleNewJournalEntry = () => setActiveTab('new-journal-entry');

  const handleBackToJournal = () => {
    setJournalRefreshKey(prevKey => prevKey + 1);
    setActiveTab('journal');
  };

  const handleNavigateToMood = () => {
    setActiveTab('mood');
    setShowMoodAlert(false);
  };

  const handleNavigate = (screen: string) => setActiveTab(screen);
  const handleBackToSettings = () => setActiveTab('settings');

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-gradient-to-r from-blue-400 via-blue-500 to-brand shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">Equilibrius</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/90">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="text-white/80 hover:text-white hover:underline transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Alerta para registrar humor */}
      {showMoodAlert && <MoodTrackerAlert onOpenMoodTracker={handleNavigateToMood} />}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard onNewEntry={handleNewJournalEntry} />}
        {activeTab === 'mood' && <MoodTracker onNewEntry={handleNewJournalEntry} />}
        {activeTab === 'journal' && (
          <Journal
            onNewEntry={handleNewJournalEntry}
            key={journalRefreshKey} // Usar a chave aqui ou passar como prop
          />
        )}
        {activeTab === 'settings' && <SettingsPanel onNavigate={handleNavigate} />}
        {activeTab === 'new-journal-entry' && (
          <NewJournalEntry userId={user.id} onSave={handleBackToJournal} />
        )}
        {activeTab === 'family-register' && (
          <FamilyRegisterPage onBack={handleBackToSettings} />
        )}
      </main>

      {/* Footer (mantido como está) ... */}
      <footer className="fixed bottom-0 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-brand shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-3 relative">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center relative z-10 px-6 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'text-white bg-gradient-to-b from-white/20 to-transparent shadow-lg scale-110 font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home size={activeTab === 'dashboard' ? 26 : 24} className="transition-all duration-200" />
              <span className="text-sm mt-1">Início</span>
              {activeTab === 'dashboard' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('mood')}
              className={`flex flex-col items-center relative z-10 px-6 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'mood'
                  ? 'text-white bg-gradient-to-b from-white/20 to-transparent shadow-lg scale-110 font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <LineChart size={activeTab === 'mood' ? 26 : 24} className="transition-all duration-200" />
              <span className="text-sm mt-1">Humor</span>
              {activeTab === 'mood' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex flex-col items-center relative z-10 px-6 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'journal'
                  ? 'text-white bg-gradient-to-b from-white/20 to-transparent shadow-lg scale-110 font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen size={activeTab === 'journal' ? 26 : 24} className="transition-all duration-200" />
              <span className="text-sm mt-1">Diário</span>
              {activeTab === 'journal' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center relative z-10 px-6 py-1 rounded-lg transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'text-white bg-gradient-to-b from-white/20 to-transparent shadow-lg scale-110 font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <SettingsIcon size={activeTab === 'settings' ? 26 : 24} className="transition-all duration-200" />
              <span className="text-sm mt-1">Configurações</span>
              {activeTab === 'settings' && (
                <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
// src/components/MoodTracker.tsx
import { useState, useEffect } from 'react';
import { BookOpen, Calendar, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import 'react-datepicker/dist/react-datepicker.css';

const moods = [1, 2, 3, 4, 5];

interface MoodEntry {
  id: string;
  user_id: string;
  mood_value: number;
  note?: string;
  entry_date: string; // YYYY-MM-DD string from database
  created_at: string;
  updated_at: string;
}

interface MoodTrackerProps {
  onNewEntry?: () => void;
}

const MoodTracker = ({ onNewEntry }: MoodTrackerProps = {}) => {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEntrySavedForSelectedDate, setIsEntrySavedForSelectedDate] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // Para feedback ao usuário

  const formatDateForSupabase = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (user) {
      fetchMoodHistory();
    } else {
      // Se o usuário deslogar, limpa o estado relacionado ao usuário
      setMoodHistory([]);
      setSelectedMood(null);
      setIsEntrySavedForSelectedDate(false);
    }
  }, [user]);

  useEffect(() => {
    if (moodHistory.length > 0) {
      const entryForSelectedDate = moodHistory.find(entry =>
        isSameDay(parseISO(entry.entry_date), selectedDate)
      );

      if (entryForSelectedDate) {
        setSelectedMood(entryForSelectedDate.mood_value);
        setIsEntrySavedForSelectedDate(true);
      } else {
        setSelectedMood(null);
        setIsEntrySavedForSelectedDate(false);
      }
    } else {
      setSelectedMood(null);
      setIsEntrySavedForSelectedDate(false);
    }
    // Limpar feedback ao mudar a data ou histórico
    setFeedbackMessage(null);
  }, [selectedDate, moodHistory]);

  const fetchMoodHistory = async () => {
    if (!user) return;
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setMoodHistory(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de humor:', err);
      setMoodHistory([]);
      setFeedbackMessage(`Erro ao carregar histórico: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveMoodEntry = async () => {
    if (!selectedMood || !user) return;

    setLoading(true);
    setFeedbackMessage(null);
    const formattedEntryDate = formatDateForSupabase(selectedDate);

    try {
      // Verificar se já existe um registro para user_id e entry_date
      const { data: existingEntries, error: fetchError } = await supabase
        .from('mood_entries')
        .select('id') // Selecionamos 'id' para usar no update
        .eq('user_id', user.id)
        .eq('entry_date', formattedEntryDate)
        .limit(1); // Buscamos no máximo 1 registro

      if (fetchError) {
        throw fetchError; // Lança o erro para ser pego pelo catch
      }

      let operationSuccessful = false;

      if (existingEntries && existingEntries.length > 0) {
        // Registro existente encontrado
        const existingEntry = existingEntries[0];
        const { error: updateError } = await supabase
          .from('mood_entries')
          .update({ mood_value: selectedMood })
          .eq('id', existingEntry.id);

        if (updateError) throw updateError;
        setFeedbackMessage('Humor atualizado com sucesso!');
        operationSuccessful = true;
      } else {
        // Nenhum registro existente, criar novo registro
        const { error: insertError } = await supabase
          .from('mood_entries')
          .insert([{
            user_id: user.id,
            mood_value: selectedMood,
            entry_date: formattedEntryDate,
          }]);

        if (insertError) throw insertError;
        setFeedbackMessage('Humor salvo com sucesso!');
        operationSuccessful = true;
      }

      if (operationSuccessful) {
        await fetchMoodHistory(); // Re-busca para refletir a mudança
        setIsEntrySavedForSelectedDate(true);
      }

    } catch (err: any) {
      console.error('Erro ao salvar humor:', err);
      setFeedbackMessage(`Erro ao salvar: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = () => {
    return isSameDay(selectedDate, new Date())
      ? 'Hoje'
      : format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
    setIsCalendarOpen(false);
  };

  const resetToToday = () => {
    setSelectedDate(new Date());
  };

  const canSave = selectedMood !== null;

  return (
    <div className="space-y-8">
      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`p-3 rounded-md text-sm mb-4 ${feedbackMessage.startsWith('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {feedbackMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Humor {isSameDay(selectedDate, new Date()) ? 'de Hoje' : `do dia ${format(selectedDate, 'dd/MM')}`}
          </h2>

          <div className="relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar size={16} className="text-blue-500" />
              <span className="text-sm">{formatDisplayDate()}</span>
              {!isSameDay(selectedDate, new Date()) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetToToday();
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </button>

            {isCalendarOpen && (
              <div className="absolute z-20 mt-1 right-0 bg-white shadow-xl rounded-lg border border-gray-200 p-1">
                <div className="p-2 border-b border-gray-100 mb-1">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Selecione uma data</h4>
                  <p className="text-xs text-gray-500">Veja ou registre seu humor em dias anteriores</p>
                </div>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  locale={ptBR}
                  maxDate={new Date()}
                  dayClassName={(date: Date): string => {
                    const hasEntry = moodHistory.some(entry =>
                      isSameDay(parseISO(entry.entry_date), date)
                    );
                    const isCurrentlySelected = isSameDay(date, selectedDate);

                    if (isCurrentlySelected) {
                      return "bg-blue-500 text-white rounded-full";
                    } else if (hasEntry) {
                      return "bg-blue-100 text-blue-800 rounded-full font-medium";
                    }
                    return "hover:bg-gray-100 rounded-full";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center max-w-xl mx-auto">
          {moods.map((value) => {
            const isActive = selectedMood === value;
            return (
              <button
                key={value}
                onClick={() => setSelectedMood(value)}
                className={`flex flex-col items-center focus:outline-none transition-transform ${isActive ? 'scale-110' : 'opacity-80 hover:scale-105'}`}
                aria-label={`Humor ${value}`}
              >
                <span className={`rounded-full w-14 h-14 flex items-center justify-center border text-xl font-bold ${isActive ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'} mb-2 transition-colors duration-200`}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>
        {selectedMood ? (
          <div className="mt-6 text-center space-y-4">
            <div className="flex flex-col items-center">
              <span className="inline-block px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-medium mb-2">
                Seu humor {isSameDay(selectedDate, new Date()) ? 'hoje' : 'neste dia'}: {selectedMood}
              </span>

              {canSave && (
                 <button
                    onClick={saveMoodEntry}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : (isEntrySavedForSelectedDate ? 'Atualizar registro' : 'Salvar registro')}
                  </button>
              )}
            </div>

            {(selectedMood === 1 || selectedMood === 2) && onNewEntry && isSameDay(selectedDate, new Date()) && (
              <div className="animate-fadeIn">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4 text-left">
                  <p className="text-blue-800 mb-2">Parece que você não está se sentindo muito bem hoje.</p>
                  <p className="text-blue-700 text-sm">Escrever sobre seus sentimentos pode ajudar a processá-los melhor.</p>
                </div>
                <button
                  onClick={onNewEntry}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 mx-auto shadow-sm"
                >
                  <BookOpen size={18} />
                  <span>Escrever no Diário</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-gray-500">
              {isSameDay(selectedDate, new Date())
                ? 'Selecione seu humor para hoje'
                : 'Nenhum registro de humor para esta data. Selecione para adicionar.'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Histórico Recente (últimos 14 dias com registro)</h3>
        {loading && moodHistory.length === 0 ? <p className="text-gray-500">Carregando histórico...</p> : null}
        {!loading && moodHistory.length > 0 ? (
          <div className="overflow-hidden">
            <div className="flex overflow-x-auto pb-4 -mx-2 px-2">
              <div className="flex space-x-2">
                {moodHistory.slice(0, 14).map((entry) => {
                  const entryDateObject = parseISO(entry.entry_date);
                  const isHistorySelected = isSameDay(entryDateObject, selectedDate);

                  const getColorClass = (value: number) => {
                    switch(value) {
                      case 1: return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
                      case 2: return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
                      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
                      case 4: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
                      case 5: return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
                      default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
                    }
                  };

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedDate(entryDateObject)}
                      className={`flex flex-col items-center min-w-16 p-2 rounded-lg border transition-all ${isHistorySelected ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'} ${getColorClass(entry.mood_value)}`}
                    >
                      <span className="text-xl font-bold">{entry.mood_value}</span>
                      <span className="text-xs whitespace-nowrap">
                        {isSameDay(entryDateObject, new Date()) ? 'Hoje' : format(entryDateObject, 'dd/MM', { locale: ptBR })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-right mt-2">
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
              >
                <Calendar size={14} className="mr-1" />
                <span>Ver calendário completo</span>
              </button>
            </div>
          </div>
        ) : (
          !loading && <div className="h-32 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Nenhum registro de humor encontrado ainda.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Insights (Em Breve)</h3>
        <p className="text-gray-500">Em breve, você verá insights baseados no seu histórico de humor.</p>
      </div>
    </div>
  );
};

export default MoodTracker;
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

  // Função para definir estilos dos botões de humor baseado no valor (1-5)
  const getMoodButtonStyles = (value: number, isActive: boolean): string => {
    // Define as cores do espectro do vermelho ao verde com cores mais vivas
    const moodColors = {
      1: { // Muito ruim - Vermelho
        active: 'bg-red-600 text-white shadow-md ring-2 ring-red-700',
        inactive: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md'
      },
      2: { // Ruim - Laranja/âmbar
        active: 'bg-orange-500 text-white shadow-md ring-2 ring-orange-600',
        inactive: 'bg-orange-400 text-white hover:bg-orange-500 hover:shadow-md'
      },
      3: { // Neutro - Amarelo
        active: 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-600',
        inactive: 'bg-yellow-400 text-white hover:bg-yellow-500 hover:shadow-md'
      },
      4: { // Bom - Azul claro
        active: 'bg-blue-500 text-white shadow-md ring-2 ring-blue-600',
        inactive: 'bg-blue-400 text-white hover:bg-blue-500 hover:shadow-md'
      },
      5: { // Muito bom - Verde
        active: 'bg-green-600 text-white shadow-md ring-2 ring-green-700',
        inactive: 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
      }
    };
    
    return isActive ? moodColors[value as keyof typeof moodColors].active : moodColors[value as keyof typeof moodColors].inactive;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`p-3 rounded-md text-sm mb-4 ${feedbackMessage.startsWith('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {feedbackMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 transition-all hover:shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-brand">
            Humor {isSameDay(selectedDate, new Date()) ? 'de Hoje' : `do dia ${format(selectedDate, 'dd/MM')}`}
          </h2>

          {/* Mostrar o botão de calendário apenas quando não estiver visualizando o humor de hoje */}
          {!isSameDay(selectedDate, new Date()) && (
            <div className="relative">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Calendar size={16} className="text-blue-500" />
                <span className="text-sm">{formatDisplayDate()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetToToday();
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
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
          )}
        </div>

        <div className="flex justify-between items-center max-w-xl mx-auto my-8">
          {moods.map((value) => {
            const isActive = selectedMood === value;
            return (
              <button
                key={value}
                onClick={() => setSelectedMood(value)}
                className={`flex flex-col items-center focus:outline-none transition-all duration-300 ${isActive ? 'scale-115 -translate-y-2' : 'opacity-85 hover:scale-110 hover:-translate-y-1'}`}
                aria-label={`Humor ${value}`}
              >
                <span className={`
                  rounded-full 
                  w-16 h-16 
                  flex items-center justify-center 
                  text-2xl font-bold 
                  mb-2 
                  transition-all duration-300 
                  ${getMoodButtonStyles(value, isActive)} 
                  ${isActive ? 'shadow-xl' : 'shadow-md hover:shadow-lg'}
                `}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>
        {selectedMood ? (
          <div className="mt-8 text-center space-y-6">
            <div className="flex flex-col items-center">
              {/* Estilizando a exibição do humor selecionado baseado na cor do humor */}
              <div className={`
                inline-flex items-center gap-3 
                px-6 py-3 rounded-xl 
                ${selectedMood === 1 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                  selectedMood === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' :
                  selectedMood === 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                  selectedMood === 4 ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                  'bg-gradient-to-r from-green-500 to-green-600 text-white'
                }
                shadow-md mb-4 font-medium
              `}>
                <span className="text-xl">{selectedMood === 1 ? '😞' : 
                  selectedMood === 2 ? '😐' :
                  selectedMood === 3 ? '😊' :
                  selectedMood === 4 ? '😄' : '😁'}</span>
                <span className="font-bold">
                  Seu humor {isSameDay(selectedDate, new Date()) ? 'hoje' : 'neste dia'}: {selectedMood}
                </span>
              </div>

              {canSave && (
                <button
                  onClick={saveMoodEntry}
                  disabled={loading}
                  className="
                    mt-2 px-5 py-2 
                    bg-white border border-blue-500 
                    text-blue-600 rounded-full 
                    hover:bg-blue-50 hover:shadow-md 
                    transition-all duration-200 
                    font-medium disabled:opacity-50
                  "
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando
                    </span>
                  ) : (
                    isEntrySavedForSelectedDate ? 'Atualizar registro' : 'Salvar registro'
                  )}
                </button>
              )}
            </div>

            {(selectedMood === 1 || selectedMood === 2) && onNewEntry && isSameDay(selectedDate, new Date()) && (
              <div className="animate-fadeIn mt-8 max-w-lg mx-auto">
                {/* Box com sombra mais pronunciada e borda mais visível */}
                <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-300 mb-6 text-left shadow-lg transform hover:scale-[1.02] transition-all">
                  <h3 className="text-blue-800 font-bold mb-3 text-lg">Parece que você não está se sentindo muito bem hoje.</h3>
                  <p className="text-blue-700">Escrever sobre seus sentimentos pode ajudar a processá-los melhor.</p>
                </div>
                
                {/* Botão maior, mais destacado e com efeito de hover melhorado */}
                <button
                  onClick={onNewEntry}
                  className="bg-blue-500 text-white px-8 py-4 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center space-x-3 mx-auto shadow-lg font-medium text-lg transform hover:scale-105 hover:shadow-xl"
                >
                  <BookOpen size={22} />
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
              <div className="flex space-x-4">
                {moodHistory.slice(0, 14).map((entry) => {
                  const entryDateObject = parseISO(entry.entry_date);
                  const isHistorySelected = isSameDay(entryDateObject, selectedDate);
                  
                  // Função para cores de fundo e texto que correspondem às cores dos botões de humor
                  const getColorClasses = (value: number) => {
                    switch(value) {
                      case 1: return 'bg-red-500 text-white'; // Vermelho
                      case 2: return 'bg-orange-400 text-white'; // Laranja
                      case 3: return 'bg-yellow-400 text-white'; // Amarelo
                      case 4: return 'bg-blue-400 text-white'; // Azul
                      case 5: return 'bg-green-500 text-white'; // Verde
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };
                  
                  // Função para cores das bordas que correspondem às cores dos botões de humor
                  const getBorderColorClass = (value: number) => {
                    switch(value) {
                      case 1: return 'border-red-700'; // Vermelho
                      case 2: return 'border-orange-600'; // Laranja
                      case 3: return 'border-yellow-600'; // Amarelo
                      case 4: return 'border-blue-600'; // Azul
                      case 5: return 'border-green-700'; // Verde
                      default: return 'border-gray-400';
                    }
                  };

                  // Usando uma abordagem mais simples e robusta
                  return (
                    <div key={entry.id} className="relative m-1">
                      {/* Borda destacada para o estado selecionado com cor correspondente ao humor */}
                      {isHistorySelected && (
                        <div className={`absolute inset-0 border-2 rounded-lg z-0 ${getBorderColorClass(entry.mood_value)}`} style={{margin: '-3px'}}></div>
                      )}
                      {/* Botão principal */}
                      <button
                        onClick={() => setSelectedDate(entryDateObject)}
                        className={`
                          relative z-10
                          flex flex-col items-center justify-center
                          min-w-16
                          p-3
                          rounded-lg
                          border-2 ${isHistorySelected ? 'border-transparent' : 'border-gray-200'}
                          ${getColorClasses(entry.mood_value)}
                          ${isHistorySelected ? 'scale-105' : `hover:${getBorderColorClass(entry.mood_value)}`}
                          transition-all
                        `}
                      >
                        <span className="text-xl font-bold">{entry.mood_value}</span>
                        <span className="text-xs whitespace-nowrap">
                          {isSameDay(entryDateObject, new Date()) ? 'Hoje' : format(entryDateObject, 'dd/MM', { locale: ptBR })}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Botão de calendário removido */}
          </div>
        ) : (
          !loading && <div className="h-32 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Nenhum registro de humor encontrado ainda.</p>
          </div>
        )}
      </div>

      {/* Seção de Insights removida */}
    </div>
  );
};

export default MoodTracker;
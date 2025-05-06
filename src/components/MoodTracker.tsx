

import { useState, useEffect } from 'react';
import { BookOpen, Calendar, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import 'react-datepicker/dist/react-datepicker.css';

const moods = [1, 2, 3, 4, 5];

interface MoodEntry {
  id: string;
  user_id: string;
  mood_value: number;
  created_at: string;
  note?: string;
}

interface MoodTrackerProps {
  onNewEntry?: () => void;
}

const MoodTracker = ({ onNewEntry }: MoodTrackerProps = {}) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedToday, setSavedToday] = useState(false);
  
  // Buscar histórico de humor
  useEffect(() => {
    if (user) {
      fetchMoodHistory();
    }
  }, [user]);
  
  // Verificar se já existe um registro para a data selecionada
  useEffect(() => {
    if (selectedDate && moodHistory.length > 0) {
      const entryForSelectedDate = moodHistory.find(entry => 
        isSameDay(new Date(entry.created_at), selectedDate)
      );
      
      if (entryForSelectedDate) {
        setSelected(entryForSelectedDate.mood_value);
        setSavedToday(isSameDay(new Date(entryForSelectedDate.created_at), new Date()));
      } else {
        setSelected(null);
        setSavedToday(false);
      }
    }
  }, [selectedDate, moodHistory]);
  
  const fetchMoodHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setMoodHistory(data || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de humor:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const saveMoodEntry = async () => {
    if (!selected || !user || !selectedDate) return;
    
    setLoading(true);
    try {
      // Verificar se já existe um registro para a data selecionada
      const existingEntry = moodHistory.find(entry => 
        isSameDay(new Date(entry.created_at), selectedDate)
      );
      
      if (existingEntry) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('mood_entries')
          .update({ mood_value: selected })
          .eq('id', existingEntry.id);
          
        if (error) throw error;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('mood_entries')
          .insert([{ 
            user_id: user.id, 
            mood_value: selected, 
            created_at: selectedDate.toISOString() 
          }]);
          
        if (error) throw error;
      }
      
      // Atualizar histórico
      fetchMoodHistory();
      setSavedToday(isSameDay(selectedDate, new Date()));
    } catch (err) {
      console.error('Erro ao salvar humor:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatSelectedDate = () => {
    if (!selectedDate) return 'Hoje';
    return isSameDay(selectedDate, new Date()) 
      ? 'Hoje' 
      : format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };
  
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };
  
  const resetToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Humor {isSameDay(selectedDate || new Date(), new Date()) ? 'de Hoje' : 'do Dia'}</h2>
          
          <div className="relative">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar size={16} className="text-blue-500" />
              <span className="text-sm">{formatSelectedDate()}</span>
              {!isSameDay(selectedDate || new Date(), new Date()) && (
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
                  <p className="text-xs text-gray-500">Veja como estava seu humor em dias anteriores</p>
                </div>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  locale={ptBR}
                  maxDate={new Date()}
                  dayClassName={(date: Date): string => {
                    // Destacar dias com registros de humor
                    const hasEntry = moodHistory.some(entry => 
                      isSameDay(new Date(entry.created_at), date)
                    );
                    
                    if (isSameDay(date, selectedDate || new Date())) {
                      return "bg-blue-500 text-white rounded-full";
                    } else if (hasEntry) {
                      return "bg-blue-100 text-blue-800 rounded-full font-medium";
                    }
                    return "";
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center max-w-xl mx-auto">
          {moods.map((value) => {
            const isActive = selected === value;
            return (
              <button
                key={value}
                onClick={() => setSelected(value)}
                className={`flex flex-col items-center focus:outline-none transition-transform ${isActive ? 'scale-110' : 'opacity-80 hover:scale-105'}`}
                aria-label={`Humor ${value}`}
              >
                <span className={`rounded-full w-14 h-14 flex items-center justify-center border text-xl font-bold ${isActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'} mb-2 transition-colors duration-200`}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <div className="mt-6 text-center space-y-4">
            <div className="flex flex-col items-center">
              <span className="inline-block px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-medium mb-2">
                Seu humor {isSameDay(selectedDate || new Date(), new Date()) ? 'hoje' : 'neste dia'}: {selected}
              </span>
              
              {isSameDay(selectedDate || new Date(), new Date()) && !savedToday && (
                <button
                  onClick={saveMoodEntry}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {loading ? 'Salvando...' : 'Salvar registro'}
                </button>
              )}
            </div>
            
            {(selected === 1 || selected === 2) && onNewEntry && isSameDay(selectedDate || new Date(), new Date()) && (
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
            {isSameDay(selectedDate || new Date(), new Date()) ? (
              <p className="text-gray-500">Selecione seu humor hoje</p>
            ) : (
              <p className="text-gray-500">Nenhum registro de humor para esta data</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Histórico de Humor</h3>
        {moodHistory.length > 0 ? (
          <div className="overflow-hidden">
            <div className="flex overflow-x-auto pb-4 -mx-2 px-2">
              <div className="flex space-x-2">
                {moodHistory.slice(0, 14).map((entry) => {
                  const entryDate = new Date(entry.created_at);
                  const isToday = isSameDay(entryDate, new Date());
                  const isSelected = selectedDate && isSameDay(entryDate, selectedDate);
                  
                  // Definir cores com base no valor do humor
                  const getColorClass = (value: number) => {
                    switch(value) {
                      case 1: return 'bg-red-100 text-red-800 border-red-200';
                      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
                      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
                      case 5: return 'bg-green-100 text-green-800 border-green-200';
                      default: return 'bg-gray-100 text-gray-800 border-gray-200';
                    }
                  };
                  
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedDate(entryDate)}
                      className={`flex flex-col items-center min-w-16 p-2 rounded-lg border transition-all ${isSelected ? 'ring-2 ring-blue-500 scale-105' : ''} ${getColorClass(entry.mood_value)}`}
                    >
                      <span className="text-xl font-bold">{entry.mood_value}</span>
                      <span className="text-xs whitespace-nowrap">
                        {isToday ? 'Hoje' : format(entryDate, 'dd/MM', { locale: ptBR })}
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
          <div className="h-32 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Nenhum registro de humor encontrado</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Insights</h3>
        <ul className="space-y-4">
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span>Seu humor tende a ser melhor pela manhã</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
            <span>Dias com exercícios estão relacionados com humor melhor</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
            <span>Considere adicionar mais tempo para relaxamento</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MoodTracker;
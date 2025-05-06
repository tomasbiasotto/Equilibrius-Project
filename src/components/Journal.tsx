// src/components/Journal.tsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, AlertCircle, Loader2 } from 'lucide-react'; // Adicionado AlertCircle, Loader2
import DatePicker from 'react-datepicker';
import { format, isSameDay, parseISO } from 'date-fns'; // Adicionado parseISO
import ptBR from 'date-fns/locale/pt-BR';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import 'react-datepicker/dist/react-datepicker.css';

interface JournalEntryFromDB {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[] | null; // Tags podem ser nulas ou um array de strings
  entry_date: string; // YYYY-MM-DD
  created_at: string;
}

interface JournalProps {
  onNewEntry?: () => void;
  // A prop 'key' do App.tsx fará a remontagem, então não precisamos de 'refreshKey' aqui explicitamente
  // se usarmos a abordagem da 'key' no App.tsx.
  // Se não usássemos a 'key', adicionaríamos: refreshKey?: number;
}

const Journal: React.FC<JournalProps> = ({ onNewEntry }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // null para mostrar todas
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntryFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar entradas do diário
  const fetchJournalEntries = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      // Se uma data específica for selecionada, filtre por ela no banco
      // (opcional, mas bom para performance se houver muitas entradas)
      // if (selectedDate) {
      //   query = query.eq('entry_date', selectedDate.toISOString().split('T')[0]);
      // }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;
      setJournalEntries(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar entradas do diário:', err);
      setError(`Erro ao carregar diário: ${err.message}`);
      setJournalEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar entradas quando o componente monta ou o usuário muda
  // A 'key' em App.tsx garante que este useEffect rode em "nova montagem"
  useEffect(() => {
    fetchJournalEntries();
  }, [user]); // A 'key' em App.tsx lida com o refresh após salvar nova entrada.

  // Função para formatar a data selecionada para display
  const formatSelectedDateForDisplay = () => {
    if (!selectedDate) return 'Todas as entradas';
    return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Função para limpar o filtro de data
  const clearDateFilter = () => {
    setSelectedDate(null);
    setIsCalendarOpen(false);
    // Não precisa refazer a busca aqui se já buscamos todas as entradas do usuário
    // A filtragem local abaixo cuidará disso.
  };

  // Filtrar entradas localmente com base na data selecionada
  const filteredEntries = selectedDate
    ? journalEntries.filter(entry => isSameDay(parseISO(entry.entry_date), selectedDate))
    : journalEntries;

  // Mapeamento de IDs de tags para labels e cores (do NewJournalEntry)
  const MOOD_TAG_DETAILS: Record<string, { label: string; color: string }> = {
    feliz: { label: 'Feliz', color: 'bg-green-100 text-green-800 border-green-200' },
    triste: { label: 'Triste', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    ansioso: { label: 'Ansioso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    calmo: { label: 'Calmo', color: 'bg-brand/10 text-brand border-brand/20' },
    estressado: { label: 'Estressado', color: 'bg-red-100 text-red-800 border-red-200' },
    motivado: { label: 'Motivado', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cansado: { label: 'Cansado', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    grato: { label: 'Grato', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Entradas do Diário</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar size={18} className="text-brand" />
              <span>{formatSelectedDateForDisplay()}</span>
              {selectedDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDateFilter();
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label="Limpar filtro de data"
                >
                  ×
                </button>
              )}
            </button>
            {isCalendarOpen && (
              <div className="absolute z-10 mt-1 right-0">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  inline
                  locale={ptBR}
                  calendarClassName="bg-white shadow-lg rounded-lg border border-gray-200 p-2"
                  dayClassName={date => {
                      const baseClass = "hover:bg-gray-100 rounded-full";
                      if (selectedDate && isSameDay(date, selectedDate)) {
                          return "bg-brand text-white rounded-full";
                      }
                      // Destacar dias que têm entradas de diário
                      const hasEntry = journalEntries.some(entry => isSameDay(parseISO(entry.entry_date), date));
                      if (hasEntry) {
                          return `${baseClass} bg-brand/10 font-semibold`;
                      }
                      return baseClass;
                    }
                  }
                />
              </div>
            )}
          </div>
          <button
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand/80 flex items-center space-x-2 shadow-sm"
            onClick={onNewEntry}
          >
            <BookOpen size={18} />
            <span>Nova Entrada</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="ml-2 text-gray-600">Carregando entradas...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && filteredEntries.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="space-y-6">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{entry.title}</h3>
                    <div className="flex items-center space-x-2 text-gray-500 mt-1 text-sm">
                      <Calendar size={14} />
                      <span>{format(parseISO(entry.entry_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                    {entry.tags && entry.tags.map((tagId: string) => {
                      const tagDetail = MOOD_TAG_DETAILS[tagId];
                      return (
                        <span
                          key={tagId}
                          className={`${tagDetail ? tagDetail.color : 'bg-gray-100 text-gray-800'} text-xs px-2.5 py-1 rounded-full whitespace-nowrap`}
                        >
                          {tagDetail ? tagDetail.label : tagId}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && !error && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {selectedDate ? 'Nenhuma entrada para esta data' : 'Nenhuma entrada no diário ainda'}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedDate
                ? 'Não há entradas de diário para a data selecionada.'
                : 'Comece a escrever para registrar seus pensamentos e sentimentos.'}
            </p>
            {selectedDate && (
              <button
                onClick={clearDateFilter}
                className="text-brand hover:text-brand/80 font-medium"
              >
                Mostrar todas as entradas
              </button>
            )}
          </div>
        )
      )}

      {/* Temas Comuns (pode ser dinâmico no futuro) */}
      {!loading && !error && journalEntries.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Temas Comuns (Exemplo)</h3>
          <div className="flex flex-wrap gap-2">
            {/* Esta parte ainda é estática, pode ser implementada para ser dinâmica no futuro */}
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Trabalho</span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
              Relacionamentos
            </span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Saúde</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
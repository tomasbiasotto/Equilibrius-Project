import React, { useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';

interface JournalProps {
  onNewEntry?: () => void;
}

const Journal: React.FC<JournalProps> = ({ onNewEntry }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Função para formatar a data selecionada
  const formatSelectedDate = () => {
    if (!selectedDate) return 'Todas as entradas';
    return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Função para limpar o filtro de data
  const clearDateFilter = () => {
    setSelectedDate(null);
    setIsCalendarOpen(false);
  };

  // Função para filtrar entradas pelo dia selecionado
  const filterEntriesByDate = (entries: any[], date: Date | null) => {
    if (!date) return entries;
    
    // Aqui você pode implementar a lógica real de filtragem quando tiver os dados
    // Este é apenas um exemplo
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getDate() === date.getDate() &&
        entryDate.getMonth() === date.getMonth() &&
        entryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Dados de exemplo para demonstração
  const allEntries = [
    {
      id: 1,
      title: 'Um Dia Produtivo',
      date: '2024-03-15',
      tags: ['Trabalho', 'Conquista'],
      content: 'Hoje foi incrivelmente produtivo. Consegui completar todas as minhas tarefas e ainda tive tempo para uma curta sessão de meditação...'
    },
    {
      id: 2,
      title: 'Refletindo sobre o Crescimento',
      date: '2024-03-14',
      tags: ['Pessoal', 'Crescimento'],
      content: 'Olhando para o mês passado, posso ver um progresso significativo em como lido com o estresse...'
    }
  ];

  // Filtrar entradas com base na data selecionada
  const filteredEntries = filterEntriesByDate(allEntries, selectedDate);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-semibold">Entradas do Diário</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar size={18} className="text-brand" />
              <span>{formatSelectedDate()}</span>
              {selectedDate && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDateFilter();
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
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
                  calendarClassName="bg-white shadow-lg rounded-lg border border-gray-200"
                  dayClassName={date => 
                    date.getDate() === selectedDate?.getDate() &&
                    date.getMonth() === selectedDate?.getMonth() &&
                    date.getFullYear() === selectedDate?.getFullYear()
                      ? "bg-brand text-white rounded-full"
                      : undefined
                  }
                />
              </div>
            )}
          </div>
          <button
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand/80 flex items-center space-x-2"
            onClick={onNewEntry}
          >
            <BookOpen size={18} />
            <span>Nova Entrada</span>
          </button>
        </div>
      </div>

      {filteredEntries.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="space-y-6">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{entry.title}</h3>
                    <div className="flex items-center space-x-2 text-gray-500 mt-1">
                      <Calendar size={16} />
                      <span>{format(new Date(entry.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {entry.tags.map((tag: string, index: number) => {
                      // Definir cores diferentes para diferentes tags
                      const tagColors: Record<string, string> = {
                        'Trabalho': 'bg-blue-100 text-blue-800',
                        'Conquista': 'bg-green-100 text-green-800',
                        'Pessoal': 'bg-brand/10 text-brand',
                        'Crescimento': 'bg-yellow-100 text-yellow-800',
                        'Saúde': 'bg-purple-100 text-purple-800',
                        'Relacionamentos': 'bg-pink-100 text-pink-800',
                      };
                      
                      return (
                        <span 
                          key={index} 
                          className={`${tagColors[tag] || 'bg-gray-100 text-gray-800'} text-sm px-3 py-1 rounded-full`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <p className="text-gray-600">{entry.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma entrada encontrada</h3>
          <p className="text-gray-500 mb-6">Não há entradas de diário para a data selecionada.</p>
          <button
            onClick={clearDateFilter}
            className="text-brand hover:text-brand/80 font-medium"
          >
            Mostrar todas as entradas
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Temas Comuns</h3>
        <div className="flex flex-wrap gap-2">
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Trabalho</span>
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
            Relacionamentos
          </span>
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Saúde</span>
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Objetivos</span>
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Gratidão</span>
        </div>
      </div>
    </div>
  );
};

export default Journal;
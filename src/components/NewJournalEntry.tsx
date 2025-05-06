// src/components/NewJournalEntry.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, X, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns'; // <--- IMPORTAÇÃO ADICIONADA
import { ptBR } from 'date-fns/locale/pt-BR'; // <--- IMPORTAÇÃO GARANTIDA

interface NewJournalEntryProps {
  userId: string;
  onSave: () => void;
}

const MOOD_TAGS = [
  { id: 'feliz', label: 'Feliz', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'triste', label: 'Triste', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'ansioso', label: 'Ansioso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'calmo', label: 'Calmo', color: 'bg-brand/10 text-brand border-brand/20' },
  { id: 'estressado', label: 'Estressado', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'motivado', label: 'Motivado', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'cansado', label: 'Cansado', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'grato', label: 'Grato', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

// Função para formatar Date para YYYY-MM-DD string
const formatDateForSupabase = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const NewJournalEntry: React.FC<NewJournalEntryProps> = ({ userId, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryDate] = useState(new Date());

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError('Título e conteúdo são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const { error: dbError } = await supabase.from('journal_entries').insert([
        {
          user_id: userId,
          title,
          content,
          tags: selectedTags.length > 0 ? selectedTags : null,
          entry_date: formatDateForSupabase(entryDate),
        },
      ]);
      if (dbError) throw dbError;
      onSave();
    } catch (err: any) {
      console.error('Erro ao salvar entrada do diário:', err);
      setError(`Erro ao salvar entrada: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-0 overflow-hidden">
      <div className="bg-gradient-to-r from-brand/10 to-brand/5 p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Nova Entrada do Diário</h2>
          <button
            type="button"
            onClick={onSave}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100"
            disabled={loading}
            aria-label="Voltar para o diário"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex items-center text-gray-500 mt-2">
          <Calendar size={16} className="mr-2" />
          {/* A função format é usada aqui */}
          <span>{format(entryDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="journal-title" className="block mb-1.5 font-medium text-gray-700">Título</label>
          <input
            id="journal-title"
            type="text"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Como você resumiria seu dia?"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block mb-1.5 font-medium text-gray-700">Como você está se sentindo?</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {MOOD_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-offset-1 ${isSelected ? tag.color + ' shadow-sm ring-transparent' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 focus:ring-brand/50'}`}
                  disabled={loading}
                >
                  {tag.label}
                  {isSelected && <X size={14} className="inline ml-1.5 -mr-0.5 align-text-bottom" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="journal-content" className="block mb-1.5 font-medium text-gray-700">Conte sobre seu dia</label>
          <textarea
            id="journal-content"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all h-40 resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva sobre seus pensamentos, sentimentos e experiências de hoje..."
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <X size={18} className="mr-2 text-red-500 cursor-pointer" onClick={() => setError(null)} />
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-70"
            disabled={loading || !title.trim() || !content.trim()}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <Save size={18} />
            )}
            <span>{loading ? 'Salvando...' : 'Salvar Entrada'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewJournalEntry;
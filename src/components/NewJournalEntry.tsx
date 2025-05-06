import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, X, Save, ArrowLeft } from 'lucide-react';

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

const NewJournalEntry: React.FC<NewJournalEntryProps> = ({ userId, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    if (!title || !content) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('journal_entries').insert([
        { 
          user_id: userId, 
          title, 
          content, 
          tags: selectedTags,
          created_at: new Date().toISOString() 
        },
      ]);
      if (error) throw error;
      onSave();
    } catch (err: any) {
      setError('Erro ao salvar entrada.');
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
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex items-center text-gray-500 mt-2">
          <Calendar size={16} className="mr-2" />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block mb-2 font-medium text-gray-700">Título</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Como você resumiria seu dia?"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">Como você está se sentindo?</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {MOOD_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isSelected ? tag.color + ' shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                >
                  {tag.label}
                  {isSelected && <X size={14} className="inline ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">Conte sobre seu dia</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all h-40 resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva sobre seus pensamentos, sentimentos e experiências de hoje..."
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors flex items-center space-x-2 shadow-sm"
            disabled={loading}
          >
            <Save size={18} />
            <span>{loading ? 'Salvando...' : 'Salvar Entrada'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewJournalEntry;

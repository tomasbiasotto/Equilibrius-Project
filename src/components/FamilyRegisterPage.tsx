import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Heart, Mail, User, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FamilyMember {
  id?: string;
  name: string;
  relationship: string;
  email: string;
}

interface FamilyRegisterPageProps {
  onBack: () => void;
}

const FamilyRegisterPage: React.FC<FamilyRegisterPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newMember, setNewMember] = useState<FamilyMember>({
    name: '',
    relationship: '',
    email: ''
  });

  // Buscar familiares cadastrados
  useEffect(() => {
    if (user) {
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (err) {
      console.error('Erro ao buscar familiares:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validateForm = () => {
    if (!newMember.name.trim()) {
      setError('Por favor, informe o nome completo do familiar.');
      return false;
    }
    if (!newMember.relationship.trim()) {
      setError('Por favor, informe o grau de parentesco.');
      return false;
    }
    if (!newMember.email.trim() || !validateEmail(newMember.email)) {
      setError('Por favor, informe um e-mail válido.');
      return false;
    }
    return true;
  };

  const handleAddMember = async () => {
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) return;
    
    if (familyMembers.length >= 2) {
      setError('Você atingiu o limite de 2 familiares no plano gratuito.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .insert([{
          user_id: user?.id,
          name: newMember.name,
          relationship: newMember.relationship,
          email: newMember.email
        }]);

      if (error) throw error;
      
      setSuccess('Familiar cadastrado com sucesso!');
      setNewMember({ name: '', relationship: '', email: '' });
      fetchFamilyMembers();
    } catch (err: any) {
      console.error('Erro ao cadastrar familiar:', err);
      setError('Erro ao cadastrar familiar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Familiar removido com sucesso!');
      fetchFamilyMembers();
    } catch (err) {
      console.error('Erro ao remover familiar:', err);
      setError('Erro ao remover familiar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const relationshipOptions = [
    'Cônjuge', 'Mãe', 'Pai', 'Filho(a)', 'Irmão/Irmã', 'Avô/Avó', 'Tio(a)', 'Primo(a)', 'Amigo(a)', 'Outro'
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Cadastro de Familiares</h1>
        </div>

        {/* Informações */}
        <div className="bg-gradient-to-r from-brand/10 to-brand/5 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full">
              <Heart size={24} className="text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Rede de Apoio</h2>
              <p className="text-gray-700">
                Cadastre até 2 familiares que receberão notificações sobre seu bem-estar emocional.
                Eles serão notificados apenas quando seu humor estiver baixo por vários dias consecutivos.
              </p>
              <div className="mt-3 text-sm text-brand/80 font-medium">
                Plano atual: Gratuito (limite de 2 familiares)
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens de erro ou sucesso */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <Check size={20} className="mr-2 flex-shrink-0" />
            <span>{success}</span>
            <button 
              onClick={() => setSuccess(null)} 
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Formulário de cadastro */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Adicionar Familiar</h2>
            <p className="text-gray-500 text-sm">Preencha os dados do familiar que você deseja adicionar à sua rede de apoio.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="pl-10 w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Nome completo do familiar"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grau de Parentesco</label>
              <select
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                value={newMember.relationship}
                onChange={(e) => setNewMember({...newMember, relationship: e.target.value})}
              >
                <option value="">Selecione o grau de parentesco</option>
                {relationshipOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail do Familiar</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  className="pl-10 w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="email@exemplo.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Este e-mail receberá notificações sobre seu bem-estar.
              </p>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end">
            <button
              onClick={handleAddMember}
              disabled={loading}
              className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-70"
            >
              <UserPlus size={18} />
              <span>{loading ? 'Adicionando...' : 'Adicionar Familiar'}</span>
            </button>
          </div>
        </div>

        {/* Lista de familiares */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Familiares Cadastrados</h2>
            <p className="text-gray-500 text-sm mt-1">
              {familyMembers.length === 0 
                ? 'Você ainda não cadastrou nenhum familiar.' 
                : `Você cadastrou ${familyMembers.length} de 2 familiares permitidos.`}
            </p>
          </div>
          
          {familyMembers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {familyMembers.map((member) => (
                <div key={member.id} className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <div className="flex items-center">
                        <span className="inline-block bg-brand/10 text-brand text-xs px-2 py-1 rounded-full mr-2">
                          {member.relationship}
                        </span>
                        <Mail size={14} className="mr-1" />
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => member.id && handleRemoveMember(member.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                    aria-label="Remover familiar"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <UserPlus size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500">
                Nenhum familiar cadastrado ainda. Adicione familiares para formar sua rede de apoio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyRegisterPage;

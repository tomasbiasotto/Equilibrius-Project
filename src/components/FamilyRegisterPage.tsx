// src/components/FamilyRegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Heart, Mail, User, X, Check, AlertCircle, Loader2 } from 'lucide-react'; // Adicionado Loader2
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FamilyMember {
  id?: string; // id é opcional pois não existe antes de inserir
  user_id?: string; // user_id será preenchido pelo user.id
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
  const [loading, setLoading] = useState(false); // Loading geral para a página
  const [formLoading, setFormLoading] = useState(false); // Loading específico para o formulário de adicionar
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
    if (!user) return;
    setLoading(true);
    setError(null); // Limpa erro anterior
    try {
      const { data, error: dbError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }); // Opcional: ordenar por data de criação

      if (dbError) throw dbError;
      setFamilyMembers(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar familiares:', err);
      setError('Falha ao carregar lista de familiares. Tente recarregar a página.');
      setFamilyMembers([]); // Garante que a lista seja limpa em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Regex mais comum e geralmente aceita para validação de e-mail no frontend.
  // É importante notar que nenhuma regex é 100% perfeita para RFC 5322,
  // mas esta cobre a maioria dos casos comuns.
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Alternativa mais simples que a do banco, mas a do banco é mais rigorosa:
    // const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    if (!newMember.name.trim()) {
      setError('Por favor, informe o nome completo do familiar.');
      return false;
    }
    if (newMember.name.trim().length < 3) {
      setError('O nome do familiar deve ter pelo menos 3 caracteres.');
      return false;
    }
    if (!newMember.relationship.trim()) {
      setError('Por favor, informe o grau de parentesco.');
      return false;
    }
    if (!newMember.email.trim()) {
      setError('Por favor, informe o e-mail do familiar.');
      return false;
    }
    if (!validateEmail(newMember.email.trim())) {
      setError('Por favor, informe um e-mail válido (ex: nome@dominio.com).');
      return false;
    }
    return true;
  };

  const handleAddMember = async () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;
    if (!user) {
        setError('Usuário não autenticado. Por favor, faça login novamente.');
        return;
    }

    if (familyMembers.length >= 2) {
      setError('Você atingiu o limite de 2 familiares no plano gratuito.');
      return;
    }

    setFormLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('family_members')
        .insert([{
          user_id: user.id, // Garantir que user.id está sendo passado
          name: newMember.name.trim(),
          relationship: newMember.relationship.trim(),
          email: newMember.email.trim().toLowerCase() // Salvar email em minúsculas para consistência
        }])
        .select(); // Adicionar .select() para obter os dados inseridos de volta se precisar

      if (insertError) {
        // Tratar erros específicos do Supabase
        if (insertError.code === '23505') { // Violação de constraint UNIQUE (user_id, email)
          setError('Este familiar (e-mail) já foi cadastrado.');
        } else if (insertError.code === '23514') { // Violação de CHECK constraint (como a do email)
             setError('O e-mail fornecido não é válido. Verifique o formato (ex: nome@dominio.com).');
        } else {
          setError(`Erro ao cadastrar familiar: ${insertError.message}`);
        }
        throw insertError; // Re-lança para o console.error abaixo
      }

      // Se chegou aqui, o insert foi bem-sucedido
      if (data && data.length > 0) {
        setSuccess('Familiar cadastrado com sucesso!');
        setNewMember({ name: '', relationship: '', email: '' }); // Limpa o formulário
        // Adiciona o novo membro localmente ou refaz a busca
        // setFamilyMembers(prev => [...prev, data[0]]); // Otimista
        fetchFamilyMembers(); // Mais seguro para pegar o estado atual do banco
      } else {
        // Isso não deveria acontecer se o insert não deu erro e .select() foi usado
        setError('Erro ao processar o cadastro. Tente novamente.');
      }

    } catch (err: any) {
      console.error('Erro ao cadastrar familiar (catch geral):', err);
      // A mensagem de erro já deve ter sido definida pelo if(insertError)
      if (!error && !success) { // Se nenhuma mensagem de erro específica foi definida
        setError('Ocorreu uma falha inesperada ao cadastrar. Tente novamente.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveMember = async (idToRemove: string) => {
    if (!idToRemove) return;
    setLoading(true); // Usar o loading geral para a lista
    setError(null);
    setSuccess(null);
    try {
      const { error: deleteError } = await supabase
        .from('family_members')
        .delete()
        .eq('id', idToRemove);

      if (deleteError) throw deleteError;

      setSuccess('Familiar removido com sucesso!');
      // Remove o membro localmente ou refaz a busca
      // setFamilyMembers(prev => prev.filter(member => member.id !== idToRemove)); // Otimista
      fetchFamilyMembers(); // Mais seguro
    } catch (err: any) {
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
    <div className="min-h-screen bg-gray-50 pb-16"> {/* Adicionado pb-16 para espaço do footer */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-700"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Cadastro de Familiares</h1>
        </div>

        <div className="bg-gradient-to-r from-brand/10 to-brand/5 rounded-xl p-6 mb-8 border border-brand/20">
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Heart size={24} className="text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1 text-brand">Sua Rede de Apoio</h2>
              <p className="text-gray-700 text-sm">
                Cadastre até 2 familiares ou amigos próximos. Eles poderão ser notificados caso seu humor registrado
                esteja consistentemente baixo, oferecendo uma camada extra de cuidado.
              </p>
              <div className="mt-3 text-xs text-brand/80 font-medium bg-brand/10 inline-block px-2 py-0.5 rounded-md">
                Plano atual: Gratuito (limite de 2 contatos)
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center shadow-sm">
            <AlertCircle size={20} className="mr-3 flex-shrink-0 text-red-500" />
            <span className="flex-grow">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700"
              aria-label="Fechar alerta"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center shadow-sm">
            <Check size={20} className="mr-3 flex-shrink-0 text-green-500" />
            <span className="flex-grow">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-3 text-green-500 hover:text-green-700"
              aria-label="Fechar alerta"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Adicionar Familiar ou Amigo</h2>
            <p className="text-gray-500 text-sm">Preencha os dados do contato que você deseja adicionar.</p>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label htmlFor="memberName" className="block text-sm font-medium text-gray-700 mb-1.5">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  id="memberName"
                  type="text"
                  className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-brand transition-all shadow-sm"
                  placeholder="Nome completo do contato"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="memberRelationship" className="block text-sm font-medium text-gray-700 mb-1.5">Grau de Parentesco / Relação</label>
              <select
                id="memberRelationship"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-brand transition-all shadow-sm bg-white"
                value={newMember.relationship}
                onChange={(e) => setNewMember({...newMember, relationship: e.target.value})}
                disabled={formLoading}
              >
                <option value="">Selecione a relação</option>
                {relationshipOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-1.5">E-mail do Contato</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="memberEmail"
                  type="email"
                  className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand focus:border-brand transition-all shadow-sm"
                  placeholder="email@exemplo.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  disabled={formLoading}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Este e-mail poderá receber notificações sobre seu bem-estar, conforme sua configuração.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end border-t border-gray-100">
            <button
              onClick={handleAddMember}
              disabled={formLoading || familyMembers.length >= 2}
              className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors flex items-center space-x-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {formLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <UserPlus size={18} />}
              <span>{formLoading ? 'Adicionando...' : 'Adicionar Contato'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Contatos Cadastrados</h2>
            <p className="text-gray-500 text-sm mt-1">
              {familyMembers.length === 0
                ? 'Você ainda não cadastrou nenhum contato.'
                : `Você cadastrou ${familyMembers.length} de 2 contatos permitidos.`}
            </p>
          </div>

          {loading && familyMembers.length === 0 ? (
             <div className="p-8 text-center text-gray-500">Carregando contatos...</div>
          ) : null}

          {!loading && familyMembers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {familyMembers.map((member) => (
                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center bg-brand/10 text-brand text-xs px-2 py-0.5 rounded-full">
                          <Heart size={12} className="mr-1.5" />
                          {member.relationship}
                        </span>
                        <span className="inline-flex items-center text-gray-600">
                          <Mail size={14} className="mr-1.5 text-gray-400" />
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => member.id && handleRemoveMember(member.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                    aria-label="Remover contato"
                    disabled={loading} // Desabilita enquanto a lista geral está carregando/removendo
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <UserPlus size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500">
                Nenhum contato cadastrado ainda. Adicione familiares ou amigos para formar sua rede de apoio.
              </p>
            </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyRegisterPage;
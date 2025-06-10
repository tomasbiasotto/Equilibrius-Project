import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const validateForm = () => {
    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return false;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);

      if (error) {
        if (error.message.includes('email')) {
          setError('Este email já está sendo utilizado ou é inválido.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Elementos decorativos flutuantes relacionados à saúde mental */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-blue-100 opacity-60 animate-float1"></div>
      <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-blue-200 opacity-50 animate-float2"></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-blue-50 opacity-40 animate-float3"></div>
      <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full bg-blue-300 opacity-30 animate-float2"></div>
      
      {/* Ícones representativos de saúde mental e bem-estar */}
      <div className="absolute top-1/4 left-1/5 text-blue-300 opacity-20 transform rotate-12 text-6xl">🧠</div>
      <div className="absolute bottom-1/4 right-1/5 text-blue-400 opacity-20 transform -rotate-6 text-5xl">🌱</div>
      <div className="absolute top-2/3 left-1/3 text-blue-200 opacity-20 transform rotate-45 text-4xl">🌿</div>
      <div className="absolute top-1/2 right-1/4 text-blue-100 opacity-15 transform -rotate-12 text-5xl">✨</div>
      
      {/* Container principal com efeito de vidro */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl w-full max-w-md border border-blue-50 relative z-10">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-blue-600 hover:text-blue-800 focus:outline-none"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-brand">Iniciar Jornada</h1>
          <p className="text-blue-700 mt-2">Crie sua conta no Equilibrius</p>
          <div className="h-1 w-20 bg-blue-500 mx-auto mt-3 rounded-full"></div>
        </div>
        
        {success ? (
          <div className="text-center space-y-4 py-6">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-semibold text-green-600">Cadastro Realizado!</h2>
            <p className="text-gray-600">
              Por favor, verifique seu email para confirmar seu cadastro.
              Enviamos um link de confirmação para <strong>{email}</strong>.
            </p>
            <button
              onClick={onBack}
              className="mt-6 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Voltar para o Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6 text-gray-600 italic">
              "Registre-se para iniciar sua jornada de equilíbrio emocional."
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blue-700">
                  Nome completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-blue-200 bg-blue-50/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="Seu nome completo"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-blue-700">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="register-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-blue-200 bg-blue-50/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="seu@email.com"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-blue-700">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="register-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-blue-200 bg-blue-50/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-blue-700">
                  Confirme sua senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-blue-200 bg-blue-50/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                className="mt-2 w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-all duration-200 transform hover:translate-y-[-2px] font-medium text-base"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Criar minha conta'}
              </button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm hover:underline"
                >
                  ← Já tem uma conta? Entre aqui
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;

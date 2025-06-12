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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-brand">
      {/* Background profissional com efeito de mesh gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-teal-600/20 via-transparent to-transparent"></div>
      
      {/* Elementos sutis de design */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black/5 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-2/3 h-1/2 bg-gradient-to-tl from-black/5 to-transparent"></div>
      
      {/* Container principal com efeito de vidro - cor exatamente igual ao fundo do logo */}
      <div className="p-8 rounded-xl shadow-2xl w-full max-w-md border border-white/20 relative z-10" style={{backgroundColor: '#ffffff'}}>
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-blue-600 hover:text-blue-800 focus:outline-none transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="text-center mb-8">
          {/* Logo do Equilibrius */}
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.svg.png" 
              alt="Equilibrius Logo" 
              width="120" 
              height="120" 
              style={{display: 'block'}} 
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Jornada</h1>
          <p className="text-blue-700 font-medium">Crie sua conta no Equilibrius</p>
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
            <div className="mb-6 py-3 px-4 border-l-4 border-blue-500 bg-blue-50/30 text-gray-700">
              <p className="text-sm font-medium">Bem-vindo ao Equilibrius</p>
              <p className="text-xs text-gray-600">Registre-se para iniciar sua jornada de equilíbrio emocional e bem-estar mental.</p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                  Nome completo
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="Seu nome completo"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="register-email" className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="email"
                    id="register-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="seu@email.com"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="register-password" className="block text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="password"
                    id="register-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700">
                  Confirme sua senha
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                className="mt-4 w-full flex justify-center py-3 px-6 border border-transparent rounded-md shadow-xl text-white bg-gradient-to-r from-blue-700 to-brand hover:from-blue-800 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all duration-200 font-semibold text-base"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </span>
                ) : 'Criar minha conta'}
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

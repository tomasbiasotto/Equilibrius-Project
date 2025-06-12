import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ResetPassword from './ResetPassword';
import Register from './Register';

type AuthMode = 'email' | 'reset' | 'register';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  if (authMode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
        {/* Elementos decorativos flutuantes */}
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-blue-100 opacity-60 animate-float1"></div>
        <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-blue-200 opacity-50 animate-float2"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-blue-50 opacity-40 animate-float3"></div>
        <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full bg-blue-300 opacity-30 animate-float2"></div>
      
        {/* Ícones representativos */}
        <div className="absolute top-1/4 left-1/5 text-blue-300 opacity-20 transform rotate-12 text-6xl">💆</div>
        <div className="absolute bottom-1/4 right-1/5 text-blue-400 opacity-20 transform -rotate-6 text-5xl">🧘</div>
        
        <ResetPassword onCancel={() => setAuthMode('email')} />
      </div>
    );
  }
  
  if (authMode === 'register') {
    return <Register onBack={() => setAuthMode('email')} />;
  }



  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Elementos decorativos flutuantes relacionados à saúde mental */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-blue-100 opacity-60 animate-float1"></div>
      <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-blue-200 opacity-50 animate-float2"></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-blue-50 opacity-40 animate-float3"></div>
      <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full bg-blue-300 opacity-30 animate-float2"></div>
      
      {/* Ícones representativos de saúde mental e bem-estar */}
      <div className="absolute top-1/4 left-1/5 text-blue-300 opacity-20 transform rotate-12 text-6xl">💆</div>
      <div className="absolute bottom-1/4 right-1/5 text-blue-400 opacity-20 transform -rotate-6 text-5xl">🧘</div>
      <div className="absolute top-2/3 left-1/3 text-blue-200 opacity-20 transform rotate-45 text-4xl">🌿</div>
      <div className="absolute top-1/2 right-1/4 text-blue-100 opacity-15 transform -rotate-12 text-5xl">✨</div>
      
      {/* Container principal com efeito de vidro */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl w-full max-w-md border border-blue-50 relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/logo.svg.png" 
            alt="Equilibrius Logo" 
            width="120" 
            height="120" 
            className="mb-4 mix-blend-multiply" 
          />
          <h1 className="text-3xl font-bold text-blue-700 mb-1">Equilibrius</h1>
          <p className="text-blue-600 mt-1 font-medium">Seu caminho para o equilíbrio emocional</p>
        </div>
        
        <div className="text-center mb-6 text-gray-600 italic">
          "Cuide da sua mente hoje para um amanhã mais equilibrado."
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-blue-700">
              Email
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
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
            <label htmlFor="password" className="block text-sm font-semibold text-blue-700">
              Senha
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white sm:text-sm transition-all duration-200 pl-10"
                required
                disabled={loading}
                placeholder="••••••••"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            className="mt-4 w-full flex justify-center py-3 px-6 border border-transparent rounded-md shadow-xl text-white bg-gradient-to-r from-blue-600 to-brand hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all duration-200 font-semibold text-base"
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
            ) : 'Entrar no Equilibrius'}
          </button>
        </form>

        <div className="mt-8 space-y-5">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/90 backdrop-blur-sm text-blue-500 font-medium">Opções de conta</span>
            </div>
          </div>



          <div className="grid grid-cols-1 gap-3 mt-4">
            <button
              onClick={() => setAuthMode('register')}
              className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 transition-all rounded-lg border border-blue-200 flex items-center justify-center shadow-sm hover:shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Não tem uma conta? Registre-se
            </button>
            
            <button
              onClick={() => setAuthMode('reset')}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-all rounded-lg flex items-center justify-center hover:bg-blue-50/50 font-medium text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Esqueceu sua senha?
            </button>
          </div>
          
          <div className="text-center text-xs mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
            <p>Ao entrar, você concorda com nossos <span className="font-medium hover:underline cursor-pointer">termos de uso</span> e <span className="font-medium hover:underline cursor-pointer">política de privacidade</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

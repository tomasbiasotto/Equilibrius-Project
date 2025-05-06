import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PhoneLogin: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithPhone, verifyPhoneOTP } = useAuth();

  const formatPhoneNumber = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    // Formato: +55 (XX) XXXXX-XXXX
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 6) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    if (numbers.length <= 11) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signInWithPhone(phone.replace(/\D/g, ''));
      if (error) {
        setError(error.message);
      } else {
        setCodeSent(true);
      }
    } catch (err) {
      setError('Ocorreu um erro ao enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await verifyPhoneOTP(phone.replace(/\D/g, ''), token);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Ocorreu um erro ao verificar o código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-brand mb-4">
        Login com Telefone
      </h2>

      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {!codeSent ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Número de Telefone
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="+55 (11) 98765-4321"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Formato: +55 (XX) XXXXX-XXXX
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || phone.length < 19}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Código'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:text-brand/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
            >
              Voltar
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Código de Verificação
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Digite o código de 6 dígitos enviado para seu telefone
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar Código'}
            </button>
            <button
              type="button"
              onClick={() => setCodeSent(false)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:text-brand/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PhoneLogin;

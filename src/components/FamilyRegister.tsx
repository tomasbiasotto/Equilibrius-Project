import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FamilyRegisterProps {
  userId: string;
}

const FamilyRegister: React.FC<FamilyRegisterProps> = ({ userId }) => {
  const [emails, setEmails] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!emails[0] || !emails[1]) {
      setError('Por favor, preencha ambos os e-mails.');
      return;
    }
    if (!validateEmail(emails[0]) || !validateEmail(emails[1])) {
      setError('Insira e-mails válidos.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('familiares').upsert([
        { usuario_id: userId, email: emails[0] },
        { usuario_id: userId, email: emails[1] },
      ]);
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError('Erro ao cadastrar familiares.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="family-register-container">
      <h2>Cadastro de Familiares</h2>
      <form onSubmit={handleSubmit}>
        <label>
          E-mail do Familiar 1:
          <input
            type="email"
            value={emails[0]}
            onChange={e => handleChange(0, e.target.value)}
            required
          />
        </label>
        <label>
          E-mail do Familiar 2:
          <input
            type="email"
            value={emails[1]}
            onChange={e => handleChange(1, e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">Familiares cadastrados com sucesso!</div>}
      </form>
      <p>Os familiares cadastrados receberão notificações sobre o estado de saúde (0 a 5) do usuário.</p>
    </div>
  );
};

export default FamilyRegister;

// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null; // Adicionando a sessão para acesso se necessário
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: AuthError | null }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
      setUser(sessionState?.user ?? null);
      setLoading(false); // Garante que o loading seja false após qualquer mudança de estado
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redireciona para a raiz da aplicação após o clique no link de confirmação do e-mail.
        // O Supabase lida com a validação do token na URL de redirecionamento.
        emailRedirectTo: window.location.origin
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // O onAuthStateChange cuidará de setUser(null) e setSession(null)
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // O usuário será redirecionado para esta URL após clicar no link de redefinição de senha.
      // Nesta página, idealmente, haveria um formulário para inserir a nova senha.
      // Se você não tiver uma página específica, pode redirecionar para a raiz.
      // Lembre-se que o Supabase adicionará tokens à URL.
      redirectTo: `${window.location.origin}/update-password` // Ou window.location.origin se não tiver a rota
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    // Esta função é usada quando o usuário já está logado e quer mudar sua senha.
    // Para redefinir senha após esquecimento, o fluxo é via resetPasswordForEmail.
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    // Certifique-se que o número de telefone está no formato E.164 (ex: +5511999999999)
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone // O componente PhoneLogin já deve formatar para remover caracteres não numéricos.
    });
    return { error };
  };

  const verifyPhoneOTP = async (phone: string, token: string) => {
    // Certifique-se que o número de telefone está no formato E.164
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: 'sms' // ou 'phone_change' se for para mudança de número
    });
    // Se data.session e data.user existirem, a verificação foi bem-sucedida.
    // O onAuthStateChange também será disparado.
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    signInWithPhone,
    verifyPhoneOTP
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
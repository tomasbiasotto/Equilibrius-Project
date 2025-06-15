-- Execute este script para criar a view necessária para acessar emails de usuários
CREATE OR REPLACE VIEW public.auth_user_emails_view AS
  SELECT id as user_id, email, raw_user_meta_data
  FROM auth.users;

-- Função para obter email do usuário
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param UUID)
RETURNS TABLE (email TEXT)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT auth.users.email
  FROM auth.users
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

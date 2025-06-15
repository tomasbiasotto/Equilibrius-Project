-- Arquivo de trigger SQL para inserir na interface SQL do Supabase
-- Esta solução não depende de webhooks, é mais confiável e direta

-- Habilitar a extensão pg_net (necessária para fazer requisições HTTP do banco)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função que chama automaticamente a Edge Function quando um mood baixo for registrado
CREATE OR REPLACE FUNCTION public.notify_low_mood()
RETURNS trigger AS $$
DECLARE
  edge_function_url TEXT := 'https://vpwaotyxobqqvogkqzpy.supabase.co/functions/v1'; -- SUBSTITUA PELA SUA URL
BEGIN
  -- Só envia notificação quando o humor for 1 ou 2
  IF (NEW.mood_value = 1 OR NEW.mood_value = 2) THEN
    -- Usa pg_net.http_post para chamar a Edge Function de forma assíncrona
    PERFORM
      net.http_post(
        url:= edge_function_url || '/mood-monitor-debug',
        body:= json_build_object(
          'type', 'INSERT',
          'table', 'mood_entries',
          'record', json_build_object(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'mood_value', NEW.mood_value,
            'entry_date', COALESCE(NEW.entry_date, current_date)
          )
        )::jsonb,
        headers:= '{"Content-Type": "application/json"}'::jsonb
      );
      
    -- Registra uma entrada de log para acompanhamento
    INSERT INTO public.notification_logs (
      event_type, 
      user_id, 
      mood_value, 
      details
    ) VALUES (
      'low_mood_notification', 
      NEW.user_id, 
      NEW.mood_value,
      json_build_object('trigger_time', now(), 'mood_id', NEW.id)
    );
  END IF;
  
  -- Sempre retorna a linha que desencadeou o trigger
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, logamos a falha mas permitimos a inserção
    INSERT INTO public.notification_logs (
      event_type, 
      user_id, 
      mood_value, 
      details,
      status
    ) VALUES (
      'low_mood_notification_error', 
      NEW.user_id, 
      NEW.mood_value,
      json_build_object('error', SQLERRM, 'trigger_time', now(), 'mood_id', NEW.id),
      'error'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criação da tabela de logs para acompanhamento
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  mood_value SMALLINT,
  details JSONB,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar ou substituir o trigger para INSERT
DROP TRIGGER IF EXISTS trig_notify_low_mood ON public.mood_entries;

CREATE TRIGGER trig_notify_low_mood
AFTER INSERT ON public.mood_entries
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_mood();

-- Adicionar trigger para UPDATE também
DROP TRIGGER IF EXISTS trig_notify_low_mood_update ON public.mood_entries;

CREATE TRIGGER trig_notify_low_mood_update
AFTER UPDATE ON public.mood_entries
FOR EACH ROW
WHEN (NEW.mood_value <> OLD.mood_value AND (NEW.mood_value = 1 OR NEW.mood_value = 2))
EXECUTE FUNCTION public.notify_low_mood();

-- IMPORTANTE: Certifique-se de substituir o URL na função notify_low_mood acima
-- pela URL correta do seu projeto Supabase antes de executar este script
-- Exemplo: edge_function_url TEXT := 'https://seu-projeto-id.supabase.co/functions/v1';
--
-- Nenhuma configuração adicional é necessária.

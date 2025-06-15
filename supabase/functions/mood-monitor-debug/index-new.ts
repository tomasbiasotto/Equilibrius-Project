// supabase/functions/mood-monitor-debug/index.ts
// VERSÃO FINAL E GARANTIDA
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

console.log("INICIALIZANDO: mood-monitor-debug - VERSÃO FINAL E GARANTIDA")

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  relationship: string;
  user_id: string;
}

serve(async (req) => {
  // Log inicial
  console.log("--------------------------------")
  console.log("Nova requisição recebida")
  
  // Extração segura do payload
  let payload;
  try {
    payload = await req.json();
    console.log("Payload JSON processado:", JSON.stringify(payload));
  } catch (error) {
    console.log("Erro ao processar JSON:", error.message);
    payload = {};
  }
  
  // Headers para diagnóstico
  const headersObj = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  console.log("Headers:", JSON.stringify(headersObj));
  
  // URL e método para diagnóstico
  console.log("URL:", req.url);
  console.log("Método:", req.method);
  
  // Processamento principal
  try {
    // Extração de dados do payload
    let userId, moodValue;
    
    // Detectar formato do payload (webhook ou chamada direta)
    if (payload.type === 'INSERT' && payload.table === 'mood_entries') {
      // Formato de webhook
      userId = payload.record?.user_id;
      moodValue = payload.record?.mood_value;
      console.log("Registro de humor encontrado:", JSON.stringify(payload.record));
    } else {
      // Formato de chamada direta do trigger
      userId = payload.user_id;
      moodValue = payload.mood_value;
    }
    
    console.log('ALERTA: Humor baixo detectado ('+moodValue+') para usuário '+userId);
    
    // Validação básica
    if (!userId || (moodValue !== 1 && moodValue !== 2)) {
      throw new Error("Dados inválidos ou humor não é crítico");
    }
    
    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Verificando configurações:', 
      'SUPABASE_URL definida:', !!supabaseUrl,
      'SUPABASE_KEY definida:', !!supabaseKey
    );
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Cliente Supabase inicializado');
    
    // Buscar familiares - sem depender de tabela user_profiles
    const { data: familyMembers, error: familyError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId);
    
    if (familyError) {
      throw new Error(`Erro ao buscar familiares: ${familyError.message}`);
    }
    
    console.log(`${familyMembers?.length || 0} familiares encontrados para o usuário ${userId}`);
    
    if (!familyMembers || familyMembers.length === 0) {
      console.log("Nenhum familiar cadastrado para notificar");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Nenhum familiar para notificar" 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Inicializar Resend para envio de emails
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('RESEND_API_KEY definida:', !!resendApiKey);
    
    if (!resendApiKey) {
      throw new Error('API key do Resend não configurada');
    }
    
    // Nome simples para o usuário (sem depender de tabela user_profiles)
    const userName = `Usuário-${userId.substring(0, 8)}`;
    
    // Inicializar Resend
    const resend = new Resend(resendApiKey);
    console.log('Cliente Resend inicializado');
    
    // Preparar e enviar emails para cada familiar
    const emailPromises = familyMembers.map(async (member: FamilyMember) => {
      try {
        console.log(`Preparando email para familiar: ${member.name} <${member.email}>`);
        
        const moodText = moodValue === 1 ? 'muito baixo' : 'baixo';
        const emailData = {
          from: 'notificacoes@equilibrius-br.com.br',
          to: member.email,
          subject: `[Equilibrius] Uma pessoa próxima precisa de atenção agora`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d32f2f;">Notificação de Humor Baixo</h2>
              <p>Olá, ${member.name},</p>
              <p>
                <strong>Uma pessoa próxima a você</strong> acabou de registrar um humor ${moodText} 
                (nível ${moodValue} de 5) no aplicativo Equilibrius.  
              </p>
              <p>Recomendamos que você:</p>
              <ul>
                <li>Entre em contato com essa pessoa assim que possível</li>
                <li>Ofereça apoio emocional</li>
                <li>Verifique se há necessidade de assistência profissional</li>
              </ul>
              <p>
                Esta é uma notificação automática do sistema Equilibrius. 
                Você recebeu este alerta por fazer parte da rede de apoio desta pessoa.
              </p>
            </div>
          `
        };
        
        console.log(`Enviando email para: ${member.email}`);
        const { data, error } = await resend.emails.send(emailData);
        
        if (error) {
          console.error(`Erro ao enviar email para ${member.email}:`, error);
          return { member: member.id, success: false, error: error.message };
        }
        
        console.log(`Email enviado com sucesso para ${member.email}:`, data);
        return { member: member.id, success: true, data };
      } catch (emailError: any) {
        console.error(`Exceção ao processar email para ${member.email}:`, emailError);
        return { member: member.id, success: false, error: emailError.message };
      }
    });
    
    const emailResults = await Promise.allSettled(emailPromises);
    console.log('Resultados do envio de emails:', JSON.stringify(emailResults));
    
    // Retornar resposta de sucesso
    return new Response(JSON.stringify({
      success: true,
      message: `Notificações enviadas para ${familyMembers.length} familiares`,
      results: emailResults
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    // Log detalhado em caso de erro
    console.error("ERRO AO PROCESSAR NOTIFICAÇÕES:", err);
    
    // Resposta de erro
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

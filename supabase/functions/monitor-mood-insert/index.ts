// supabase/functions/monitor-mood-insert/index.ts
/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

interface MoodPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    user_id: string;
    mood_value: number;
    entry_date: string;
    notes?: string;
    created_at: string;
  };
  schema: string;
  old_record: null | any;
}

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  relationship: string;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
}

serve(async (req: Request) => {
  console.log('==== FUNÇÃO MONITOR-MOOD-INSERT INICIADA ====');
  console.log('Método da requisição:', req.method);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers), null, 2));
  
  // Modo de teste direto - permite testar a função por HTTP sem depender do webhook
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const testMode = url.searchParams.get('test') === 'true';
    const testUserId = url.searchParams.get('userId');
    
    if (testMode && testUserId) {
      console.log('MODO DE TESTE ATIVADO para usuário:', testUserId);
      
      try {
        // Inicializar cliente Supabase com service role para acesso adm
        const supabaseAdminClient: SupabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Inicializar Resend para envio de emails
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          console.error('RESEND_API_KEY não configurado.');
          return new Response('Configuração de e-mail ausente', { status: 500 });
        }
        
        const resend = new Resend(resendApiKey);
        console.log('Serviço de email inicializado');
        
        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabaseAdminClient
          .from('profiles')
          .select('id, full_name')
          .eq('id', testUserId)
          .single();
          
        if (userError) {
          console.error(`Erro ao buscar perfil do usuário ${testUserId}:`, userError);
          return new Response(`Erro ao buscar perfil: ${userError.message}`, { status: 500 });
        }
        
        console.log('Perfil encontrado:', userData);
        
        // Buscar dados de autenticação do usuário para o email
        const { data: authData, error: authError } = await supabaseAdminClient
          .auth.admin.getUserById(testUserId);
          
        if (authError || !authData?.user) {
          console.error(`Erro ao buscar dados de auth do usuário ${testUserId}:`, authError);
          return new Response(`Erro ao buscar dados de auth: ${authError?.message}`, { status: 500 });
        }
        
        console.log('Dados de auth recuperados');
        
        const user = {
          id: testUserId,
          email: authData.user.email || '',
          fullName: userData?.full_name || authData.user.email?.split('@')[0] || 'Usuário'
        };
        
        // Buscar familiares do usuário
        const { data: familyData, error: familyError } = await supabaseAdminClient
          .from('family_members')
          .select('id, name, email, relationship')
          .eq('user_id', testUserId);
          
        if (familyError) {
          console.error(`Erro ao buscar familiares do usuário ${testUserId}:`, familyError);
          return new Response(`Erro ao buscar familiares: ${familyError.message}`, { status: 500 });
        }
        
        // Verificar se o usuário tem familiares cadastrados
        if (!familyData || familyData.length === 0) {
          console.log(`Usuário ${user.fullName} (${testUserId}) não tem familiares cadastrados.`);
          return new Response('Sem familiares para notificar', { status: 200 });
        }
        
        console.log(`${familyData.length} familiares encontrados para teste`);
        
        // Enviar um email de teste para cada familiar
        let emailsEnviados = 0;
        for (const familyMember of familyData) {
          try {
            console.log(`Tentando enviar email de teste para ${familyMember.email}...`);
            
            const emailSubject = `[TESTE] Alerta de bem-estar: ${user.fullName}`;
            const emailHtmlBody = `
              <p>Olá ${familyMember.name || 'Familiar'},</p>
              <p><strong>Este é um email de TESTE do app Equilibrius.</strong></p>
              <p>Este email simula uma notificação quando ${user.fullName} registra um humor baixo.</p>
              <p>Se você está recebendo este email, significa que a função está corretamente configurada.</p>
              <br>
              <p>Atenciosamente,</p>
              <p>Equipe Equilibrius</p>
            `;
            
            const fromEmail = 'Equilibrius <notificacoes@equilibrius-br.com.br>';
            
            const emailResponse = await resend.emails.send({
              from: fromEmail,
              to: [familyMember.email],
              subject: emailSubject,
              html: emailHtmlBody,
            });
            
            console.log(`Email de teste enviado para ${familyMember.email}`);
            emailsEnviados++;
          } catch (emailError: any) {
            console.error(`Falha ao enviar e-mail de teste para ${familyMember.email}:`, emailError.message || emailError);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `TESTE CONCLUÍDO: ${emailsEnviados} de ${familyData.length} emails enviados para familiares de ${user.fullName}`,
            user: user,
            emailsSent: emailsEnviados,
            totalFamilyMembers: familyData.length
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (testError: any) {
        console.error('Erro no modo de teste:', testError.message || testError);
        return new Response(`Erro no teste: ${testError.message || 'Erro desconhecido'}`, { status: 500 });
      }
    }
  }
  
  try {
    // Log simplificado para detectar todas as chamadas
    console.log('-------------- NOVA REQUISIÇÃO RECEBIDA --------------');
    console.log('=> Tipo de requisição:', req.method);
    console.log('=> URL:', req.url);
    console.log('=> Headers:', JSON.stringify(Object.fromEntries(req.headers), null, 2));
    
    // Aceitar qualquer requisição para diagnóstico
    if (req.method === 'OPTIONS') {
      return new Response('OK', { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // Processar o payload do webhook
    const rawBody = await req.text();
    console.log('Corpo da requisição (raw):', rawBody);
    
    let payload: MoodPayload;
    try {
      payload = JSON.parse(rawBody);
      console.log('Payload processado:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('Erro ao analisar o payload JSON:', parseError);
      return new Response('Payload inválido', { status: 400 });
    }
    
    // Verificar se não é um evento relevante
    if (payload.type !== 'INSERT' || payload.table !== 'mood_entries') {
      return new Response('Evento ignorado', { status: 200 });
    }
    
    // Verificar se o humor é 1 ou 2
    const moodValue = payload.record.mood_value;
    if (moodValue !== 1 && moodValue !== 2) {
      return new Response('Humor não crítico, nenhuma ação necessária', { status: 200 });
    }
    
    const userId = payload.record.user_id;
    
    // Inicializar cliente Supabase com service role para acesso adm
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Inicializar Resend para envio de emails
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurado.');
      return new Response('Configuração de e-mail ausente', { status: 500 });
    }
    const resend = new Resend(resendApiKey);
    
    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabaseAdminClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error(`Erro ao buscar perfil do usuário ${userId}:`, userError);
      return new Response(`Erro ao buscar perfil: ${userError.message}`, { status: 500 });
    }
    
    // Buscar dados de autenticação do usuário para o email
    const { data: authData, error: authError } = await supabaseAdminClient
      .auth.admin.getUserById(userId);
      
    if (authError || !authData?.user) {
      console.error(`Erro ao buscar dados de auth do usuário ${userId}:`, authError);
      return new Response(`Erro ao buscar dados de auth: ${authError?.message}`, { status: 500 });
    }
    
    const user: UserProfile = {
      id: userId,
      email: authData.user.email || '',
      fullName: userData?.full_name || authData.user.email?.split('@')[0] || 'Usuário'
    };
    
    // Buscar familiares do usuário
    const { data: familyData, error: familyError } = await supabaseAdminClient
      .from('family_members')
      .select('id, name, email, relationship')
      .eq('user_id', userId);
      
    if (familyError) {
      console.error(`Erro ao buscar familiares do usuário ${userId}:`, familyError);
      return new Response(`Erro ao buscar familiares: ${familyError.message}`, { status: 500 });
    }
    
    // Verificar se o usuário tem familiares cadastrados
    if (!familyData || familyData.length === 0) {
      console.log(`Usuário ${user.fullName} (${userId}) registrou humor crítico (${moodValue}), mas não tem familiares cadastrados.`);
      return new Response('Sem familiares para notificar', { status: 200 });
    }
    
    // Formatar a data atual para exibição
    const today = new Date();
    const formattedDate = format(today, 'dd/MM/yyyy', { locale: ptBR });
    const formattedTime = format(today, 'HH:mm', { locale: ptBR });
    
    // Enviar email para cada familiar
    for (const familyMember of familyData as FamilyMember[]) {
      try {
        const emailSubject = `Alerta de bem-estar: ${user.fullName} registrou um humor baixo`;
        const moodText = moodValue === 1 ? 'muito baixo (1 - pior possível)' : 'baixo (2)';
        
        const emailHtmlBody = `
          <p>Olá ${familyMember.name || 'Familiar'},</p>
          <p><strong>Este é um alerta automático do app Equilibrius.</strong></p>
          <p>${user.fullName} acabou de registrar um humor ${moodText} em ${formattedDate} às ${formattedTime}.</p>
          <p>Esta é uma indicação de que ${user.fullName} pode estar passando por um momento difícil e precisando de apoio.</p>
          <br>
          <p><strong>O que você pode fazer:</strong></p>
          <ul>
            <li>Entre em contato com ${user.fullName}</li>
            <li>Ofereça apoio emocional</li>
            <li>Verifique se há necessidade de ajuda profissional</li>
          </ul>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Equilibrius</p>
        `;
        
        const fromEmail = 'Equilibrius <notificacoes@equilibrius-br.com.br>'; // Ajuste para seu domínio
        
        await resend.emails.send({
          from: fromEmail,
          to: [familyMember.email],
          subject: emailSubject,
          html: emailHtmlBody,
        });
        
        console.log(`Email enviado para ${familyMember.email} (${familyMember.relationship} de ${user.fullName})`);
      } catch (emailError: any) {
        console.error(`Falha ao enviar e-mail para ${familyMember.email}:`, emailError.message || emailError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificações enviadas para ${familyData.length} familiares de ${user.fullName}`
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: any) {
    console.error('Erro na Edge Function monitor-mood-insert:', error.message || error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});

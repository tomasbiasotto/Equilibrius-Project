// supabase/functions/monitor-mood-test/index.ts
/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

serve(async (req: Request) => {
  console.log('==== FUNÇÃO MONITOR-MOOD-TEST INICIADA ====');
  
  // Esta função pode ser testada diretamente através de uma chamada HTTP
  // Exemplo: curl -X POST https://[ref].supabase.co/functions/v1/monitor-mood-test
  
  // Simulação de dados de teste para um humor baixo
  const testUserId = req.url.includes('?userId=') 
    ? new URL(req.url).searchParams.get('userId')
    : null;
  
  if (!testUserId) {
    return new Response(
      'Forneça um userId na query string (?userId=SEU_ID_DO_USUÁRIO)',
      { status: 400 }
    );
  }
  
  console.log(`Testando com userId: ${testUserId}`);
  
  try {
    // Inicializar cliente Supabase
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Inicializar Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurado.');
      return new Response('Configuração de e-mail ausente', { status: 500 });
    }
    console.log('RESEND_API_KEY está configurada');
    
    const resend = new Resend(resendApiKey);
    
    // Buscar dados do usuário
    console.log('Buscando perfil do usuário...');
    const { data: userData, error: userError } = await supabaseAdminClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', testUserId)
      .single();
      
    if (userError) {
      console.error(`Erro ao buscar perfil do usuário ${testUserId}:`, userError);
      return new Response(`Erro ao buscar perfil: ${userError.message}`, { status: 500 });
    }
    
    console.log('Dados do perfil recuperados:', userData);
    
    // Buscar dados de autenticação do usuário para o email
    console.log('Buscando informações de autenticação...');
    const { data: authData, error: authError } = await supabaseAdminClient
      .auth.admin.getUserById(testUserId);
      
    if (authError || !authData?.user) {
      console.error(`Erro ao buscar dados de auth do usuário ${testUserId}:`, authError);
      return new Response(`Erro ao buscar dados de auth: ${authError?.message}`, { status: 500 });
    }
    
    console.log('Dados de auth recuperados:', JSON.stringify(authData.user, null, 2));
    
    const user = {
      id: testUserId,
      email: authData.user.email || '',
      fullName: userData?.full_name || authData.user.email?.split('@')[0] || 'Usuário'
    };
    
    // Buscar familiares do usuário
    console.log('Buscando familiares do usuário...');
    const { data: familyData, error: familyError } = await supabaseAdminClient
      .from('family_members')
      .select('id, name, email, relationship')
      .eq('user_id', testUserId);
      
    if (familyError) {
      console.error(`Erro ao buscar familiares do usuário ${testUserId}:`, familyError);
      return new Response(`Erro ao buscar familiares: ${familyError.message}`, { status: 500 });
    }
    
    console.log(`Encontrado ${familyData?.length || 0} familiares`);
    
    // Verificar se o usuário tem familiares cadastrados
    if (!familyData || familyData.length === 0) {
      console.log(`Usuário ${user.fullName} (${testUserId}) não tem familiares cadastrados.`);
      return new Response('Sem familiares para notificar', { status: 200 });
    }
    
    // Enviar email para cada familiar (apenas no modo teste)
    console.log(`Simulando envio de emails para ${familyData.length} familiares...`);
    
    let emailsEnviados = 0;
    for (const familyMember of familyData) {
      try {
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
        
        console.log(`Tentando enviar email para ${familyMember.email}...`);
        
        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [familyMember.email],
          subject: emailSubject,
          html: emailHtmlBody,
        });
        
        console.log(`Email enviado para ${familyMember.email}, resposta:`, emailResponse);
        emailsEnviados++;
      } catch (emailError: any) {
        console.error(`Falha ao enviar e-mail para ${familyMember.email}:`, emailError.message || emailError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Teste concluído. ${emailsEnviados} de ${familyData.length} emails enviados para familiares de ${user.fullName}`,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email
        },
        familyMembersCount: familyData.length
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Erro na função de teste:', error.message || error);
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

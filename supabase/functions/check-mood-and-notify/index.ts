// supabase/functions/check-mood-and-notify/index.ts
/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'
import { format } from "https://esm.sh/date-fns@3.6.0"
import { ptBR } from "https://esm.sh/date-fns@3.6.0/locale/pt-BR"

// Função para formatar data para YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

serve(async (req: Request) => {
  const cronSecretHeader = req.headers.get('X-Cron-Secret');
  const configuredCronSecret = Deno.env.get('CRON_SECRET');

  if (configuredCronSecret && cronSecretHeader !== configuredCronSecret) {
    console.warn('ACESSO NÃO AUTORIZADO: Header X-Cron-Secret não corresponde.');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurado.')
      return new Response('Configuração de e-mail ausente', { status: 500 })
    }
    const resend = new Resend(resendApiKey)

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayString = formatDateToYYYYMMDD(yesterday)

    console.log(`Verificando entradas de humor para a data: ${yesterdayString}`)

    // Passo 1: Buscar todos os user_ids distintos que têm familiares cadastrados
    const { data: distinctUserIdsData, error: distinctUserIdsError } = await supabaseAdminClient
      .from('family_members')
      .select('user_id', { count: 'exact', head: false }); // Usamos head:false para obter os dados

    if (distinctUserIdsError) {
      console.error("Erro ao buscar user_ids distintos de family_members:", JSON.stringify(distinctUserIdsError, null, 2));
      throw distinctUserIdsError;
    }

    if (!distinctUserIdsData || distinctUserIdsData.length === 0) {
      console.log('Nenhum familiar cadastrado encontrado para processar.');
      return new Response('Nenhum usuário para processar', { status: 200 });
    }
    
    // Extrair apenas os user_ids únicos
    const userIdsToProcess = [...new Set(distinctUserIdsData.map(item => item.user_id))].filter(id => id != null);

    if (userIdsToProcess.length === 0) {
        console.log('Nenhum user_id válido encontrado após filtragem.');
        return new Response('Nenhum usuário para processar', { status: 200 });
    }
    
    console.log(`IDs de usuários a processar: ${userIdsToProcess.join(', ')}`);

    // Passo 2: Iterar sobre cada user_id e buscar seus detalhes e familiares
    for (const userId of userIdsToProcess) {
      // Buscar detalhes do usuário (de auth.users)
      const { data: userData, error: userError } = await supabaseAdminClient
        .from('users') // Supabase JS client mapeia 'users' para 'auth.users'
        .select('id, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error(`Erro ao buscar detalhes do usuário ${userId}:`, JSON.stringify(userError, null, 2));
        continue; // Pula para o próximo user_id
      }

      if (!userData) {
        console.warn(`Usuário com ID ${userId} não encontrado na tabela 'users' (auth.users). Pulando.`);
        continue;
      }

      // Buscar familiares para este usuário
      const { data: familyMembers, error: familyError } = await supabaseAdminClient
        .from('family_members')
        .select('name, email, relationship')
        .eq('user_id', userId);

      if (familyError) {
        console.error(`Erro ao buscar familiares para o usuário ${userId}:`, JSON.stringify(familyError, null, 2));
        continue; // Pula para o próximo user_id
      }

      if (!familyMembers || familyMembers.length === 0) {
        console.log(`Nenhum familiar encontrado para o usuário ${userId} (apesar de esperado). Pulando.`);
        continue;
      }

      const user = {
        id: userData.id,
        email: userData.email,
        fullName: userData.email.split('@')[0] || 'Usuário', // Nome simplificado
      };

      console.log(`Processando usuário: ${user.fullName} (${user.id}) com ${familyMembers.length} familiar(es).`);

      // Verificar a entrada de humor do usuário para "ontem"
      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id)
        .eq('entry_date', yesterdayString)
        .single();

      if (moodError && moodError.code !== 'PGRST116') {
        console.error(`Erro ao buscar humor para ${user.fullName} (${user.id}):`, moodError);
        continue;
      }

      let reasonForNotification: string | null = null;
      let userMoodValue: number | null = null;

      if (!moodEntry) {
        reasonForNotification = `${user.fullName} não registrou seu humor ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`;
        console.log(`Notificação para ${user.fullName}: Sem entrada de humor.`);
      } else {
        userMoodValue = moodEntry.mood_value;
        if (userMoodValue === 1 || userMoodValue === 2) {
          reasonForNotification = `${user.fullName} registrou um humor baixo (${userMoodValue}) ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`;
          console.log(`Notificação para ${user.fullName}: Humor baixo (${userMoodValue}).`);
        }
      }

      if (reasonForNotification) {
        for (const familyMember of familyMembers) {
          try {
            const emailSubject = `Atualização sobre o bem-estar de ${user.fullName}`;
            const emailHtmlBody = `
              <p>Olá ${familyMember.name || 'Familiar'},</p>
              <p>Este é um contato do app Equilibrius.</p>
              <p>${reasonForNotification}</p>
              ${userMoodValue ? `<p>Humor registrado: ${userMoodValue} (numa escala de 1 a 5, sendo 1 o mais baixo).</p>` : ''}
              <p>Sugerimos que você entre em contato para oferecer seu apoio.</p>
              <br>
              <p>Atenciosamente,</p>
              <p>Equipe Equilibrius</p>
            `;
            const fromEmail = 'Equilibrius <notificacoes@equilibrius-br.com.br>'; // AJUSTE SEU DOMÍNIO AQUI

            await resend.emails.send({
              from: fromEmail,
              to: [familyMember.email],
              subject: emailSubject,
              html: emailHtmlBody,
            });
            console.log(`E-mail enviado para ${familyMember.email} (familiar de ${user.fullName})`);
          } catch (emailError: any) {
            console.error(`Falha ao enviar e-mail para ${familyMember.email} sobre ${user.fullName}:`, emailError.message || emailError);
          }
        }
      } else {
        console.log(`Nenhuma notificação necessária para ${user.fullName} para ${yesterdayString}.`);
      }
    } // Fim do loop por userId

    return new Response('Verificação de humor concluída.', { status: 200 });
  } catch (error: any) {
    console.error('Erro GERAL na Edge Function check-mood-and-notify:', error.message || error);
    return new Response(`Erro interno: ${error.message || 'Erro desconhecido'}`, { status: 500 });
  }
});
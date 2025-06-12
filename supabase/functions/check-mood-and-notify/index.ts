// supabase/functions/check-mood-and-notify/index.ts
/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'
import { format } from "https://esm.sh/date-fns@3.6.0"
import { ptBR } from "https://esm.sh/date-fns@3.6.0/locale/pt-BR"

const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface UserFamilyDataFromRPC {
  user_id: string;
  user_email: string;
  user_full_name_from_profile: string | null;
  family_member_name: string;
  family_member_email: string;
  family_member_relationship: string;
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

    // Chamar a função PostgreSQL via RPC
    const { data: rpcData, error: rpcError } = await supabaseAdminClient
      .rpc('get_users_and_families_for_notification');

    if (rpcError) {
      console.error("Erro ao chamar RPC get_users_and_families_for_notification:", JSON.stringify(rpcError, null, 2));
      // Se a RPC falhar, não podemos continuar.
      return new Response(`Erro ao buscar dados via RPC: ${rpcError.message}`, { status: 500 });
    }

    const processedData = rpcData as UserFamilyDataFromRPC[] | null;

    if (!processedData || processedData.length === 0) {
      console.log('Nenhum usuário com familiares encontrado via RPC.');
      return new Response('Nenhum usuário para processar', { status: 200 });
    }
    
    const usersToNotifyMap = new Map<string, { 
        id: string; 
        email: string; 
        fullName: string; 
        familyMembers: Array<{ name: string; email: string; relationship: string }> 
    }>();

    for (const record of processedData) {
      const userId = record.user_id;
      const userEmail = record.user_email;
      const userNameForEmail = record.user_full_name_from_profile || userEmail.split('@')[0] || 'Usuário'; 

      if (!usersToNotifyMap.has(userId)) {
        usersToNotifyMap.set(userId, {
          id: userId,
          email: userEmail,
          fullName: userNameForEmail,
          familyMembers: []
        });
      }
      
      usersToNotifyMap.get(userId)!.familyMembers.push({
        name: record.family_member_name,
        email: record.family_member_email,
        relationship: record.family_member_relationship
      });
    }

    const usersToNotifyList = Array.from(usersToNotifyMap.values());
    console.log(`${usersToNotifyList.length} usuários únicos para processar.`);

    for (const userData of usersToNotifyList) {
      const user = { 
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
      }
      const familyMembers = userData.familyMembers; 

      console.log(`Processando usuário: ${user.fullName} (${user.id}) com ${familyMembers.length} familiar(es).`);

      // ESTA QUERY NÃO DEVERIA CAUSAR O ERRO "public.users does not exist"
      // A FK em mood_entries.user_id aponta para auth.users.id
      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries') // Esta tabela está em 'public'
        .select('mood_value')
        .eq('user_id', user.id) // user.id aqui é o UUID de auth.users
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
    } 

    return new Response('Verificação de humor concluída.', { status: 200 });
  } catch (error: any) {
    console.error('Erro GERAL na Edge Function check-mood-and-notify:', error.message || error);
    return new Response(`Erro interno: ${error.message || 'Erro desconhecido'}`, { status: 500 });
  }
});
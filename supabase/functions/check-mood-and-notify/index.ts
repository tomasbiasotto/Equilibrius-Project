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

    // Consulta simplificada: Buscar de 'users' (auth.users) e fazer join com 'family_members'
    const { data: usersWithFamily, error: usersError } = await supabaseAdminClient
      .from('users') // Refere-se a auth.users
      .select(`
        id,
        email,
        family_members!inner ( user_id, name, email, relationship ) 
      `)
      .not('family_members', 'is', null) // Garante que apenas usuários com familiares sejam selecionados

    if (usersError) {
        console.error("Erro ao buscar usuários e seus familiares:", JSON.stringify(usersError, null, 2));
        throw usersError;
    }

    if (!usersWithFamily || usersWithFamily.length === 0) {
      console.log('Nenhum usuário com familiares cadastrados encontrado.')
      return new Response('Nenhum usuário para processar', { status: 200 })
    }

    for (const userData of usersWithFamily) {
      // Se full_name não está disponível, podemos usar o email ou uma saudação genérica.
      // Para este exemplo, vamos usar o início do email se full_name da tabela profiles não for usado.
      const userNameForEmail = userData.email.split('@')[0] || 'Usuário';

      const user = {
        id: userData.id,
        email: userData.email,
        // Se você decidir usar profiles no futuro, buscaria o full_name daqui.
        // Por agora, usamos uma alternativa.
        fullName: userNameForEmail,
      }

      const familyMembers: Array<{ name: string; email: string; relationship: string }> | null = userData.family_members

      if (!familyMembers || familyMembers.length === 0) {
        // Este log é redundante por causa do .not('family_members', 'is', null) na query,
        // mas é uma boa verificação de segurança.
        console.log(`Usuário ${user.fullName} (${user.id}) não tem familiares ativos (verificação interna). Pulando.`);
        continue;
      }

      console.log(`Processando usuário: ${user.fullName} (${user.id}, ${user.email})`);

      // Verificar a entrada de humor do usuário para "ontem"
      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id) // user.id é o auth.users.id
        .eq('entry_date', yesterdayString)
        .single()

      if (moodError && moodError.code !== 'PGRST116') {
        console.error(`Erro ao buscar humor para ${user.fullName}:`, moodError)
        continue
      }

      let reasonForNotification: string | null = null
      let userMoodValue: number | null = null

      if (!moodEntry) {
        reasonForNotification = `${user.fullName} não registrou seu humor ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`
        console.log(`Notificação para ${user.fullName}: Sem entrada de humor.`)
      } else {
        userMoodValue = moodEntry.mood_value
        if (userMoodValue === 1 || userMoodValue === 2) {
          reasonForNotification = `${user.fullName} registrou um humor baixo (${userMoodValue}) ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`
          console.log(`Notificação para ${user.fullName}: Humor baixo (${userMoodValue}).`)
        }
      }

      if (reasonForNotification) {
        for (const familyMember of familyMembers) {
          try {
            const emailSubject = `Atualização sobre o bem-estar de ${user.fullName}`
            const emailHtmlBody = `
              <p>Olá ${familyMember.name || 'Familiar'},</p>
              <p>Este é um contato do app Equilibrius.</p>
              <p>${reasonForNotification}</p>
              ${userMoodValue ? `<p>Humor registrado: ${userMoodValue} (numa escala de 1 a 5, sendo 1 o mais baixo).</p>` : ''}
              <p>Sugerimos que você entre em contato para oferecer seu apoio.</p>
              <br>
              <p>Atenciosamente,</p>
              <p>Equipe Equilibrius</p>
            `
            const fromEmail = 'Equilibrius onboarding@resend.dev'; // ALTERE AQUI

            await resend.emails.send({
              from: fromEmail,
              to: [familyMember.email],
              subject: emailSubject,
              html: emailHtmlBody,
            })
            console.log(`E-mail enviado para ${familyMember.email} sobre ${user.fullName}`)
          } catch (emailError: any) {
            console.error(`Falha ao enviar e-mail para ${familyMember.email} sobre ${user.fullName}:`, emailError.message || emailError)
          }
        }
      } else {
        console.log(`Nenhuma notificação necessária para ${user.fullName} para ${yesterdayString}.`)
      }
    }

    return new Response('Verificação de humor concluída.', { status: 200 })
  } catch (error: any) {
    console.error('Erro GERAL na Edge Function check-mood-and-notify:', error.message || error)
    return new Response(`Erro interno: ${error.message || 'Erro desconhecido'}`, { status: 500 })
  }
})
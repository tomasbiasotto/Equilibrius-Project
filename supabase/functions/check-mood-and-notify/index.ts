/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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

  console.log(`DEBUG: Header X-Cron-Secret recebido: ${cronSecretHeader}`);
  console.log(`DEBUG: Segredo CRON_SECRET configurado: ${configuredCronSecret}`);

  if (configuredCronSecret && cronSecretHeader !== configuredCronSecret) {
    console.warn('ACESSO NÃO AUTORIZADO: Header X-Cron-Secret não corresponde ao segredo configurado.');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseAdminClient = createClient(
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

    // !!! IMPORTANTE: Substitua 'profiles_id_fkey' pelo nome real da sua constraint FK !!!
    // Você pode descobrir o nome usando a query SQL que forneci anteriormente.
    const nomeDaForeignKeyConstraintDeProfilesParaAuthUsers = 'profiles_id_fkey';

    const { data: usersData, error: usersError } = await supabaseAdminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      user_auth_info: ${nomeDaForeignKeyConstraintDeProfilesParaAuthUsers}!inner ( email ), 
      family_members!inner ( name, email, relationship )
    `)
    .not('family_members', 'is', null)

    if (usersError) throw usersError
    if (!usersData || usersData.length === 0) {
      console.log('Nenhum usuário com familiares cadastrados encontrado.')
      return new Response('Nenhum usuário para processar', { status: 200 })
    }

    for (const userProfile of usersData) {
      if (!userProfile.user_auth_info || !userProfile.user_auth_info.email) {
        console.warn(`Usuário ${userProfile.id} não tem dados de autenticação (email) associados em 'user_auth_info'. Pulando.`);
        continue;
      }

      const user = {
        id: userProfile.id,
        email: userProfile.user_auth_info.email,
        fullName: userProfile.full_name || 'Usuário',
      }
      // A CHAVE EXTRA FOI REMOVIDA DA LINHA ANTERIOR (onde estava '};')

      // Adicionar uma verificação para o caso de email ser null, se necessário (já está implícito no check acima)
      // A verificação `!userProfile.user_auth_info.email` já cobre isso.
      // Se por algum motivo o objeto `user` pudesse ser formado mas `user.email` fosse explicitamente `null`
      // (o que não deve acontecer com a query atual se o email for NOT NULL na tabela auth.users),
      // a verificação abaixo seria redundante ou precisaria de ajuste.
      // A lógica atual com `!userProfile.user_auth_info.email` é suficiente.

      const familyMembers: Array<{ name: string; email: string; relationship: string }> = userProfile.family_members

      if (!familyMembers || familyMembers.length === 0) {
        console.log(`Usuário ${user.fullName} (${user.id}) não tem familiares ativos. Pulando.`);
        continue;
      }

      console.log(`Processando usuário: ${user.fullName} (${user.id})`);

      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id)
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

            await resend.emails.send({
              from: 'Equilibrius equilibrius-br.com.br', // SUBSTITUA PELO SEU DOMÍNIO
              to: [familyMember.email],
              subject: emailSubject,
              html: emailHtmlBody,
            })
            console.log(`E-mail enviado para ${familyMember.email} sobre ${user.fullName}`)
          } catch (emailError) {
            console.error(`Falha ao enviar e-mail para ${familyMember.email}:`, emailError)
          }
        } // Fim do loop familyMember
      } else {
        console.log(`Nenhuma notificação necessária para ${user.fullName} para ${yesterdayString}.`)
      }
    } // Fim do loop userProfile

    return new Response('Verificação de humor concluída.', { status: 200 })
  } catch (error) {
    console.error('Erro na Edge Function check-mood-and-notify:', error)
    return new Response(`Erro interno: ${error.message}`, { status: 500 })
  }
})
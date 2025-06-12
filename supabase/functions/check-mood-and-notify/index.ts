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

  // Comente ou remova este log em produção
  // console.log(`DEBUG: Header X-Cron-Secret recebido: ${cronSecretHeader}`);
  // console.log(`DEBUG: Segredo CRON_SECRET configurado: ${configuredCronSecret}`);

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

    // Query Modificada: Partir de 'family_members' e fazer join com 'users'
    const { data: familyDataWithUsers, error: queryError } = await supabaseAdminClient
      .from('family_members')
      .select(`
        user_id, 
        name,      // Nome do familiar
        email,     // Email do familiar
        relationship,
        users!inner ( id, email ) // Dados do usuário (auth.users)
      `)
      // O !inner em users garante que só pegamos familiares com usuários válidos.
      // Não é necessário .not('users', 'is', null) por causa do !inner.

    if (queryError) {
        console.error("Erro ao buscar familiares e seus usuários:", JSON.stringify(queryError, null, 2));
        throw queryError; // Lança o erro para o catch geral
    }

    if (!familyDataWithUsers || familyDataWithUsers.length === 0) {
      console.log('Nenhum familiar cadastrado com usuário associado encontrado.')
      return new Response('Nenhum usuário para processar', { status: 200 })
    }

    // Reagrupar os dados por usuário
    const usersToNotifyMap = new Map<string, { 
        id: string; 
        email: string; 
        fullName: string; 
        familyMembers: Array<{ name: string; email: string; relationship: string }> 
    }>();

    for (const record of familyDataWithUsers) {
      if (!record.users) {
        console.warn(`Registro de familiar ${record.name} (ID do familiar não disponível diretamente aqui, user_id: ${record.user_id}) sem dados de usuário retornados do join. Pulando.`);
        continue;
      }

      const userId = record.users.id;
      const userEmail = record.users.email;
      // Usar a parte antes do @ do e-mail do usuário como nome para o e-mail,
      // já que não estamos mais buscando 'profiles' nesta função.
      const userNameForEmail = userEmail.split('@')[0] || 'Usuário'; 

      if (!usersToNotifyMap.has(userId)) {
        usersToNotifyMap.set(userId, {
          id: userId,
          email: userEmail,
          fullName: userNameForEmail,
          familyMembers: []
        });
      }
      
      // Adiciona o familiar atual ao array do usuário correspondente
      usersToNotifyMap.get(userId)!.familyMembers.push({
        name: record.name, // Nome do familiar
        email: record.email, // Email do familiar
        relationship: record.relationship
      });
    }

    const usersToNotifyList = Array.from(usersToNotifyMap.values());

    // Iterar sobre a lista de usuários únicos para notificar
    for (const userData of usersToNotifyList) {
      const user = { // Objeto 'user' para consistência com o código anterior
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
      }
      const familyMembers = userData.familyMembers; // Array de familiares para este usuário

      console.log(`Processando usuário: ${user.fullName} (${user.id}, ${user.email}) com ${familyMembers.length} familiar(es).`);

      // Verificar a entrada de humor do usuário para "ontem"
      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id) // user.id é o auth.users.id
        .eq('entry_date', yesterdayString)
        .single()

      if (moodError && moodError.code !== 'PGRST116') { // PGRST116: Query returned no rows
        console.error(`Erro ao buscar humor para ${user.fullName} (${user.id}):`, moodError)
        continue // Pula para o próximo usuário
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
            // CERTIFIQUE-SE DE ALTERAR "seu-dominio-verificado.com" ABAIXO
            const fromEmail = 'Equilibrius <notificacoes@equilibrius-br.com.br>'; // ALTERE AQUI

            await resend.emails.send({
              from: fromEmail,
              to: [familyMember.email], // Email do familiar
              subject: emailSubject,
              html: emailHtmlBody,
            })
            console.log(`E-mail enviado para ${familyMember.email} (familiar de ${user.fullName})`)
          } catch (emailError: any) {
            console.error(`Falha ao enviar e-mail para ${familyMember.email} sobre ${user.fullName}:`, emailError.message || emailError)
          }
        }
      } else {
        console.log(`Nenhuma notificação necessária para ${user.fullName} para ${yesterdayString}.`)
      }
    } // Fim do loop por userData

    return new Response('Verificação de humor concluída.', { status: 200 })
  } catch (error: any) {
    console.error('Erro GERAL na Edge Function check-mood-and-notify:', error.message || error)
    return new Response(`Erro interno: ${error.message || 'Erro desconhecido'}`, { status: 500 })
  }
})
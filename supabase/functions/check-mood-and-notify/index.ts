/// <reference path="../supabase-edge.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend' // Importa o Resend via npm specifier
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
  const cronSecretHeader = req.headers.get('X-Cron-Secret'); // Nome correto do header
  const configuredCronSecret = Deno.env.get('CRON_SECRET'); // Nome correto do segredo

  console.log(`DEBUG: Header X-Cron-Secret recebido: ${cronSecretHeader}`);
  console.log(`DEBUG: Segredo CRON_SECRET configurado: ${configuredCronSecret}`);

  if (configuredCronSecret && cronSecretHeader !== configuredCronSecret) {
    console.warn('ACESSO NÃO AUTORIZADO: Header X-Cron-Secret não corresponde ao segredo configurado.');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Usar SERVICE_ROLE_KEY para bypass RLS
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurado.')
      return new Response('Configuração de e-mail ausente', { status: 500 })
    }
    const resend = new Resend(resendApiKey)

    // 2. Determinar a data de "ontem"
    // O cron rodará no início do dia (ex: 00:05 UTC) para verificar o dia anterior.
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayString = formatDateToYYYYMMDD(yesterday)

    console.log(`Verificando entradas de humor para a data: ${yesterdayString}`)

    // 3. Buscar todos os usuários que têm familiares cadastrados
    //    e também informações de perfil para personalizar o e-mail.
    const { data: usersWithFamily, error: usersError } = await supabaseAdminClient
      .from('profiles') // Assumindo que 'profiles' tem user_id (id) e full_name
      .select(`
        id,
        full_name,
        auth_users_via_id:users ( email ),
        family_members!inner ( name, email, relationship )
      `)
      //.not('family_members', 'is', null) // Garante que haja pelo menos um familiar

    if (usersError) throw usersError
    if (!usersWithFamily || usersWithFamily.length === 0) {
      console.log('Nenhum usuário com familiares cadastrados encontrado.')
      return new Response('Nenhum usuário para processar', { status: 200 })
    }

    // 4. Iterar sobre cada usuário
    for (const userProfile of usersWithFamily) {
      const user = {
        id: userProfile.id,
        // Acessa o email através do alias que demos à relação com auth.users
        email: userProfile.auth_users_via_id ? userProfile.auth_users_via_id.email : null, // <--- AJUSTE AQUI
        fullName: userProfile.full_name || 'Usuário',
      };
      // Adicionar uma verificação para o caso de email ser null, se necessário
      if (!user.email) {
        console.warn(`Usuário ${user.id} não possui e-mail associado em auth.users. Pulando.`);
        continue;
      }
      const familyMembers: Array<{ name: string; email: string; relationship: string }> = userProfile.family_members

      if (!familyMembers || familyMembers.length === 0) {
        console.log(`Usuário ${user.fullName} (${user.id}) não tem familiares ativos. Pulando.`);
        continue;
      }

      console.log(`Processando usuário: ${user.fullName} (${user.id})`);

      // 5. Verificar a entrada de humor do usuário para "ontem"
      const { data: moodEntry, error: moodError } = await supabaseAdminClient
        .from('mood_entries')
        .select('mood_value')
        .eq('user_id', user.id)
        .eq('entry_date', yesterdayString)
        .single() // Esperamos uma ou nenhuma entrada

      if (moodError && moodError.code !== 'PGRST116') { // PGRST116: "Query returned no rows"
        console.error(`Erro ao buscar humor para ${user.fullName}:`, moodError)
        continue // Pula para o próximo usuário
      }

      let reasonForNotification: string | null = null
      let userMoodValue: number | null = null

      if (!moodEntry) {
        // Condição 1: Nenhuma entrada de humor
        reasonForNotification = `${user.fullName} não registrou seu humor ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`
        console.log(`Notificação para ${user.fullName}: Sem entrada de humor.`)
      } else {
        userMoodValue = moodEntry.mood_value
        if (userMoodValue === 1 || userMoodValue === 2) {
          // Condição 2: Humor baixo
          reasonForNotification = `${user.fullName} registrou um humor baixo (${userMoodValue}) ontem (${format(yesterday, 'dd/MM/yyyy', { locale: ptBR })}).`
          console.log(`Notificação para ${user.fullName}: Humor baixo (${userMoodValue}).`)
        }
      }

      // 6. Se houver motivo, enviar e-mail para os familiares
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
              from: 'Equilibrius <nao-responda@seu-dominio-verificado.com>', // SEU DOMÍNIO VERIFICADO NO RESEND
              to: [familyMember.email],
              subject: emailSubject,
              html: emailHtmlBody,
            })
            console.log(`E-mail enviado para ${familyMember.email} sobre ${user.fullName}`)
          } catch (emailError) {
            console.error(`Falha ao enviar e-mail para ${familyMember.email}:`, emailError)
          }
        }
      } else {
        console.log(`Nenhuma notificação necessária para ${user.fullName} para ${yesterdayString}.`)
      }
    }

    return new Response('Verificação de humor concluída.', { status: 200 })
  } catch (error) {
    console.error('Erro na Edge Function check-mood-and-notify:', error)
    return new Response(`Erro interno: ${error.message}`, { status: 500 })
  }
})

// As importações de format e ptBR do date-fns foram movidas para o topo do arquivo
# Modulo Relatorios

Modulo para configurar destinatarios, agendamentos e historico de envio de resumos operacionais.

## Estrutura

- `Reports`: quadro geral de envios, erros, rotinas ativas e historico.
- `Admin`: cadastro de destinatarios, templates e agendamentos.
- Endpoint n8n: `/api/relatorios/due?time=HH:mm`.
- Endpoint de log: `/api/relatorios/log`.

## Templates e blocos

Cada agendamento pode usar um template pronto ou uma configuracao personalizada.

Templates iniciais:

- `Ju - Resumo executivo`: agenda, financeiro, ocorrencias, directs/interacoes, Ads e objetivos.
- `Ju - Fechamento do dia`: leitura curta do dia e principais pendencias.
- `Suporte - Prioridades do dia`: agenda do dia, proximos compromissos financeiros, ocorrencias e interacoes pendentes.
- `Jeff - Alertas tecnicos`: envia apenas quando houver alerta.
- `Especialista - Agenda operacional`: foco nos proximos compromissos.
- `Lembrete de agenda`: envia somente se existir compromisso dentro da antecedencia configurada.

Blocos disponiveis:

- Agenda
- Financeiro operacional
- Ocorrencias
- Directs e interacoes
- Ads
- Objetivos e metas

Cada bloco tem seu proprio periodo: hoje, amanha, proximos 7 dias, proximos 15 dias, mes atual, ultimos 7 dias, ultimos 30 dias, ano atual ou pendentes em aberto.

Use `Enviar apenas se houver alerta` para evitar mensagens vazias. Nesse caso, o envio e registrado como `ignorado` quando nao houver evento, pendencia ou alerta relevante no periodo.

## Lembrete de agendamento

Para lembretes:

1. Crie um agendamento com tipo `Lembrete de agenda`.
2. Selecione o template `Lembrete de agenda`.
3. Configure a antecedencia em minutos, por exemplo `60`.
4. Mantenha o bloco `Agenda` ativo.

O sistema envia apenas se houver evento dentro da janela configurada.

## Variaveis

Na Vercel e no ambiente local:

```env
N8N_INGEST_TOKEN=um_token_forte_compartilhado_com_o_n8n
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
TELEGRAM_BOT_TOKEN=token_do_botfather
```

No n8n:

```env
PLATAFORMA_BASE_URL=https://plataf-op-hml.vercel.app
N8N_INGEST_TOKEN=o_mesmo_token_da_vercel
TELEGRAM_BOT_TOKEN=token_do_botfather
```

## Como configurar Telegram

1. Abra o Telegram e fale com `@BotFather`.
2. Use `/newbot` e crie o bot.
3. Copie o token gerado.
4. Envie uma mensagem para o bot, ou adicione o bot em um grupo.
5. Abra no navegador:
   `https://api.telegram.org/botSEU_TOKEN/getUpdates`
6. Copie o `chat.id`.
7. No modulo `Relatorios > Admin`, preencha o `Telegram chat ID` do destinatario.

## Workflow n8n

Importe o arquivo:

`modules/relatorios/Resumo_Operacional_Telegram_v1.json`

O workflow roda a cada 15 minutos, calcula o horario de Sao Paulo, pergunta para a plataforma quais reports estao previstos naquele horario e envia por Telegram.

Se o mesmo report ja foi preparado ou enviado no dia, a plataforma nao duplica.

## Envio imediato

O botao `Enviar agora` fica em `Relatorios > Admin > Agendamentos` e envia o resumo por Telegram sem depender do horario do workflow.

Para funcionar em homologacao/producao, configure tambem na Vercel:

```env
TELEGRAM_BOT_TOKEN=token_do_botfather
```

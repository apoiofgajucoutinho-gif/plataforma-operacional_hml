# Modulo Relatorios

Modulo para configurar destinatarios, agendamentos e historico de envio de resumos operacionais.

## Estrutura

- `Reports`: quadro geral de envios, erros, rotinas ativas e historico.
- `Admin`: cadastro de destinatarios e agendamentos.
- Endpoint n8n: `/api/relatorios/due?time=HH:mm`.
- Endpoint de log: `/api/relatorios/log`.

## Variaveis

Na Vercel e no ambiente local:

```env
N8N_INGEST_TOKEN=um_token_forte_compartilhado_com_o_n8n
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
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

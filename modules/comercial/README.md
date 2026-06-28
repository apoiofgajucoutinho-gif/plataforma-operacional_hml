# Modulo Comercial

Modulo local para consolidar vendas Hotmart, recebiveis, alunos e produtos antes de integrar os dados ao Financeiro.

## Estado atual

- As tabelas ficam nas migrations `supabase/migrations/0038_comercial_module.sql` e complementos posteriores.
- A rota de ingestao fica em `POST /api/comercial/hotmart/import`.
- O modulo aparece em `/comercial`, liberado por permissao `comercial`.
- O endpoint faz upsert por `tenant_id + transaction_id`.
- Nenhuma migration deve ser aplicada em homologacao/producao sem validacao previa.

## Regra financeira oficial atual

- O modulo Comercial/Financeiro trabalha hoje com receita bruta oficial da Hotmart como fonte financeira confiavel.
- Receita liquida fica indisponivel quando a Hotmart nao fornece `net_amount` no payload.
- Taxas ficam indisponiveis quando a Hotmart nao fornece `fees` no payload.
- Recebiveis oficiais so sao tratados como oficiais quando a Hotmart fornece `expected_payment_date` e informacoes financeiras suficientes.
- Recebiveis sem fonte oficial Hotmart permanecem claramente identificados como projetados.
- O sistema nao copia valor bruto para valor liquido.

## Launch Intelligence Essentials

A aba `Lancamento` transforma os dados reais ja importados da Hotmart em uma leitura operacional do mini lancamento.

Nesta primeira versao:

- Nao usa IA.
- Nao chama OpenRouter.
- Nao altera ingestao Hotmart.
- Nao altera workflows n8n.
- Nao altera migrations.
- Usa apenas `comercial_vendas`, `comercial_recebiveis`, `comercial_alunos`, `comercial_produtos` e `comercial_hotmart_raw` ja carregados pelo backend.
- Exclui transacoes com `transaction_id` iniciado por `TESTE-` dos KPIs principais da aba.
- Considera confiavel: vendas, receita bruta, status, produto, comprador, forma de pagamento, source_sck quando existir e eventos recentes.
- Exibe com alerta: receita liquida, saldo realizado, saldo a receber, taxas e recebiveis projetados.

Filtros da aba:

- Hoje
- Ontem
- 7 dias
- 15 dias
- 30 dias
- Mes
- Lancamento
- Tudo
- Personalizado

O filtro `Lancamento` permite configurar nome, data inicial e data final em estado local da tela.

## Variaveis necessarias na plataforma

No `.env.local` ou Vercel:

```env
N8N_INGEST_TOKEN=um_token_longo_aleatorio
SUPABASE_SERVICE_ROLE_KEY=service_role_do_supabase
```

## Variaveis necessarias no n8n

Configure como variaveis de ambiente, credenciais ou secrets do n8n. Nao cole tokens em nodes versionados.

```env
PLATAFORMA_COMERCIAL_IMPORT_URL=https://plataf-op-hml.vercel.app/api/comercial/hotmart/import
PLATAFORMA_TENANT_ID=<tenant_id_da_juliana>
N8N_INGEST_TOKEN=<mesmo_token_da_plataforma>
HOTMART_BASIC_AUTHORIZATION=<Basic gerado para OAuth client_credentials>
HOTMART_TOKEN_URL=https://api-sec-vlc.hotmart.com/security/oauth/token
HOTMART_SALES_HISTORY_URL=https://developers.hotmart.com/payments/api/v1/sales/history
HOTMART_MAX_RESULTS=100
```

Para backfill manual, opcionais:

```env
HOTMART_BACKFILL_START_DATE=2020-01-01
HOTMART_BACKFILL_END_DATE=2026-06-27
HOTMART_MAX_PAGES_PER_STATUS=500
```

Para incremental:

```env
HOTMART_LOOKBACK_DAYS=3
HOTMART_MAX_PAGES_PER_STATUS=50
```

## Payload aceito pela plataforma

Formato obrigatorio:

```json
{
  "tenant_id": "uuid-do-tenant",
  "rows": [
    {
      "event_id": "evt_123",
      "transaction_id": "HP123",
      "event": "sales_history",
      "product_id": "987",
      "product_name": "Curso AASI",
      "buyer_email": "cliente@email.com",
      "buyer_name": "Cliente",
      "buyer_phone": "+553199999999",
      "status": "APPROVED",
      "payment_type": "credit_card",
      "installments": 6,
      "currency": "BRL",
      "gross_amount": 1200,
      "net_amount": 1080,
      "fees": 120,
      "purchase_date": "2026-06-10T10:00:00-03:00",
      "approved_date": "2026-06-10T10:05:00-03:00",
      "expected_payment_date": "2026-07-10",
      "source_sck": "campanha_x",
      "raw_payload": {}
    }
  ]
}
```

Regras importantes:

- `tenant_id` e `rows` sao obrigatorios.
- `transaction_id` e obrigatorio para importar uma venda.
- `buyer_email` e importado quando existir, mas nao bloqueia a venda.
- `net_amount` nao deve ser inventado. Se a Hotmart nao enviar, fica `null`.
- `gross_amount` nunca e usado como liquido.
- `fees` fica `null` quando nao vier da Hotmart.
- `expected_payment_date` so gera recebivel quando vier da Hotmart. Se nao vier, o sistema registra lacuna; nao cria previsao artificial.
- Duplicidade e evitada por upsert `tenant_id + transaction_id`.

## Workflows n8n versionados

### 1. `Hotmart_Comercial_Webhook_v1.json`

Uso: eventos em tempo real enviados pela Hotmart.

Node principal: `Enviar Plataforma Comercial`.

Configuracao esperada:

- Method: `POST`
- URL: `={{ $json.config.plataformaImportUrl.replace(/\/$/, "") }}`
- Headers:
  - `Authorization`: `={{ 'Bearer ' + $json.config.n8nIngestToken }}`
  - `Content-Type`: `application/json`
- Body JSON:

```js
={{ { tenant_id: $json.config.plataformaTenantId, rows: $json.rows } }}
```

O webhook responde `200` mesmo quando ignora evento sem `transaction_id`, retornando `reason`.

### 2. `Hotmart_Comercial_Backfill_Historico_v1.json`

Uso: importacao historica manual.

Comportamento:

- Manual Trigger.
- Itera status por status.
- Itera paginas por status.
- Monta a URL da Hotmart com `transaction_status=<STATUS>`.
- Envia lotes normalizados para `/api/comercial/hotmart/import`.

Status cobertos:

```txt
APPROVED, COMPLETE, STARTED, WAITING_PAYMENT, PRINTED_BILLET,
PROCESSING_TRANSACTION, UNDER_ANALISYS, PRE_ORDER, OVERDUE,
CANCELLED, EXPIRED, NO_FUNDS, BLOCKED, REFUNDED,
PARTIALLY_REFUNDED, CHARGEBACK, PROTESTED
```

URL final montada no node `Buscar Historico Hotmart`:

```txt
https://developers.hotmart.com/payments/api/v1/sales/history?start_date=<ms>&end_date=<ms>&max_results=100&transaction_status=<STATUS>&page_token=<TOKEN_OPCIONAL>
```

### 3. `Hotmart_Comercial_Incremental_Diario_v1.json`

Uso: atualizacao recorrente de vendas e mudancas de status.

Configuracao atual:

- Schedule Trigger: a cada 1 hora.
- Janela: ultimos `HOTMART_LOOKBACK_DAYS`, default `3`.
- Mesma lista de status do backfill.
- Mesmo endpoint da plataforma.

Durante mini lancamento, manter ativo a cada 1 hora. Fora de lancamento, pode trocar o Schedule Trigger para diario.

## Como testar antes do mini lancamento

1. Aplicar as migrations pendentes do Comercial no Supabase de HML.
2. Confirmar no Vercel/HML:
   - `N8N_INGEST_TOKEN`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Importar os tres JSONs no n8n.
4. Configurar variaveis/secrets do n8n.
5. Testar o webhook com payload simulado contendo `transaction_id`.
6. No node `Enviar Plataforma Comercial`, confirmar que o body enviado contem:

```json
{
  "tenant_id": "uuid-do-tenant",
  "rows": ["..."]
}
```

7. Rodar o backfill com periodo curto primeiro, por exemplo:

```env
HOTMART_BACKFILL_START_DATE=2026-06-01
HOTMART_BACKFILL_END_DATE=2026-06-27
```

8. Validar pelo modulo Comercial:
   - vendas confirmadas;
   - pendentes;
   - perdas/reembolsos/chargebacks;
   - lacunas de `net_amount` e `expected_payment_date`;
   - ausencia de duplicidade ao rodar novamente.
9. Ativar o incremental apenas depois do backfill curto estar coerente.

## Logs esperados

Ao final dos fluxos de backfill/incremental, o node `Fim Consulta Hotmart` retorna um resumo com:

- `statuses`
- `window`
- `pagesProcessed`
- `vendasNormalizadas`
- `imported`
- `updated`
- `skipped`
- `errors`
- `byStatus`

## Validacoes antes de homologacao publica

- Conferir se o numero de vendas importadas bate com o extrato Hotmart no mesmo periodo.
- Conferir vendas aprovadas, pendentes, reembolsadas e chargeback.
- Conferir se `valor_liquido` nao esta igual ao bruto quando a Hotmart nao informou comissao.
- Conferir previsao de recebiveis somente quando a Hotmart trouxe `expected_payment_date`.
- Conferir alunos duplicados por e-mail.
- Conferir produtos sem `hotmart_product_id` na aba de reconciliacao.

# Modulo Comercial

Modulo local para consolidar vendas Hotmart, recebiveis, alunos e produtos antes de integrar os dados ao Financeiro.

## Estado atual

- As tabelas ficam na migration `supabase/migrations/0037_comercial_module.sql`.
- A rota de ingestao local fica em `POST /api/comercial/hotmart/import`.
- O modulo aparece em `/comercial`, liberado por permissao `comercial`.
- Nenhuma migration deve ser aplicada em homologacao/producao sem validacao previa.

## Variaveis necessarias

No `.env.local` da plataforma:

```env
N8N_INGEST_TOKEN=um_token_longo_aleatorio
SUPABASE_SERVICE_ROLE_KEY=service_role_do_supabase
```

No n8n, configure os mesmos valores como credenciais/variaveis do workflow:

```env
PLATAFORMA_COMERCIAL_IMPORT_URL=http://localhost:3000/api/comercial/hotmart/import
PLATAFORMA_TENANT_ID=<tenant_id_da_juliana>
N8N_INGEST_TOKEN=<mesmo_token_do_env_local>
HOTMART_CLIENT_ID=<client_id_hotmart>
HOTMART_CLIENT_SECRET=<client_secret_hotmart>
```

Para homologacao, a URL muda para:

```env
PLATAFORMA_COMERCIAL_IMPORT_URL=https://plataf-op-hml.vercel.app/api/comercial/hotmart/import
```

## Payload aceito pela plataforma

O endpoint aceita um objeto com `tenant_id` e `rows`, ou um array direto. O formato recomendado e:

```json
{
  "tenant_id": "uuid-do-tenant",
  "rows": [
    {
      "transaction_id": "HP123",
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
      "source_sck": "campanha_x"
    }
  ]
}
```

Se a Hotmart nao enviar `expected_payment_date`, a plataforma cria uma previsao com `data_aprovacao + 30 dias` e marca `fonte_previsao = projetado`.

## Workflow n8n - historico 2026

1. Crie um workflow manual chamado `Hotmart Comercial - Backfill 2026`.
2. Adicione um node `Manual Trigger`.
3. Adicione um node `Set Periodo 2026` com:
   - `start_date`: `2026-01-01`
   - `end_date`: data atual
   - `tenant_id`: valor de `PLATAFORMA_TENANT_ID`
4. Adicione um node `HTTP Request - Hotmart vendas`.
   - Metodo: conforme endpoint usado da Hotmart.
   - Autenticacao: credencial oficial da Hotmart.
   - Periodo: use `start_date` e `end_date`.
   - Paginacao: habilite ate nao haver proxima pagina.
5. Adicione um node `Code - Normalizar Hotmart`.
   - Gere uma lista de objetos com os campos do payload recomendado.
   - Preserve tambem o JSON original em campos extras quando houver duvida.
6. Adicione `Split in Batches` com lote de 100 registros.
7. Adicione `HTTP Request - Enviar Plataforma`.
   - Method: `POST`
   - URL: `{{$env.PLATAFORMA_COMERCIAL_IMPORT_URL}}`
   - Headers:
     - `Authorization`: `Bearer {{$env.N8N_INGEST_TOKEN}}`
     - `Content-Type`: `application/json`
   - Body:
```json
{
  "tenant_id": "{{$env.PLATAFORMA_TENANT_ID}}",
  "rows": "={{$json.rows}}"
}
```
8. Rode primeiro com 5 registros, depois 100, e somente depois o historico completo.

## Workflow n8n - incremental

1. Crie um workflow `Hotmart Comercial - Incremental`.
2. Use `Schedule Trigger`.
3. Frequencia recomendada:
   - Durante lancamento: a cada 3 horas.
   - Operacao normal: 1 vez por dia.
4. Busque os ultimos 3 dias para capturar atualizacoes tardias, reembolsos e mudancas de status.
5. Use o mesmo node de normalizacao e o mesmo endpoint da plataforma.

## Workflow n8n - webhook Hotmart

Depois que o historico estiver validado, crie um workflow separado para webhook. Ele deve receber eventos novos da Hotmart, normalizar para o mesmo payload e chamar `POST /api/comercial/hotmart/import`.

### Eventos Hotmart recomendados

Na tela `Cadastrar Webhook`, use:

- Produto: `Todos os produtos`.
- Versao: `2.0.0`.
- Compras: selecione os eventos de compra, aprovacao, cancelamento, reembolso, chargeback e atualizacoes de pagamento.
- Club: selecione `Primeiro acesso` e `Modulo completo`, porque ajudam a enriquecer a base de alunos.
- Assinaturas: deixar desmarcado por enquanto, pois o modelo atual nao usa recorrencia de assinatura.
- Gestao Logistica: deixar desmarcado. Nao ha entrega fisica/logistica nesta operacao.
- Outros: marcar apenas se o evento trouxer status financeiro ou acesso de aluno que nao esteja coberto em Compras/Club.

URL que deve ser cadastrada na Hotmart:

```txt
https://seu-n8n/webhook/hotmart-comercial
```

O endpoint da plataforma abaixo nao deve ser cadastrado direto na Hotmart. Ele e chamado pelo node `HTTP Request - Enviar Plataforma` dentro do n8n:

```txt
http://localhost:3000/api/comercial/hotmart/import
```

Como seu n8n esta hospedado, ele nao consegue acessar `localhost` da sua maquina. Para teste local existem duas opcoes:

- Testar a rota com um envio manual local, sem n8n.
- Usar um tunel temporario para expor o `localhost:3000`.

Em homologacao, depois da validacao local, o node do n8n deve chamar:

```txt
https://plataf-op-hml.vercel.app/api/comercial/hotmart/import
```

## Validacoes antes de homologacao

- Conferir se o numero de vendas importadas bate com o extrato Hotmart.
- Conferir vendas aprovadas, reembolsadas e chargeback.
- Conferir previsao de recebiveis em 7, 15 e 30 dias.
- Conferir alunos duplicados por e-mail.
- Conferir produtos sem `hotmart_product_id` na aba de reconciliacao.

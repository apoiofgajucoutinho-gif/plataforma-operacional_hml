# V9 no n8n Cloud sem Variables

## Estado seguro do artefato

- Workflow: `Instagram Ads Daily Collector_V9_Traffic_Foundation`
- Arquivo: `modules/ads/Instagram Ads Daily Collector_V9_Traffic_Foundation.json`
- Estado importado: `active=false`
- Smoke: manual, um dia e `smoke_persist=false`
- V3: não é alterada, importada ou usada como fonte de secrets
- Backfill e cutover: não executar nesta etapa

O export não contém token Meta, chave Supabase, ID de Credential nem referência a `$env`. A associação das Credentials acontece somente na interface do n8n Cloud depois da importação.

## Credential 1: Meta

Crie em **Credentials > New credential > Facebook Graph API**:

- Nome sugerido: `Meta Ads - Norwyn V9`
- Access Token: token autorizado para leitura da conta de anúncios

O token precisa ter acesso à conta configurada e permissões Meta adequadas para Insights/configuração de anúncios, normalmente `ads_read` e, conforme a origem do token, `business_management`. Não use App Token sem acesso à conta de anúncios.

Depois da importação, abra os três nós abaixo e selecione **Authentication > Predefined Credential Type > Facebook Graph API > Meta Ads - Norwyn V9**:

1. `Meta Ads API - Insights`
2. `Meta Graph - Configuracao de Anuncios`
3. `Meta Graph - Assets`

O n8n injeta `access_token` em tempo de execução. O workflow não recebe nem manipula o token em Code nodes.

## Credential 2: Supabase HML

Crie em **Credentials > New credential > Supabase API**:

- Nome sugerido: `Supabase HML - Norwyn V9`
- Host: URL do projeto HML, sem `/rest/v1`
- Secret Key: secret key do projeto HML; uma `service_role` legada também é aceita pelo n8n

Depois da importação, abra os quatro nós abaixo e selecione **Authentication > Predefined Credential Type > Supabase API > Supabase HML - Norwyn V9**:

1. `Carregar Registry Supabase`
2. `Carregar Cache Supabase`
3. `Upsert Snapshots de Configuracao`
4. `Upsert Supabase Ads`

A Credential nativa injeta `apikey` e `Authorization` durante a execução. Esses valores não aparecem no JSON exportado.

## Configuracao V9

Edite somente o node `Configuracao V9`. Ele aceita apenas valores não secretos:

```js
const config = {
  ad_account_id: 'act_...',
  tenant_id: '...',
  supabase_url: 'https://<project-ref>.supabase.co',
  graph_version: 'v23.0',
  lookback_days: 7,
  smoke_days: 1,
  smoke_persist: false,
  max_pages: 100,
  upsert_batch_size: 50,
  config_ttl_hours: 24,
  creative_ttl_hours: 168,
};
```

Não coloque token, secret key ou qualquer outro segredo nesse node. O `supabase_url` e os IDs são identificadores de roteamento, não credenciais.

## Smoke seguro

1. Importe a V9.
2. Confirme `Inactive` no topo do workflow.
3. Preencha os três placeholders do `Configuracao V9`.
4. Selecione as duas Credentials nos sete nós listados acima.
5. Execute apenas `Executar Smoke Manual`.
6. Confirme no resultado `persisted: false`.
7. Compare métricas e enriquecimento com a fonte Meta, sem executar backfill.

Com `smoke_persist=false`, os dois ramos de upsert permanecem bloqueados. Ativação, persistência do smoke, backfill e desativação da V3 exigem autorização separada.

## Arquitetura de autenticação

- Meta Insights e enriquecimento: HTTP Request + `facebookGraphApi`.
- Registry, cache e upserts: HTTP Request + `supabaseApi`.
- Paginação Meta: opção nativa do HTTP Request, que reaplica a Credential sem expor o token a Code nodes.
- Code nodes: cálculo, agregação e transformação apenas; nenhum acesso a Credentials.
- Export: sem objeto `credentials`, evitando carregar IDs vinculados a outra conta n8n.

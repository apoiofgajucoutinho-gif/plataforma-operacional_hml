# Importacao n8n - Instagram Ads

Este modulo le os dados da tabela `public.instagram_ads_daily`.

## Configuracao recomendada no n8n

Use o node oficial do Supabase no workflow `Instagram Ads Daily Collector_V2-atual`.

Configuracao do node:

- Operation: `Create row` para execucao diaria normal, ou `Upsert` se a sua versao do node permitir conflito por `tenant_id,row_key`.
- Table: `instagram_ads_daily`
- Data to send: `Auto-map input data to columns`
- Credential: Supabase do projeto `Plataforma_Operacional` usando a `service_role key` no ambiente seguro do n8n.

Importante: nao use a anon key para este node. A tabela tem RLS Admin-only e o n8n precisa operar como servico.

## Campos enviados pelo workflow

O node `Transform Data` deve continuar enviando:

- `data_referencia`
- `campanha`
- `conjunto`
- `anuncio`
- `status`
- `objetivo`
- `alcance`
- `impressoes`
- `cliques`
- `ctr`
- `cpc`
- `cpm`
- `frequencia`
- `valor_gasto`
- `conversoes`
- `leads`
- `performance_status`
- `performance_score`
- `created_at`

O banco calcula automaticamente `row_key`, `created_at` e `updated_at`.

## Meta Ads API

No node da Meta Ads API, mantenha:

- `level=ad`
- `date_preset=yesterday`
- `time_increment=1`
- Campos: `campaign_name,adset_name,ad_name,impressions,reach,clicks,ctr,cpc,cpm,frequency,spend,objective,date_start,date_stop`

Se quiser preencher `status` real futuramente, acrescente uma chamada complementar para buscar `effective_status`, porque o endpoint `/insights` nem sempre retorna esse campo.

## Duplicidade

A tabela tem uma chave unica por:

- tenant
- data de referencia
- campanha
- conjunto
- anuncio

Se o workflow rodar duas vezes para o mesmo dia e mesmo anuncio, a segunda tentativa pode falhar se estiver como `Create row`. Para reprocessar historico, prefira configurar `Upsert` no node ou apagar os registros daquele dia antes de rodar novamente.

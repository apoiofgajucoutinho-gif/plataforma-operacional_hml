# NORWYN — Central de Validação P0 Data Trust

## Escopo implementado

Central permanente de validação em `/validacao`, com abas profundas:

- `/validacao/hotmart`
- `/validacao/produtos`
- `/validacao/conteudos`

Acesso previsto para ADMIN, ESPECIALISTA e OPERACIONAL via módulo `validacao`.

## Princípios preservados

- Não altera `comercial_vendas` durante upload/comparação.
- Não altera raw data, Financeiro, Aluno 360 ou Produto 360 automaticamente.
- CSV oficial da Hotmart entra em staging antes de qualquer decisão.
- Comparação por `transaction_id` oficial quando disponível.
- Correções viram decisões/auditoria/aprendizado, não mutação silenciosa.
- Dados não-BRL são preservados com moeda original e não somados como BRL.

## Migrations

- `supabase/migrations/0077_norwyn_validation_center.sql`
  - adiciona `module_key = validacao`;
  - cria tabelas de upload, staging, comparação, decisões, knowledge layer e status mapping;
  - habilita RLS;
  - sem uso transacional do enum recém-criado em policies/permissões.

- `supabase/migrations/0078_norwyn_validation_center_access.sql`
  - cria policies de leitura/escrita;
  - libera `validacao` para ADMIN, ESPECIALISTA e OPERACIONAL;
  - não concede novo acesso a SUPORTE.

## Tabelas novas

- `norwyn_validation_uploads`
- `norwyn_hotmart_validation_rows`
- `norwyn_hotmart_validation_comparisons`
- `norwyn_status_mapping_rules`
- `norwyn_validation_decisions`
- `norwyn_validation_knowledge`

## APIs novas

- `POST /api/validacao/hotmart/upload`
  - aceita múltiplos CSVs;
  - normaliza linhas oficiais;
  - grava staging;
  - compara com `comercial_vendas`;
  - registra classes `MATCH_EXACT`, `MATCH_DIVERGENT`, `ONLY_HOTMART`, `ONLY_NORWYN`, `UNKNOWN_MATCH`.

- `POST /api/validacao/decision`
  - registra validações, correções, feedbacks e aprendizados;
  - suporta `single_case`, `reusable_learning` e `suggested_rule`.

## Status Hotmart cobertos

Mapeamento canônico inclui, entre outros:

- Aprovado / Approved -> `APPROVED`
- Completo / Complete / Completed -> `COMPLETED`
- Atrasado / Overdue -> `OVERDUE`
- Cancelado / Cancelled / Canceled -> `CANCELLED`
- Expirado / Expired -> `EXPIRED`
- Reembolsado / Refunded / Partially Refunded -> `REFUNDED`
- Chargeback -> `CHARGEBACK`
- Iniciada / Started -> `STARTED`
- Aguardando Pagto / Waiting Payment / Printed Billet -> `PENDING_PAYMENT`

## Validações locais realizadas

- `npm run typecheck`: passou.
- `npm run build`: passou.

## Bloqueio operacional HML

A aplicação das migrations no projeto HML `oerdsmgiebquecqwcbox` foi tentada com:

```bash
npx supabase db push --project-ref oerdsmgiebquecqwcbox
```

Resultado:

```text
LegacyPlatformAuthRequiredError: Access token not provided.
Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

Ação manual necessária para Jefferson:

```bash
supabase login
npx supabase db push --project-ref oerdsmgiebquecqwcbox
```

ou:

```bash
$env:SUPABASE_ACCESS_TOKEN="<token>"
npx supabase db push --project-ref oerdsmgiebquecqwcbox
```

Após isso, validar:

```sql
select enum_range(null::public.module_key);
select module, role, can_read, can_write
from public.tenant_module_permissions
where module = 'validacao'
order by role;
```

## Observações de dados

Não foram encontrados no workspace CSVs oficiais Hotmart 2020-2026 para processamento local. A Central aceita o upload desses arquivos quando eles forem disponibilizados pelo usuário.

Status desconhecidos encontrados anteriormente no HML aparecem principalmente como eventos de plataforma/club/acesso, não como status oficiais de venda:

- `CLUB_MODULE_COMPLETED`
- `CLUB_FIRST_ACCESS`
- `PURCHASE_OUT_OF_SHOPPING_CART`
- `COMPLETED`

`COMPLETED` foi incorporado como status confirmado no parser; eventos Club/Cart precisam de regra de domínio para não contaminar vendas.

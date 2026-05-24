# Importacao Instagram via n8n

## Endpoint

```text
POST /api/instagram/import
```

Em DEV:

```text
http://localhost:3000/api/instagram/import
```

Em HML/PRD:

```text
https://SEU-DOMINIO.vercel.app/api/instagram/import
```

No ambiente do n8n, configure:

```env
PLATAFORMA_INSTAGRAM_IMPORT_URL=https://SEU-DOMINIO.vercel.app/api/instagram/import
N8N_INGEST_TOKEN=mesmo-token-configurado-na-plataforma
```

## Autenticacao

Configure no ambiente:

```env
N8N_INGEST_TOKEN=um-token-forte
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
INSTAGRAM_DEFAULT_TENANT_NAME=Juliana Coutinho
INSTAGRAM_DEFAULT_ACCOUNT_NAME=Juliana Coutinho
INSTAGRAM_DEFAULT_USERNAME=fga.jucoutinho
```

No n8n, envie um dos headers:

```text
Authorization: Bearer {{ $env.N8N_INGEST_TOKEN }}
```

ou:

```text
x-ingest-token: {{ $env.N8N_INGEST_TOKEN }}
```

## Payload aceito

Pode enviar um array direto:

```json
[
  {
    "data_coleta": "2026-05-21 23:00:07",
    "post_id": "18105642653498907",
    "tipo_postagem": "VIDEO",
    "likes": 11,
    "comentarios": 0,
    "data_postagem": "2026-05-12",
    "hora_postagem": "14:36:41",
    "legenda": "Texto da legenda",
    "permalink": "https://www.instagram.com/reel/...",
    "reach": 312,
    "saved": 0,
    "shares": 0
  }
]
```

Ou um objeto com metadados:

```json
{
  "tenantName": "Juliana Coutinho",
  "accountName": "Juliana Coutinho",
  "username": "fga.jucoutinho",
  "source": "n8n",
  "rows": []
}
```

## Campos reconhecidos

- `data_coleta`
- `post_id` ou `id`
- `tipo_postagem`, `tipo postagem`, `tipo`, `type`, `formato`
- `likes` ou `curtidas`
- `comentarios`, `comentários` ou `comments`
- `data_postagem`, `data postagem`, `postagem` ou `date`
- `hora_postagem`, `hora postagem`, `horario` ou `hora`
- `legenda`, `caption`, `titulo`, `title` ou `descricao`
- `permalink`, `link` ou `url`
- `reach` ou `alcance`
- `saved` ou `salvos`
- `shares` ou `compartilhamentos`

## Comportamento

- Cria/localiza o tenant.
- Cria/localiza a conta Instagram.
- Faz upsert em `instagram_posts` por `tenant_id + post_id`.
- Faz upsert em `instagram_metrics` por `tenant_id + post_id + origem`.
- Registra a execucao em `instagram_import_runs`.
- Calcula engajamento usando `(likes + comentarios + salvos) / alcance`.

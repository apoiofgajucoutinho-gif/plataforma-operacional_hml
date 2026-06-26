# Auditoria de Dados para o Editorial Agent

**Projeto auditado:** Plataforma Juliana  
**Iniciativa:** NORWYN Editorial Agent — Labs Intelligence  
**Data:** 24/06/2026  
**Natureza:** auditoria técnica e de dados, sem alterações funcionais

---

## 1. Resumo executivo

A Plataforma Juliana já possui uma base relevante para um primeiro ciclo assistido do Editorial Agent.

Os dados mais maduros são:

- posts publicados;
- identificador externo;
- data e horário de publicação;
- formato;
- legenda;
- permalink;
- curtidas;
- contagem de comentários;
- alcance;
- salvamentos;
- compartilhamentos;
- taxa e classificação de engajamento;
- histórico diário limitado de seguidores;
- dados secundários de Ads;
- estrutura para comentários e outras interações.

A evidência local inclui uma planilha real com 115 linhas e 108 posts únicos, entre 17/12/2025 e 20/05/2026. Também existem seed SQL produzido dessa fonte e workflows exportados para coleta via Meta/n8n.

O principal ponto de atenção são os comentários textuais:

- a tabela e os workflows existem;
- não há dump local que comprove a cobertura atual no banco remoto;
- a relação entre interação e post é textual, sem chave estrangeira;
- o serviço não carrega `post_id` das interações;
- a aplicação limita a leitura às 500 interações mais recentes;
- o status de resposta é mais confiável para mensagens diretas do que para comentários públicos.

Tema, pilar editorial, modo de voz, objetivo editorial, campanha, restrições e contexto do ciclo não existem como taxonomia canônica associada aos posts. Há classificações heurísticas em workflows e no frontend, mas elas não equivalem a um modelo editorial validado.

### Conclusão

**MVP viável com ajustes simples.**

O MVP assistido pode começar com desempenho de posts, padrões de formato, dia, horário, legenda, CTA e uma amostra de comentários. Contexto editorial e classificações estratégicas devem ser preenchidos manualmente no primeiro ciclo.

A condição mínima é validar que existe uma amostra suficiente de comentários textuais relacionável aos posts por `post_id`, `media_id` ou permalink. Sem isso, ainda é possível um MVP de desempenho de conteúdo, mas não o MVP editorial mínimo completo.

---

## 2. Escopo e método

### 2.1 Escopo auditado

Foram examinados:

- migrations Supabase relacionadas ao Instagram;
- serviços server-side e componentes do módulo;
- rotas e serviços de ingestão;
- views e funções de importação;
- workflows n8n exportados;
- seeds e fontes locais;
- seguidores;
- Ads, Objetivos, Agenda, Produtos/Cursos e Relatórios apenas quando conectados ao contexto editorial.

Não foram auditados em profundidade:

- Financeiro e DRE;
- operação interna sem ligação editorial;
- integrações externas ao vivo;
- credenciais;
- conteúdo do banco remoto.

### 2.2 Limitações

Por determinação do escopo:

- nenhuma API externa foi chamada;
- nenhuma coleta foi executada;
- nenhum dado foi alterado;
- nenhum workflow foi modificado;
- o Supabase remoto não foi consultado;
- nenhuma credencial foi lida ou exposta.

O relatório diferencia:

- **confirmado por estrutura:** migration, código ou workflow;
- **confirmado por dado local:** planilha, seed ou arquivo;
- **incerto no ambiente remoto:** estrutura existente sem validação da população atual.

---

## 3. Inventário de tabelas e fontes

### 3.1 Estruturas principais

| Nome | Tipo | Schema | Finalidade | Evidência de dados reais | Situação |
|---|---|---|---|---|---|
| `instagram_accounts` | Tabela | `public` | Contas Instagram por tenant | Usada pelo módulo e pelas cargas | Ativa |
| `instagram_posts` | Tabela | `public` | Cadastro canônico dos posts | Planilha, seed e ingestão n8n | Ativa |
| `instagram_metrics` | Tabela | `public` | Métricas atuais por post e origem | Planilha, seed e ingestão n8n | Ativa |
| `instagram_import_runs` | Tabela | `public` | Log das importações | Escrita pelo serviço de ingestão | Ativa |
| `instagram_n8n_import_rows` | View de entrada | `public` | Adaptador para inserção via n8n | Workflow e trigger | Ativa/preparada |
| `instagram_interactions` | Tabela | `public` | Comentários, mensagens, stories e seguidores | Estrutura e workflows; volume remoto não validado | Ativa, dados incertos |
| `instagram_interactions_import_rows` | View de entrada | `public` | Adaptador de ingestão de interações | Workflows exportados | Ativa/preparada |
| `instagram_follower_snapshots` | Tabela | `public` | Histórico diário de seguidores | 36 registros consolidados | Ativa, origem manual |
| `instagram_ads_daily` | Tabela | `public` | Métricas diárias por anúncio | Seed histórico e workflows | Ativa, secundária |
| `objetivos_metas` | Tabela | `public` | Metas de Instagram e Ads | Seeds com metas | Ativa, secundária |
| `objetivos_planos_acao` | Tabela | `public` | Planos associados às metas | Estrutura e serviço | Ativa, secundária |
| `agenda_eventos` | Tabela | `public` | Eventos operacionais | Usada pela Agenda | Ativa, relação indireta |
| `fin_cursos` | Tabela | `public` | Cadastro de cursos | Financeiro e Comercial | Ativa, secundária |
| `comercial_produtos` | Tabela | `public` | Produtos externos e cursos | Módulo Comercial | Ativa, secundária |

### 3.2 Fontes locais

| Fonte | Conteúdo | Evidência |
|---|---|---|
| `Insight.xlsx` | Posts orgânicos e métricas | 115 linhas, 108 posts únicos |
| `supabase/seed/instagram_insight_import.sql` | Seed da planilha | Posts, legendas, links e métricas |
| `Instagram_Analytics.json` | Coleta orgânica | Meta Graph, normalização e envio |
| `Instagram_Analytics_v2.json` | Versão posterior da coleta | Fluxo diário de posts e insights |
| `Instagram_Directs_Comments_Collector_v1.json` | Coleta de comentários | Posts, comentários e normalização |
| `Instagram_Directs_Messages_Collector_v1.json` | Coleta de mensagens | Conversas, mensagens e resposta |
| `Instagram_Directs_Webhook_v1.json` | Recepção por webhook | Eventos de mensagens |
| `Instagram_Directs_Interactions_v1.json` | Ingestão genérica | Interações para Supabase |
| `0021_instagram_ads_seed.sql` | Histórico de Ads | Dados de fonte real |
| `0041_instagram_follower_snapshots.sql` | Seguidores diários | 36 snapshots |
| `fga_instagram_dashboard_v6.html` | Dashboard legado | Referência, não fonte canônica |

### 3.3 Atividade dos workflows

Os arquivos representam versões exportadas. O campo `active` do JSON não comprova o estado do workflow remoto.

- desenho do fluxo: **confirmado**;
- execução atual no n8n: **não validada**;
- frequência real: **incerta**;
- frequência pretendida: identificável nos nós de agenda.

---

## 4. Mapa das tabelas Instagram/conteúdo

### 4.1 `instagram_accounts`

Representa a conta Instagram de um tenant.

| Coluna | Tipo | Uso |
|---|---|---|
| `id` | `uuid` | Chave interna |
| `tenant_id` | `uuid` | Segregação multiempresa |
| `nome` | `text` | Nome da conta |
| `username` | `text` | Perfil |
| `instagram_user_id` | `text` | ID da Meta |
| `ativo` | `boolean` | Situação |
| `created_at`, `updated_at` | `timestamptz` | Auditoria |

Relaciona-se com posts, métricas, interações e snapshots. Não armazena posicionamento editorial nem audiência detalhada.

### 4.2 `instagram_posts`

Armazena identidade e conteúdo textual básico de cada publicação.

| Coluna | Tipo | Uso editorial |
|---|---|---|
| `id` | `uuid` | Chave interna |
| `tenant_id` | `uuid` | Segregação |
| `account_id` | `uuid` | Conta |
| `post_id` | `text` | ID externo |
| `data_coleta` | `timestamptz` | Momento da coleta |
| `data_postagem` | `date` | Data |
| `hora_postagem` | `time` | Hora |
| `tipo_original` | `text` | Formato da origem |
| `tipo` | enum | Reels, Carrossel, Estatico ou Outro |
| `legenda` | `text` | Texto integral |
| `permalink` | `text` | Link |
| `raw_payload` | `jsonb` | Payload bruto |

**Relações:**

- pertence a uma conta;
- possui métricas por FK;
- pode ser relacionado logicamente às interações por ID externo ou permalink.

**Dados reais:** confirmados em planilha e seed, com 108 IDs únicos no período auditado.

**Ausências:** tema, pilar, objetivo, voz, campanha, produto, mídia direta, transcrição e calendário editorial.

### 4.3 `instagram_metrics`

Armazena métricas agregadas de cada post.

| Coluna | Tipo | Uso |
|---|---|---|
| `post_id` | `uuid` | FK do post |
| `likes` | `integer` | Curtidas |
| `comentarios` | `integer` | Contagem de comentários |
| `alcance` | `integer` | Alcance |
| `salvos` | `integer` | Salvamentos |
| `compartilhamentos` | `integer` | Compartilhamentos |
| `engajamento_score` | `numeric` | Taxa calculada |
| `engajamento_classificacao` | enum | Bom, Medio, Ruim ou N/A |
| `origem` | `text` | Fonte |
| `imported_at` | `timestamptz` | Importação |
| `raw_payload` | `jsonb` | Payload |

Fórmula identificada:

```text
(likes + comentarios + salvos) / alcance
```

Compartilhamentos não participam do cálculo.

**Limitações:**

- não possui impressões orgânicas;
- o upsert substitui a leitura anterior da mesma origem;
- não preserva série diária do post;
- múltiplas origens podem existir sem precedência explícita na leitura.

### 4.4 `instagram_import_runs`

Registra:

- fonte;
- status;
- total de linhas;
- inseridas, atualizadas e falhas;
- erro;
- início e fim.

É útil para atualidade e integridade da carga. O preenchimento pode variar conforme o caminho de ingestão.

### 4.5 `instagram_interactions`

Armazena comentários, mensagens, respostas de stories e seguidores.

| Coluna | Tipo | Uso editorial |
|---|---|---|
| `source` | `text` | Origem |
| `external_id` | `text` | ID externo |
| `dedupe_key` | `text` | Deduplicação |
| `profile_username` | `text` | Autor |
| `profile_name` | `text` | Nome |
| `message_text` | `text` | Texto |
| `media_id` | `text` | ID da mídia |
| `post_id` | `text` | ID externo do post, sem FK |
| `post_permalink` | `text` | Link do post |
| `interaction_at` | `timestamptz` | Data |
| `status` | `text` | Situação |
| `potential` | `text` | Potencial |
| `product_topic` | `text` | Tema heurístico |
| `next_action` | `text` | Ação heurística |
| `raw_payload` | `jsonb` | Evento bruto |

**Evidência:** estrutura e coletores confirmados; quantidade, período e completude do banco remoto não validados.

**Limitações:**

- `post_id` sem FK;
- consulta da aplicação não seleciona esse campo;
- limite de 500 interações;
- temas derivados por expressões regulares;
- diferentes tipos de interação na mesma tabela;
- dependência da ordem correta das migrations.

### 4.6 `instagram_follower_snapshots`

Campos:

- `snapshot_date`;
- `followers_total`;
- `source`;
- `source_url`.

Há 36 snapshots entre 24/04/2026 e 23/06/2026, originados de Google Sheets.

Limitações:

- período curto e com lacunas;
- sem demografia;
- migration consolidada não comprova atualização automática contínua.

### 4.7 `instagram_ads_daily`

Possui:

- data;
- campanha;
- conjunto;
- anúncio;
- objetivo;
- alcance e impressões;
- cliques, CTR, CPC e CPM;
- frequência e gasto;
- conversões e leads;
- performance.

Não existe FK para posts orgânicos. A associação depende de nomenclatura ou análise manual. É contexto secundário, não uma relação editorial confiável.

### 4.8 Estruturas secundárias

**Objetivos:** metas de alcance, frequência, formatos, engajamento, salvamentos, compartilhamentos e seguidores. Não classificam cada post.

**Agenda:** fornece contexto temporal, mas não é calendário editorial e não se relaciona a posts.

**Produtos e cursos:** existem, mas não se relacionam diretamente aos posts. `product_topic` é texto heurístico.

**Relatórios:** consolida alertas operacionais, não histórico editorial canônico.

---

## 5. Views, funções e tratamento

### 5.1 Views

| View | Finalidade |
|---|---|
| `instagram_n8n_import_rows` | Receber posts e métricas via insert |
| `instagram_interactions_import_rows` | Receber interações via insert |

São adaptadores de ingestão, não views analíticas.

Não foram encontradas views para:

- desempenho editorial consolidado;
- histórico diário de métricas;
- posts com comentários;
- tema/pilar;
- campanha orgânica;
- objeções e perguntas.

### 5.2 Funções

| Função | Uso |
|---|---|
| `parse_ptbr_date` | Datas |
| `parse_ptbr_timestamp` | Timestamps |
| `normalize_instagram_post_type` | Formato |
| `classify_instagram_engagement` | Classificação |
| `instagram_n8n_import_rows_insert` | Upsert de post e métrica |
| `normalize_instagram_interaction_source` | Origem |
| `classify_instagram_interaction_potential` | Potencial por palavras-chave |
| `normalize_instagram_interaction_status` | Status |
| `instagram_interactions_import_rows_insert` | Upsert de interação |

### 5.3 Tratamentos existentes

- normalização de formatos e datas;
- deduplicação e upsert;
- cálculo e classificação de engajamento;
- deduplicação de interações;
- classificação heurística de potencial, tema e ação;
- agregações por período, formato, dia e horário;
- filtros e rankings.

### 5.4 Não tratado canonicamente

- tema e pilar editorial;
- objetivo e voz;
- intenção e hipótese da peça;
- produto e campanha;
- CTA estruturada;
- mídia/transcrição;
- perguntas e objeções como entidades;
- evolução diária da métrica.

---

## 6. Qualidade da fonte local

### 6.1 Resumo da `Insight.xlsx`

| Indicador | Resultado |
|---|---:|
| Linhas | 115 |
| Posts únicos | 108 |
| Linhas repetidas por `post_id` | 7 |
| Início | 17/12/2025 |
| Fim | 20/05/2026 |
| Com legenda | 115 |
| Com permalink | 115 |
| Com data e hora | 115 |
| Com alcance | 111 |
| Com salvos | 111 |
| Com compartilhamentos | 111 |
| Com comentários contados acima de zero | 80 |

### 6.2 Formatos

| Formato original | Linhas |
|---|---:|
| Vídeo | 56 |
| Carrossel | 41 |
| Imagem | 18 |

### 6.3 Avaliação

**Pontos fortes:**

- período útil;
- legendas completas;
- links e formatos consistentes;
- métricas editoriais;
- upsert absorve duplicatas.

**Pontos frágeis:**

- duplicatas não viram snapshots;
- sem impressões, mídia ou transcrição;
- sem contexto estratégico;
- a fonte local não comprova a atualização atual do Supabase;
- sem comentários textuais.

---

## 7. Mapa das métricas

| Métrica | Existe? | Fonte | Granularidade | Histórico | Qualidade |
|---|---|---|---|---|---|
| Curtidas | Sim | `instagram_metrics` | Post | Último valor/origem | Alta |
| Contagem de comentários | Sim | `instagram_metrics` | Post | Último valor/origem | Alta |
| Alcance | Sim | `instagram_metrics` | Post | Último valor/origem | Média/Alta |
| Impressões orgânicas | Não | — | — | — | — |
| Salvamentos | Sim | `instagram_metrics` | Post | Último valor/origem | Média/Alta |
| Compartilhamentos | Sim | `instagram_metrics` | Post | Último valor/origem | Média/Alta |
| Taxa de engajamento | Sim | `instagram_metrics` | Post | Último valor/origem | Média |
| Classificação | Sim | `instagram_metrics` | Post | Último valor/origem | Média |
| Seguidores | Sim | snapshots | Conta/dia | 36 registros | Média |
| Crescimento diário | Derivável | snapshots | Conta/dia | Limitado | Média |
| Evolução diária do post | Não | — | — | — | — |
| Ads | Sim | `instagram_ads_daily` | Anúncio/dia | Diário | Média |
| Cliques e CTR pagos | Sim | Ads | Anúncio/dia | Diário | Média |
| Leads/conversões | Parcial | Ads | Anúncio/dia | Depende da origem | Média/Baixa |

A taxa atual é um sinal interno, não uma definição universal. O agente precisa conhecer sua fórmula.

---

## 8. Mapa dos comentários

### 8.1 Dados previstos

- texto;
- autor;
- data;
- origem;
- ID externo;
- mídia;
- post;
- permalink;
- status;
- potencial;
- tema;
- ação;
- payload.

### 8.2 Comentários públicos

O workflow de comentários foi desenhado para:

1. buscar posts recentes;
2. buscar comentários;
3. normalizar autor, texto, data, post e link;
4. classificar tema e prioridade;
5. enviar ao Supabase.

Não foi possível confirmar:

- quantidade atual;
- profundidade histórica;
- cobertura;
- taxa de falha;
- respostas ou curtidas da especialista.

### 8.3 Mensagens e stories

Há workflows próprios, mas DMs e Stories completos não são obrigatórios para o MVP.

### 8.4 Classificações

Existem heurísticas para:

- curso/formação;
- consulta/clínica;
- preço/inscrição;
- dúvida técnica;
- reclamação/risco;
- Jiu Jitsu;
- família;
- CTA;
- engajamento geral.

Elas ajudam operacionalmente, mas não representam taxonomia editorial formal e podem confundir o assunto do post com a intenção do comentário.

---

## 9. Relação post ↔ comentários ↔ métricas

### 9.1 Relação forte

```text
instagram_accounts
    ├── instagram_posts
    │       └── instagram_metrics
    ├── instagram_interactions
    └── instagram_follower_snapshots
```

`instagram_posts.id` possui FK em `instagram_metrics.post_id`.

### 9.2 Relação fraca

```text
instagram_posts.post_id   ≈ instagram_interactions.post_id
instagram_posts.post_id   ≈ instagram_interactions.media_id
instagram_posts.permalink ≈ instagram_interactions.post_permalink
```

Problemas:

- sem FK;
- o serviço não carrega `post_id` da interação;
- IDs de eventos Meta podem divergir;
- sem view consolidada;
- interações sem post coexistem na tabela.

### 9.3 Consequência

Performance por post pode ser analisada com alta confiança.

Para responder “o que as pessoas disseram neste post”, é preciso:

- confirmar compatibilidade dos IDs;
- escolher a regra de relação;
- medir a taxa de sucesso;
- separar comentários de DMs, stories e seguidores.

Esse é o principal tratamento antes do primeiro ciclo.

---

## 10. Dados agregados existentes

O dashboard calcula:

- totais e médias;
- posts por semana;
- distribuição e alcance por formato;
- engajamento por formato;
- dia e horário;
- evolução mensal;
- rankings;
- distribuição de engajamento;
- crescimento de seguidores;
- prioridades e temas das interações.

São úteis, mas:

- não são fatos analíticos armazenados;
- dependem da versão da interface;
- não preservam versão ou explicação;
- algumas regras são heurísticas.

---

## 11. Dados ausentes

### 11.1 Ausentes

- impressões orgânicas;
- mídia, descrição, transcrição e OCR;
- tema e pilar editorial por post;
- modo de voz;
- objetivo editorial;
- produto e campanha por FK;
- hipótese e CTA estruturadas;
- público e etapa de funil;
- restrições;
- contexto e objetivo do ciclo;
- capacidade semanal;
- esforço de produção;
- evolução diária dos posts;
- demografia;
- resposta e curtida confiáveis em comentários;
- calendário editorial;
- briefings históricos.

### 11.2 Parciais

- produto: cadastros existem, sem relação com posts;
- campanha: Ads existe, sem vínculo orgânico;
- tema: heurística em interação, não no post;
- perguntas e objeções: inferíveis, não estruturadas;
- interesse: potencial heurístico;
- calendário: Agenda operacional;
- comentários: estrutura sem completude validada;
- respostas: lógica melhor em DMs;
- snapshots: seguidores, não posts.

---

## 12. Mapeamento contra as necessidades do Editorial Agent

| Necessidade | Existe hoje? | Onde está? | Qualidade | Observação | Ação mínima |
|---|---|---|---|---|---|
| `post_id` | Sim | `instagram_posts.post_id` | Alta | ID externo e interno | Usar como identidade |
| Data | Sim | `data_postagem` | Alta | Obrigatória | Nenhuma |
| Hora | Sim | `hora_postagem` | Alta | Presente | Nenhuma |
| Formato | Sim | `tipo_original`, `tipo` | Alta | Normalizado | Preservar ambos |
| Legenda | Sim | `legenda` | Alta | Completa | Nenhuma |
| Mídia | Parcial | permalink, payload | Baixa | Sem arquivo ou descrição | Usar texto/link |
| Tema | Não | — | Desconhecida | Heurística só em interações | Manual |
| Objetivo editorial | Não | — | Desconhecida | Ausente | Manual |
| Alcance | Sim | `instagram_metrics` | Média/Alta | Alguns ausentes | Tratar nulos |
| Impressões orgânicas | Não | — | Desconhecida | Apenas Ads possui | Não bloquear |
| Curtidas | Sim | métricas | Alta | Completo localmente | Nenhuma |
| Contagem de comentários | Sim | métricas | Alta | Completo localmente | Nenhuma |
| Salvamentos | Sim | métricas | Média/Alta | Alguns ausentes | Tratar nulos |
| Compartilhamentos | Sim | métricas | Média/Alta | Alguns ausentes | Tratar nulos |
| Taxa de engajamento | Sim | `engajamento_score` | Média | Fórmula interna | Documentar |
| Classificação | Sim | métricas | Média | Limiares fixos | Usar como sinal |
| Comentários textuais | Parcial | `message_text` | Desconhecida | Cobertura não validada | Validar amostra |
| Autor | Parcial | perfil da interação | Desconhecida | Dado pessoal | Anonimizar |
| Data do comentário | Parcial | `interaction_at` | Desconhecida | Campo existe | Validar origem |
| Relação comentário-post | Parcial | IDs e permalink | Baixa/Média | Sem FK | Reconciliar |
| Perguntas | Parcial | texto | Baixa | Não estruturadas | Classificação assistida |
| Objeções | Parcial | texto/risco | Baixa | Sem taxonomia | Classificação assistida |
| Interesse | Parcial | `potential` | Média/Baixa | Palavras-chave | Revisão humana |
| Produto | Parcial | cursos/produtos/tópico | Baixa | Sem relação | Manual |
| Pilar editorial | Não | — | Desconhecida | Ausente | Manual |
| Modo de voz | Não | — | Desconhecida | Ausente | Manual |
| Campanha | Parcial | Ads | Baixa | Associação textual | Manual |
| Calendário editorial | Não | — | Desconhecida | Agenda não substitui | Contexto manual |
| Restrições | Não | — | Desconhecida | Ausente | Manual |
| Contexto do ciclo | Não | — | Desconhecida | Ausente | Manual |
| Objetivo do ciclo | Não | — | Desconhecida | Metas gerais não bastam | Manual |
| Capacidade semanal | Não | — | Desconhecida | Ausente | Manual |
| Métricas por dia | Não | — | Desconhecida | Upsert mantém último valor | Não bloquear |
| Snapshots | Parcial | seguidores | Média | Sem snapshots de posts | Contexto |
| Audiência | Parcial | total de seguidores | Baixa | Sem demografia | Não bloquear |
| Logs de importação | Sim | `instagram_import_runs` | Média | Depende do fluxo | Conferir atualidade |

---

## 13. Qualidade dos dados

| Domínio | Avaliação |
|---|---|
| Identidade do post | Alta |
| Texto | Alta |
| Data, hora e formato | Alta |
| Métricas básicas | Alta |
| Alcance, salvos e compartilhamentos | Média/Alta |
| Impressões orgânicas | Inexistente |
| Comentários textuais | Desconhecida |
| Relação comentário-post | Baixa/Média |
| Contexto editorial | Inexistente |
| Histórico temporal de posts | Baixa |
| Seguidores | Média |
| Ads | Média |

### Consistência

**Pontos positivos:**

- enums e normalização;
- chaves únicas;
- deduplicação;
- datas tipadas;
- multi-tenant.

**Pontos de atenção:**

- duplicatas na fonte;
- upsert elimina histórico;
- múltiplas origens sem precedência explícita;
- interações sem FK;
- heurísticas em mais de uma camada;
- possível divergência banco x migrations.

### Atualidade

- há timestamps e logs;
- seguidores chegam a 23/06/2026 no código;
- a planilha local termina em 20/05/2026;
- workflows indicam recorrência pretendida;
- execução remota não validada.

### Representatividade

O período permite explorar formatos, dias, horários, desempenho, legendas e CTAs. Não permite afirmar causalidade nem separar efeitos de campanha, sazonalidade, mídia, público ou distribuição paga.

---

## 14. Riscos técnicos

### 14.1 RLS e rastreabilidade

As migrations habilitam RLS em contas, posts, métricas e importações, mas não foram encontradas localmente policies correspondentes para essas quatro tabelas.

Pode haver:

- policies criadas diretamente no ambiente remoto;
- uso de cliente privilegiado;
- divergência banco x migrations.

Isso não significa exposição. Com RLS sem policy, o padrão é negar acesso aos papéis comuns. O risco é de rastreabilidade e reprodução do ambiente.

### 14.2 Ingestão

- views usam `security_invoker`;
- migration posterior altera permissões;
- segurança depende da aplicação completa das migrations e grants;
- triggers podem criar tenant/conta por erro de nomenclatura.

### 14.3 Limite de interações

As 500 interações mais recentes podem ocultar histórico e distorcer tendências.

### 14.4 Análise no frontend

Muitas agregações e heurísticas vivem no React:

- não há dataset analítico versionado;
- resultados dependem da interface;
- regras não estão totalmente centralizadas.

### 14.5 Métricas substituídas

Não é possível reconstruir alcance e engajamento em 24h, 48h ou sete dias porque a leitura anterior é substituída.

---

## 15. Riscos de dados

1. Contagem de comentários não é comentário textual.
2. Comentário e post podem não ser reconciliáveis.
3. Cobertura de comentários é desconhecida.
4. Fontes possuem períodos diferentes.
5. Tema heurístico pode refletir palavra isolada.
6. Desempenho não informa sozinho o objetivo do post.
7. Ausência pode ser confundida com zero.
8. Múltiplas origens podem produzir seleção ambígua.
9. Sem snapshots de posts.
10. Ads não possui vínculo automático com orgânico.

---

## 16. Riscos de privacidade

As interações podem armazenar:

- nome;
- username;
- mensagem;
- identificadores;
- contexto de conversa;
- payload bruto.

Riscos:

- análise sem minimização;
- retenção indefinida;
- exposição de identidade;
- uso de DMs além da finalidade;
- payload com campos desnecessários;
- uso futuro em IA sem regra documentada.

O MVP editorial não precisa apresentar nomes. O necessário é conteúdo anonimizado ou agregado.

Não foi identificada no escopo uma política editorial específica de retenção, anonimização, consentimento, exclusão ou uso analítico das mensagens.

---

## 17. O que já permite MVP assistido

### Análises possíveis

- rankings por alcance, salvamentos e compartilhamentos;
- comparação por formato;
- frequência;
- padrões por dia e horário;
- análise de legendas;
- identificação manual de CTA;
- comparação entre alto e baixo desempenho;
- relação formato-resultado;
- perguntas e objeções em amostra validada;
- crescimento de seguidores;
- contexto secundário de Ads;
- sinais, recomendações e briefings com revisão humana.

### Saídas possíveis

- sinais;
- padrões;
- hipóteses;
- perguntas;
- lacunas;
- recomendações não executáveis;
- briefings propostos;
- decisões pendentes.

---

## 18. O que deve ser manual

Nos primeiros 30 dias:

- objetivo e período do ciclo;
- tema;
- pilar;
- voz;
- produto;
- campanha;
- intenção;
- restrições;
- capacidade semanal;
- eventos relevantes;
- validação dos comentários;
- confirmação de perguntas e objeções;
- interpretação final;
- aprovação dos briefings.

Isso não bloqueia um agente assistido e não executor.

---

## 19. Automação futura necessária

- associação confiável comentário-post;
- coleta completa e incremental;
- status de resposta;
- descrição e transcrição de mídia;
- snapshots de posts;
- associação a produto, campanha e ciclo;
- taxonomia validada;
- atualização contínua de seguidores;
- estruturação de perguntas, objeções e interesse;
- contexto editorial por ciclo;
- auditoria dos workflows;
- anonimização.

---

## 20. Análise de viabilidade

### 20.1 O MVP é viável?

**Sim, com ajustes simples e validação obrigatória dos comentários.**

Posts, métricas e legendas atendem ao núcleo. A cobertura e relação dos comentários precisam ser medidas.

### 20.2 Viável agora

- posts, formatos e legendas;
- calendário histórico;
- alcance e engajamento;
- rankings e padrões;
- sinais e briefings assistidos;
- seguidores;
- Ads como contexto.

### 20.3 Tratamento simples

- deduplicação lógica;
- seleção da métrica vigente;
- distinção entre nulo e zero;
- reconciliação de comentários;
- separação por origem;
- anonimização;
- validação da amostra;
- contexto manual.

### 20.4 Integração nova

- impressões orgânicas;
- mídia e transcrição;
- snapshots dos posts;
- demografia;
- resposta/curtida em comentários;
- vínculo automático com produto e campanha.

### 20.5 Manual no primeiro teste

- tema, pilar e voz;
- objetivo;
- produto e campanha;
- restrições;
- contexto e capacidade;
- comentários;
- decisão final.

### 20.6 Faltantes que não bloqueiam

- impressões;
- mídia/transcrição;
- evolução diária;
- demografia;
- campanha e produto;
- taxonomia;
- DMs e Stories completos;
- vendas.

### 20.7 Faltantes que podem bloquear

- comentários textuais utilizáveis;
- relação suficiente entre comentário e post;
- período atualizado e confiável.

Sem isso, resta um MVP de desempenho, não o MVP editorial completo.

### 20.8 Menor escopo real

- uma conta;
- 30 a 60 dias;
- posts orgânicos;
- data, hora, formato e legenda;
- alcance, curtidas, comentários, salvos e compartilhamentos;
- 10 a 20 melhores e piores posts;
- comentários anonimizados relacionáveis;
- contexto editorial preenchido manualmente;
- um objetivo de ciclo;
- capacidade semanal;
- saída limitada a sinais, insights, lacunas, recomendações e briefings.

---

## 21. Próximas ações recomendadas

1. Confirmar a data máxima de posts e métricas no ambiente do MVP.
2. Confirmar o último log de importação.
3. Contar interações por origem e período.
4. Medir comentários com post, mídia ou permalink.
5. Testar a relação em 20 posts.
6. Separar comentários públicos de outras interações.
7. Anonimizar a amostra.
8. Definir período de 30 a 60 dias.
9. Informar contexto, objetivo, produto, tema, pilar, voz e capacidade.
10. Executar ciclo assistido sem publicação ou automação.

---

## 22. Análise crítica obrigatória

### 1. A auditoria confirma que o Editorial Agent pode usar os dados atuais?

**Sim, para um MVP assistido.** A evidência é forte para posts e métricas e condicional para comentários.

### 2. O que está mais pronto?

1. Posts;
2. métricas;
3. comentários.

### 3. Qual é o maior gargalo?

O gargalo técnico é associar interações aos posts com confiança. O gargalo de valor é a ausência de contexto editorial estruturado.

### 4. O gargalo é dado, integração, modelagem ou governança?

É uma combinação:

- modelagem: vínculo fraco;
- dado: cobertura incerta;
- governança: taxonomia não canônica;
- integração: necessária para dados adicionais, não para começar.

### 5. Qual dado faltante mais reduz o valor?

Objetivo, tema e pilar validados por post. Para o critério técnico mínimo, a relação comentário-post é o ponto mais sensível.

### 6. Qual dado faltante não importa para o MVP?

- DMs e Stories completos;
- CRM;
- Revenue;
- atribuição de vendas;
- publicação automática;
- Studio;
- Automation;
- demografia detalhada.

### 7. O que pode ser manual nos primeiros 30 dias?

Classificação, contexto, objetivo, produto, campanha, restrições, capacidade, validação de comentários e revisão das recomendações.

### 8. O que deve ser automatizado depois?

Coleta completa, vínculo, snapshots, mídia/transcrição, taxonomia, contexto, anonimização e monitoramento.

### 9. O que impediria o MVP técnico?

- dados desatualizados;
- ausência de comentários utilizáveis;
- comentários não relacionáveis;
- período não confiável;
- uso de dados pessoais sem tratamento mínimo.

### 10. Qual é a menor entrega possível?

Uma análise assistida de 30 a 60 dias com desempenho, padrões, legendas, CTAs, amostra anonimizada de comentários, sinais, hipóteses, lacunas, recomendações e briefings para revisão humana.

---

## 23. Recomendação final

### Classificação

**MVP viável com ajustes simples.**

### Justificativa

Já existem:

- posts;
- datas;
- legendas;
- formatos;
- curtidas;
- contagem de comentários;
- alcance;
- engajamento;
- salvamentos;
- compartilhamentos;
- período histórico útil.

O item parcialmente atendido é o comentário textual relacionado ao post.

O primeiro ciclo exige validar interações, reconciliar identificadores e informar manualmente o contexto editorial. Não exige construir nova plataforma nem automatizar publicação.

### Decisão recomendada

Seguir para um ciclo assistido e controlado, condicionado à verificação amostral dos comentários no ambiente real.

---

## 24. Evidências examinadas

- `supabase/migrations/0002_instagram_analytics.sql`
- `supabase/migrations/0003_instagram_n8n_ingest_view.sql`
- `supabase/migrations/0004_fix_instagram_n8n_ingest_permissions.sql`
- `supabase/migrations/0020_instagram_ads_daily.sql`
- `supabase/migrations/0021_instagram_ads_seed.sql`
- `supabase/migrations/0025_objetivos_module.sql`
- `supabase/migrations/0026_objetivos_seed_complementar.sql`
- `supabase/migrations/0028_instagram_directs_interactions.sql`
- `supabase/migrations/0030_ocorrencias_module.sql`
- `supabase/migrations/0033_relatorios_alertas.sql`
- `supabase/migrations/0038_comercial_module.sql`
- `supabase/migrations/0041_instagram_follower_snapshots.sql`
- `supabase/seed/instagram_insight_import.sql`
- `modules/instagram/services/instagram-server.ts`
- `modules/instagram/services/ingest/instagram-ingest.ts`
- `modules/instagram/components/InstagramDashboard.tsx`
- `modules/instagram/README_N8N_IMPORT.md`
- `modules/objetivos/services/objetivos-server.ts`
- `modules/relatorios/services/relatorios-server.ts`
- `Instagram_Analytics.json`
- `Instagram_Analytics_v2.json`
- `modules/instagram/Instagram_Directs_Comments_Collector_v1.json`
- `modules/instagram/Instagram_Directs_Messages_Collector_v1.json`
- `modules/instagram/Instagram_Directs_Webhook_v1.json`
- `modules/instagram/Instagram_Directs_Interactions_v1.json`
- `Insight.xlsx`
- `fga_instagram_dashboard_v6.html`

---

## 25. Arquivos criados ou alterados

- Criado: `EDITORIAL_AGENT_DATA_AUDIT.md`

Nenhum código, dado, schema, migration, workflow, frontend, backend ou configuração foi alterado.

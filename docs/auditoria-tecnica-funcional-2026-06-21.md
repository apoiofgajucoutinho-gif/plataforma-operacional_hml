# Auditoria Técnica e Funcional

**Sistema:** Plataforma Operacional Juliana Coutinho  
**Data da auditoria:** 21/06/2026  
**Escopo:** código-fonte presente no workspace, migrations Supabase, schema conectado, dados existentes e arquivos de integração versionados no projeto.

## Premissas da auditoria

- O relatório descreve o sistema exatamente como foi encontrado.
- O estado funcional foi classificado pela combinação entre código implementado, estrutura de banco disponível, dados existentes e validação de build.
- A presença de código ou de uma tabela não foi considerada, isoladamente, prova de funcionamento integral.
- Os arquivos de workflow n8n existentes no repositório foram analisados como artefatos do projeto. A execução de instâncias externas do n8n não pode ser comprovada apenas pelo repositório.
- O workspace contém alterações locais ainda não consolidadas em commit. Portanto, o estado auditado pode ser diferente do último commit ou da versão atualmente publicada em homologação.
- O projeto passou nos comandos `npm.cmd run typecheck` e `npm.cmd run build` durante esta auditoria.

# 1. Visão Geral

## Objetivo aparente do sistema

A Plataforma Operacional Juliana Coutinho é uma aplicação web interna destinada a centralizar a operação administrativa, comercial, financeira, de marketing e de suporte ligada à especialista Juliana Coutinho.

O sistema reúne, em uma única interface:

- agenda operacional com sincronização ao Google Calendar;
- métricas orgânicas do Instagram;
- métricas de anúncios da Meta;
- acompanhamento de metas e OKRs;
- gestão financeira e DRE;
- vendas, recebíveis, produtos e alunos da Hotmart;
- registro de chamados, incidentes e ocorrências;
- atividades, projetos, recorrências e templates;
- relatórios e alertas operacionais por Telegram;
- administração de usuários, perfis e permissões;
- telemetria de adoção e páginas acessadas.

## Problemas que o sistema resolve hoje

O código atual resolve ou centraliza os seguintes problemas operacionais:

- dispersão de dados entre planilhas, plataformas de venda, Meta, Instagram e agendas;
- necessidade de acompanhar compromissos e sincronizá-los com um calendário central;
- acompanhamento de conteúdo orgânico e mídia paga;
- visão financeira de entradas, saídas, bancos, cartões, previsões e DRE;
- acompanhamento de vendas e recebíveis da Hotmart;
- organização de chamados, incidentes e falhas operacionais;
- controle de tarefas, projetos e rotinas recorrentes;
- envio e histórico de resumos operacionais;
- restrição de acesso por perfil, módulo e tenant;
- visualização do uso real da própria plataforma.

## Usuários aparentes

Os perfis e grupos identificados no código são:

- **ADMIN:** administração integral da plataforma.
- **SUPORTE:** operação de agenda, Instagram, Ads, Financeiro, Atividades, Relatórios e outros módulos liberados.
- **MARKETING_PARTNER:** leitura de Instagram e acesso restrito à área de Marketing do Financeiro.
- **CLINICA:** perfil previsto para operações ligadas à clínica.
- **USER:** perfil básico previsto no modelo de autenticação.

Também aparecem como grupos operacionais ou responsáveis:

- Especialista;
- Marketing;
- Suporte;
- Gestão/Dados.

O banco conectado possui atualmente um tenant, quatro perfis e quatro vínculos de usuários ao tenant.

# 2. Mapa de Módulos

| Módulo | Objetivo atual | Status | Dependências principais |
|---|---|---|---|
| Agenda | Cadastrar, editar, excluir, visualizar e sincronizar compromissos. | Funcional, condicionado às credenciais Google. | Supabase, Google OAuth, Google Calendar API. |
| Instagram | Exibir métricas orgânicas, publicações, rankings, resultados e interações. | Parcial. Insights e Resultados possuem dados; Directs depende da cobertura dos workflows Meta. | Supabase, n8n, Meta/Instagram Graph API. |
| Ads | Exibir desempenho diário de anúncios, campanhas, conjuntos e criativos. | Parcial. Dados e dashboards existem; alguns indicadores estão marcados como futuros. | Supabase, n8n, Meta Marketing API. |
| Objetivos | Acompanhar metas, OKRs, resultados automáticos e planos de ação. | Parcial. Metas possuem dados; Key Results e planos de ação estão vazios. | Supabase e dados agregados de Instagram, Ads e Financeiro. |
| Financeiro | Controlar lançamentos, bancos, cartões, previsão, DRE e visão de marketing. | Funcional no núcleo principal. Recorrências e CAPEX existem no schema, sem registros atuais. | Supabase, Realtime e views SQL. |
| Comercial | Consolidar vendas, recebíveis, alunos e produtos da Hotmart. | Parcial. Dados e consultas funcionam; a administração de mapeamentos está declaradamente incompleta. | Supabase, n8n, Hotmart API/Webhooks. |
| Ocorrências | Registrar chamados, incidentes, falhas, planos e impactos. | Funcional no cadastro e consulta; planos de ação não possuem registros atuais. | Supabase e dados de Ads para estimativas relacionadas a campanhas. |
| Adoção | Medir visualizações, usuários, módulos e páginas acessadas. | Funcional. | Supabase e rastreamento interno do AppShell. |
| Atividades | Gerenciar projetos, tarefas, recorrências, templates e gestão à vista. | Parcial. A estrutura e os dados existem, mas há incompatibilidade de colunas em alterações de status e logs. | Supabase, Realtime, RPCs e regras de permissão. |
| Relatórios | Configurar destinatários, resumos, agendas de envio e histórico. | Parcial. Telegram está implementado; outros canais estão apenas modelados. | Supabase, Telegram Bot API, n8n. |
| Admin | Gerenciar usuários, perfis e permissões. | Funcional. | Supabase Auth, service role e tabelas de tenant/permissão. |

# 3. Telas

## Rotas de interface

| Tela | Rota | Objetivo | Componentes principais | Status |
|---|---|---|---|---|
| Entrada do sistema | `/` | Redirecionar o usuário autenticado para o primeiro módulo permitido. | Resolução de sessão, tenant e prioridade de módulos. | Funcional, com ausência de `comercial` na prioridade de destino. |
| Login | `/login` | Solicitar e validar código OTP por e-mail. | Formulário de e-mail, envio de OTP, validação e mensagens de erro. | Funcional, dependente do SMTP do Supabase Auth. |
| Callback de autenticação | `/auth/callback` | Concluir o fluxo de autenticação e redirecionar o usuário. | Troca de código/sessão e resolução de destino. | Funcional. |
| Agenda operacional | `/agenda` | Operar compromissos e visualizar calendário, lista e Gantt. | Big numbers, próximos eventos, formulário, filtros, Calendar/List/Gantt, sincronização Google. | Funcional, condicionado à conexão Google. |
| Instagram Analytics | `/instagram` | Analisar conteúdo orgânico e interações. | Abas Insights, Resultados e Directs; filtros; gráficos; rankings; tabelas; exportação. | Parcial. |
| Instagram Ads Analytics | `/ads` | Analisar mídia paga. | Abas Visão Geral, Performance, Detalhamento, Glossário e Análise; filtros e gráficos. | Parcial. |
| Objetivos e metas | `/objetivos` | Acompanhar metas e OKRs por frente de negócio. | Abas Visão Geral, OKRs, Instagram, Ads, Faturamento e Admin. | Parcial. |
| Financeiro | `/financeiro` | Controlar lançamentos e análises financeiras. | Abas Início, Diagnóstico, Lançar, Consultar, DRE, Marketing e Cadastro. | Funcional no núcleo. |
| Comercial | `/comercial` | Consultar vendas, recebíveis, alunos e produtos. | Abas Visão Geral, Vendas, Recebíveis, Alunos, Produtos, Conciliação e Admin. | Parcial. |
| Ocorrências | `/ocorrencias` | Registrar e analisar chamados e incidentes. | Abas Visão Geral, Chamados, Incidentes, Marketing, Planos de Ação, Relatórios e Admin. | Funcional no núcleo. |
| Adoção da plataforma | `/adocao` | Medir uso da plataforma. | Filtros, big numbers, módulos, páginas acessadas, usuários e atividades recentes. | Funcional. |
| Atividades | `/atividades` | Controlar projetos, tarefas e rotinas. | Abas Visão Geral, Projetos, Atividades, Recorrências, Templates, Gestão à Vista e Admin; Kanban/List/Calendar/Gantt. | Parcial. |
| Reports operacionais | `/relatorios` | Configurar e acompanhar envios de relatórios. | Abas Reports e Admin; destinatários, templates, agendamentos, envio imediato e histórico. | Parcial. |
| Administração | `/admin` | Manter usuários e visualizar perfis de acesso. | Abas Users e Perfil; criação, edição e exclusão de usuários. | Funcional. |
| Política de privacidade | `/privacy` | Exibir a política pública do aplicativo. | Conteúdo institucional e contato. | Funcional. |
| Exclusão de dados | `/data-deletion` | Exibir instruções públicas para solicitação de exclusão de dados. | Conteúdo institucional e contato. | Funcional. |

## Estrutura comum das telas autenticadas

As telas autenticadas utilizam um shell compartilhado com:

- menu lateral fixo e recolhível;
- logo Juliana Coutinho;
- navegação conforme permissões;
- nome do usuário conectado;
- alternância entre tema do sistema, claro e escuro;
- logout;
- encerramento de sessão após dez minutos sem atividade;
- registro de páginas acessadas;
- comportamento responsivo.

# 4. Banco de Dados

## Visão geral do schema conectado

O schema público conectado contém:

- 49 tabelas base;
- 7 views;
- um tenant;
- dados reais ou de teste em praticamente todos os módulos principais.

As contagens abaixo são estimativas observadas durante a auditoria e servem para indicar uso atual.

## Núcleo multiempresa e autenticação

### `tenants`

- **Objetivo:** representar empresas ou unidades segregadas.
- **Principais colunas:** `id`, `nome`, `tipo`, `created_at`, `updated_at`.
- **Relacionamentos:** referenciada por tabelas operacionais e de permissão por `tenant_id`.
- **Uso:** utilizada; 1 registro.

### `profiles`

- **Objetivo:** armazenar dados complementares dos usuários do Supabase Auth.
- **Principais colunas:** `id`, `nome`, `email`, `created_at`, `updated_at`.
- **Relacionamentos:** `id` corresponde ao usuário de autenticação.
- **Uso:** utilizada; 4 registros.

### `tenant_members`

- **Objetivo:** vincular usuários a tenants e papéis.
- **Principais colunas:** `id`, `tenant_id`, `user_id`, `role`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e Supabase Auth.
- **Uso:** utilizada; 4 registros.

### `tenant_module_permissions`

- **Objetivo:** controlar módulos e abas liberados por tenant e perfil.
- **Principais colunas:** `id`, `tenant_id`, `role`, `module`, `tabs`, `can_read`, `can_write`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`.
- **Uso:** utilizada; 25 registros.

## Agenda

### `agenda_eventos`

- **Objetivo:** armazenar todos os compromissos operacionais.
- **Principais colunas:** `id`, `tenant_id`, `titulo`, `tipo`, `inicio`, `fim`, `local`, `status`, `observacoes`, `google_event_id`, `created_by`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`; vínculo lógico com Google Calendar por `google_event_id`.
- **Uso:** utilizada; 54 registros.

### `google_calendar_connections`

- **Objetivo:** armazenar a autorização OAuth e o calendário central por tenant.
- **Principais colunas:** `tenant_id`, `google_email`, `calendar_id`, `access_token`, `refresh_token`, `expires_at`, `scope`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`.
- **Uso:** utilizada; 1 registro.

## Instagram orgânico e interações

### `instagram_accounts`

- **Objetivo:** cadastrar a conta do Instagram monitorada.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `username`, `meta_account_id`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`; referenciada por posts, métricas e interações.
- **Uso:** utilizada; 1 registro.

### `instagram_posts`

- **Objetivo:** armazenar publicações e métricas por conteúdo.
- **Principais colunas:** `id`, `tenant_id`, `account_id`, `external_id`, `published_at`, `tipo`, `conteudo`, `permalink`, `alcance`, `impressoes`, `likes`, `comentarios`, `salvos`, `compartilhamentos`, `engajamento_status`, `raw_payload`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e `instagram_accounts`.
- **Uso:** utilizada; 224 registros.

### `instagram_metrics`

- **Objetivo:** armazenar séries de métricas agregadas da conta.
- **Principais colunas:** `id`, `tenant_id`, `account_id`, `metric_date`, `seguidores`, `alcance`, `impressoes`, `engajamento`, `reels`, `stories`, `crescimento`, `raw_payload`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e `instagram_accounts`.
- **Uso:** utilizada; 225 registros.

### `instagram_interactions`

- **Objetivo:** consolidar comentários, mensagens, menções e outras interações.
- **Principais colunas:** `id`, `tenant_id`, `account_id`, `external_id`, `interaction_type`, `occurred_at`, `username`, `message_text`, `post_id`, `responded`, `responded_at`, `priority`, `potential`, `topic`, `suggested_action`, `raw_payload`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e `instagram_accounts`; vínculo lógico com posts.
- **Uso:** utilizada; 241 registros.

### `instagram_import_runs`

- **Objetivo:** registrar execuções de importação.
- **Principais colunas:** `id`, `tenant_id`, `account_id`, `source`, `status`, `records_received`, `records_inserted`, `records_updated`, `error_message`, `started_at`, `finished_at`.
- **Relacionamentos:** FK para tenant e conta.
- **Uso:** sem registros atuais.

### `instagram_interactions_import_rows`

- **Tipo:** view.
- **Objetivo:** expor o formato de importação das interações ao n8n/Supabase REST.
- **Uso:** utilizada como interface de ingestão.

### `instagram_n8n_import_rows`

- **Tipo:** view.
- **Objetivo:** expor o formato de importação de publicações e métricas.
- **Uso:** utilizada como interface de ingestão.

## Meta Ads

### `instagram_ads_daily`

- **Objetivo:** armazenar métricas diárias de campanhas, conjuntos e anúncios.
- **Principais colunas:** `id`, `tenant_id`, `date_start`, `date_stop`, `account_id`, `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `ad_id`, `ad_name`, `status`, `objective`, `spend`, `impressions`, `reach`, `frequency`, `clicks`, `ctr`, `cpc`, `cpm`, `results`, `cost_per_result`, `raw_payload`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`.
- **Uso:** utilizada; 1.031 registros.

### `instagram_ads_daily_backup_20260604_011205`

- **Objetivo:** cópia de segurança pontual da tabela de Ads.
- **Principais colunas:** espelha os dados de `instagram_ads_daily`.
- **Relacionamentos:** sem uso funcional identificado no aplicativo.
- **Uso:** contém 1.271 registros; não é consultada pelo código atual.

## Objetivos e metas

### `objetivos_metas`

- **Objetivo:** cadastrar metas por frente, indicador e período.
- **Principais colunas:** `id`, `tenant_id`, `frente`, `indicador`, `periodo_tipo`, `periodo_inicio`, `periodo_fim`, `meta_alcancavel`, `meta_alta`, `supermeta`, `valor_manual`, `fonte`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`.
- **Uso:** utilizada; 205 registros.

### `objetivos_okrs`

- **Objetivo:** armazenar objetivos estratégicos.
- **Principais colunas:** `id`, `tenant_id`, `titulo`, `descricao`, `periodo_inicio`, `periodo_fim`, `responsavel`, `status`, `confianca`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`; referenciada por Key Results.
- **Uso:** utilizada; 1 registro.

### `objetivos_key_results`

- **Objetivo:** armazenar resultados-chave vinculados a um OKR.
- **Principais colunas:** `id`, `tenant_id`, `okr_id`, `titulo`, `meta_valor`, `valor_atual`, `unidade`, `fonte`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e `objetivos_okrs`.
- **Uso:** sem registros atuais.

### `objetivos_planos_acao`

- **Objetivo:** registrar planos de ação relacionados a metas ou OKRs.
- **Principais colunas:** `id`, `tenant_id`, `meta_id`, `okr_id`, `titulo`, `descricao`, `responsavel`, `prazo`, `status`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, meta e OKR.
- **Uso:** sem registros atuais.

## Financeiro

### `fin_bancos`

- **Objetivo:** cadastrar contas bancárias e caixas.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `apelido`, `saldo_inicial`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants`; referenciada por cartões e lançamentos.
- **Uso:** utilizada; 2 registros.

### `fin_cartoes`

- **Objetivo:** cadastrar cartões de crédito.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `banco_id`, `ultimos_quatro`, `dia_fechamento`, `dia_vencimento`, `limite`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para `tenants` e `fin_bancos`; referenciada por lançamentos.
- **Uso:** utilizada; 3 registros.

### `fin_centros_resultado`

- **Objetivo:** cadastrar centros de resultado.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `ordem`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por lançamentos, perfis e DRE.
- **Uso:** utilizada; 5 registros.

### `fin_naturezas`

- **Objetivo:** classificar naturezas financeiras.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `tipo`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por categorias.
- **Uso:** utilizada; 4 registros.

### `fin_categorias`

- **Objetivo:** cadastrar categorias financeiras.
- **Principais colunas:** `id`, `tenant_id`, `natureza_id`, `nome`, `tipo`, `dre_grupo`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e natureza; referenciada por subcategorias e lançamentos.
- **Uso:** utilizada; 15 registros.

### `fin_subcategorias`

- **Objetivo:** detalhar categorias financeiras.
- **Principais colunas:** `id`, `tenant_id`, `categoria_id`, `nome`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e categoria; referenciada por lançamentos.
- **Uso:** utilizada; 23 registros.

### `fin_cursos`

- **Objetivo:** cadastrar cursos relacionados ao centro Infoproduto.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `codigo`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por lançamentos e DRE por curso.
- **Uso:** utilizada; 12 registros.

### `fin_lancamentos`

- **Objetivo:** armazenar entradas e saídas realizadas ou previstas.
- **Principais colunas:** `id`, `tenant_id`, `tipo`, `status`, `descricao`, `valor`, `data_pagamento`, `mes_competencia`, `centro_resultado_id`, `categoria_id`, `subcategoria_id`, `curso_id`, `forma_pagamento`, `banco_id`, `cartao_id`, `qtd_parcelas`, `parcela_pai_id`, `status_origem`, `observacao`, `created_by`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, centros, categorias, subcategorias, cursos, bancos, cartões e para a própria tabela.
- **Uso:** utilizada; 117 registros.

### `fin_recorrencias`

- **Objetivo:** armazenar regras de repetição de lançamentos.
- **Principais colunas:** `id`, `tenant_id`, `frequencia`, `data_inicio`, `data_fim`, dados do lançamento-base, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e cadastros financeiros.
- **Uso:** sem registros atuais.

### `fin_capex`

- **Objetivo:** controlar aquisições de ativo imobilizado e depreciação.
- **Principais colunas:** `id`, `tenant_id`, `descricao`, `valor_total`, `data_aquisicao`, `vida_util_meses`, `lancamento_origem_id`, `confirmado`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e lançamento de origem.
- **Uso:** sem registros atuais.

### `fin_perfis_usuario`

- **Objetivo:** definir o perfil financeiro e centros permitidos por usuário.
- **Principais colunas:** `id`, `tenant_id`, `user_id`, `perfil`, `centros_permitidos`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e usuário.
- **Uso:** utilizada; 4 registros.

### `fin_config`

- **Objetivo:** armazenar configurações financeiras por tenant.
- **Principais colunas:** `tenant_id`, `percentual_provisao_imposto`, `tratamento_coproducao`, `limite_capex`, parâmetros de reservas e alertas, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant.
- **Uso:** utilizada; 1 registro.

### Views financeiras

| View | Objetivo | Uso atual |
|---|---|---|
| `fin_v_dre_consolidado` | Consolidar DRE por competência e grupo. | Utilizada. |
| `fin_v_dre_por_centro` | Consolidar DRE por centro de resultado. | Utilizada. |
| `fin_v_dre_por_curso` | Consolidar DRE de Infoproduto por curso. | Utilizada; visão agregada por curso. |
| `fin_v_fatura_cartao` | Agregar lançamentos por cartão e vencimento. | Utilizada. |
| `fin_v_previsao_caixa` | Projetar entradas, saídas e saldo. | Utilizada. |

## Comercial, vendas e alunos

### `comercial_hotmart_raw`

- **Objetivo:** preservar os payloads brutos recebidos da Hotmart.
- **Principais colunas:** `id`, `tenant_id`, `event_id`, `event_type`, `source`, `payload`, `received_at`, `processed_at`, `processing_status`, `error_message`.
- **Relacionamentos:** FK para tenant; origem de normalização para vendas.
- **Uso:** utilizada; 2.451 registros.

### `comercial_vendas`

- **Objetivo:** armazenar vendas normalizadas.
- **Principais colunas:** `id`, `tenant_id`, `transaction_id`, `product_id`, `buyer_email`, `buyer_name`, `status`, `payment_type`, `installments`, `gross_value`, `net_value`, `currency`, `purchase_date`, `approved_date`, `source`, `raw_id`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, produto e registro bruto; origem para alunos, parcelas e recebíveis.
- **Uso:** utilizada; 2.451 registros.

### `comercial_recebiveis`

- **Objetivo:** representar valores previstos ou confirmados a receber.
- **Principais colunas:** `id`, `tenant_id`, `venda_id`, `transaction_id`, `parcela_numero`, `parcela_total`, `previsao_recebimento`, `valor`, `status`, `fonte_previsao`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e venda.
- **Uso:** utilizada; 13.179 registros.

### `comercial_parcelas`

- **Objetivo:** detalhar parcelamentos de vendas.
- **Principais colunas:** `id`, `tenant_id`, `venda_id`, `numero`, `total`, `valor_bruto`, `valor_liquido`, `data_prevista`, `data_recebimento`, `status`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e venda.
- **Uso:** utilizada; 13.180 registros.

### `comercial_alunos`

- **Objetivo:** criar e acompanhar alunos derivados das vendas.
- **Principais colunas:** `id`, `tenant_id`, `email`, `nome`, `produto_id`, `venda_id`, `status`, `data_inicio`, `data_expiracao`, `ultimo_acesso`, `progresso_percentual`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, produto e venda.
- **Uso:** utilizada; 1.196 registros.

### `comercial_produtos`

- **Objetivo:** mapear produtos Hotmart para cursos e regras de acesso.
- **Principais colunas:** `id`, `tenant_id`, `external_id`, `nome`, `curso_id`, `centro_resultado_id`, `dias_acesso`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, curso financeiro e centro de resultado.
- **Uso:** utilizada; 23 registros.

## Ocorrências

### `ocorrencias_cadastros`

- **Objetivo:** manter categorias, canais, plataformas, prioridades, status e demais listas do módulo.
- **Principais colunas:** `id`, `tenant_id`, `tipo`, `nome`, `ordem`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant.
- **Uso:** utilizada; 33 registros.

### `ocorrencias_chamados`

- **Objetivo:** registrar chamados e incidentes.
- **Principais colunas:** `id`, `tenant_id`, `tipo_registro`, `nome_cliente`, `email`, `telefone`, `instagram`, `data_chamado`, `canal`, `categoria`, `erro_motivo`, `plataforma`, `solucao`, `prioridade`, `status`, `responsavel`, `avaliacao`, `impacto_financeiro_real`, `impacto_financeiro_estimado`, `metodo_estimativa`, `observacao`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referências lógicas aos cadastros e, em alguns casos, a campanhas Ads.
- **Uso:** utilizada; 8 registros.

### `ocorrencias_planos_acao`

- **Objetivo:** registrar ações corretivas vinculadas a ocorrências.
- **Principais colunas:** `id`, `tenant_id`, `chamado_id`, `titulo`, `descricao`, `responsavel`, `prazo`, `status`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e chamado.
- **Uso:** sem registros atuais.

## Adoção

### `adoption_events`

- **Objetivo:** registrar visualizações e navegação dos usuários.
- **Principais colunas:** `id`, `tenant_id`, `user_id`, `user_email`, `module`, `page`, `event_name`, `occurred_at`, `metadata`.
- **Relacionamentos:** FK para tenant e vínculo lógico com usuário.
- **Uso:** utilizada; 1.683 registros.

## Atividades

### `atividades_templates`

- **Objetivo:** cadastrar modelos de projetos e tarefas.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `categoria`, `duracao_dias`, `time_padrao`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por tarefas de template e projetos.
- **Uso:** utilizada; 3 registros.

### `atividades_template_tarefas`

- **Objetivo:** definir tarefas e prazos relativos de cada template.
- **Principais colunas:** `id`, `tenant_id`, `template_id`, `titulo`, `descricao`, `ordem`, `inicio_offset_dias`, `duracao_dias`, `time_responsavel`, `status_inicial`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e template.
- **Uso:** utilizada; 11 registros.

### `atividades_projetos`

- **Objetivo:** armazenar projetos criados manualmente ou por template.
- **Principais colunas:** `id`, `tenant_id`, `template_id`, `nome`, `categoria`, `descricao`, `data_inicio`, `data_fim`, `status`, `time_responsavel`, `responsavel_id`, `created_by`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e template; referenciada por tarefas.
- **Uso:** utilizada; 1 registro.

### `atividades_tarefas`

- **Objetivo:** armazenar tarefas de projetos, avulsas e recorrentes.
- **Principais colunas reais:** `id`, `tenant_id`, `projeto_id`, `titulo`, `descricao`, `time_responsavel`, `responsavel_id`, `data_inicio`, `data_fim`, `prioridade`, `status`, `recorrencia_id`, `concluida_em`, `motivo_ignorado`, `created_by`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, projeto e recorrência; referenciada por dependências e logs.
- **Uso:** utilizada; 79 registros.
- **Observação de auditoria:** o frontend e a API usam os nomes `concluida_at` e `ignorada_motivo`, diferentes das colunas reais `concluida_em` e `motivo_ignorado`.

### `atividades_recorrencias`

- **Objetivo:** cadastrar tarefas repetitivas.
- **Principais colunas:** `id`, `tenant_id`, `titulo`, `descricao`, `frequencia`, `dias_semana`, `dia_mes`, `data_inicio`, `data_fim`, `time_responsavel`, `responsavel_id`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por tarefas.
- **Uso:** utilizada; 5 registros.

### `atividades_dependencias`

- **Objetivo:** representar dependências entre tarefas.
- **Principais colunas:** `id`, `tenant_id`, `tarefa_id`, `depende_de_tarefa_id`, `created_at`.
- **Relacionamentos:** duas FKs para tarefas.
- **Uso:** sem registros atuais.

### `atividades_logs`

- **Objetivo:** registrar ações feitas em projetos e tarefas.
- **Principais colunas reais:** `id`, `tenant_id`, `projeto_id`, `tarefa_id`, `user_id`, `acao`, `detalhe`, `created_at`.
- **Relacionamentos:** FK para tenant, projeto e tarefa.
- **Uso:** sem registros atuais.
- **Observação de auditoria:** a API envia o campo `descricao`, enquanto a tabela real possui `detalhe`.

## Relatórios

### `relatorio_destinatarios`

- **Objetivo:** cadastrar destinatários e canais de comunicação.
- **Principais colunas:** `id`, `tenant_id`, `nome`, `email`, `telegram_chat_id`, `whatsapp`, `perfil`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant; referenciada por agendamentos e envios.
- **Uso:** utilizada; 4 registros.

### `relatorio_agendamentos`

- **Objetivo:** configurar o que enviar, quando enviar e para quem.
- **Principais colunas:** `id`, `tenant_id`, `destinatario_id`, `nome`, `tipo_resumo`, `canal`, `frequencia`, `horario`, `dias_semana`, `dia_mes`, `periodo_dados`, `modulos`, `blocos`, `antecedencia_minutos`, `ativo`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant e destinatário.
- **Uso:** utilizada; 8 registros.

### `relatorio_envios`

- **Objetivo:** manter histórico, status e erros dos envios.
- **Principais colunas:** `id`, `tenant_id`, `agendamento_id`, `destinatario_id`, `tipo_resumo`, `canal`, `status`, `payload`, `erro`, `scheduled_for`, `sent_at`, `created_at`, `updated_at`.
- **Relacionamentos:** FK para tenant, agendamento e destinatário.
- **Uso:** utilizada; 60 registros.

## Tabelas previstas em migrations, ausentes no schema conectado

As migrations locais também definem os objetos abaixo, mas eles não aparecem no schema público conectado e não foram encontrados em uso pelo código atual:

- `agenda_aulas`;
- `agenda_pacientes`;
- `agenda_palestras`;
- `logs_api`;
- `logs_envio`;
- `logs_sistema`;
- `logs_usuario`.

# 5. Integrações

| Integração | Status encontrado | Onde é utilizada | Situação funcional |
|---|---|---|---|
| Supabase Database | Implementada e central. | Todos os módulos operacionais. | Funcional. |
| Supabase Auth | Implementada com OTP por e-mail. | Login, sessão, usuários e RBAC. | Funcional, dependente do SMTP configurado no projeto Supabase. |
| Supabase Realtime | Implementada em módulos como Financeiro e Atividades. | Atualização de dados sem recarga completa. | Funcional no código. |
| Google Calendar | OAuth, criação, atualização, exclusão, importação e sincronização bidirecional implementados. | Agenda. | Funcional quando a conexão e o refresh token do tenant são válidos. |
| Instagram Graph API | Não é chamada diretamente pelo frontend. Os dados entram por workflows n8n. | Instagram Insights, Resultados e Directs. | Parcial; dados orgânicos existem, mas a cobertura total de mensagens depende dos webhooks e permissões Meta externos. |
| Meta Marketing API | Utilizada por workflows n8n versionados. | Ads. | Dados estão presentes; os workflows do repositório estão com `active: false`. |
| Hotmart API/Webhooks | Utilizada por workflows n8n e endpoint de importação da aplicação. | Comercial. | Dados históricos estão presentes; workflows versionados estão inativos no arquivo. |
| Telegram Bot API | Chamada diretamente para envio imediato e indiretamente por n8n para rotinas. | Relatórios. | Implementada; depende de `TELEGRAM_BOT_TOKEN` e chat ID válido. |
| WhatsApp | Campos e canal previstos no banco e nas telas. | Relatórios e cadastros de ocorrências. | Não há implementação de envio encontrada. |
| Gmail SMTP | Variáveis aparecem no exemplo de ambiente e documentação. | Planejamento de envio de e-mail. | Não foi encontrada implementação de envio SMTP no código da aplicação. |
| Brevo/Supabase SMTP | Configuração externa ao repositório para OTP. | Autenticação. | Dependência operacional externa; não controlada pelo código. |
| ActiveCampaign | Nenhuma referência funcional encontrada. | Não utilizado. | Não implementado. |
| Sentry | Variável/documentação de preparação encontrada. | Monitoramento previsto. | SDK e inicialização não encontrados no projeto. |
| UptimeRobot | Mencionado em documentação. | Monitoramento externo. | Não há configuração versionada no repositório. |
| Vercel | Plataforma prevista para deploy. | Hospedagem do Next.js e variáveis de ambiente. | Externa ao código; o projeto está preparado para execução Next.js. |
| GitHub | Fluxo de versionamento previsto na documentação. | Código e deploy. | Repositório Git presente; estado local contém alterações pendentes. |
| n8n | Orquestra importações e envios agendados. | Instagram, Ads, Hotmart e Relatórios. | Dependência crítica. Os JSONs locais são modelos/versionamentos e estão inativos. |

# 6. Fluxos de Negócio

## Autenticação e acesso

1. O usuário informa o e-mail na tela de login.
2. A API verifica se o usuário já existe no Supabase Auth.
3. A API valida se existe vínculo ativo em `tenant_members`.
4. Se autorizado, o Supabase envia o código OTP.
5. Após a validação, o sistema resolve o tenant, o papel e os módulos permitidos.
6. O usuário é redirecionado para o primeiro módulo permitido.
7. O AppShell mantém a sessão, registra navegação e encerra o acesso após dez minutos sem atividade.

## Administração de usuários

1. Um administrador abre a tela Admin.
2. A aplicação lista usuários do Supabase Auth, perfis e vínculos ao tenant.
3. O administrador pode criar, editar ou excluir usuários.
4. A alteração atualiza Auth, `profiles`, `tenant_members` e, quando aplicável, o perfil financeiro.
5. A tela Perfil exibe os papéis e os módulos/abas associados.

## Agenda

1. O usuário abre o módulo e visualiza eventos do período.
2. Pode cadastrar um evento informando tipo, título, datas, local, status e observações.
3. O servidor valida conflito de horário.
4. O registro é salvo em `agenda_eventos`.
5. Quando a conexão Google está válida, o evento é criado ou atualizado no calendário central.
6. Eventos também podem ser importados do Google para o sistema pelo comando de sincronização.
7. Edição e exclusão atuam no banco e no Google Calendar.
8. Os eventos podem ser vistos em calendário, lista ou Gantt.

## Instagram orgânico e Directs

1. Workflows externos coletam publicações, métricas e interações.
2. Os dados são normalizados e enviados ao Supabase ou ao endpoint de importação.
3. A aba Insights consolida indicadores, formatos, horários, dias e rankings.
4. A aba Resultados lista publicações com filtros, ordenação, paginação e exportação.
5. A aba Directs consolida interações, temas, prioridade, potencial e ação sugerida.
6. Os filtros dos big numbers podem ser aplicados e removidos sobre a tabela.

## Ads

1. O n8n consulta a Meta Marketing API.
2. Os registros diários são normalizados e gravados em `instagram_ads_daily`.
3. O módulo agrega gastos, alcance, impressões, CTR, CPC, CPM e demais métricas disponíveis.
4. As abas apresentam visão geral, performance, detalhamento, glossário e análise.
5. Os filtros atuam por período, ano, mês e elementos da campanha.

## Objetivos

1. Metas são cadastradas por frente e período.
2. Cada meta pode utilizar valor manual ou fonte automática.
3. O serviço consulta dados de Instagram, Ads e Financeiro.
4. O sistema calcula realizado, percentual, faixa atingida e status.
5. A Visão Geral consolida metas dentro e fora.
6. OKRs, Key Results e planos de ação possuem estruturas próprias.

## Financeiro

1. Bancos, cartões, centros, naturezas, categorias, subcategorias e cursos são cadastrados.
2. O usuário cria uma entrada ou saída realizada ou prevista.
3. O lançamento é associado a competência, pagamento, centro, categoria e meio de pagamento.
4. Compras parceladas podem gerar parcelas relacionadas.
5. As telas consultam os lançamentos por filtros e paginação.
6. Views SQL alimentam DRE, faturas e previsão de caixa.
7. A área Marketing restringe a visão aos dados permitidos do centro Infoproduto.
8. Alterações nas tabelas principais atualizam as telas por Realtime.

## Comercial

1. O n8n recebe webhooks ou consulta o histórico da Hotmart.
2. O payload bruto é preservado.
3. A aplicação normaliza venda, produto, aluno, parcelas e recebíveis.
4. A Visão Geral consolida faturamento, líquido, vendas, alunos e previsões.
5. As abas permitem consultar e exportar vendas, recebíveis, alunos e produtos.
6. A conciliação expõe diferenças ou pendências de mapeamento.

## Ocorrências

1. O usuário cadastra chamado ou incidente.
2. Informa cliente, canal, categoria, plataforma, prioridade, motivo, solução, responsável e status.
3. Quando existe referência a campanha, o módulo consulta dados Ads para apoiar a estimativa de impacto.
4. O sistema separa chamados, incidentes, ocorrências de marketing, planos e relatórios.
5. Cadastros auxiliares são mantidos na aba Admin.

## Adoção

1. O AppShell registra a entrada em módulos e páginas.
2. O evento inclui usuário, módulo, página e data.
3. A tela Adoção agrega visualizações, usuários, módulos e páginas.
4. O administrador filtra os dados por período, módulo e usuário.

## Atividades

1. Templates definem tarefas, ordens e prazos relativos.
2. Um projeto pode ser criado a partir de um template.
3. Tarefas também podem ser avulsas ou geradas por recorrência.
4. A equipe consulta atividades em Kanban, lista, calendário ou Gantt.
5. Mudanças deveriam registrar status e logs.
6. No schema conectado, a atualização de status encontra incompatibilidade entre nomes de colunas usados pelo código e nomes existentes no banco.

## Relatórios e alertas

1. O administrador cadastra destinatários.
2. Configura templates/agendamentos com canal, frequência, horário, período e blocos.
3. O envio imediato prepara o conteúdo e usa Telegram quando o canal é Telegram.
4. Para rotinas, o n8n consulta envios devidos, solicita o payload e registra o resultado.
5. O histórico mantém status preparado, enviado, cancelado ou erro.

# 7. Funcionalidades Implementadas

- autenticação por código OTP;
- bloqueio de login para e-mails sem vínculo ativo;
- RBAC por papel, módulo e abas;
- base multi-tenant com segregação por `tenant_id`;
- criação, edição e exclusão de usuários pelo Admin;
- sidebar responsiva e recolhível;
- tema sistema, claro e escuro;
- logout e sessão com expiração por inatividade;
- rastreamento de adoção;
- CRUD de eventos de agenda;
- validação de conflito de agenda;
- calendário, lista e Gantt;
- sincronização sistema/Google e Google/sistema;
- métricas e rankings de Instagram;
- resultados de publicações com filtros, paginação e exportação;
- central de interações com classificação, prioridade e filtros;
- dashboards de Meta Ads;
- metas automáticas e manuais;
- visão de OKRs;
- cadastro financeiro de bancos, cartões e classificações;
- lançamentos de entrada e saída;
- consulta, edição, exclusão, filtros, paginação e exportação financeira;
- previsão de caixa, faturas e DRE;
- restrição da visão financeira de Marketing;
- importação e armazenamento de dados Hotmart;
- consultas de vendas, recebíveis, alunos e produtos;
- paginação, filtros e exportação no Comercial;
- registro de chamados e incidentes;
- estimativa de impacto baseada em dados Ads quando aplicável;
- cadastros administrativos de Ocorrências;
- telemetria de módulos, páginas e usuários;
- projetos, templates, recorrências e visualizações de atividades;
- cadastro de destinatários e agendamentos de relatórios;
- envio imediato por Telegram;
- endpoints para orquestração de relatórios por n8n;
- páginas públicas de privacidade e exclusão de dados;
- build de produção e verificação TypeScript sem erros no estado auditado.

# 8. Funcionalidades Incompletas

## Instagram

- A área Directs existe e possui dados, mas a captura integral de mensagens privadas depende de publicação, permissões e assinatura de webhooks Meta fora do repositório.
- Os workflows locais relacionados a comentários, interações e mensagens estão versionados como inativos.
- `instagram_import_runs` não possui registros.

## Ads

- Indicadores de conversões e leads aparecem como “Em breve”.
- Os workflows versionados no projeto estão inativos, embora a tabela possua dados.

## Objetivos

- Existem 205 metas, porém `objetivos_key_results` e `objetivos_planos_acao` não possuem registros.
- A estrutura de OKR está implementada, mas o uso atual está concentrado em uma única linha de objetivo.

## Financeiro

- `fin_recorrencias` e `fin_capex` estão estruturadas, mas sem registros atuais.
- A view de DRE por curso está disponível como visão agregada; não possui a mesma dimensão mensal identificada nas outras views.

## Comercial

- A aba Admin informa que a primeira entrega está estruturada, mas a edição dos mapeamentos de produto, curso, centro e dias de acesso ainda não está disponível pela interface.
- Dados de último acesso e progresso do aluno dependem das fontes externas Hotmart Club/Cademí e não são garantidos para todos os registros.
- Os workflows de backfill e webhook estão versionados como inativos no repositório.

## Ocorrências

- A estrutura de planos de ação existe, mas não há planos cadastrados.

## Atividades

- Alterações de status usam `concluida_at` e `ignorada_motivo`, mas o banco conectado possui `concluida_em` e `motivo_ignorado`.
- O registro de log usa `descricao`, enquanto o banco possui `detalhe`.
- As divergências impedem o funcionamento confiável da mudança de status e do log de ações.
- Dependências e logs possuem tabelas, porém não têm registros.
- A migration local de Atividades não coincide integralmente com o schema efetivamente conectado.

## Relatórios

- Telegram é o único canal de envio implementado.
- E-mail e WhatsApp aparecem no modelo de dados, mas não possuem mecanismo de envio encontrado.
- O funcionamento das rotinas agendadas depende de um workflow n8n externo ativo.

## Monitoramento

- Sentry e UptimeRobot aparecem como preparação documental, sem implementação versionada suficiente para comprovar monitoramento ativo.

# 9. Funcionalidades Planejadas

Os seguintes itens aparecem no código, schema, textos de interface ou documentação como sinais de uso futuro:

- conversões e leads no módulo Ads;
- edição administrativa dos mapeamentos de produtos do Comercial;
- dados completos de progresso e último acesso de alunos;
- envio de relatórios por e-mail;
- envio de relatórios por WhatsApp;
- uso operacional de recorrências financeiras;
- uso operacional de CAPEX e depreciação;
- preenchimento de Key Results e planos de ação de Objetivos;
- uso de dependências entre tarefas;
- uso dos logs de Atividades;
- tabelas separadas de agenda para aulas, pacientes e palestras;
- tabelas gerais de logs de API, sistema, usuário e envio;
- integração direta futura com Meta indicada na documentação do módulo Instagram;
- monitoramento com Sentry e UptimeRobot;
- envio SMTP Gmail descrito na configuração, sem implementação atual encontrada.

# 10. Dependências Críticas

## APIs e serviços obrigatórios

- Supabase Database;
- Supabase Auth;
- serviço SMTP configurado no Supabase Auth;
- Google OAuth e Google Calendar API;
- Meta Graph API para Instagram;
- Meta Marketing API para Ads;
- Hotmart API e Webhooks;
- Telegram Bot API;
- n8n para ingestões e rotinas agendadas;
- Vercel ou ambiente equivalente para hospedagem das rotas Next.js.

## Variáveis de ambiente utilizadas pelo código

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `N8N_INGEST_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_OWNER_EMAIL`
- `GOOGLE_CALENDAR_CONNECTION_EMAIL`
- `INSTAGRAM_DEFAULT_TENANT_NAME`
- `INSTAGRAM_DEFAULT_ACCOUNT_NAME`
- `INSTAGRAM_DEFAULT_USERNAME`

## Variáveis encontradas apenas em exemplo ou documentação

- `SENTRY_DSN`
- `GMAIL_SMTP_HOST`
- `GMAIL_SMTP_PORT`
- `GMAIL_SMTP_USER`
- `GMAIL_SMTP_PASS`

## Fluxos n8n identificados no repositório

- coleta de comentários e interações do Instagram;
- coleta de mensagens/Directs;
- webhook de interações do Instagram;
- coleta diária de Ads;
- backfill histórico de Ads;
- webhook Hotmart em tempo real;
- backfill histórico Hotmart;
- consulta e envio de relatórios agendados.

Os JSONs encontrados no repositório não estão marcados como ativos. A operação real depende da configuração e ativação na instância externa do n8n.

# 11. Acoplamento ao Negócio Atual

## Nomes específicos

O sistema apresenta acoplamento explícito à operação atual por meio de:

- marca “Juliana Coutinho” e “FGA Juliana Coutinho”;
- textos institucionais e títulos direcionados à especialista;
- conta padrão `fga.jucoutinho`;
- e-mail de suporte `apoio.fgajucoutinho@gmail.com`;
- calendário central padrão `fga.jucoutinho@gmail.com`;
- tenant padrão “Juliana Coutinho”;
- logo, favicon e paleta específicos.

## Regras específicas

- centros financeiros Infoproduto, Clínica, Palestras, Administrativo fixo e Não operacional;
- cursos associados ao negócio atual;
- visão financeira específica para Marketing;
- classificação operacional em Marketing, Suporte, Especialista e Gestão/Dados;
- templates e recorrências de atividades ligados à rotina atual;
- regras de objetivos para Instagram, Ads e Faturamento;
- classificação de interações por temas ligados à clínica, cursos, família, Jiu-Jitsu e marketing;
- relatórios destinados a Ju, Jeff e Suporte;
- calendário único central da especialista.

## Dados específicos

O banco conectado contém:

- publicações e métricas da conta da especialista;
- métricas de campanhas Meta;
- vendas e alunos da Hotmart;
- lançamentos financeiros reais ou operacionais;
- eventos da agenda;
- metas de negócio;
- ocorrências e atividades da equipe;
- destinatários e históricos de relatórios.

## Componentes reutilizáveis

Apesar do conteúdo específico, existem estruturas tecnicamente genéricas:

- shell de aplicação com navegação e responsividade;
- autenticação Supabase;
- modelo de tenant e permissões;
- componentes visuais de cards, tabelas, filtros e botões;
- utilitários de exportação;
- rastreamento de adoção;
- cadastros administrativos;
- padrão de APIs Next.js;
- serviços Supabase server/client;
- composição de blocos de relatórios;
- paginação, filtros e ordenação;
- abstrações de Realtime.

## Grau de acoplamento observado

A arquitetura possui base multi-tenant e componentes reutilizáveis, mas a implantação atual está fortemente identificada com um único negócio, uma única marca, um calendário central, uma conta de Instagram e regras operacionais específicas. O schema suporta segregação por tenant, porém o banco auditado possui apenas um tenant ativo.

# 12. Resumo Executivo

## 1. O que já está realmente pronto?

Autenticação, permissões, shell responsivo, Agenda com Google Calendar, dashboards principais de Instagram e Ads, núcleo Financeiro, consultas do Comercial, Ocorrências, Adoção, administração de usuários e envio imediato de relatórios por Telegram estão implementados. O projeto compila e passa na verificação TypeScript.

## 2. O que está parcialmente pronto?

Directs do Instagram, Ads com todos os indicadores, OKRs completos, recorrências e CAPEX financeiros, administração do Comercial, planos de ação de Ocorrências, Atividades, canais adicionais de Relatórios e monitoramento. Atividades possui divergências objetivas entre código e banco que afetam atualização de status e logs.

## 3. O que ainda não existe?

Envio efetivo de relatórios por WhatsApp e e-mail, integração ActiveCampaign, implementação versionada de Sentry e UptimeRobot, edição administrativa completa dos mapeamentos comerciais e uso efetivo das tabelas gerais de logs e das tabelas especializadas de agenda.

## 4. Qual parece ser o foco principal do sistema atualmente?

Centralizar a operação da especialista Juliana Coutinho, com maior maturidade nas frentes de Agenda, Instagram/Ads, Financeiro, Comercial, controle operacional e relatórios.

## 5. Qual o nível de maturidade do projeto de 0 a 10?

**6 de 10.**

O sistema já possui arquitetura, autenticação, banco estruturado, dados reais, múltiplos módulos e integrações em operação. A nota é limitada pela diferença de maturidade entre módulos, dependência de automações externas, funcionalidades modeladas sem execução completa e incompatibilidades atuais no módulo Atividades.

# 13. Portabilidade e Núcleo de Produto

## 1. Se todas as referências à Juliana fossem removidas, o que continuaria funcionando sem nenhuma alteração?

Considerando a remoção apenas dos nomes, imagens, textos e dados da Juliana, os seguintes elementos técnicos continuariam funcionando sem alteração estrutural:

- autenticação por OTP com Supabase Auth;
- controle de sessão e logout por inatividade;
- estrutura multi-tenant por `tenant_id`;
- RBAC por perfil, módulo e aba;
- administração de usuários e permissões;
- AppShell com menu lateral, responsividade e dark mode;
- componentes compartilhados de cards, tabelas, filtros, paginação e botões;
- utilitários de exportação;
- rastreamento de adoção e páginas acessadas;
- clientes Supabase server/client;
- padrão de APIs com Next.js;
- estrutura genérica de cadastro, edição e exclusão;
- infraestrutura de Realtime;
- histórico e configuração de relatórios;
- páginas públicas de privacidade e exclusão, desde que o conteúdo institucional removido não precisasse ser substituído imediatamente.

Alguns módulos também manteriam sua mecânica, mas ficariam vazios ou dependeriam de novas configurações:

| Módulo | O que continuaria funcionando | Dependência que ficaria sem configuração |
|---|---|---|
| Agenda | CRUD, filtros, calendário, lista, Gantt e validação de conflitos. | Calendário Google, conta OAuth e eventos. |
| Financeiro | Lançamentos, bancos, cartões, filtros, previsão e estrutura de DRE. | Centros, categorias, cursos, saldos e lançamentos. |
| Ocorrências | Cadastro e acompanhamento de chamados e incidentes. | Categorias, plataformas, responsáveis e registros. |
| Atividades | Projetos, tarefas, templates, recorrências e visualizações. | Templates, equipes, responsáveis e correção das divergências atuais de schema. |
| Relatórios | Destinatários, templates, agendamentos e histórico. | Telegram, destinatários, blocos e regras de envio. |
| Objetivos | Estrutura de metas, OKRs e planos de ação. | Metas, indicadores, fontes e resultados. |
| Instagram | Interface, filtros, gráficos e tabelas. | Conta, dados, token Meta e workflows. |
| Ads | Interface, filtros, gráficos e tabelas. | Conta de anúncios, dados, token Meta e workflows. |
| Comercial | Estrutura de vendas, recebíveis, alunos e produtos. | Credenciais Hotmart, produtos, histórico e workflows. |

Portanto, o núcleo técnico sobreviveria, mas os módulos integrados não entregariam dados até receberem configuração e conteúdo de outro especialista.

## 2. O que é especificamente “algo Juliana”?

“Algo Juliana” é qualquer elemento cuja existência, significado ou valor atual depende diretamente da marca, das contas, dos processos ou dos dados da operação Juliana Coutinho.

### Identidade e comunicação

- nome Juliana Coutinho e FGA Juliana Coutinho;
- logotipo, favicon e identidade visual;
- textos institucionais;
- e-mails de apoio e administração;
- conta do Instagram `fga.jucoutinho`;
- nomes Ju, Jeff e demais pessoas da operação;
- textos de privacidade e exclusão direcionados ao negócio atual.

### Contas e integrações

- tenant “Juliana Coutinho”;
- calendário `fga.jucoutinho@gmail.com`;
- conexão OAuth do Google;
- conta Instagram e conta de anúncios Meta;
- credenciais e produtos Hotmart;
- destinatários e chat IDs do Telegram;
- workflows n8n configurados para as contas atuais.

### Regras e classificações

- centros de resultado atuais;
- cursos e produtos da especialista;
- metas de faturamento, Instagram e Ads;
- temas de Directs como curso, clínica, família e Jiu-Jitsu;
- categorias de ocorrências ligadas à operação atual;
- templates e recorrências de atividades da equipe;
- regras de acesso dos perfis atuais;
- blocos dos relatórios destinados a Ju, Jeff e Suporte.

### Dados operacionais

- eventos da agenda;
- posts, métricas e interações do Instagram;
- campanhas e métricas de Ads;
- vendas, alunos, produtos e recebíveis;
- lançamentos financeiros;
- chamados, incidentes e impactos;
- projetos, tarefas e recorrências;
- metas, OKRs e planos de ação;
- histórico de navegação e relatórios enviados.

Os elementos acima não são apenas textos de personalização. Parte deles interfere diretamente nas consultas, integrações, permissões e resultados exibidos.

## 3. O que seria o produto e funcionaria sem os dados da Juliana?

O produto identificável no código é uma plataforma operacional modular para especialistas ou pequenas operações de serviço, conteúdo e infoprodutos.

O produto técnico é composto por:

- autenticação e usuários;
- tenants, perfis e permissões;
- navegação modular;
- agenda operacional;
- controle financeiro;
- gestão de atividades;
- registro de ocorrências;
- relatórios e alertas;
- acompanhamento de adoção;
- conectores de dados para marketing e vendas;
- componentes compartilhados de consulta, filtros e exportação.

### Funcionamento sem os dados da Juliana

Sem os dados da Juliana, a aplicação ainda poderia:

- autenticar usuários;
- cadastrar e administrar perfis;
- liberar módulos e abas;
- criar eventos locais;
- cadastrar bancos, cartões e classificações financeiras;
- criar lançamentos;
- registrar chamados e incidentes;
- cadastrar projetos, tarefas, templates e recorrências;
- cadastrar destinatários e agendamentos de relatórios;
- registrar o uso da plataforma.

Sem dados e credenciais externas, ela não poderia exibir conteúdo útil em:

- Instagram;
- Ads;
- Comercial/Hotmart;
- sincronização com Google Calendar;
- envios pelo Telegram;
- metas automáticas alimentadas por integrações.

O código atual contém um produto-base, mas a implantação auditada ainda não é neutra. Ela combina:

1. uma plataforma tecnicamente reutilizável;
2. configurações específicas da operação atual;
3. dados exclusivos da Juliana;
4. integrações configuradas para contas específicas.

## 4. Quais 20% do sistema entregariam 80% do valor para um segundo especialista em 30 dias?

Com base apenas no que já existe e no nível de dependência de cada módulo, o menor núcleo com maior valor seria:

### 1. Plataforma de acesso e operação

- login por código;
- usuários;
- perfis e permissões;
- menu modular;
- responsividade;
- dark mode;
- administração.

Esse bloco não é percebido isoladamente como valor de negócio, mas permite que todo o restante seja utilizado com segurança.

### 2. Agenda

- cadastro de compromissos;
- visualização em calendário, lista e Gantt;
- filtros;
- conflito de horários;
- integração com um calendário Google central.

A Agenda possui uso imediato e exige menos dados históricos para começar a gerar valor.

### 3. Financeiro essencial

- bancos e cartões;
- entradas e saídas;
- consulta e filtros;
- previsão de caixa;
- visão consolidada;
- exportação.

O Financeiro entrega valor mesmo começando com uma base vazia, pois os dados passam a ser produzidos pelo uso diário.

### 4. Controle operacional

O conjunto formado por Atividades e Ocorrências cobre:

- tarefas;
- projetos;
- rotinas recorrentes;
- chamados;
- incidentes;
- responsáveis;
- prioridade;
- status;
- histórico operacional.

Atividades possui atualmente uma limitação técnica na mudança de status e nos logs, mas sua estrutura representa parte central do valor operacional.

### 5. Relatórios básicos

- destinatários;
- resumo de agenda;
- prioridades operacionais;
- alertas;
- histórico de envios;
- Telegram.

Esse bloco transforma os dados dos demais módulos em acompanhamento diário.

## Distribuição aproximada de valor

| Núcleo | Motivo do valor imediato | Dependência de histórico |
|---|---|---|
| Acesso e permissões | Permite operação multiusuário e controlada. | Baixa. |
| Agenda | Organiza compromissos desde o primeiro dia. | Baixa. |
| Financeiro essencial | Produz visão de caixa e rotina financeira. | Média. |
| Atividades e Ocorrências | Centraliza execução, pendências e falhas. | Baixa. |
| Relatórios Telegram | Leva os dados operacionais aos responsáveis. | Média. |

Instagram, Ads, Objetivos e Comercial possuem valor relevante, mas dependem mais fortemente de:

- credenciais externas;
- histórico importado;
- configuração de contas;
- produtos específicos;
- normalização de dados;
- workflows n8n;
- regras próprias do especialista.

Por isso, eles representam uma parcela maior do esforço de implantação para um segundo especialista e não formam o núcleo mais rápido de valor em um prazo de 30 dias.

## Síntese da portabilidade

- **Totalmente genérico:** autenticação, tenants, permissões, shell, componentes, exportação e adoção.
- **Genérico após configuração:** Agenda, Financeiro, Ocorrências, Atividades e Relatórios.
- **Fortemente dependente de integrações e dados:** Instagram, Ads, Comercial e metas automáticas.
- **Específico da Juliana:** marca, contas, credenciais, cursos, metas, calendários, destinatários, templates e dados operacionais atuais.

O “produto” não é o conjunto de dados da Juliana. O produto é a estrutura operacional que recebe configurações e dados de uma operação. No estado auditado, essa estrutura existe, mas ainda está combinada com várias referências e regras específicas do primeiro negócio.

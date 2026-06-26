# MAPA MESTRE DO SISTEMA

**Sistema auditado:** Plataforma Operacional Juliana Coutinho  
**Data de referência:** 21/06/2026  
**Escopo:** código presente no workspace, rotas Next.js, migrations Supabase, schema conectado, dados existentes, regras de acesso e workflows n8n versionados.

## Critérios deste documento

- O conteúdo descreve o sistema como ele existe hoje.
- Não são propostas funcionalidades, módulos, refatorações ou arquitetura futura.
- “Funcional” significa que o fluxo principal está implementado e possui estrutura de dados compatível.
- “Parcial” significa que parte do fluxo depende de configuração externa, possui áreas sem dados ou apresenta alguma limitação concreta.
- “Incompleto” significa que o código ou o banco contém somente parte da funcionalidade esperada ou existe divergência que impede o fluxo.
- Workflows n8n versionados no repositório representam artefatos de integração. O estado da instância externa do n8n pode ser diferente do campo `active` presente nos arquivos JSON.
- O workspace possui alterações locais ainda não consolidadas em commit. A documentação representa o workspace atual, que pode diferir da versão publicada.

# VISÃO GERAL

## Objetivo do sistema

A Plataforma Operacional Juliana Coutinho centraliza a operação administrativa, financeira, comercial, de marketing, agenda, suporte e acompanhamento executivo relacionada à especialista Juliana Coutinho.

O sistema combina:

- aplicação operacional multiusuário;
- banco de dados multi-tenant;
- autenticação e controle de acesso;
- dashboards de Instagram e Meta Ads;
- agenda sincronizada ao Google Calendar;
- gestão financeira e DRE;
- vendas, recebíveis e alunos da Hotmart;
- chamados, incidentes e ocorrências;
- metas e OKRs;
- projetos, tarefas e recorrências;
- relatórios e alertas via Telegram;
- administração de usuários;
- telemetria de adoção.

## Problemas resolvidos atualmente

- centralização de dados antes distribuídos entre planilhas e plataformas;
- segregação de acesso por usuário e perfil;
- organização de compromissos;
- sincronização de eventos com um calendário Google central;
- leitura operacional de Instagram e Ads;
- controle de entradas, saídas, bancos, cartões, previsões e DRE;
- consolidação de vendas, alunos e recebíveis Hotmart;
- registro de chamados e falhas;
- acompanhamento de metas;
- controle de tarefas e projetos;
- envio de resumos e alertas operacionais;
- medição de uso da plataforma.

## Usuários identificados

O código e os dados indicam uso pelos seguintes grupos:

- Juliana, como especialista e administradora da operação;
- equipe de suporte;
- equipe de marketing;
- gestão e dados;
- operação clínica;
- usuários básicos cadastrados.

## Perfis existentes

| Perfil | Papel técnico | Finalidade atual |
|---|---|---|
| `ADMIN` | Administrador integral | Acesso a todos os módulos, usuários, cadastros e dados. |
| `SUPORTE` | Operador amplo | Agenda, leitura de marketing, operação financeira, ocorrências, atividades, comercial e relatórios conforme permissões. |
| `MARKETING_PARTNER` | Parceiro de marketing | Instagram, Financeiro restrito à aba Marketing e tarefas da equipe Marketing. |
| `CLINICA` | Operação clínica/especialista | Agenda e tarefas vinculadas à equipe especialista/clínica. |
| `USER` | Usuário básico | Acesso apenas quando explicitamente liberado em `tenant_module_permissions`. |

# ARQUITETURA

## Frontend

- **Framework:** Next.js 16 com App Router.
- **Linguagem:** TypeScript.
- **Biblioteca de interface:** React 19.
- **Estilização:** TailwindCSS e estilos globais.
- **Ícones:** Lucide React.
- **Renderização:** combinação de Server Components, páginas server-side e componentes client-side.
- **Estrutura:** rotas em `/app`, componentes compartilhados em `/components` e domínios em `/modules`.
- **Layout autenticado:** `AppShell` com sidebar, responsividade, dark mode, usuário conectado, logout e rastreamento de adoção.

## Backend

- rotas HTTP em `/app/api`;
- serviços server-side em `/modules/*/services`;
- autenticação e resolução de acesso no servidor;
- uso de Supabase client, server client e admin client;
- APIs de ingestão protegidas por token para n8n;
- APIs específicas para Google Calendar, Telegram, Hotmart e importação de Instagram.

## Banco

- PostgreSQL gerenciado pelo Supabase;
- schema público com 49 tabelas base e 7 views identificadas;
- segregação por `tenant_id`;
- RLS aplicada às tabelas operacionais;
- funções no schema `app_private`;
- triggers para timestamps e regras financeiras;
- views de DRE, previsão, fatura e ingestão;
- Realtime utilizado em módulos específicos.

## Integrações

- Supabase Database, Auth e Realtime;
- Google OAuth e Google Calendar API;
- Instagram Graph API por n8n;
- Meta Marketing API por n8n;
- Hotmart API e webhooks por n8n;
- Telegram Bot API;
- SMTP externo configurado no Supabase Auth;
- Vercel para hospedagem;
- GitHub para versionamento;
- n8n para coleta, normalização, backfill e agendamentos.

## Serviços externos

| Serviço | Papel |
|---|---|
| Supabase | Banco, Auth, RLS, Realtime e API REST. |
| Vercel | Hospedagem da aplicação Next.js e variáveis de ambiente. |
| n8n | Orquestração de integrações e relatórios. |
| Google Cloud | OAuth e acesso ao Google Calendar. |
| Meta | Instagram, comentários, mensagens e anúncios. |
| Hotmart | Vendas, produtos, alunos, parcelas e recebíveis. |
| Telegram | Entrega de relatórios e alertas. |
| SMTP/Brevo | Entrega dos códigos OTP do Supabase Auth. |

## Diagrama textual

```text
Usuário
  |
  v
Next.js / Vercel
  |
  +--> Supabase Auth ----> SMTP externo
  |
  +--> Supabase PostgreSQL
  |      |
  |      +--> RLS / tenant_id
  |      +--> Views financeiras
  |      +--> Realtime
  |      +--> Tabelas operacionais
  |
  +--> Google OAuth / Calendar API
  |
  +--> Telegram Bot API
  |
  +--> Endpoints protegidos para n8n
             |
             +--> Instagram Graph API
             +--> Meta Marketing API
             +--> Hotmart API / Webhooks
             +--> Telegram
             +--> Supabase REST
```

# MÓDULOS

## 1. Agenda

- **Objetivo:** controlar compromissos operacionais e manter sincronização com o Google Calendar central.
- **Funcionalidades:**
  - cadastro, edição e exclusão de eventos;
  - tipos paciente, palestra, aula e interno;
  - status agendado, confirmado, concluído e cancelado;
  - validação de conflito de horário;
  - filtros Hoje, Próximos 7 dias e Mês;
  - calendário mensal;
  - lista;
  - Gantt;
  - expansão e detalhes do evento;
  - sincronização sistema → Google;
  - sincronização Google → sistema.
- **Tabelas:** `agenda_eventos`, `google_calendar_connections`.
- **Integrações:** Supabase, Google OAuth e Google Calendar API.
- **Páginas:** `/agenda`.
- **APIs:** `/api/agenda/events`, `/api/agenda/events/[eventId]`, `/api/agenda/events/pull-google`, `/api/agenda/events/sync-google`, `/api/google/connect`, `/api/google/callback`.
- **Status:** funcional, condicionado à validade da conexão OAuth, refresh token e credenciais Google.

## 2. Instagram

- **Objetivo:** consolidar métricas orgânicas, publicações e interações.
- **Funcionalidades:**
  - aba Insights;
  - aba Resultados;
  - aba Directs;
  - indicadores de publicações, alcance e engajamento;
  - rankings;
  - gráficos por formato, dia, horário, mês e semana;
  - filtros por período, ano, mês e tipo;
  - paginação;
  - ordenação;
  - exportação;
  - classificação de interação por tipo, tema, prioridade e potencial;
  - indicação de respondido e ação sugerida.
- **Tabelas:** `instagram_accounts`, `instagram_posts`, `instagram_metrics`, `instagram_interactions`, `instagram_import_runs`.
- **Views:** `instagram_n8n_import_rows`, `instagram_interactions_import_rows`.
- **Integrações:** Supabase, n8n e Instagram Graph API.
- **Páginas:** `/instagram`.
- **APIs:** `/api/instagram/import`.
- **Status:** parcial. Insights e Resultados possuem dados; a abrangência de Directs depende dos webhooks, tokens e permissões Meta.

## 3. Ads

- **Objetivo:** acompanhar mídia paga da Meta.
- **Funcionalidades:**
  - Visão Geral;
  - Performance;
  - Detalhamento;
  - Glossário;
  - Análise;
  - filtros de período, ano e mês;
  - indicadores de investimento, alcance, impressões, frequência, cliques, CTR, CPC e CPM;
  - gráficos e tabelas por campanha, conjunto e anúncio.
- **Tabelas:** `instagram_ads_daily`.
- **Tabela auxiliar:** `instagram_ads_daily_backup_20260604_011205`.
- **Integrações:** Supabase, n8n e Meta Marketing API.
- **Páginas:** `/ads`.
- **Status:** parcial. O dashboard possui dados; conversões e leads estão sinalizados na interface como futuros.

## 4. Objetivos

- **Objetivo:** acompanhar metas operacionais e estratégicas.
- **Funcionalidades:**
  - Visão Geral;
  - OKRs;
  - Instagram;
  - Ads;
  - Faturamento;
  - Admin;
  - períodos mensal, quarter, semestre e anual;
  - metas alcançável, alta e supermeta;
  - valor manual ou automático;
  - percentual atingido;
  - status dentro ou fora da meta;
  - planos de ação.
- **Tabelas:** `objetivos_metas`, `objetivos_okrs`, `objetivos_key_results`, `objetivos_planos_acao`.
- **Integrações internas:** Instagram, Ads e Financeiro.
- **Páginas:** `/objetivos`.
- **APIs:** `/api/objetivos`.
- **Status:** parcial. Metas possuem dados; Key Results e planos de ação estão sem registros atuais.

## 5. Financeiro

- **Objetivo:** controlar caixa, lançamentos, cadastros financeiros, projeções e DRE.
- **Funcionalidades:**
  - Início;
  - Diagnóstico;
  - Lançar;
  - Consultar;
  - DRE;
  - Marketing;
  - Cadastro;
  - entradas e saídas;
  - realizado e previsto;
  - bancos;
  - cartões;
  - centros de resultado;
  - naturezas;
  - categorias;
  - subcategorias;
  - cursos;
  - parcelas;
  - filtros;
  - paginação;
  - exportação;
  - previsão de caixa;
  - faturas;
  - DRE consolidado, por centro e por curso;
  - Realtime;
  - segregação da visão de Marketing.
- **Tabelas:** `fin_bancos`, `fin_cartoes`, `fin_centros_resultado`, `fin_naturezas`, `fin_categorias`, `fin_subcategorias`, `fin_cursos`, `fin_lancamentos`, `fin_recorrencias`, `fin_capex`, `fin_perfis_usuario`, `fin_config`.
- **Views:** `fin_v_dre_consolidado`, `fin_v_dre_por_centro`, `fin_v_dre_por_curso`, `fin_v_fatura_cartao`, `fin_v_previsao_caixa`.
- **Integrações:** Supabase Database e Realtime.
- **Páginas:** `/financeiro`.
- **APIs:** `/api/financeiro/lancamentos`, `/api/financeiro/bancos`, `/api/financeiro/cartoes`, `/api/financeiro/cadastros`.
- **Status:** funcional no núcleo. CAPEX e recorrências possuem estrutura, mas não possuem registros atuais.

## 6. Comercial

- **Objetivo:** consolidar vendas, recebíveis, alunos, produtos e parcelas da Hotmart.
- **Funcionalidades:**
  - Visão Geral;
  - Vendas;
  - Recebíveis;
  - Alunos;
  - Produtos;
  - Conciliação;
  - Admin;
  - filtros por período, ano, mês, status e busca;
  - paginação;
  - exportação;
  - separação entre histórico e webhook;
  - armazenamento do payload bruto;
  - criação de aluno a partir da venda;
  - previsão de recebimento;
  - acompanhamento de acesso e expiração quando a origem fornece os dados.
- **Tabelas:** `comercial_hotmart_raw`, `comercial_vendas`, `comercial_recebiveis`, `comercial_parcelas`, `comercial_alunos`, `comercial_produtos`.
- **Integrações:** Supabase, n8n e Hotmart.
- **Páginas:** `/comercial`.
- **APIs:** `/api/comercial/hotmart/import`.
- **Status:** parcial. Dados e consultas existem; a edição administrativa dos mapeamentos não está disponível na interface atual.

## 7. Ocorrências

- **Objetivo:** registrar chamados, incidentes, falhas e impactos operacionais.
- **Funcionalidades:**
  - Visão Geral;
  - Chamados;
  - Incidentes;
  - Marketing;
  - Planos de Ação;
  - Relatórios;
  - Admin;
  - cadastro de cliente e canal;
  - prioridade e status;
  - solução e responsável;
  - avaliação;
  - classificação e exportação;
  - impacto financeiro real;
  - impacto financeiro estimado;
  - associação lógica com campanhas.
- **Tabelas:** `ocorrencias_cadastros`, `ocorrencias_chamados`, `ocorrencias_planos_acao`.
- **Integrações internas:** dados do módulo Ads.
- **Páginas:** `/ocorrencias`.
- **APIs:** `/api/ocorrencias`.
- **Status:** funcional no cadastro e consulta. A tabela de planos de ação não possui registros atuais.

## 8. Adoção

- **Objetivo:** registrar e analisar o uso da plataforma.
- **Funcionalidades:**
  - visualizações;
  - usuários ativos;
  - módulos usados;
  - páginas acessadas;
  - atividades recentes;
  - filtros por período, módulo e usuário;
  - exportação.
- **Tabelas:** `adoption_events`.
- **Integrações:** rastreamento interno do `AppShell` e Supabase.
- **Páginas:** `/adocao`.
- **APIs:** `/api/adoption/track`.
- **Status:** funcional; o serviço atual restringe a consulta ao perfil Admin.

## 9. Atividades

- **Objetivo:** gerenciar projetos, tarefas, templates e rotinas.
- **Funcionalidades:**
  - Visão Geral;
  - Projetos;
  - Atividades;
  - Recorrências;
  - Templates;
  - Gestão à Vista;
  - Admin;
  - Kanban;
  - lista;
  - calendário;
  - Gantt;
  - tarefas avulsas;
  - tarefas de projeto;
  - tarefas recorrentes;
  - dependências;
  - responsáveis e times;
  - status concluído e ignorado;
  - logs de ação.
- **Tabelas:** `atividades_templates`, `atividades_template_tarefas`, `atividades_projetos`, `atividades_tarefas`, `atividades_recorrencias`, `atividades_dependencias`, `atividades_logs`.
- **Integrações:** Supabase, Realtime e RPCs do PostgreSQL.
- **Páginas:** `/atividades`.
- **APIs:** `/api/atividades`.
- **Status:** incompleto. A estrutura e os dados existem, mas há divergências de nomes de colunas entre código e banco que afetam mudança de status e logs.

## 10. Relatórios

- **Objetivo:** configurar, disparar e registrar resumos operacionais.
- **Funcionalidades:**
  - aba Reports;
  - aba Admin;
  - destinatários;
  - tipos de resumo;
  - periodicidade;
  - período dos dados;
  - seleção de módulos e blocos;
  - lembrete de evento;
  - envio imediato;
  - envio agendado;
  - histórico;
  - cancelamento e reenvio;
  - status preparado, enviado, erro e cancelado.
- **Tabelas:** `relatorio_destinatarios`, `relatorio_agendamentos`, `relatorio_envios`.
- **Integrações:** Supabase, Telegram Bot API e n8n.
- **Páginas:** `/relatorios`.
- **APIs:** `/api/relatorios`, `/api/relatorios/send-now`, `/api/relatorios/due`, `/api/relatorios/dispatch`, `/api/relatorios/log`, `/api/relatorios/history`.
- **Status:** parcial. Telegram está implementado; e-mail e WhatsApp estão apenas modelados.

## 11. Admin

- **Objetivo:** administrar usuários e visualizar perfis.
- **Funcionalidades:**
  - aba Users;
  - aba Perfil;
  - listagem de usuários;
  - criação;
  - edição de nome, e-mail, papel e status;
  - exclusão;
  - leitura dos módulos e abas atribuídos aos perfis;
  - sincronização com perfil financeiro.
- **Tabelas:** `profiles`, `tenant_members`, `tenant_module_permissions`, `fin_perfis_usuario`.
- **Integrações:** Supabase Auth e Supabase Admin API.
- **Páginas:** `/admin`.
- **APIs:** `/api/admin/users`.
- **Status:** funcional e restrito ao perfil Admin.

# BANCO DE DADOS

## Classificação dos domínios

- **Core:** identidade, tenancy, autenticação e permissões.
- **Marketing:** Instagram orgânico, Directs, Ads e metas de marketing.
- **Comercial:** Hotmart, vendas, recebíveis, produtos e alunos.
- **Financeiro:** lançamentos, cadastros, projeções e DRE.
- **Operação:** agenda, ocorrências, atividades e relatórios.
- **Administração:** adoção, objetivos corporativos e administração da plataforma.

## Core

| Tabela | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `tenants` | Representar empresas ou operações segregadas. | Pai de tabelas com `tenant_id`. | Core | Nenhuma. | Sim. |
| `profiles` | Dados complementares dos usuários. | `id` vinculado a `auth.users`. | Core | Supabase Auth. | Sim. |
| `tenant_members` | Vincular usuário, tenant, papel e status. | FK para tenant e Auth. | Core | Supabase Auth. | Sim. |
| `tenant_module_permissions` | Definir leitura e escrita por perfil e módulo. | FK para tenant; consultada pelo acesso. | Core | Nenhuma. | Sim. |

## Marketing

| Tabela/view | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `instagram_accounts` | Cadastrar a conta monitorada. | FK para tenant; pai de posts, métricas e interações. | Instagram | Meta/Instagram. | Sim, com nova conta. |
| `instagram_posts` | Armazenar publicações e métricas por conteúdo. | FK para tenant e conta. | Instagram | Instagram Graph API/n8n. | Sim. |
| `instagram_metrics` | Armazenar séries agregadas da conta. | FK para tenant e conta. | Instagram | Instagram Graph API/n8n. | Sim. |
| `instagram_interactions` | Consolidar comentários, mensagens e menções. | FK para tenant e conta; vínculo lógico com posts. | Instagram | Meta Webhooks/API/n8n. | Sim. |
| `instagram_import_runs` | Registrar execuções de importação. | FK para tenant e conta. | Instagram | n8n. | Sim. |
| `instagram_n8n_import_rows` | Interface de ingestão de posts/métricas. | Alimenta tabelas Instagram. | Instagram | Supabase REST/n8n. | Sim. |
| `instagram_interactions_import_rows` | Interface de ingestão de interações. | Alimenta `instagram_interactions`. | Instagram | Supabase REST/n8n. | Sim. |
| `instagram_ads_daily` | Métricas diárias de campanhas e anúncios. | FK para tenant. | Ads | Meta Marketing API/n8n. | Sim. |
| `instagram_ads_daily_backup_20260604_011205` | Backup pontual dos dados Ads. | Sem uso no runtime. | Ads | Origem interna. | Não como componente de produto. |
| `objetivos_metas` | Metas por frente, indicador e período. | FK para tenant. | Objetivos | Fontes internas opcionais. | Sim, com novos indicadores. |
| `objetivos_okrs` | Objetivos estratégicos. | FK para tenant; pai de KRs. | Objetivos | Nenhuma. | Sim. |
| `objetivos_key_results` | Resultados-chave. | FK para tenant e OKR. | Objetivos | Fontes internas opcionais. | Sim. |
| `objetivos_planos_acao` | Planos vinculados a metas ou OKRs. | FK para tenant, meta e OKR. | Objetivos | Nenhuma. | Sim. |

## Comercial

| Tabela | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `comercial_hotmart_raw` | Preservar payload bruto recebido. | FK para tenant; origem da normalização. | Comercial | Hotmart/n8n. | Sim para Hotmart. |
| `comercial_vendas` | Vendas normalizadas. | FK para tenant, produto e raw. | Comercial | Hotmart/n8n. | Sim para Hotmart. |
| `comercial_recebiveis` | Valores previstos ou confirmados. | FK para tenant e venda. | Comercial | Hotmart/n8n. | Sim para Hotmart. |
| `comercial_parcelas` | Parcelas das vendas. | FK para tenant e venda. | Comercial | Hotmart/n8n. | Sim para Hotmart. |
| `comercial_alunos` | Alunos derivados das vendas. | FK para tenant, produto e venda. | Comercial | Hotmart/Club/Cademí. | Parcialmente. |
| `comercial_produtos` | Mapear produto externo, curso e acesso. | FK para tenant, curso e centro. | Comercial | Hotmart. | Sim, com novo catálogo. |

## Financeiro

| Tabela/view | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `fin_bancos` | Bancos e caixas. | FK para tenant; pai de cartões e lançamentos. | Financeiro | Nenhuma. | Sim. |
| `fin_cartoes` | Cartões de crédito. | FK para tenant e banco. | Financeiro | Nenhuma. | Sim. |
| `fin_centros_resultado` | Centros de resultado. | FK para tenant; usado por lançamentos. | Financeiro | Nenhuma. | Sim, com novo cadastro. |
| `fin_naturezas` | Naturezas financeiras. | FK para tenant; pai de categorias. | Financeiro | Nenhuma. | Sim. |
| `fin_categorias` | Categorias e grupos de DRE. | FK para tenant e natureza. | Financeiro | Nenhuma. | Sim. |
| `fin_subcategorias` | Detalhamento de categorias. | FK para tenant e categoria. | Financeiro | Nenhuma. | Sim. |
| `fin_cursos` | Cursos associados às receitas. | FK para tenant; usado em lançamentos. | Financeiro | Catálogo do negócio. | Sim, com novo catálogo. |
| `fin_lancamentos` | Entradas e saídas realizadas ou previstas. | FK para cadastros financeiros e auto-FK de parcelas. | Financeiro | Nenhuma obrigatória. | Sim. |
| `fin_recorrencias` | Regras recorrentes de lançamento. | FK para tenant e cadastros. | Financeiro | Nenhuma. | Sim. |
| `fin_capex` | Ativos e depreciação. | FK para tenant e lançamento. | Financeiro | Nenhuma. | Sim. |
| `fin_perfis_usuario` | Perfil financeiro e centros permitidos. | FK para tenant e usuário. | Financeiro | Supabase Auth. | Sim. |
| `fin_config` | Parâmetros financeiros por tenant. | FK para tenant. | Financeiro | Nenhuma. | Sim, mediante configuração. |
| `fin_v_dre_consolidado` | DRE consolidado. | Derivada de lançamentos e cadastros. | Financeiro | Nenhuma. | Sim. |
| `fin_v_dre_por_centro` | DRE por centro. | Derivada de lançamentos e centros. | Financeiro | Nenhuma. | Sim. |
| `fin_v_dre_por_curso` | DRE por curso. | Derivada de lançamentos e cursos. | Financeiro | Catálogo de cursos. | Sim. |
| `fin_v_fatura_cartao` | Faturas por cartão e vencimento. | Derivada de lançamentos e cartões. | Financeiro | Nenhuma. | Sim. |
| `fin_v_previsao_caixa` | Projeção de entradas, saídas e saldo. | Derivada de lançamentos. | Financeiro | Nenhuma. | Sim. |

## Operação

| Tabela | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `agenda_eventos` | Compromissos operacionais. | FK para tenant; vínculo por `google_event_id`. | Agenda | Google Calendar opcional. | Sim. |
| `google_calendar_connections` | Token OAuth e calendário central. | FK para tenant. | Agenda | Google OAuth/Calendar. | Sim, com nova conexão. |
| `ocorrencias_cadastros` | Listas de categorias, canais e status. | FK para tenant. | Ocorrências | Nenhuma. | Sim, com novos cadastros. |
| `ocorrencias_chamados` | Chamados e incidentes. | FK para tenant; referências lógicas a cadastros e Ads. | Ocorrências | Ads opcional. | Sim. |
| `ocorrencias_planos_acao` | Ações corretivas. | FK para tenant e chamado. | Ocorrências | Nenhuma. | Sim. |
| `atividades_templates` | Templates de projetos. | FK para tenant; pai de tarefas-template. | Atividades | Nenhuma. | Sim. |
| `atividades_template_tarefas` | Etapas e prazos do template. | FK para tenant e template. | Atividades | Nenhuma. | Sim. |
| `atividades_projetos` | Projetos. | FK para tenant e template. | Atividades | Nenhuma. | Sim. |
| `atividades_tarefas` | Tarefas avulsas, de projeto e recorrentes. | FK para tenant, projeto e recorrência. | Atividades | Nenhuma. | Sim após compatibilidade de schema. |
| `atividades_recorrencias` | Regras de tarefas recorrentes. | FK para tenant; gera tarefas. | Atividades | Nenhuma. | Sim. |
| `atividades_dependencias` | Dependências entre tarefas. | Duas FKs para tarefas. | Atividades | Nenhuma. | Sim. |
| `atividades_logs` | Histórico de ações. | FK para tenant, projeto e tarefa. | Atividades | Supabase Auth. | Sim após compatibilidade de schema. |
| `relatorio_destinatarios` | Pessoas e canais de envio. | FK para tenant; pai de agendamentos e envios. | Relatórios | Telegram/e-mail/WhatsApp. | Sim. |
| `relatorio_agendamentos` | Configuração de conteúdo e periodicidade. | FK para tenant e destinatário. | Relatórios | n8n. | Sim. |
| `relatorio_envios` | Histórico e status dos envios. | FK para tenant, agendamento e destinatário. | Relatórios | Telegram/n8n. | Sim. |

## Administração

| Tabela | Objetivo | Relacionamentos | Proprietário | Dependência externa | Reutilizável? |
|---|---|---|---|---|---|
| `adoption_events` | Registrar páginas e módulos acessados. | FK para tenant; vínculo lógico com usuário. | Adoção | Supabase Auth. | Sim. |

## Objetos definidos em migrations e ausentes no schema conectado

Os objetos abaixo aparecem nas migrations iniciais, mas não foram encontrados no schema público conectado:

- `agenda_aulas`;
- `agenda_pacientes`;
- `agenda_palestras`;
- `logs_api`;
- `logs_envio`;
- `logs_sistema`;
- `logs_usuario`.

# INTEGRAÇÕES

## Supabase

- **Finalidade:** banco, autenticação, RLS, Realtime, API REST e administração de usuários.
- **Dependências:** URL do projeto, publishable key, service role key, migrations e políticas.
- **Riscos atuais:**
  - indisponibilidade do projeto afeta toda a plataforma;
  - service role incorreta bloqueia rotas administrativas e ingestões;
  - divergência entre migration local e schema conectado já ocorre em Atividades;
  - SMTP do Auth é externo ao código.
- **Tabelas impactadas:** todas.

## Meta / Instagram

- **Finalidade:** publicações, insights, comentários, mensagens, menções e conta do Instagram.
- **Dependências:** app Meta, tokens, permissões, conta profissional, página vinculada, webhooks e n8n.
- **Riscos atuais:**
  - expiração ou troca de token;
  - permissões não aprovadas;
  - app Meta não publicado;
  - webhook não assinado ou inativo;
  - mudanças de versão da Graph API;
  - cobertura parcial de Directs.
- **Tabelas impactadas:** `instagram_accounts`, `instagram_posts`, `instagram_metrics`, `instagram_interactions`, `instagram_import_runs`.

## Meta Ads

- **Finalidade:** métricas diárias de campanhas, conjuntos e anúncios.
- **Dependências:** token com permissões Ads, conta de anúncios, Meta Marketing API e n8n.
- **Riscos atuais:**
  - token inválido;
  - paginação incompleta;
  - timeout em grandes volumes;
  - workflows duplicados por versão;
  - indicadores não fornecidos pela origem.
- **Tabelas impactadas:** `instagram_ads_daily` e backup.

## Google

- **Finalidade:** calendário central e sincronização bidirecional.
- **Dependências:** client ID, client secret, redirect URI, consentimento OAuth, refresh token e calendário autorizado.
- **Riscos atuais:**
  - `redirect_uri_mismatch`;
  - `invalid_client`;
  - `unauthorized_client`;
  - refresh token revogado;
  - calendário incorreto;
  - evento salvo localmente sem confirmação externa quando a conexão falha.
- **Tabelas impactadas:** `agenda_eventos`, `google_calendar_connections`.

## Hotmart

- **Finalidade:** histórico e eventos de vendas, produtos, alunos, parcelas e recebíveis.
- **Dependências:** credenciais Hotmart, token OAuth, API, webhooks, paginação e n8n.
- **Riscos atuais:**
  - limitação ou paginação incompleta do histórico;
  - igualdade entre bruto e líquido quando a origem não fornece deduções;
  - previsões antigas projetadas sem confirmação real;
  - dados de acesso do aluno não disponíveis em todos os endpoints;
  - workflows locais inativos.
- **Tabelas impactadas:** todas as tabelas `comercial_*`.

## Telegram

- **Finalidade:** enviar resumos e alertas.
- **Dependências:** `TELEGRAM_BOT_TOKEN`, chat ID, bot presente no grupo e n8n para agendamentos.
- **Riscos atuais:**
  - chat ID incorreto;
  - bot sem permissão;
  - erro “bot can't send messages to the bot”;
  - token ausente na Vercel;
  - envio preparado sem retorno do n8n.
- **Tabelas impactadas:** `relatorio_destinatarios`, `relatorio_agendamentos`, `relatorio_envios`.

## n8n

- **Finalidade:** consultar APIs, normalizar payloads, executar backfills, receber webhooks, gravar no Supabase e disparar relatórios.
- **Dependências:** instância ativa, workflows importados, credenciais, tokens, URLs da plataforma e agenda de execução.
- **Riscos atuais:**
  - JSON versionado não comprova ativação externa;
  - múltiplas versões de um mesmo fluxo;
  - timeout;
  - credenciais no ambiente;
  - URLs de produção e webhook;
  - execução interrompida em paginação;
  - divergência entre workflow importado e workflow atualmente ativo na instância.
- **Tabelas impactadas:** Instagram, Ads, Comercial e Relatórios.

# WORKFLOWS N8N

| Nome | Objetivo | Gatilho | Origem | Destino | Tabelas impactadas | Estado no arquivo |
|---|---|---|---|---|---|---|
| `Instagram_Analytics` | Coletar posts e insights. | Schedule Trigger. | Instagram Graph API. | Endpoint/Supabase. | `instagram_posts`, `instagram_metrics`, `instagram_accounts`. | `active: true`. |
| `Instagram_Analytics_v2` | Versão com node Supabase para posts e insights. | Schedule Trigger. | Instagram Graph API. | Supabase. | `instagram_posts`, `instagram_metrics`, `instagram_accounts`. | `active: true`. |
| `Instagram Ads Daily Collector_V3_Supabase` | Coleta incremental e backfill de Ads. | Diário 20h30 e manual. | Meta Marketing API. | Supabase. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V3_Supabase_2026_full` | Coleta completa de 2026 e incremental. | Diário 20h30 e manual. | Meta Marketing API. | Supabase. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V4_Supabase_2026` | Backfill 2026 e incremental. | Diário 20h30 e manual. | Meta Marketing API. | Supabase. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V5_Supabase_2026` | Revisão do coletor 2026. | Diário 20h30 e manual. | Meta Marketing API. | Supabase. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V6_Supabase_2026` | Revisão do coletor 2026. | Diário 20h30 e manual. | Meta Marketing API. | Supabase. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V7_Supabase_2026` | Coleta com tratamento em lotes. | Diário 20h30 e manual. | Meta Marketing API. | Supabase REST. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Ads Daily Collector_V8_Supabase_2026` | Versão mais recente encontrada do coletor Ads. | Diário 20h30 e manual. | Meta Marketing API. | Supabase REST. | `instagram_ads_daily`. | `active: false`. |
| `Instagram Directs / Comentarios Collector v1` | Buscar comentários de posts recentes. | A cada 1 hora. | Instagram Graph API. | Supabase REST. | `instagram_interactions`. | `active: false`. |
| `Instagram Directs / Interacoes - Supabase v1` | Receber interações por webhook genérico. | Webhook. | Meta/n8n caller. | Supabase REST. | `instagram_interactions`. | `active: false`. |
| `Instagram Directs / Mensagens Collector v1` | Buscar conversas e mensagens. | Manual e a cada 1 hora. | Instagram Messaging API. | Supabase REST. | `instagram_interactions`. | `active: false`. |
| `Instagram Directs / Webhook v1` | Validar webhook Meta e receber Directs. | Webhooks GET e POST. | Meta Webhooks. | Supabase REST. | `instagram_interactions`. | `active: false`. |
| `Hotmart Comercial / Backfill Historico v1` | Importar histórico paginado. | Manual. | Hotmart Sales API. | API da plataforma. | Todas `comercial_*`. | `active: false`. |
| `Hotmart Comercial / Webhook v1` | Receber eventos Hotmart em tempo real. | Webhook. | Hotmart Webhooks. | API da plataforma. | Todas `comercial_*`. | `active: false`. |
| `Resumo Operacional Telegram v1` | Buscar relatórios devidos e enviar pelo Telegram. | A cada 15 minutos. | API `/api/relatorios/due`. | Telegram e API de log. | `relatorio_agendamentos`, `relatorio_envios`. | Campo `active` sem valor no arquivo. |

# PERMISSÕES

## Modelo de autorização

O acesso combina:

1. usuário no Supabase Auth;
2. vínculo ativo em `tenant_members`;
3. papel do usuário;
4. registros de `tenant_module_permissions`;
5. RLS por tenant;
6. regras adicionais dentro de alguns módulos.

## Admin

- acesso total retornado diretamente por `getAllowedModulesForUser`;
- acesso a todos os módulos listados em `allModules`;
- leitura e escrita administrativa;
- gerenciamento de usuários;
- acesso aos cadastros e dados financeiros;
- acesso integral às equipes de Atividades;
- único perfil aceito pelo serviço atual de Adoção.

## Suporte

Permissões seedadas e regras encontradas:

| Módulo | Acesso real identificado |
|---|---|
| Agenda | Leitura e escrita. |
| Instagram | Leitura. |
| Ads | Leitura. |
| Objetivos | Leitura, sem aba Admin. |
| Financeiro | Leitura e escrita; abas operacionais sem Cadastro no catálogo do Admin. |
| Comercial | Leitura e escrita. |
| Ocorrências | Leitura e escrita. |
| Atividades | Leitura e escrita ampla. |
| Relatórios | Leitura e escrita. |
| Admin | Sem acesso. |
| Adoção | O serviço atual retorna acesso apenas para Admin. |

## Marketing

| Módulo | Acesso real identificado |
|---|---|
| Instagram | Somente leitura em Insights e Resultados. |
| Financeiro | Somente leitura na aba Marketing. |
| Atividades | Leitura e escrita apenas para tarefas da equipe `marketing`; exclusão segue regras específicas do módulo. |
| Demais módulos | Sem permissão seedada identificada. |

## Clínica

| Módulo | Acesso real identificado |
|---|---|
| Agenda | Leitura e escrita. |
| Atividades | Leitura e escrita para tarefas associadas à equipe `especialista`. |
| Demais módulos | Sem permissão seedada identificada. |

## User

- não recebe acesso automático amplo;
- depende de registros explícitos em `tenant_module_permissions`;
- em Atividades, a leitura depende de `can_read`;
- o login somente é permitido quando o usuário existe e possui vínculo ativo no tenant.

## Divergências observadas no catálogo de perfis

- `comercial` e `ocorrencias` existem em `allModules`, mas não aparecem no mapa `moduleLabels` do serviço Admin.
- `atividades` e `relatorios` aparecem no catálogo de abas do Admin como “Em desenvolvimento”, apesar de possuírem telas e funcionalidades implementadas.
- `comercial` existe na navegação e nas permissões, mas não está presente em `landingPriority` nem em `modulePaths`; um usuário com apenas esse módulo não possui destino inicial configurado.
- permissões exibidas na tela Admin derivam das tabelas, mas os nomes das abas são parcialmente definidos de forma fixa no código.

# DADOS JULIANA

## Marca

- nome Juliana Coutinho;
- nome FGA Juliana Coutinho;
- logotipo horizontal;
- ícone do aplicativo;
- paleta visual;
- textos institucionais;
- e-mail `apoio.fgajucoutinho@gmail.com`;
- páginas públicas de privacidade e exclusão.

## Cursos e produtos

- catálogo de cursos em `fin_cursos`;
- produtos Hotmart em `comercial_produtos`;
- associação produto → curso;
- associação produto → centro de resultado;
- dias de acesso;
- regras de Infoproduto;
- dados históricos de alunos e vendas.

## Calendário

- conta central `fga.jucoutinho@gmail.com`;
- conexão OAuth do tenant;
- calendar ID;
- eventos operacionais existentes;
- sincronização configurada para a agenda da especialista.

## Integrações

- conta Instagram `fga.jucoutinho`;
- conta Meta Ads;
- app Meta;
- conta Hotmart;
- produtos Hotmart;
- bot e grupos Telegram;
- workflows n8n com IDs e contas da operação;
- SMTP de apoio;
- projeto Supabase da Plataforma Operacional.

## Regras específicas

- centros Infoproduto, Clínica, Palestras, Administrativo fixo e Não operacional;
- tratamento financeiro por curso;
- acesso restrito de Marketing;
- calendário central único;
- equipes Marketing, Suporte, Especialista e Gestão/Dados;
- destinatários Ju, Jeff e Suporte;
- classificação de ocorrências de marketing;
- templates de atividades de lançamento e ação de venda;
- rotinas de suporte;
- cálculo de reservas e metas financeiras;
- classificação de interações por curso, clínica, família, Jiu-Jitsu, reclamação e risco.

## Indicadores

- metas de Instagram;
- metas de Ads;
- metas de faturamento;
- indicadores de DRE;
- metas por curso;
- métricas da conta Instagram;
- métricas das campanhas;
- previsão de recebíveis Hotmart;
- indicadores de agenda;
- indicadores de adoção.

## Templates

- templates de projetos;
- tarefas de lançamento;
- tarefas de ação de venda;
- recorrências do suporte;
- relatórios executivos;
- relatórios de suporte;
- alertas técnicos;
- lembretes de agenda;
- blocos configurados para destinatários atuais.

# REUTILIZAÇÃO

## Produto

Elementos que constituem uma plataforma reutilizável:

- autenticação por OTP;
- modelo de tenant;
- perfis e permissões;
- RLS;
- administração de usuários;
- AppShell;
- sidebar;
- responsividade;
- dark mode;
- componentes de cards, tabelas, filtros e botões;
- paginação e exportação;
- APIs Next.js;
- clientes Supabase;
- telemetria de adoção;
- agenda local;
- cadastros financeiros;
- lançamentos;
- chamados e incidentes;
- projetos, tarefas, templates e recorrências;
- destinatários, agendamentos e histórico de relatórios;
- estrutura de metas e OKRs;
- conectores de ingestão.

## Customização Juliana

- marca e identidade visual;
- textos institucionais;
- e-mails;
- tenant atual;
- usuários atuais;
- perfis aplicados à equipe;
- contas Google, Meta, Instagram, Hotmart e Telegram;
- credenciais e tokens;
- cursos e produtos;
- centros e categorias financeiras;
- calendário;
- metas e indicadores;
- temas de interação;
- responsáveis;
- templates de atividades;
- rotinas de suporte;
- destinatários e relatórios;
- todos os dados operacionais existentes.

## Débito Técnico

Itens que representam discrepância, redundância ou limitação concreta do estado atual:

- nomes de colunas de Atividades diferentes entre código e banco;
- campo de log `descricao` no código e `detalhe` no banco;
- migration local de Atividades diferente do schema conectado;
- `comercial` ausente da prioridade e do mapa de rotas de landing;
- `comercial` e `ocorrencias` ausentes do catálogo de labels do Admin;
- abas de Atividades e Relatórios descritas como “Em desenvolvimento” no Admin;
- múltiplas versões de workflow Ads mantidas em paralelo;
- dois workflows ativos de Instagram Analytics com finalidade sobreposta;
- tabela de backup Ads exposta no schema principal;
- tabelas previstas em migration e ausentes no banco conectado;
- canais e-mail e WhatsApp modelados sem mecanismo de envio;
- indicadores Ads marcados como futuros;
- Key Results e planos de ação sem dados;
- cadastros de CAPEX e recorrências financeiras sem uso atual;
- mapeamento administrativo do Comercial sem edição pela interface;
- workflows JSON locais com estado diferente do que pode estar ativo no n8n externo;
- documentação README anterior não representa integralmente o sistema atual.

# GAPS

## Funcionalidades incompletas

- cobertura integral de Directs e mensagens Meta;
- indicadores de conversão e leads em Ads;
- Key Results e planos de ação de Objetivos;
- uso operacional de CAPEX;
- uso operacional de recorrências financeiras;
- edição administrativa dos mapeamentos do Comercial;
- dados completos de progresso e último acesso dos alunos;
- planos de ação de Ocorrências;
- dependências e logs de Atividades;
- envio de relatórios por e-mail;
- envio de relatórios por WhatsApp;
- monitoramento versionado por Sentry;
- configuração versionada do UptimeRobot.

## Divergências banco x código

| Área | Código | Banco conectado | Efeito atual |
|---|---|---|---|
| Atividades | `concluida_at` | `concluida_em` | Mudança de status pode falhar. |
| Atividades | `ignorada_motivo` | `motivo_ignorado` | Status ignorado pode falhar. |
| Logs de Atividades | `descricao` | `detalhe` | Registro de log pode falhar. |
| Migration de Atividades | Define nomes usados no frontend. | Schema conectado contém nomes diferentes. | Estado local e remoto não coincidem. |
| Agenda/logs iniciais | Migrations definem tabelas especializadas e gerais de log. | Tabelas ausentes no schema conectado. | Objetos não participam do runtime atual. |

## Dependências críticas

- Supabase disponível;
- migrations compatíveis com o banco;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- SMTP do Supabase Auth;
- `NEXT_PUBLIC_APP_URL`;
- `N8N_INGEST_TOKEN`;
- instância n8n ativa;
- tokens Meta;
- permissões Meta;
- credenciais Hotmart;
- Google client ID e secret;
- redirect URI Google;
- refresh token Google;
- `TELEGRAM_BOT_TOKEN`;
- chat IDs válidos;
- workflows corretamente ativados.

# CONCLUSÃO

## 1. O que já é um produto?

Já constitui produto:

- autenticação;
- multi-tenancy;
- usuários e permissões;
- layout operacional;
- agenda;
- financeiro básico;
- ocorrências;
- estrutura de atividades;
- relatórios;
- adoção;
- componentes de consulta, filtros, paginação e exportação;
- conectores de integração;
- estrutura administrativa.

Esses elementos possuem lógica genérica e não dependem conceitualmente da identidade Juliana.

## 2. O que ainda é apenas operação Juliana?

- marca;
- contas e credenciais;
- calendário;
- cursos;
- produtos;
- centros e categorias;
- metas;
- indicadores configurados;
- temas de Directs;
- templates;
- responsáveis;
- destinatários;
- relatórios configurados;
- workflows vinculados às contas atuais;
- dados históricos e operacionais.

## 3. O que pode virar produto sem alteração?

Pode ser utilizado por outro cliente sem alteração estrutural:

- autenticação;
- tenants;
- perfis;
- permissões;
- AppShell;
- componentes visuais;
- administração de usuários;
- adoção;
- agenda local;
- bancos e cartões;
- lançamentos;
- chamados;
- projetos;
- tarefas;
- templates;
- recorrências;
- destinatários;
- agendamentos;
- histórico de relatórios.

Esses elementos exigem dados e configuração, mas não uma mudança conceitual de código.

## 4. O que exige adaptação?

Exige adaptação de configuração ou integração:

- identidade visual;
- textos institucionais;
- Google Calendar;
- Instagram;
- Meta Ads;
- Hotmart;
- Telegram;
- catálogo de cursos e produtos;
- classificação financeira;
- metas e indicadores;
- permissões por equipe;
- temas de interação;
- templates e relatórios.

Atividades também exige compatibilidade entre os nomes usados no código e os nomes existentes no banco para operar integralmente no estado atual.

## 5. O que deveria ser descartado?

Com base apenas no código, nenhum dado operacional ativo pode ser declarado descartável com segurança.

Os elementos identificados sem participação no runtime atual ou com natureza redundante são:

- versões anteriores dos workflows Ads mantidas ao lado da versão mais recente;
- duplicidade funcional entre `Instagram_Analytics` e `Instagram_Analytics_v2`;
- tabela `instagram_ads_daily_backup_20260604_011205` como backup pontual dentro do schema principal;
- páginas e arquivos de preview usados apenas para validação visual;
- tabelas definidas em migrations, ausentes no banco e sem consumo pelo código;
- artefatos de documentação ou protótipos que não são carregados pela aplicação.

Esta classificação descreve ausência de uso ou redundância encontrada. Ela não confirma que os arquivos possam ser removidos sem validação externa de histórico, deploy ou operação do n8n.

# MATRIZ NEXOS

**Versão:** 1.0  
**Data:** 21/06/2026  
**Fontes analisadas:** `NEXOS_DOSSIE.md` e `MAPA_MESTRE_SISTEMA.md`  
**Escopo:** transformação do sistema atual em uma visão de produto Nexos, sem geração de código.

# 1. OBJETIVO DA MATRIZ

Esta matriz relaciona o sistema operacional atualmente utilizado pela Juliana com a visão conceitual do Nexos.

O dossiê define o Nexos como uma **Central de Inteligência para Especialistas**, cujo valor central é transformar dados, operações e marketing em:

- clareza;
- autonomia;
- direção;
- crescimento;
- decisões explicáveis.

O sistema atual já contém partes de uma plataforma reutilizável, partes de inteligência, customizações específicas da Juliana, experimentos, funcionalidades incompletas e débitos técnicos.

Esta documentação separa esses elementos para responder:

- o que pertence ao produto Nexos;
- o que pertence à operação Juliana;
- o que já pode ser comercializado;
- o que depende apenas de configuração;
- o que depende de adaptação estrutural;
- o que permanece experimental;
- o que representa dívida técnica;
- o que pertence ao roadmap conceitual, mas ainda não existe.

# 2. CRITÉRIOS DE CLASSIFICAÇÃO

## Categorias

### 1. Nexos Core

Infraestrutura, segurança, cadastros, operação básica e capacidades reutilizáveis necessárias para executar o produto em múltiplos clientes.

### 2. Nexos Intelligence

Capacidades que transformam dados em contexto, indicadores, alertas, tendências, diagnóstico, priorização, recomendação ou resumo executivo.

### 3. Nexos Labs

Experimentos que transformam inteligência em ação. Inclui agentes, classificações experimentais e automações ainda não validadas como produto recorrente.

### 4. Customização Juliana

Marca, dados, regras, taxonomias, contas, templates, metas e processos que existem especificamente para a operação Juliana Coutinho.

### 5. Débito Técnico

Divergências, duplicidades, artefatos redundantes, inconsistências de schema, lacunas de implementação ou estruturas que não representam uma capacidade estável do produto.

### 6. Roadmap Futuro

Capacidades descritas na visão Nexos ou preparadas no sistema, mas ainda não implementadas ou não validadas como produto atual.

## Escalas

### Reutilização

- **Alta:** aplicável a diferentes especialistas sem mudança estrutural.
- **Média:** reutilizável após configuração ou adaptação do domínio.
- **Baixa:** fortemente específica da Juliana ou de uma integração única.

### Dependência da Juliana

- **Alta:** perde significado ou funcionamento sem dados, contas ou regras da Juliana.
- **Média:** a estrutura funciona, mas depende de configuração equivalente em outro cliente.
- **Baixa:** funciona independentemente da operação Juliana.

### Potencial de monetização

- **Alta:** possui valor percebido direto e pode compor oferta comercial.
- **Média:** agrega valor, mas normalmente depende de outras capacidades.
- **Baixa:** infraestrutura invisível, item interno ou sem valor comercial isolado.

### Complexidade de adaptação

- **Alta:** requer mudança de regra, integração, schema ou comportamento.
- **Média:** requer configuração, mapeamento ou onboarding técnico relevante.
- **Baixa:** requer apenas dados, identidade ou credenciais.

### Prioridade

- **Alta:** central para a proposta de valor ou para a venda do Nexos.
- **Média:** importante, mas não constitui o núcleo inicial.
- **Baixa:** complementar, experimental, específico ou sem impacto imediato.

# 3. VISÃO EXECUTIVA DA CLASSIFICAÇÃO

| Bloco atual | Categoria predominante | Domínio Nexos | Situação |
|---|---|---|---|
| Autenticação, tenants e permissões | Nexos Core | Core | Produto existente. |
| AppShell, navegação e componentes | Nexos Core | Core | Produto existente. |
| Agenda | Nexos Core | Ops | Produto existente, com integração configurável. |
| Atividades | Nexos Core + Débito Técnico | Ops | Estrutura existente, operação parcial. |
| Ocorrências | Nexos Core | Ops | Produto existente. |
| Financeiro | Nexos Core + Intelligence | Revenue | Produto existente no núcleo. |
| Comercial/Hotmart | Nexos Core + Intelligence | Revenue / Leads | Produto dependente da Hotmart. |
| Instagram | Nexos Intelligence | Marketing | Produto configurável, dependente da Meta. |
| Ads | Nexos Intelligence | Marketing | Produto configurável, dependente da Meta. |
| Directs e interações | Nexos Intelligence + Labs | Leads / Marketing | Parcial e dependente da Meta. |
| Objetivos e metas | Nexos Intelligence | Intelligence | Estrutura existente, utilização parcial. |
| Relatórios e alertas | Nexos Intelligence | Intelligence / Ops | Telegram existente; demais canais futuros. |
| Adoção | Nexos Core + Intelligence | Core / Intelligence | Produto existente para administração. |
| Admin | Nexos Core | Core | Produto existente. |
| Agentes do dossiê | Nexos Labs / Roadmap Futuro | Labs | Não implementados. |

# 4. MATRIZ DE MÓDULOS

| Nome | Categoria | Domínio Nexos | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|---|
| Admin | Nexos Core | Core | Usuários, perfis, papéis e permissões. | Alta | Baixa | Média | Baixa | Alta |
| Adoção | Nexos Core | Core / Intelligence | Telemetria de uso da plataforma por usuário, módulo e página. | Alta | Baixa | Média | Baixa | Média |
| Agenda | Nexos Core | Ops | Compromissos, calendário, lista, Gantt e sincronização Google. | Alta | Média | Alta | Média | Alta |
| Atividades | Nexos Core | Ops | Projetos, tarefas, recorrências, templates e gestão à vista. | Alta | Média | Alta | Média | Alta |
| Ocorrências | Nexos Core | Ops | Chamados, incidentes, falhas, responsáveis e planos. | Alta | Média | Alta | Baixa | Alta |
| Financeiro | Nexos Core | Revenue | Lançamentos, bancos, cartões, previsões e DRE. | Alta | Média | Alta | Média | Alta |
| Comercial | Nexos Core | Revenue / Leads | Vendas, recebíveis, alunos e produtos da Hotmart. | Média | Média | Alta | Alta | Alta |
| Instagram | Nexos Intelligence | Marketing | Leitura de conteúdo orgânico, audiência e desempenho. | Alta | Média | Alta | Média | Alta |
| Ads | Nexos Intelligence | Marketing | Leitura de campanhas e performance de mídia paga. | Alta | Média | Alta | Média | Alta |
| Directs | Nexos Intelligence | Leads / Marketing | Interações, prioridade, potencial, tema e resposta pendente. | Alta | Média | Alta | Alta | Alta |
| Objetivos | Nexos Intelligence | Intelligence | Metas, OKRs, progresso e planos de ação. | Alta | Média | Alta | Média | Alta |
| Relatórios | Nexos Intelligence | Intelligence / Ops | Resumos, alertas, lembretes e histórico de envio. | Alta | Média | Alta | Média | Alta |
| Agents/Labs | Roadmap Futuro | Labs | Agentes de campanhas, conteúdo, criativos, lançamentos e produtos. | Alta | Baixa | Alta | Alta | Média |

# 5. MATRIZ DE FUNCIONALIDADES

## 5.1 Core, identidade e acesso

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Login por OTP | Nexos Core | Autenticação por código enviado por e-mail. | Alta | Baixa | Média | Baixa | Alta |
| Bloqueio de usuário não cadastrado | Nexos Core | Impede acesso sem vínculo ativo no tenant. | Alta | Baixa | Média | Baixa | Alta |
| Sessão autenticada | Nexos Core | Mantém usuário e tenant no contexto da aplicação. | Alta | Baixa | Baixa | Baixa | Alta |
| Logout por inatividade | Nexos Core | Encerra sessão após dez minutos sem uso. | Alta | Baixa | Baixa | Baixa | Média |
| Multi-tenancy | Nexos Core | Segrega dados por `tenant_id`. | Alta | Baixa | Alta | Média | Alta |
| RBAC | Nexos Core | Controla leitura e escrita por perfil e módulo. | Alta | Baixa | Alta | Média | Alta |
| Permissões por aba | Nexos Core | Expõe subconjuntos de módulos conforme o perfil. | Alta | Média | Alta | Média | Alta |
| Gestão de usuários | Nexos Core | Criação, edição, exclusão e ativação de usuários. | Alta | Baixa | Alta | Baixa | Alta |
| Catálogo de perfis | Nexos Core | Exibe papéis e acessos associados. | Alta | Média | Média | Baixa | Média |
| Sidebar modular | Nexos Core | Navegação conforme módulos permitidos. | Alta | Baixa | Média | Baixa | Alta |
| Dark mode | Nexos Core | Alternância de tema claro, escuro ou sistema. | Alta | Baixa | Baixa | Baixa | Baixa |
| Responsividade | Nexos Core | Uso em notebook, monitor e celular. | Alta | Baixa | Alta | Média | Alta |
| Componentes compartilhados | Nexos Core | Cards, filtros, tabelas, botões e navegação. | Alta | Baixa | Média | Baixa | Alta |
| Paginação reutilizável | Nexos Core | Limita e navega grandes listas. | Alta | Baixa | Média | Baixa | Média |
| Exportação CSV/XLSX/PDF | Nexos Core | Exporta dados de tabelas operacionais. | Alta | Baixa | Média | Média | Média |
| Rastreamento de navegação | Nexos Core | Registra módulo, página, usuário e horário. | Alta | Baixa | Média | Baixa | Média |

## 5.2 Agenda e operação

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| CRUD de eventos | Nexos Core | Criação, edição e exclusão de compromissos. | Alta | Baixa | Alta | Baixa | Alta |
| Tipos de evento | Customização Juliana | Paciente, palestra, aula e interno. | Média | Alta | Média | Baixa | Média |
| Status do evento | Nexos Core | Agendado, confirmado, concluído e cancelado. | Alta | Baixa | Média | Baixa | Média |
| Validação de conflito | Nexos Core | Impede sobreposição de horários. | Alta | Baixa | Alta | Média | Alta |
| Visualização calendário | Nexos Core | Distribuição mensal de eventos. | Alta | Baixa | Alta | Média | Alta |
| Visualização lista | Nexos Core | Lista cronológica e editável. | Alta | Baixa | Média | Baixa | Alta |
| Visualização Gantt | Nexos Core | Distribuição temporal dos eventos. | Média | Baixa | Média | Média | Média |
| Próximos eventos | Nexos Intelligence | Resume hoje, sete dias e mês. | Alta | Baixa | Alta | Baixa | Alta |
| Insight de lembrete | Nexos Intelligence | Destaca o próximo compromisso. | Alta | Baixa | Média | Baixa | Média |
| Sincronização sistema → Google | Nexos Core | Replica eventos no calendário conectado. | Alta | Média | Alta | Média | Alta |
| Sincronização Google → sistema | Nexos Core | Importa eventos do calendário central. | Alta | Média | Alta | Alta | Alta |
| Calendário central Juliana | Customização Juliana | Usa `fga.jucoutinho@gmail.com` como calendário operacional. | Baixa | Alta | Baixa | Baixa | Baixa |

## 5.3 Atividades

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Projetos | Nexos Core | Agrupa tarefas por objetivo, categoria, prazo e equipe. | Alta | Baixa | Alta | Média | Alta |
| Tarefas avulsas | Nexos Core | Registra atividades fora de projetos. | Alta | Baixa | Alta | Baixa | Alta |
| Templates de projeto | Nexos Core | Gera tarefas e prazos a partir de um modelo. | Alta | Média | Alta | Média | Alta |
| Tarefas de template | Nexos Core | Etapas, ordem e prazo relativo do projeto. | Alta | Média | Alta | Média | Alta |
| Recorrências | Nexos Core | Gera tarefas diárias, semanais ou mensais. | Alta | Média | Alta | Média | Alta |
| Dependências | Nexos Core | Relaciona tarefa bloqueada à tarefa predecessora. | Alta | Baixa | Média | Média | Média |
| Kanban | Nexos Core | Visualização por status ou período operacional. | Alta | Baixa | Alta | Média | Alta |
| Calendário de tarefas | Nexos Core | Visualização por data. | Alta | Baixa | Média | Média | Média |
| Gantt de tarefas | Nexos Core | Visualização temporal de projetos e tarefas. | Alta | Baixa | Alta | Média | Média |
| Gestão à Vista | Nexos Intelligence | Resume atividades para acompanhamento em reunião. | Alta | Média | Alta | Média | Alta |
| Logs de atividades | Nexos Core | Histórico de ações por usuário. | Alta | Baixa | Média | Média | Média |
| Equipes atuais | Customização Juliana | Marketing, Suporte, Especialista e Gestão/Dados. | Média | Alta | Baixa | Baixa | Baixa |
| Templates Lançamento/Ação de Venda | Customização Juliana | Checklists e prazos da operação atual. | Média | Alta | Média | Baixa | Média |
| Rotinas Ryan/Suporte | Customização Juliana | Fluxo de caixa, NFs, certificados e suporte de alunos. | Baixa | Alta | Baixa | Baixa | Baixa |
| Mudança de status | Débito Técnico | Código e banco usam nomes de colunas diferentes. | Alta | Baixa | Alta | Média | Alta |
| Log de ação | Débito Técnico | API usa `descricao`; banco usa `detalhe`. | Alta | Baixa | Média | Baixa | Alta |

## 5.4 Ocorrências

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Chamados | Nexos Core | Registra solicitações de clientes. | Alta | Baixa | Alta | Baixa | Alta |
| Incidentes | Nexos Core | Registra falhas com impacto operacional. | Alta | Baixa | Alta | Baixa | Alta |
| Categorias e status | Nexos Core | Cadastros configuráveis da operação. | Alta | Média | Média | Baixa | Média |
| Prioridade | Nexos Intelligence | Ordena ocorrências por urgência. | Alta | Baixa | Média | Baixa | Alta |
| Responsável | Nexos Core | Associa atendimento a uma pessoa. | Alta | Média | Média | Baixa | Média |
| Solução realizada | Nexos Core | Registra resposta aplicada. | Alta | Baixa | Média | Baixa | Média |
| Avaliação | Nexos Intelligence | Registra nota do atendimento. | Alta | Baixa | Média | Baixa | Média |
| Impacto financeiro real | Nexos Intelligence | Registra custo confirmado de uma falha. | Alta | Baixa | Alta | Média | Alta |
| Impacto estimado | Nexos Intelligence | Calcula projeção quando o valor real não existe. | Alta | Média | Alta | Alta | Alta |
| Evidência de campanha | Nexos Intelligence | Consulta Ads quando o incidente cita campanha. | Média | Média | Alta | Alta | Alta |
| Planos de ação | Nexos Intelligence | Registra ação corretiva, prazo e responsável. | Alta | Baixa | Alta | Média | Média |
| Taxonomias atuais | Customização Juliana | Plataformas, produtos e responsáveis da operação. | Média | Alta | Baixa | Baixa | Baixa |

## 5.5 Financeiro e Revenue

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Bancos | Nexos Core | Cadastro de contas e saldo inicial. | Alta | Baixa | Alta | Baixa | Alta |
| Cartões | Nexos Core | Cadastro de cartões, fechamento e vencimento. | Alta | Baixa | Alta | Baixa | Alta |
| Entradas e saídas | Nexos Core | Lançamentos realizados ou previstos. | Alta | Baixa | Alta | Média | Alta |
| Regime de caixa | Nexos Core | Usa data de pagamento. | Alta | Baixa | Alta | Média | Alta |
| Regime de competência | Nexos Core | Usa mês de competência. | Alta | Baixa | Alta | Média | Alta |
| Parcelamento | Nexos Core | Gera e acompanha parcelas. | Alta | Baixa | Alta | Alta | Alta |
| Recorrências financeiras | Roadmap Futuro | Estrutura existente sem uso atual. | Alta | Baixa | Alta | Média | Média |
| CAPEX e depreciação | Roadmap Futuro | Estrutura existente sem uso atual. | Média | Baixa | Média | Alta | Baixa |
| Previsão de caixa | Nexos Intelligence | Projeta entradas, saídas e saldo. | Alta | Baixa | Alta | Média | Alta |
| Fatura de cartão | Nexos Intelligence | Agrega lançamentos por cartão e vencimento. | Alta | Baixa | Alta | Média | Alta |
| DRE consolidado | Nexos Intelligence | Estrutura resultado gerencial. | Alta | Média | Alta | Alta | Alta |
| DRE por centro | Nexos Intelligence | Compara unidades econômicas. | Alta | Média | Alta | Alta | Alta |
| DRE por curso | Nexos Intelligence | Compara resultado de produtos educacionais. | Média | Alta | Alta | Alta | Alta |
| Diagnóstico financeiro | Nexos Intelligence | Exibe indicadores, centros e períodos. | Alta | Média | Alta | Média | Alta |
| Reservas | Nexos Intelligence | Compara reserva atual e metas. | Alta | Média | Alta | Média | Média |
| Área Marketing | Nexos Intelligence | Expõe apenas indicadores financeiros permitidos ao parceiro. | Média | Alta | Média | Média | Média |
| Centros atuais | Customização Juliana | Infoproduto, Clínica, Palestras, Administrativo e Não operacional. | Média | Alta | Baixa | Baixa | Baixa |
| Cursos financeiros | Customização Juliana | Catálogo dos cursos da especialista. | Baixa | Alta | Média | Baixa | Baixa |
| Configuração de impostos e coprodução | Customização Juliana | Parâmetros gerenciais da operação. | Média | Alta | Média | Média | Média |

## 5.6 Comercial, Leads e Revenue

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Importação de vendas | Nexos Core | Recebe eventos e histórico de vendas. | Média | Média | Alta | Alta | Alta |
| Payload bruto | Nexos Core | Preserva a evidência original. | Alta | Baixa | Média | Baixa | Média |
| Normalização de vendas | Nexos Core | Converte o payload para modelo interno. | Média | Média | Alta | Alta | Alta |
| Recebíveis | Nexos Intelligence | Exibe previsão de valores a receber. | Alta | Média | Alta | Alta | Alta |
| Parcelas comerciais | Nexos Core | Armazena parcelas de vendas. | Alta | Média | Alta | Média | Alta |
| Alunos | Nexos Core | Mantém base de compradores/alunos. | Alta | Média | Alta | Média | Alta |
| Produtos | Nexos Core | Mapeia produto externo, curso e acesso. | Alta | Média | Alta | Média | Alta |
| Expiração de acesso | Nexos Intelligence | Indica vencimentos de acesso. | Alta | Média | Alta | Média | Alta |
| Último acesso/progresso | Roadmap Futuro | Campos existem, mas dependem de fonte externa. | Alta | Média | Alta | Alta | Média |
| Conciliação | Nexos Intelligence | Identifica dados sem mapeamento ou inconsistentes. | Alta | Baixa | Alta | Alta | Alta |
| Histórico Hotmart | Customização Juliana | Base histórica da conta e produtos atuais. | Baixa | Alta | Baixa | Baixa | Baixa |
| Catálogo Hotmart atual | Customização Juliana | Produtos, cursos e dias de acesso atuais. | Baixa | Alta | Baixa | Baixa | Baixa |
| Edição dos mapeamentos | Roadmap Futuro | Interface informa que o cadastro ainda não é editável. | Alta | Baixa | Alta | Média | Alta |

## 5.7 Marketing e Instagram

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Visão geral orgânica | Nexos Intelligence | Consolida alcance, posts e engajamento. | Alta | Média | Alta | Média | Alta |
| Ranking de posts | Nexos Intelligence | Ordena conteúdos por desempenho. | Alta | Média | Alta | Baixa | Alta |
| Melhor formato | Nexos Intelligence | Identifica formato com melhor resultado. | Alta | Média | Alta | Baixa | Alta |
| Melhor dia e horário | Nexos Intelligence | Identifica padrões temporais. | Alta | Média | Alta | Média | Alta |
| Evolução mensal | Nexos Intelligence | Compara meses e volume de posts. | Alta | Média | Alta | Média | Alta |
| Engajamento bom/médio/ruim | Nexos Intelligence | Classifica desempenho de publicações. | Alta | Média | Alta | Média | Alta |
| Detalhamento de publicações | Nexos Core | Consulta posts e indicadores. | Alta | Média | Alta | Baixa | Alta |
| Exportação de publicações | Nexos Core | Exporta a base filtrada. | Alta | Baixa | Média | Baixa | Média |
| Conta `fga.jucoutinho` | Customização Juliana | Conta monitorada atualmente. | Baixa | Alta | Baixa | Baixa | Baixa |
| Regras de bom engajamento | Customização Juliana | Critérios atuais usados nos indicadores. | Média | Alta | Média | Média | Média |

## 5.8 Ads

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Investimento | Nexos Intelligence | Consolida gasto de mídia. | Alta | Média | Alta | Média | Alta |
| Alcance e impressões | Nexos Intelligence | Mede distribuição das campanhas. | Alta | Média | Alta | Média | Alta |
| CTR | Nexos Intelligence | Mede taxa de clique. | Alta | Média | Alta | Baixa | Alta |
| CPC | Nexos Intelligence | Mede custo por clique. | Alta | Média | Alta | Baixa | Alta |
| CPM | Nexos Intelligence | Mede custo por mil impressões. | Alta | Média | Alta | Baixa | Alta |
| Frequência | Nexos Intelligence | Mede repetição de exposição. | Alta | Média | Alta | Baixa | Média |
| Performance por campanha | Nexos Intelligence | Compara campanhas. | Alta | Média | Alta | Média | Alta |
| Performance por conjunto | Nexos Intelligence | Compara públicos/conjuntos. | Alta | Média | Alta | Média | Alta |
| Performance por anúncio | Nexos Intelligence | Compara criativos/anúncios. | Alta | Média | Alta | Média | Alta |
| Glossário | Nexos Core | Explica indicadores ao usuário. | Alta | Baixa | Média | Baixa | Média |
| Conversões | Roadmap Futuro | Indicador sinalizado como futuro. | Alta | Média | Alta | Alta | Alta |
| Leads | Roadmap Futuro | Indicador sinalizado como futuro. | Alta | Média | Alta | Alta | Alta |
| Conta Ads Juliana | Customização Juliana | Conta e campanhas atuais. | Baixa | Alta | Baixa | Baixa | Baixa |
| Backup Ads no schema | Débito Técnico | Cópia pontual exposta como tabela de produção. | Baixa | Alta | Baixa | Baixa | Baixa |

## 5.9 Directs e interações

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Captura de comentários | Nexos Core | Coleta comentários de publicações. | Alta | Média | Alta | Alta | Alta |
| Captura de mensagens | Nexos Core | Coleta conversas privadas quando autorizada. | Alta | Média | Alta | Alta | Alta |
| Captura de menções | Nexos Core | Recebe menções por webhook. | Alta | Média | Média | Alta | Média |
| Status respondido | Nexos Intelligence | Identifica pendência de resposta. | Alta | Média | Alta | Alta | Alta |
| Prioridade de resposta | Nexos Intelligence | Classifica urgência da interação. | Alta | Média | Alta | Média | Alta |
| Potencial comercial | Nexos Intelligence | Classifica possibilidade de oportunidade. | Alta | Média | Alta | Alta | Alta |
| Tema | Nexos Intelligence | Classifica assunto da interação. | Alta | Média | Alta | Alta | Alta |
| Ação sugerida | Nexos Intelligence | Exibe orientação operacional baseada em regras. | Alta | Média | Alta | Alta | Alta |
| Reclamações e riscos | Nexos Intelligence | Identifica erro, falha, produto ruim, plágio e outros riscos. | Alta | Média | Alta | Alta | Alta |
| Pessoas mais engajadas | Roadmap Futuro | Análise sugerida, ainda não implementada. | Alta | Média | Alta | Alta | Média |
| Temas Jiu-Jitsu e família | Customização Juliana | Temas editoriais específicos da especialista. | Baixa | Alta | Baixa | Baixa | Baixa |
| Agente de classificação semântico | Nexos Labs | Classificação inteligente além das regras atuais. | Alta | Baixa | Alta | Alta | Média |

## 5.10 Objetivos e Intelligence

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Visão geral de metas | Nexos Intelligence | Resume metas dentro e fora. | Alta | Média | Alta | Média | Alta |
| Metas por período | Nexos Intelligence | Mês, quarter, semestre e ano. | Alta | Baixa | Alta | Média | Alta |
| Meta alcançável | Nexos Intelligence | Faixa mínima esperada. | Alta | Média | Alta | Baixa | Alta |
| Meta alta | Nexos Intelligence | Faixa de desempenho superior. | Alta | Média | Alta | Baixa | Média |
| Supermeta | Nexos Intelligence | Faixa excepcional. | Alta | Média | Média | Baixa | Média |
| Valor automático | Nexos Intelligence | Busca realizado em Instagram, Ads ou Financeiro. | Alta | Média | Alta | Alta | Alta |
| Valor manual | Nexos Core | Permite acompanhamento sem integração. | Alta | Baixa | Média | Baixa | Média |
| OKRs | Nexos Intelligence | Objetivos, período, responsável e confiança. | Alta | Baixa | Alta | Média | Alta |
| Key Results | Nexos Intelligence | Mede resultados do objetivo. | Alta | Baixa | Alta | Média | Alta |
| Planos de ação | Nexos Intelligence | Vincula ação ao desvio de meta. | Alta | Baixa | Alta | Média | Alta |
| Metas atuais | Customização Juliana | Metas de faturamento, Instagram e Ads. | Baixa | Alta | Baixa | Baixa | Baixa |
| Recomendações explicáveis | Roadmap Futuro | Capacidade central descrita no dossiê, não sistematizada transversalmente. | Alta | Baixa | Alta | Alta | Alta |
| Tendências cross-module | Roadmap Futuro | Leitura conjunta de Marketing, Leads, Revenue e Ops. | Alta | Baixa | Alta | Alta | Alta |

## 5.11 Relatórios, alertas e resumos

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Destinatários | Nexos Core | Pessoas e canais de envio. | Alta | Média | Média | Baixa | Alta |
| Templates de resumo | Nexos Intelligence | Define módulos e blocos enviados. | Alta | Média | Alta | Média | Alta |
| Agendamentos | Nexos Core | Frequência, horário e período dos dados. | Alta | Baixa | Alta | Média | Alta |
| Envio imediato | Nexos Core | Dispara relatório sem horário. | Alta | Baixa | Alta | Média | Alta |
| Histórico de envios | Nexos Core | Registra status e erro. | Alta | Baixa | Média | Baixa | Alta |
| Resumo executivo | Nexos Intelligence | Consolida operação para decisão. | Alta | Média | Alta | Alta | Alta |
| Resumo de suporte | Nexos Intelligence | Consolida agenda, ocorrências e prioridades. | Alta | Média | Alta | Média | Alta |
| Alerta técnico | Nexos Intelligence | Informa falhas de plataforma e integrações. | Alta | Baixa | Alta | Alta | Alta |
| Lembrete de agenda | Nexos Intelligence | Avisa evento próximo. | Alta | Baixa | Alta | Média | Alta |
| Telegram | Nexos Core | Canal atual de entrega. | Alta | Média | Alta | Média | Alta |
| E-mail | Roadmap Futuro | Canal modelado sem envio implementado. | Alta | Baixa | Alta | Média | Média |
| WhatsApp | Roadmap Futuro | Canal modelado sem envio implementado. | Alta | Baixa | Alta | Alta | Média |
| Ju, Jeff e Suporte | Customização Juliana | Destinatários e composições atuais. | Baixa | Alta | Baixa | Baixa | Baixa |

## 5.12 Adoção

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Visualizações | Nexos Core | Contagem de acessos. | Alta | Baixa | Baixa | Baixa | Média |
| Usuários ativos | Nexos Intelligence | Mede uso real por usuário. | Alta | Baixa | Média | Baixa | Média |
| Módulos usados | Nexos Intelligence | Mede adoção por domínio. | Alta | Baixa | Média | Baixa | Média |
| Páginas acessadas | Nexos Intelligence | Mede uso de abas e páginas. | Alta | Baixa | Média | Baixa | Média |
| Atividades recentes | Nexos Core | Histórico de navegação. | Alta | Baixa | Baixa | Baixa | Baixa |
| Restrição somente Admin | Customização Juliana | Regra atual do serviço. | Média | Média | Baixa | Baixa | Baixa |

# 6. MATRIZ DE INTEGRAÇÕES

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Supabase Database | Nexos Core | Persistência, RLS e API REST. | Alta | Baixa | Média | Média | Alta |
| Supabase Auth | Nexos Core | Autenticação e usuários. | Alta | Baixa | Média | Média | Alta |
| Supabase Realtime | Nexos Core | Atualização de telas por eventos do banco. | Alta | Baixa | Média | Média | Média |
| SMTP/Brevo | Nexos Core | Entrega do OTP. | Alta | Média | Baixa | Baixa | Alta |
| Google Calendar | Nexos Core | Sincronização de agenda. | Alta | Média | Alta | Média | Alta |
| Instagram Graph API | Nexos Core | Fonte de conteúdo orgânico e interações. | Alta | Média | Alta | Alta | Alta |
| Meta Marketing API | Nexos Core | Fonte de campanhas e mídia paga. | Alta | Média | Alta | Alta | Alta |
| Meta Webhooks | Nexos Core | Entrada em tempo real de interações. | Alta | Média | Alta | Alta | Alta |
| Hotmart API | Nexos Core | Fonte de histórico e dados comerciais. | Média | Média | Alta | Alta | Alta |
| Hotmart Webhooks | Nexos Core | Entrada em tempo real de vendas. | Média | Média | Alta | Alta | Alta |
| Telegram Bot API | Nexos Core | Canal de resumos e alertas. | Alta | Média | Alta | Média | Alta |
| n8n | Nexos Core | Orquestra APIs, webhooks e agendamentos. | Alta | Média | Alta | Alta | Alta |
| Vercel | Nexos Core | Hospeda aplicação e variáveis. | Alta | Baixa | Baixa | Média | Alta |
| GitHub | Nexos Core | Versionamento e deploy. | Alta | Baixa | Baixa | Baixa | Alta |
| Sentry | Roadmap Futuro | Monitoramento mencionado, não implementado. | Alta | Baixa | Média | Média | Média |
| UptimeRobot | Roadmap Futuro | Monitoramento externo mencionado, sem configuração versionada. | Alta | Baixa | Baixa | Baixa | Baixa |
| Gmail SMTP direto | Roadmap Futuro | Variáveis previstas, sem envio implementado. | Média | Média | Baixa | Média | Baixa |
| ActiveCampaign | Roadmap Futuro | Não existe no código atual. | Média | Baixa | Média | Alta | Baixa |

# 7. MATRIZ DE TABELAS E VIEWS

## 7.1 Nexos Core

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| `tenants` | Nexos Core | Empresas/operações segregadas. | Alta | Baixa | Alta | Baixa | Alta |
| `profiles` | Nexos Core | Perfil complementar do usuário. | Alta | Baixa | Média | Baixa | Alta |
| `tenant_members` | Nexos Core | Usuário, tenant, papel e status. | Alta | Baixa | Alta | Média | Alta |
| `tenant_module_permissions` | Nexos Core | Permissões por módulo e perfil. | Alta | Média | Alta | Média | Alta |
| `adoption_events` | Nexos Core | Eventos de navegação e uso. | Alta | Baixa | Média | Baixa | Média |
| `agenda_eventos` | Nexos Core | Eventos operacionais. | Alta | Média | Alta | Média | Alta |
| `google_calendar_connections` | Nexos Core | Credenciais OAuth por tenant. | Alta | Média | Alta | Alta | Alta |
| `ocorrencias_cadastros` | Nexos Core | Taxonomias operacionais. | Alta | Média | Média | Baixa | Média |
| `ocorrencias_chamados` | Nexos Core | Chamados e incidentes. | Alta | Média | Alta | Média | Alta |
| `ocorrencias_planos_acao` | Nexos Intelligence | Ações corretivas. | Alta | Baixa | Alta | Média | Média |
| `atividades_templates` | Nexos Core | Modelos de projeto. | Alta | Média | Alta | Média | Alta |
| `atividades_template_tarefas` | Nexos Core | Tarefas do modelo. | Alta | Média | Alta | Média | Alta |
| `atividades_projetos` | Nexos Core | Projetos. | Alta | Baixa | Alta | Média | Alta |
| `atividades_tarefas` | Nexos Core | Tarefas operacionais. | Alta | Baixa | Alta | Média | Alta |
| `atividades_recorrencias` | Nexos Core | Regras de recorrência. | Alta | Média | Alta | Média | Alta |
| `atividades_dependencias` | Nexos Core | Dependências entre tarefas. | Alta | Baixa | Média | Média | Média |
| `atividades_logs` | Nexos Core | Auditoria de ações. | Alta | Baixa | Média | Média | Média |
| `relatorio_destinatarios` | Nexos Core | Destinatários e canais. | Alta | Média | Média | Baixa | Alta |
| `relatorio_agendamentos` | Nexos Core | Regras de agendamento. | Alta | Média | Alta | Média | Alta |
| `relatorio_envios` | Nexos Core | Histórico de envio. | Alta | Baixa | Média | Baixa | Alta |

## 7.2 Marketing e Intelligence

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| `instagram_accounts` | Nexos Core | Contas Instagram por tenant. | Alta | Média | Alta | Média | Alta |
| `instagram_posts` | Nexos Core | Publicações e métricas. | Alta | Média | Alta | Média | Alta |
| `instagram_metrics` | Nexos Core | Séries agregadas da conta. | Alta | Média | Alta | Média | Alta |
| `instagram_interactions` | Nexos Core | Comentários, mensagens e menções. | Alta | Média | Alta | Alta | Alta |
| `instagram_import_runs` | Nexos Core | Controle de importações. | Alta | Baixa | Baixa | Baixa | Média |
| `instagram_n8n_import_rows` | Nexos Core | Interface de ingestão orgânica. | Alta | Baixa | Média | Média | Alta |
| `instagram_interactions_import_rows` | Nexos Core | Interface de ingestão de interações. | Alta | Baixa | Média | Média | Alta |
| `instagram_ads_daily` | Nexos Core | Base diária de anúncios. | Alta | Média | Alta | Média | Alta |
| `objetivos_metas` | Nexos Intelligence | Metas por indicador e período. | Alta | Média | Alta | Média | Alta |
| `objetivos_okrs` | Nexos Intelligence | Objetivos estratégicos. | Alta | Baixa | Alta | Média | Alta |
| `objetivos_key_results` | Nexos Intelligence | Resultados-chave. | Alta | Baixa | Alta | Média | Alta |
| `objetivos_planos_acao` | Nexos Intelligence | Ações relacionadas a metas. | Alta | Baixa | Alta | Média | Alta |

## 7.3 Revenue e Comercial

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| `fin_bancos` | Nexos Core | Bancos e caixas. | Alta | Baixa | Alta | Baixa | Alta |
| `fin_cartoes` | Nexos Core | Cartões e regras de fatura. | Alta | Baixa | Alta | Baixa | Alta |
| `fin_centros_resultado` | Nexos Core | Centros econômicos. | Alta | Média | Alta | Baixa | Alta |
| `fin_naturezas` | Nexos Core | Naturezas financeiras. | Alta | Baixa | Média | Baixa | Média |
| `fin_categorias` | Nexos Core | Categorias financeiras e DRE. | Alta | Média | Alta | Média | Alta |
| `fin_subcategorias` | Nexos Core | Detalhamento financeiro. | Alta | Média | Média | Baixa | Média |
| `fin_cursos` | Customização Juliana | Cursos atuais associados à receita. | Média | Alta | Média | Baixa | Baixa |
| `fin_lancamentos` | Nexos Core | Entradas, saídas e parcelas. | Alta | Baixa | Alta | Alta | Alta |
| `fin_recorrencias` | Roadmap Futuro | Recorrências financeiras sem uso atual. | Alta | Baixa | Alta | Média | Média |
| `fin_capex` | Roadmap Futuro | Ativos e depreciação sem uso atual. | Média | Baixa | Média | Alta | Baixa |
| `fin_perfis_usuario` | Nexos Core | Perfil financeiro por usuário. | Alta | Média | Alta | Média | Alta |
| `fin_config` | Nexos Core | Parâmetros financeiros. | Alta | Média | Alta | Média | Alta |
| `fin_v_dre_consolidado` | Nexos Intelligence | DRE consolidado. | Alta | Média | Alta | Alta | Alta |
| `fin_v_dre_por_centro` | Nexos Intelligence | DRE por centro. | Alta | Média | Alta | Alta | Alta |
| `fin_v_dre_por_curso` | Nexos Intelligence | DRE por curso. | Média | Alta | Alta | Alta | Alta |
| `fin_v_fatura_cartao` | Nexos Intelligence | Faturas previstas. | Alta | Baixa | Alta | Média | Alta |
| `fin_v_previsao_caixa` | Nexos Intelligence | Projeção de caixa. | Alta | Baixa | Alta | Média | Alta |
| `comercial_hotmart_raw` | Nexos Core | Payload bruto Hotmart. | Média | Média | Média | Média | Alta |
| `comercial_vendas` | Nexos Core | Vendas normalizadas. | Média | Média | Alta | Alta | Alta |
| `comercial_recebiveis` | Nexos Intelligence | Valores previstos. | Alta | Média | Alta | Alta | Alta |
| `comercial_parcelas` | Nexos Core | Parcelas comerciais. | Alta | Média | Alta | Média | Alta |
| `comercial_alunos` | Nexos Core | Compradores e alunos. | Alta | Média | Alta | Média | Alta |
| `comercial_produtos` | Nexos Core | Produtos e regras de acesso. | Alta | Média | Alta | Média | Alta |

## 7.4 Débito técnico e objetos não operacionais

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| `instagram_ads_daily_backup_20260604_011205` | Débito Técnico | Backup pontual no schema principal. | Baixa | Alta | Baixa | Baixa | Baixa |
| `agenda_aulas` | Débito Técnico | Definida em migration, ausente no schema conectado. | Baixa | Média | Baixa | Média | Baixa |
| `agenda_pacientes` | Débito Técnico | Definida em migration, ausente no schema conectado. | Baixa | Média | Baixa | Média | Baixa |
| `agenda_palestras` | Débito Técnico | Definida em migration, ausente no schema conectado. | Baixa | Média | Baixa | Média | Baixa |
| `logs_api` | Débito Técnico | Prevista, ausente e sem consumo atual. | Média | Baixa | Baixa | Média | Baixa |
| `logs_envio` | Débito Técnico | Prevista, substituída funcionalmente por `relatorio_envios`. | Baixa | Baixa | Baixa | Média | Baixa |
| `logs_sistema` | Débito Técnico | Prevista, ausente e sem consumo atual. | Média | Baixa | Baixa | Média | Baixa |
| `logs_usuario` | Débito Técnico | Prevista, ausente; adoção cobre parte do objetivo. | Baixa | Baixa | Baixa | Média | Baixa |

# 8. MATRIZ DE PROCESSOS

| Nome | Categoria | Descrição | Reutilização | Dependência Juliana | Monetização | Complexidade | Prioridade |
|---|---|---|---|---|---|---|---|
| Onboarding de usuário | Nexos Core | Criar Auth, perfil, tenant membership e permissões. | Alta | Baixa | Alta | Média | Alta |
| Login e resolução de destino | Nexos Core | Autenticar e encaminhar ao primeiro módulo permitido. | Alta | Baixa | Média | Baixa | Alta |
| Registro de navegação | Nexos Core | Gravar uso da plataforma. | Alta | Baixa | Média | Baixa | Média |
| Cadastro de evento | Nexos Core | Validar conflito, salvar e sincronizar. | Alta | Média | Alta | Média | Alta |
| Sincronização Google | Nexos Core | Importar e exportar eventos. | Alta | Média | Alta | Alta | Alta |
| Coleta Instagram | Nexos Core | Consultar posts e insights via n8n. | Alta | Média | Alta | Alta | Alta |
| Coleta Directs | Nexos Core | Receber comentários, mensagens e menções. | Alta | Média | Alta | Alta | Alta |
| Priorização de interação | Nexos Intelligence | Classificar pendência, potencial e assunto. | Alta | Média | Alta | Alta | Alta |
| Coleta Ads | Nexos Core | Consultar Meta, paginar, normalizar e gravar. | Alta | Média | Alta | Alta | Alta |
| Diagnóstico de marketing | Nexos Intelligence | Interpretar desempenho orgânico e pago. | Alta | Média | Alta | Alta | Alta |
| Lançamento financeiro | Nexos Core | Cadastrar entrada/saída e relacionamentos. | Alta | Baixa | Alta | Média | Alta |
| Parcelamento financeiro | Nexos Core | Gerar parcelas e vencimentos. | Alta | Baixa | Alta | Alta | Alta |
| Fechamento gerencial | Nexos Intelligence | Consolidar DRE e previsões. | Alta | Média | Alta | Alta | Alta |
| Webhook Hotmart | Nexos Core | Receber venda em tempo real. | Média | Média | Alta | Alta | Alta |
| Backfill Hotmart | Nexos Core | Importar histórico paginado. | Média | Média | Alta | Alta | Alta |
| Criação de aluno | Nexos Core | Derivar aluno da venda. | Alta | Média | Alta | Média | Alta |
| Previsão de recebíveis | Nexos Intelligence | Projetar valores a cair em conta. | Alta | Média | Alta | Alta | Alta |
| Registro de ocorrência | Nexos Core | Cadastrar chamado ou incidente. | Alta | Baixa | Alta | Baixa | Alta |
| Estimativa de impacto | Nexos Intelligence | Projetar impacto quando o real não existe. | Alta | Média | Alta | Alta | Alta |
| Criação de projeto por template | Nexos Core | Gerar tarefas e prazos relativos. | Alta | Média | Alta | Média | Alta |
| Geração de recorrências | Nexos Core | Criar tarefas operacionais periódicas. | Alta | Média | Alta | Média | Alta |
| Gestão à Vista | Nexos Intelligence | Consolidar execução para reunião. | Alta | Média | Alta | Média | Alta |
| Cálculo de metas | Nexos Intelligence | Comparar realizado e faixas de meta. | Alta | Média | Alta | Alta | Alta |
| Preparação de relatório | Nexos Intelligence | Consultar módulos e compor blocos. | Alta | Média | Alta | Alta | Alta |
| Envio Telegram | Nexos Core | Entregar resumo e registrar resultado. | Alta | Média | Alta | Média | Alta |
| Agente de campanhas | Roadmap Futuro | Transformar oportunidades em campanha estruturada. | Alta | Baixa | Alta | Alta | Média |
| Agente de conteúdo | Roadmap Futuro | Transformar audiência em pautas e calendário. | Alta | Baixa | Alta | Alta | Média |
| Agente de criativos | Roadmap Futuro | Transformar estratégia em direção visual. | Alta | Baixa | Alta | Alta | Média |
| Agente de lançamentos | Roadmap Futuro | Produzir cronograma e estratégia baseada em dados. | Alta | Baixa | Alta | Alta | Média |
| Agente de produtos | Roadmap Futuro | Identificar lacunas, upsell e escada de valor. | Alta | Baixa | Alta | Alta | Média |

# 9. ARQUITETURA FUTURA NEXOS

```text
Nexos
├── Core
│   ├── Autenticação e usuários
│   ├── Tenants e permissões
│   ├── Administração
│   ├── AppShell e componentes
│   ├── Adoção e telemetria
│   ├── Integrações e ingestão
│   └── Infraestrutura de relatórios
│
├── Intelligence
│   ├── Objetivos e metas
│   ├── OKRs e Key Results
│   ├── Alertas
│   ├── Resumos executivos
│   ├── Diagnósticos
│   ├── Tendências
│   ├── Priorização
│   └── Recomendações explicáveis
│
├── Marketing
│   ├── Instagram Insights
│   ├── Publicações e conteúdo
│   ├── Meta Ads
│   ├── Campanhas
│   ├── Audiência
│   └── Performance
│
├── Leads
│   ├── Directs
│   ├── Comentários e menções
│   ├── Potencial comercial
│   ├── Prioridade de resposta
│   ├── Jornada de interação
│   └── Alunos/compradores identificados
│
├── Revenue
│   ├── Financeiro
│   ├── DRE
│   ├── Previsão de caixa
│   ├── Comercial/Hotmart
│   ├── Recebíveis
│   ├── Produtos
│   └── Receita por curso/centro
│
├── Ops
│   ├── Agenda
│   ├── Atividades
│   ├── Projetos
│   ├── Recorrências
│   ├── Ocorrências
│   ├── Gestão à Vista
│   └── Entregas e produtividade
│
└── Labs
    ├── Agente de Campanhas
    ├── Agente de Conteúdo
    ├── Agente de Criativos
    ├── Agente de Lançamentos
    ├── Agente de Produtos
    └── Experimentos validados na operação Juliana
```

## Encaixe dos módulos atuais

| Módulo atual | Encaixe principal | Encaixe secundário |
|---|---|---|
| Admin | Core | — |
| Adoção | Core | Intelligence |
| Agenda | Ops | Intelligence |
| Atividades | Ops | Intelligence |
| Ocorrências | Ops | Intelligence |
| Instagram | Marketing | Intelligence |
| Ads | Marketing | Intelligence |
| Directs | Leads | Marketing / Intelligence |
| Objetivos | Intelligence | Revenue / Marketing |
| Financeiro | Revenue | Intelligence |
| Comercial | Revenue | Leads |
| Relatórios | Intelligence | Ops |

# 10. O QUE JÁ É PRODUTO?

Já são produto, no sentido de capacidades reutilizáveis:

- autenticação;
- multi-tenancy;
- usuários e permissões;
- administração;
- shell operacional;
- responsividade;
- componentes compartilhados;
- Agenda;
- Ocorrências;
- estrutura de Atividades;
- lançamentos financeiros;
- bancos e cartões;
- previsão financeira;
- DRE;
- base comercial;
- recebíveis;
- alunos e produtos;
- Instagram Analytics;
- Ads Analytics;
- metas e OKRs;
- relatórios e alertas;
- adoção;
- APIs de ingestão;
- integração via n8n.

O produto atual é mais maduro como **plataforma operacional conectada** do que como **ecossistema completo de inteligência**. A camada Intelligence existe em diversos pontos, mas ainda não opera como uma inteligência transversal única.

# 11. O QUE PODE SER VENDIDO HOJE?

Com base no estado documentado, podem ser apresentados comercialmente hoje:

## Nexos Core Operacional

- usuários e permissões;
- agenda;
- atividades e projetos, considerando a limitação técnica atual de status/logs;
- ocorrências;
- relatórios Telegram;
- administração;
- adoção.

## Nexos Marketing Analytics

- Instagram orgânico;
- ranking e padrões de conteúdo;
- Meta Ads;
- filtros e detalhamento;
- indicadores e exportação.

Esse bloco depende da configuração das contas Meta e dos workflows.

## Nexos Revenue

- financeiro;
- bancos e cartões;
- entradas e saídas;
- previsão;
- DRE;
- Hotmart;
- vendas;
- recebíveis;
- alunos;
- produtos.

Esse bloco depende de cadastros financeiros e, para Comercial, da integração Hotmart.

## Nexos Intelligence Básico

- metas;
- atingimento;
- OKRs;
- alertas operacionais;
- resumos executivos;
- priorização de interações;
- visão de adoção.

Não estão disponíveis hoje como oferta pronta:

- agentes;
- recomendação transversal automática;
- tendências cross-module;
- conversão completa de Ads;
- captura garantida de todos os Directs;
- e-mail e WhatsApp como canais de relatório.

# 12. O QUE EXIGE APENAS CONFIGURAÇÃO?

- criação do tenant;
- identidade visual;
- usuários e papéis;
- permissões;
- calendário Google;
- bancos e cartões;
- centros, naturezas, categorias e subcategorias;
- cursos;
- categorias de ocorrência;
- equipes e responsáveis;
- templates de atividades;
- recorrências;
- metas;
- destinatários;
- chat IDs Telegram;
- agendamentos de relatórios;
- conta Instagram;
- conta Ads;
- credenciais do n8n;
- produtos Hotmart;
- regras de acesso aos cursos.

# 13. O QUE EXIGE REFATORAÇÃO?

## Refatoração comprovadamente necessária pelo estado atual

- compatibilização de `concluida_at` com `concluida_em`;
- compatibilização de `ignorada_motivo` com `motivo_ignorado`;
- compatibilização de `descricao` com `detalhe` nos logs de Atividades;
- alinhamento da migration de Atividades com o banco conectado;
- inclusão de Comercial na resolução de landing;
- alinhamento do catálogo Admin com Comercial, Ocorrências, Atividades e Relatórios;
- consolidação das versões de workflows Ads;
- definição operacional entre `Instagram_Analytics` e `Instagram_Analytics_v2`;
- separação do backup Ads da estrutura operacional;
- alinhamento entre migrations iniciais e schema conectado.

## Adaptação estrutural para a visão Nexos

Os itens abaixo não são classificados como defeitos atuais, mas exigem mudança estrutural para cumprir integralmente o dossiê:

- inteligência transversal entre módulos;
- modelo explicável de recomendações;
- separação formal entre Core, Marketing, Leads, Revenue, Ops e Labs;
- onboarding de integrações por cliente;
- parametrização completa das taxonomias hoje fixadas na Juliana;
- isolamento dos agentes em ambiente Labs;
- validação multi-cliente antes de promover experimentos a produto.

# 14. O QUE NÃO DEVERIA FAZER PARTE DO PRODUTO?

Não constituem produto Nexos:

- dados pessoais e históricos da Juliana;
- credenciais;
- tokens;
- calendar ID atual;
- conta `fga.jucoutinho`;
- campanhas atuais;
- produtos e cursos atuais;
- metas atuais;
- responsáveis atuais;
- destinatários atuais;
- rotinas nominais de Ryan, Jeff ou Ju;
- regras editoriais específicas de família e Jiu-Jitsu;
- templates exclusivos não validados em outros clientes;
- tabela de backup Ads;
- versões antigas e redundantes de workflows;
- arquivos de preview;
- protótipos e documentos sem uso no runtime;
- tabelas ausentes do banco e sem consumo pela aplicação;
- qualquer agente não validado, apresentado como funcionalidade oficial.

Esses itens podem servir como configuração, dado de laboratório, evidência histórica ou material de validação, mas não definem o produto.

# 15. SÍNTESE ESTRATÉGICA

## Nexos Core

Já existe em nível relevante:

- identidade;
- autenticação;
- tenancy;
- permissões;
- operação;
- cadastros;
- dados;
- integrações;
- módulos funcionais.

## Nexos Intelligence

Existe de forma distribuída:

- insights de Instagram;
- análise Ads;
- metas;
- DRE;
- previsões;
- recebíveis;
- prioridade de Directs;
- impacto de ocorrências;
- resumos Telegram;
- adoção.

Ainda não existe como uma camada única capaz de responder transversalmente:

- o que aconteceu;
- por que aconteceu;
- o que merece atenção;
- o que fazer agora.

## Nexos Labs

O dossiê define cinco agentes, mas nenhum deles está implementado como agente de produto:

- campanhas;
- conteúdo;
- criativos;
- lançamentos;
- produtos.

A operação Juliana já funciona como laboratório de dados e hipóteses, mas os agentes permanecem no roadmap.

## Customização Juliana

A Juliana fornece:

- identidade;
- dados;
- taxonomias;
- processos;
- regras;
- integrações;
- exemplos reais;
- ambiente de validação.

Essa camada é essencial para validar o Nexos, mas não deve ser confundida com o núcleo comercializável.

## Conclusão

O sistema atual já contém uma base concreta para o Nexos.

O que existe hoje é:

1. uma plataforma operacional multiusuário;
2. um conjunto relevante de integrações;
3. módulos de marketing, receita e operação;
4. fragmentos funcionais de inteligência;
5. uma operação-laboratório rica em dados;
6. débitos técnicos identificáveis;
7. um roadmap de agentes ainda não implementado.

A maior parte do valor reutilizável atual está em **Core, Marketing, Revenue e Ops**.

O diferencial conceitual do Nexos está em **Intelligence**.

O potencial de experimentação está em **Labs**.

A operação Juliana é o ambiente de validação, não a definição final do produto.

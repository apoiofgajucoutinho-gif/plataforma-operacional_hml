# NORWYN — Operational Audit HML

Data da auditoria: 2026-09-06  
Escopo: HML `oerdsmgiebquecqwcbox`, tenant `Juliana Coutinho` (`ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0`)  
Regra: auditoria e plano; sem implementação estrutural, sem produção, Histogol90 intocado.

## Evidência HML

- `comercial_vendas`: 3.805
- `comercial_hotmart_raw`: 4.928
- `comercial_alunos`: 1.468
- `comercial_produtos`: 36
- `products`: 29
- `norwyn_product_external_identities`: 30
- `fin_lancamentos`: 140
- `instagram_posts`: 273
- `instagram_metrics`: 274
- `instagram_follower_daily_metrics`: 111
- `instagram_ads_daily`: 1.558
- `agenda_eventos`: 87
- `atividades_tarefas`: 119
- `campaigns`: 4
- `content_capture`: 3
- `growth_funnel_events`: 49, todos `environment=test`
- `manychat_inventory_current`: 1 snapshot
- `norwyn_customer_channel_statuses`: 693, todos `NOT_SYNCED`
- `relatorio_agendamentos`: 6 ativos

## Inventário Funcional

| Área | Funcionalidade | Status | Dados | Confiança | Usabilidade | Dependência | Recomendação | Prioridade |
|---|---|---:|---|---|---|---|---|---|
| Shell | Perfis e navegação por papel | A | `tenant_members`, `tenant_module_permissions` | Alta | Boa | RBAC atual | Manter; só limpar Admin futuramente | P1 |
| Home | Home Especialista | A | Norwyn context, Instagram, financeiro, atividades, agenda | Média/alta | Boa | SSR pesado | Manter como cockpit executivo; otimizar fetch depois | P1 |
| Agenda | Agenda pessoal/operacional | A | `agenda_eventos` 87, Google connection 1 | Alta com ressalvas | Boa | Google OAuth | Operar agora; separar de calendário editorial | P1 |
| Instagram | Instagram analytics orgânico | A | 273 posts, 274 métricas, 111 snapshots | Alta | Boa | import/coleta n8n | Usar como benchmark de clareza | P1 |
| Ads | Instagram Ads Analytics | A | 1.558 linhas | Alta para mídia; média para atribuição | Boa | Meta/n8n | Manter; drill-down já faz sentido | P1 |
| Atividades | Task manager operacional | A | 119 tarefas | Média | Boa | `atividades_tarefas` | Usar já; melhorar assignee persistente | P0 |
| Telegram | Dispatch base de relatórios | A | 6 agendamentos, 521 envios | Média | Boa para envio | config destinatários | Manter; tipar melhor relatórios | P1 |
| Financeiro | Resumo/Geral e DRE | B | 140 lançamentos | Média | Parcial | `fin_*`, vendas, ads | Tornar operacional para Ryan/Juliana | P0 |
| Comercial | Hotmart vendas/import | B | 3.805 vendas, 4.928 raw | Média | Boa para consulta; decisão exige ressalvas | parser Hotmart | Auditar status unknown/moedas antes de decisão | P0 |
| Produtos | Produtos & Alunos | B | 29 canônicos, 36 Hotmart, 30 identidades | Média | Parcial | canonical matcher | Consolidar canonical product | P0 |
| Alunos | Aluno 360 inicial | B | 1.468 alunos | Média/baixa | Parcial | email como identidade | Criar identidade confiável multi-fonte | P0 |
| Automações | ManyChat inventory | B | 1 snapshot, 12 growth tools, 41 tags | Média | Boa para inventário | ManyChat Public API | Operar inventário; performance ainda não | P1 |
| Relatórios | Report operacional atividades | B | `atividades_tarefas` | Média | Útil | responsável por time/nome | Adicionar `assignee_user_id` antes de escalar | P1 |
| Missões | Mission Center | B | campaigns, approvals, tasks | Média | Boa camada executiva | campanhas/atividades | Usar como orquestração transversal | P1 |
| Marketing | Marketing consolidado | B | Instagram, Ads, campanhas, capture | Média | Boa | múltiplas fontes | Consolidar em Growth & Conteúdo | P1 |
| Resultados | Resultados executivos | B | vendas BRL, ads, Instagram | Média | Boa | confiança Hotmart | Manter, sempre com ressalvas de moeda/status | P1 |
| Suporte | Ocorrências/Suporte | B | `ocorrencias_*`, `norwyn_support_tickets` 1 | Média/baixa | Parcial | legado Ocorrências | Incorporar a Clientes & Alunos | P2 |
| Admin | Usuários/permissões | B | members/perms/profiles | Alta | Admin only | service role | Manter técnico | P1 |
| Google | Sync Google Calendar | B | 1 conexão | Média | Boa quando OAuth OK | env/OAuth | Manter como Agenda; não virar editorial | P2 |
| Campanhas | Campaigns foundation | C | 4 campanhas, materiais/aprovações | Média | Parcial | produto/atividades | Promover para Growth & Conteúdo após produto canônico | P1 |
| Content Capture | Captura e transcrição | C | 3 capturas | Média/baixa | Parcial | Drive/YouTube/transcrição | Validar fluxo Reel -> carrossel como piloto | P2 |
| Marketing QA | QA de campanhas | C | 1 review, 8 itens | Média | Admin/operacional | campanhas/materiais | Incorporar em Growth & Conteúdo | P2 |
| Landing Monitor | Landing readiness/monitor | C | 2 landings, 22 snapshots, 62 issues | Média | Técnica | tracking keys | Promover como QA de funil, não menu principal | P1 |
| Tracking | Growth tracking keys/backfill | C | 193 keys, 1 backfill | Média | Técnica | Hotmart/Ads/landing | Usar como infraestrutura invisível | P0 |
| Lifecycle | Lifecycle/ActiveCampaign | C | 705 membros, 5 drafts, AC NOT_SYNCED | Baixa/média | Técnica | ActiveCampaign não conectado | Manter piloto read-only até conexão real | P2 |
| Jornada aluno | Student journeys | C | 295 jornadas | Baixa/média | Parcial | identidade aluno | Usar só como hipótese, não LTV decisório | P2 |
| Product Journey | Jornada/ascensão produto | C | 31 edges | Baixa/média | Parcial | product identity | Revalidar depois de canonical product | P2 |
| Funnel Lab | VSL/Funnel Lab | D | 49 eventos TEST, 9 sessões | Alta para teste; zero real | Técnica | endpoint aceita apenas test | Manter em Lab | P1 |
| Shadow Mode | Registro de ação externa | D | UI/serviço experimental | Baixa | Admin | posts/campanhas | Manter em Lab; não menu principal | P3 |
| Evidence Engine | Evidence/Intelligence | D | signals/content/events | Média | Técnica | Norwyn context | Virar motor invisível; UI em Lab | P2 |
| Strategy Planner | Strategy/Business Strategy | D | regras e cards | Baixa/média | Técnica | várias fontes | Consolidar em Missões/Calendário | P2 |
| Briefing Center | Briefings | D | draft/UI local | Baixa | Técnica | campaigns/content | Futuro Content Studio | P3 |
| Studio Draft | Studio Draft | D | draft/UI local | Baixa | Técnica | content capture | Futuro Content Studio | P3 |
| Knowledge | Knowledge core | D | `knowledge_base` 13; `growth_knowledge_base` 0 | Média/baixa | Técnica | content capture | Unificar e manter fora da navegação | P2 |
| Growth experiments | Experimentos Growth | D | `growth_experiments` 0 | Não instrumentado | Técnica | funil real | Manter em Lab | P3 |
| Business Strategy | Business Strategy vs Strategy | E | mesmas fontes do Norwyn context | Média | Duplicada | Strategy Planner | Incorporar a Missões/Plano mensal | P2 |
| Intelligence/Evidence | Intelligence vs Evidence | E | signals, content, vendas | Média | Duplicada | Evidence Engine | Um motor; várias saídas contextuais | P2 |
| Products views | Produto 360 vs Produtos & Alunos | E | products/comercial/identity | Média | Duplicada | canonical product | Centralizar em Produtos & Alunos | P1 |
| Knowledge tables | `knowledge_base` vs `growth_knowledge_base` | E | 13 vs 0 | Média/baixa | Duplicada | upsert knowledge | Definir uma fonte oficial | P2 |
| Objetivos | OKRs/Objetivos legado | F | `objetivos_*` | Baixa | Legado | none | Arquivar futuramente ou absorver por Missões | P3 |
| Adoção | Módulo Adoção | F | adoption events | Baixa para operação Juliana | Técnica | tracking UI | Remover da navegação futura | P3 |
| SUPORTE role | Perfil SUPORTE legado | F | compatibilidade | Alta | Legado | RBAC | Manter só compatibilidade | P1 |
| Hotmart decisão financeira | Valores multi-moeda/LTV bruto | G | 40 não-BRL; 1.223 unknown | Baixa para decisão financeira | Perigosa sem filtro | parser/status | Não usar como financeiro/liquidação | P0 |
| VSL real | Funil ponta a ponta real | G | 0 evento real | Não confiável | Lab only | instrumentação real | Não lançar decisão de funil real ainda | P0 |
| ActiveCampaign performance | AC sync/performance | G | 693 `NOT_SYNCED` | Não confiável | Parcial | conexão AC | Não medir conversão AC ainda | P1 |
| Financeiro caixa projetado | Próximos movimentos | G | só 1 previsto; 139 realizados | Baixa para projeção | Parcial | contas a pagar/receber | Criar rotina operacional de previsão | P0 |

## Duplicidades Principais

- Business Strategy, Strategy, Intelligence, Evidence e Mission Center usam fontes parecidas e hoje competem por atenção. Diferença real: Missões pode orquestrar ação; Evidence/Intelligence deveriam virar motor invisível; Strategy/Business Strategy deveriam virar plano/prioridade, não módulos separados.
- Briefing Center, Studio Draft, Content Capture e Knowledge formam a base de um futuro Content Studio, mas ainda não são uma experiência única.
- Product 360, Aluno 360 e Produtos & Alunos compartilham dependência de identidade de produto/aluno. Antes de promover 360, canonical product e identidade de aluno precisam ficar confiáveis.
- Growth, Funnel Lab, Landing Monitor e Tracking têm funções diferentes: Tracking é infraestrutura, Landing Monitor é QA, Funnel Lab é experimento, Growth é leitura executiva. Só Growth/QA deveriam aparecer para operação.

## Arquitetura Operacional Alvo Recomendada

1. Comercial: Hotmart, vendas, recebíveis comerciais, origem, status, recuperação.
2. Financeiro: caixa real, contas a pagar/receber, categorias, competência, realizado/previsto.
3. Clientes & Alunos: Aluno 360, suporte, certificados, jornada, LTV BRL confiável.
4. Growth & Conteúdo: Instagram, Ads, campanhas, calendário editorial, Content Capture, briefing/copy/QA.
5. Automações & Relacionamento: ManyChat, Telegram, ActiveCampaign, lifecycle.
6. Experimentação / Funnel Lab: VSL, landing tests, tracking tests, Shadow Mode, diagnostics.

Missões deve ser camada transversal: transforma diagnóstico em prioridade, campanha, atividade, resultado e aprendizado.

## Gargalos de Performance Observados

- `/norwyn` carrega um contexto amplo demais no SSR, com muitas consultas paralelas e tabelas que nem sempre aparecem na primeira tela.
- `getNorwynContext` busca vendas, ads, posts, métricas, funil, lifecycle, products, campaigns, QA, landings e automações em uma chamada grande.
- Financeiro e Comercial fazem paginação de até 20.000 linhas em memória.
- Algumas páginas carregam dados técnicos de Admin mesmo quando a experiência é executiva.
- Próxima melhoria deve ser por recorte: primeira tela leve, detalhes por módulo/drill-down.

## Conclusão Operacional

O que já opera agora: Agenda, Instagram, Ads, Atividades, Home Especialista, navegação por perfil e relatórios base.  
O que opera com ajustes: Comercial/Hotmart, Financeiro, Produtos & Alunos, Automações/ManyChat, Missões, Marketing/Resultados.  
O que não deve orientar decisão ainda: VSL real, ActiveCampaign performance, LTV completo multi-fonte, caixa projetado, status Hotmart unknown.

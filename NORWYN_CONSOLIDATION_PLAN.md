# NORWYN — Consolidation Plan

Data: 2026-09-06  
Escopo: recomendação; não implementar nesta rodada.

## Princípio

Norwyn deve deixar de parecer um conjunto de peças soltas e virar um sistema operacional com seis motores claros. Admin/Lab mantém profundidade técnica; Especialista e Operacional veem apenas decisão e ação.

## Mapa Hoje -> Alvo

| Existe hoje | Estado | Deve ficar em | Ação recomendada |
|---|---|---|---|
| Executive Home | Operacional | Home / cockpit executivo | Manter e otimizar dados por recorte |
| Business Strategy | Duplicado | Missões / Planejamento | Incorporar, tirar de navegação principal Admin |
| Strategy Planner | Lab | Missões / Planejamento | Manter em Lab até gerar plano acionável |
| Mission Center | Operacional com ajustes | Missões transversal | Promover como camada de orquestração |
| Mission Engine | Lab/técnico | Admin/Lab | Esconder da operação |
| Intelligence | Duplicado | Motor interno de insights | Não expor como módulo próprio |
| Evidence | Duplicado | Motor interno de evidências | Incorporar a Missões/Growth |
| Briefing Center | Lab | Growth & Conteúdo / Content Studio | Unificar com Content Capture |
| Studio Draft | Lab | Growth & Conteúdo / Content Studio | Unificar com aprovação/atividade |
| Content Capture | Piloto | Growth & Conteúdo | Validar caso Reel vencedor -> carrossel |
| Knowledge | Lab | Motor interno | Definir tabela oficial |
| Growth | Piloto | Growth & Conteúdo | Virar leitura executiva/operacional |
| Campaigns | Piloto | Growth & Conteúdo | Promover quando produto canônico estiver confiável |
| Marketing QA | Piloto | Growth & Conteúdo / QA | Usar como gate invisível/contextual |
| Landing Monitor | Piloto | Experimentação / QA de funil | Manter fora da navegação principal |
| Shadow Mode | Lab | Experimentação | Arquivar futuramente se não houver uso |
| Funnel Lab / VSL | Lab | Experimentação / Funnel Lab | Não promover até evento real |
| Product 360 | Duplicado/parcial | Clientes & Alunos + Produtos | Centralizar em Produtos & Alunos |
| Aluno 360 | Piloto | Clientes & Alunos | Promover após identidade confiável |
| Produtos & Alunos | Operacional com ajustes | Clientes & Alunos | Virar módulo oficial de identidade |
| Comercial | Operacional com ajustes | Comercial | Separar comercial de financeiro/liquidação |
| Hotmart | Operacional com ressalvas | Comercial | Fonte comercial oficial com filtros de confiança |
| Financeiro | Operacional com ajustes | Financeiro | Tornar contas a pagar/receber operável |
| Agenda | Operacional | Agenda | Manter pessoal/operacional |
| Calendário editorial | Parcial | Growth & Conteúdo | Construir a partir de campanhas/conteúdo/atividades |
| Instagram | Operacional | Growth & Conteúdo | Benchmark de compreensão |
| Ads | Operacional | Growth & Conteúdo | Manter drill-down |
| Automações | Operacional com ajustes | Automações & Relacionamento | Separar inventário de performance |
| ManyChat | Operacional com ajustes | Automações & Relacionamento | Inventário real; performance futura |
| ActiveCampaign | Não confiável | Automações & Relacionamento | Só após conexão real |
| Telegram | Operacional com ajustes | Automações & Relacionamento | Melhorar destinatário por usuário |
| Atividades | Operacional | Operação transversal | Fonte oficial de execução |
| Suporte/Ocorrências | Operacional com ajustes | Clientes & Alunos | Fundir com visão aluno/suporte |
| Objetivos/OKRs | Obsoleto | Missões ou arquivo futuro | Não priorizar |
| Adoção | Obsoleto para operação Juliana | Admin técnico | Remover de navegação futura |

## Fluxo Sem NBF

Fluxo alvo:

Dados -> Diagnóstico -> Estratégia -> Prioridades -> Campanha -> Atividades -> Execução -> Resultados -> Aprendizado.

Estado atual:

| Etapa | Já existe | Confiança | Gap |
|---|---|---|---|
| Dados | Instagram, Ads, Hotmart, Agenda, Atividades, ManyChat inventory | Média/alta | Hotmart unknown, moedas, ActiveCampaign ausente |
| Diagnóstico | Growth, Evidence, Landing Monitor, Instagram | Média | Duplicidade e linguagem técnica |
| Estratégia | Strategy/Business Strategy/Missões | Média/baixa | Precisa virar plano operacional único |
| Prioridades | Missões, sinais, atividades | Média | Critérios de prioridade ainda dispersos |
| Campanha | Campaigns, materiais, QA | Média | Produto canônico e calendário editorial |
| Atividades | `atividades_tarefas` | Média/alta | Assignee persistente |
| Execução | Atividades, Agenda, Telegram | Média | Report por usuário real |
| Resultados | Resultados, Ads, Comercial | Média | Separar comercial/econômico/financeiro |
| Aprendizado | Knowledge, learnings, content events | Baixa/média | Unificar Knowledge |

## Produtos: Modelo Alvo

Usar o que já existe, mas tornar explícito:

- `products`: `canonical_product`.
- `comercial_produtos`: `external_product` Hotmart legado/import.
- `norwyn_product_external_identities`: ponte oficial `canonical_product` -> origem externa.
- `product_aliases`: nomes comerciais, variações e grafias.
- `product_components`: componentes de bundles/formações.
- Nova semântica recomendada, sem criar agora: `offer`, `bundle`, `version`, `relationship`, `revenue_scope`.

Regra de confiança:

- Receita direta só entra quando `external_identity.relationship/revenue_scope` estiver explícito.
- Nome parecido não basta para somar produto.
- Produto TEST deve ser excluído de indicadores de negócio.

## Navegação Recomendada

Especialista:

- Início
- Agenda
- Missões
- Growth & Conteúdo
- Resultados
- Financeiro
- Clientes & Alunos
- Automações

Operacional:

- Início
- Agenda
- Atividades
- Suporte
- Clientes/Alunos
- Financeiro operacional
- Produtos
- Automações

Admin:

- Operação
- Inteligência
- Admin
- Avançado/Lab

Remover futuramente da navegação principal Admin: Business Strategy, Strategy, Evidence, Intelligence, Briefing, Studio, Shadow, Objetivos, Adoção. Eles podem continuar acessíveis em Lab/Admin técnico.

## Decisões Recomendadas

1. Comercial/Hotmart vira fonte comercial oficial, não fonte financeira.
2. Financeiro vira fonte de caixa, previsto/realizado e contas a pagar/receber.
3. Atividades vira fonte oficial de execução.
4. Instagram permanece referência de compreensão e freshness.
5. ManyChat começa como inventário operacional; performance vem depois.
6. VSL fica em Lab até haver evento real ponta a ponta.
7. Missões vira orquestração transversal, substituindo parte estratégica da NBF.
8. Calendário editorial deve nascer em Growth & Conteúdo, não na Agenda pessoal.

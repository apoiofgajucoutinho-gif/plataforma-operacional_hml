# NORWYN — Data Trust Audit HML

Data da auditoria: 2026-09-06  
Fonte de evidência: `tmp/norwyn-operational-audit-evidence.json` e leitura de services/migrations.

## Escala

- CONFIÁVEL: pode orientar operação agora.
- CONFIÁVEL COM RESSALVAS: útil, mas exige filtro/nota/limite.
- NÃO CONFIÁVEL: não deve orientar decisão sem correção.
- NÃO INSTRUMENTADO: estrutura existe, mas não há dado real suficiente.

## Hotmart

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- Total de transações normalizadas: 3.805.
- Raw imports: 4.928.
- BRL: 3.765 transações, valor bruto `R$ 1.221.941,73`.
- BRL confirmadas: 2.419, valor bruto `R$ 1.076.151,66`.
- Não-BRL: 40 transações.
- Não-BRL por moeda: USD 10, EUR 22, PYG 5, CHF 1, CAD 1, ARS 1.
- Valores não-BRL brutos: USD 902,32; EUR 2.451,57; PYG 6.937.867; CHF 182; CAD 195,46; ARS 1.517.
- UNKNOWN currency: 0.
- Refunds/chargebacks detectados: 17, BRL `R$ 2.025,22`.
- Produtos ausentes: 0.
- Comprador ausente: 799 transações sem comprador identificado por nome/e-mail.
- Duplicidade de transaction_id: 0.
- Status: confirmed 2.459, pending 28, lost 78, refunded 17, unknown 1.223.

Parsing validado:

| Entrada | Saída |
|---|---:|
| `1234.56` | 1234.56 |
| `1,234.56` | 1234.56 |
| `1.234,56` | 1234.56 |
| `1234,56` | 1234.56 |

Riscos:

- 1.223 transações com grupo comercial `unknown` reduzem confiança decisória.
- Valores não-BRL não podem ser somados como BRL.
- Venda Hotmart não é entrada financeira liquidada.
- `valor_bruto` é comercial/econômico; não é lucro e não é caixa.

Recomendação:

- Usar Hotmart como fonte comercial, não como financeiro.
- Recalcular todos os indicadores decisórios com filtro explícito `moeda='BRL'` e `grupo_comercial='confirmed'`.
- Criar reconciliação de status unknown antes de qualquer dashboard financeiro executivo definitivo.

## Produtos

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- `products`: 29 produtos canônicos internos.
- `comercial_produtos`: 36 produtos Hotmart/importados.
- `product_aliases`: 28.
- `product_components`: 3.
- `norwyn_product_external_identities`: 30.
- Hotmart product ids distintos em vendas: 36.
- 20 produtos internos sem identidade externa explícita.

Riscos:

- Nomes duplicados/variações existem, por exemplo `Audiologia Diagnóstica Pediátrica` com espaçamentos diferentes.
- Produto de teste aparece no cadastro interno.
- Matching por nome ainda existe como fallback; é útil, mas não suficiente para decisão financeira.

Proposta:

- `canonical_product`: produto de negócio oficial.
- `external_product`: id/nome da Hotmart, Cademi, landing, etc.
- `offer`: oferta comercial; pode apontar para produto, bundle ou versão.
- `bundle`: agrupamento vendável com múltiplos componentes.
- `version`: turma, extensão, ano de acesso, edição.
- `relationship`: relação explícita entre produto/oferta/bundle/extensão com escopo de receita: `DIRECT`, `RELATED`, `EXCLUDED`, `UNKNOWN`.

Não inventar relações. Marcar `UNKNOWN` quando não houver evidência.

## Clientes e Alunos

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- `comercial_alunos`: 1.468.
- Duplicidade de e-mail: 0.
- Status: 1.458 `nao_validado`, 10 `reembolsado`.
- Telefone ausente: 1.446.
- LTV BRL confirmado pode ser recalculado por e-mail a partir de vendas BRL confirmadas.

Amostra LTV BRL confirmado:

| Aluna | Compras | LTV BRL |
|---|---:|---:|
| Daniella Santiago Souza | 5 | R$ 5.505,00 |
| Bianca Moreira | 5 | R$ 5.365,30 |
| Priscila Helena Parodi Ribeiro | 4 | R$ 4.697,92 |
| Karin Cristina Schiessl | 4 | R$ 4.676,21 |
| Elenice Batista de Lima Costa | 2 | R$ 4.521,39 |
| Daniela Regina Sievert Alexandre | 5 | R$ 4.513,82 |
| Eneida Cristina e Silva Pires | 8 | R$ 4.485,30 |
| Roseli Gasperoni | 2 | R$ 4.155,72 |
| Ana Luiza | 5 | R$ 4.036,48 |
| Silene de Lima Marques | 5 | R$ 4.032,28 |

Riscos:

- Identidade hoje é majoritariamente e-mail Hotmart.
- CPF, telefone, suporte, certificado e automações ainda não estão unificados como identidade forte.
- LTV acima é BRL confirmado por e-mail; não inclui moedas estrangeiras convertidas nem liquidação.

## Financeiro

Nível: CONFIÁVEL COM RESSALVAS para realizado; NÃO CONFIÁVEL para caixa projetado completo.

Evidência:

- 140 lançamentos.
- Entradas: 42, total `R$ 81.173,93`.
- Saídas: 98, total `R$ 151.343,63`.
- Status: 139 `realizado`, 1 `previsto`.
- Categorias: 15; subcategorias: 23; centros: 5.
- Sem categoria ausente, sem data ausente, sem competência ausente.
- Apenas 24 lançamentos com produto/curso/campanha.
- Próximos movimentos: 1.

Usabilidade auditada:

| Pergunta | Resposta | O que falta |
|---|---|---|
| Ryan consegue cadastrar conta a pagar? | PARTIALLY | Perfil `suporte`/legado consegue; `OPERACIONAL` funcional precisa política explícita e UX segura. |
| Ryan consegue dar baixa? | PARTIALLY | Atualização existe, mas não há fluxo de baixa dedicado por perfil operacional. |
| Juliana consegue ver o que vence? | YES | Resumo/Geral mostram previsto/vencidos, mas dado previsto é escasso. |
| Conseguem registrar recebimento? | PARTIALLY | CRUD de lançamento existe para admin/suporte; especialista não registra. |
| Conseguem editar lançamento? | PARTIALLY | Admin/suporte sim; especialista não. |
| Conseguem categorizar? | YES | Categorias existem; cadastro técnico só Admin. |
| Conseguem anexar comprovante? | NO | Não há campo/fluxo de anexo auditado. |
| Distinguem previsto x realizado? | YES | Campo `status`. |
| Filtram por mês? | YES | UI tem filtros. |
| Veem resultado mensal? | YES | DRE/resumo. |
| Relacionam despesa a produto/campanha? | PARTIALLY | Poucos lançamentos vinculados; suporte incompleto. |

## Instagram

Nível: CONFIÁVEL

Evidência:

- 273 posts.
- 274 métricas.
- 111 snapshots diários.
- Growth summary atualizado em 2026-09-06.
- Seguidores atuais: 17.785; D-1: -2; 7 dias: +27; 30 dias: +125.

Ressalva:

- Depende de coleta recorrente. A UI deve sempre mostrar freshness.

## Ads

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- 1.558 linhas.
- Última data: 2026-09-06.
- Investimento agregado auditado: `R$ 7.788,44`.
- Compras Meta atribuídas: 296.
- Valor Meta atribuído: `R$ 84.712,71`.

Ressalva:

- Ads é confiável para mídia; atribuição final deve cruzar Hotmart/tracking e respeitar moeda/status.

## ManyChat

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- 1 snapshot em 2026-09-06.
- Account Pro: sim.
- Growth Tools: 12.
- Tags: 41.
- Custom Fields: 13.
- Flows: 0, mas a fonte/API pode não disponibilizar flows.

Disponibilidade:

| Item | Estado |
|---|---|
| Growth Tools | DISPONÍVEL |
| Tags | DISPONÍVEL |
| Custom Fields | DISPONÍVEL |
| Flows | PARCIAL/NÃO DISPONÍVEL por fonte |
| Triggers | PARCIAL via Growth Tools |
| Entradas/leads | PARCIAL; precisa eventos/contatos |
| Conversões | NÃO DISPONÍVEL |
| Erros | NÃO DISPONÍVEL |
| Performance por palavra-chave | NÃO DISPONÍVEL |

## ActiveCampaign

Nível: NÃO CONFIÁVEL para operação de performance.

Evidência:

- 693 linhas em `norwyn_customer_channel_statuses`.
- Todas `activecampaign_status=NOT_SYNCED`.

Conclusão:

- Estrutura está preparada, mas ActiveCampaign não está conectado/sincronizado de forma útil para decisão.

## Telegram

Nível: CONFIÁVEL COM RESSALVAS

Evidência:

- 6 agendamentos ativos.
- 521 envios.
- Report Operacional existe e usa `atividades_tarefas`.

Ressalva:

- Recorte por responsável ainda é heurístico: `time_responsavel=suporte` + nome do destinatário, porque não há `assignee_user_id` em `atividades_tarefas`.

## VSL / Funnel Lab

Nível: NÃO INSTRUMENTADO para real; CONFIÁVEL apenas como Lab.

Evidência:

- 9 sessões.
- 49 eventos.
- Todos `environment=test`.
- Eventos cobrem LANDING_VIEW, VSL_PLAY, 25/50/75/90, CTA, checkout simulado.

Resposta central:

Se amanhã uma VSL real entrar no ar, a Norwyn ainda NÃO mede ponta a ponta com confiança real. Gaps:

- Endpoint público atual aceita apenas `environment=test`.
- Não há eventos reais de landing/VSL/checkout/purchase.
- Falta ligação real sessão -> checkout -> Hotmart transaction.
- Falta política de produção para script de tracking.
- Falta separação operacional de dados TEST vs REAL nos dashboards.

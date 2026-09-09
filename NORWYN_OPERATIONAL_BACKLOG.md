# NORWYN — Operational Backlog

Data: 2026-09-06  
Base: auditoria HML pós-saída da NBF.

## P0 — Bloqueia Operação/Confiança

1. Reconciliar Hotmart status `unknown`.
   - Evidência: 1.223 de 3.805 transações.
   - Resultado esperado: status comercial confiável por transação.

2. Travar todos os indicadores comerciais/financeiros por moeda.
   - Evidência: 40 transações não-BRL.
   - Resultado esperado: BRL separado de USD/EUR/PYG/ARS/CAD/CHF; sem conversão silenciosa.

3. Consolidar canonical product.
   - Evidência: 29 products, 36 produtos Hotmart, 30 external identities, 20 products sem identidade externa.
   - Resultado esperado: produto de negócio único com ofertas/bundles/versões explícitos.

4. Tornar Financeiro operacional de verdade.
   - Evidência: 140 lançamentos, só 1 previsto.
   - Resultado esperado: contas a pagar/receber, baixa, edição, categoria, comprovante e permissões por perfil.

5. Definir identidade Aluno 360.
   - Evidência: 1.468 alunos, telefone ausente em 1.446, identidade principalmente por e-mail.
   - Resultado esperado: comprador/aluno/suporte/certificado relacionados sem duplicação.

6. Ajustar Atividades para assignee persistente.
   - Evidência: report Telegram usa heurística por time/nome.
   - Resultado esperado: `assignee_user_id`/responsável real para Juliana, Ryan e futuros operadores.

7. Separar dados TEST de indicadores operacionais.
   - Evidência: 49 eventos Funnel Lab todos `test`.
   - Resultado esperado: dashboards nunca misturam TEST com real.

## P1 — Necessário para Operar Sem NBF

8. Transformar Missões em camada oficial de orquestração.
   - Diagnóstico -> prioridade -> campanha -> atividades -> resultados -> aprendizado.

9. Criar calendário editorial dentro de Growth & Conteúdo.
   - Separado da Agenda pessoal/operacional.

10. Validar caso real Content Capture: Reel vencedor -> carrossel.
   - Usar posts Instagram, briefing, draft, aprovação, atividade e performance.

11. Tornar ManyChat observável além do inventário.
   - Growth tools, tags e custom fields existem; faltam entradas, erros, keywords e conversões.

12. Conectar/validar ActiveCampaign.
   - Hoje 693 registros `NOT_SYNCED`.

13. Melhorar report Telegram por usuário real.
   - Depois do assignee persistente, gerar report por operacional sem heurística.

14. Otimizar SSR da Home/Norwyn.
   - Dividir primeira tela e drill-down para reduzir carregamento.

15. Consolidar Produtos & Alunos como módulo oficial.
   - Produto 360 e Aluno 360 devem virar subvisões, não módulos paralelos.

## P2 — Aumenta Eficiência

16. Incorporar Landing Monitor como QA de funil.
17. Transformar Evidence/Intelligence em motor interno.
18. Unificar `knowledge_base` e `growth_knowledge_base`.
19. Melhorar reconciliação Ads -> Landing -> Hotmart via tracking keys.
20. Criar visão executiva de automações: captura, entrega, falha, conversão.
21. Relacionar despesas a produto/campanha quando houver evidência.
22. Criar matriz inicial de categorias financeiras baseada no negócio real.
23. Refinar suporte dentro de Clientes & Alunos.

## P3 — Evolução

24. Arquivar futuramente Objetivos/OKRs se Missões assumir planejamento.
25. Tirar Adoção da navegação operacional.
26. Manter Shadow Mode só se virar evidência real de ações externas.
27. Evoluir Funnel Lab para produção somente após tracking real seguro.
28. Criar Content Studio quando Content Capture + QA + Atividades estiverem validados.

## Próxima Sequência Recomendada

1. Hotmart: reconciliar `unknown` e documentar mapeamento de status.
2. Hotmart: garantir filtros de moeda em todos os KPIs decisórios.
3. Produtos: completar `norwyn_product_external_identities` para os 36 Hotmart ids.
4. Produtos: marcar produto TEST e relações `UNKNOWN/EXCLUDED/DIRECT`.
5. Financeiro: desenhar fluxo operacional de conta a pagar/receber e baixa.
6. Financeiro: permitir operação segura por Ryan sem liberar Admin técnico.
7. Aluno 360: definir identidade por e-mail/CPF/telefone/fontes.
8. Atividades: adicionar responsável persistente por usuário e migrar report Telegram.
9. Growth & Conteúdo: validar fluxo Reel vencedor -> carrossel -> atividade -> publicação.
10. VSL: preparar plano de instrumentação real sem misturar TEST.

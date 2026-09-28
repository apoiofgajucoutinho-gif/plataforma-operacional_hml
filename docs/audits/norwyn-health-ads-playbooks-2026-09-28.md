# Auditoria Norwyn: Health, Ads e Playbooks

Data: 28/09/2026  
Ambiente auditado: HML (`oerdsmgiebquecqwcbox`)  
Tenant: `ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0`

Esta auditoria e somente leitura. Nenhuma LP, campanha Meta ou dado operacional foi alterado.

> Implementacao aprovada em seguida: a V1 foi aplicada no HML pela migration `20260928113118_landing_health_playbook_v1.sql`. O inventario abaixo preserva o estado observado antes da implementacao.

## 1. Landing Page Health

### Inventario existente

| Estrutura | Uso atual | Reaproveitamento recomendado |
| --- | --- | --- |
| `landing_page_definitions` | Identidade, produto/campanha, ambiente, versao ativa e vinculos | Fonte funcional da LP |
| `landing_page_versions` | Snapshot de configuracao, conteudo e tema | Integridade da versao publicada |
| `landing_page_qa_runs` | Resultado agregado de QA e resumo tecnico/especialista | Execucao de QA por versao |
| `landing_page_tracking_events` | Eventos, sessao, UTMs, origem real/simulada | Saude do tracking e atribuicao de teste |
| `norwyn_landing_registry` | Registry monitorado e frequencia | Agenda do monitor de LP |
| `norwyn_landing_snapshots` | HTTP, hash, tamanho, HTML extraido e QA | Fingerprint e integridade |
| `norwyn_landing_qa_issues` | Issues categorizadas, severidade, evidencia e recomendacao | Alertas operacionais |
| `norwyn_landing_monitor_log` | Mudanca, erro e indisponibilidade por execucao | Historico resumido |
| `digital_assets` / `presence_checks` | HTTP, SSL, redirect, links, performance, score e incidentes | Motor tecnico central |

Dados atuais no HML: 2 registros no registry, 22 snapshots, 62 issues, 20 logs de monitor e 1 QA run. Os 20 logs sao `NO_CHANGE`. Os dois registros do registry sao MRC antigos; a Imersao Zumbido nova ainda nao esta cadastrada nele.

A Imersao Zumbido aparece no dashboard a partir de tracking, mas nao existe hoje em `landing_page_definitions`, `norwyn_landing_registry` ou `digital_assets`. O checkout `B47092539B?off=lov69pen` ja existe no Presence e teve ultimo estado `healthy`.

### Cobertura atual da aba Saude

- Disponibilidade/HTTP: somente quando existe snapshot do registry.
- Checkout: reutiliza a saude do link no Catalogo/Presence.
- Tracking: considera existencia de eventos.
- Links e imagens: inferencia superficial por HTML/tamanho capturado.
- SEO: somente titulo detectado.
- Integridade: presenca de hash, sem comparar explicitamente com a versao ativa.
- Performance tecnica: nao disponivel.
- Links curtos: nao sao verificados como cadeia operacional.

### Evolucao V1 sem novas tabelas

1. Cadastrar a LP nova nas estruturas existentes, vinculando definition, registry e `digital_assets`.
2. Tornar a LP o asset pai e cadastrar dominio, checkout e cinco rotas como assets filhos ou links descobertos monitorados.
3. Usar um unico runner que combine Presence e QA, gravando:
   - HTTP, SSL, redirect, URL final e tempo em `presence_checks`;
   - fingerprint/extracao em `norwyn_landing_snapshots`;
   - resumo funcional em `landing_page_qa_runs`;
   - issues em `norwyn_landing_qa_issues`;
   - transicao em `norwyn_landing_monitor_log`/`presence_incidents`.
4. Para `/stories`, `/bio`, `/whatsapp`, `/site` e `/ads`, executar navegacao sintetica marcada desde a entrada como `SIMULATED` e `traffic_type=test`.
5. Validar a cadeia `short link -> redirect -> LP -> atribuicao -> CTA/checkout`, conferindo uma unica sessao, first/current touch e URL final, sem compra.
6. Derivar o status executivo:
   - Saudavel: checks essenciais aprovados e tracking recente.
   - Atencao: degradacao nao bloqueante, tracking atrasado ou issue `WARNING`.
   - Critico: indisponibilidade, SSL invalido, checkout inacessivel, versao divergente ou tracking quebrado confirmado.

Para ESPECIALISTA, exibir somente estado, ultima verificacao e orientacao humana. ADMIN recebe HTTP, SSL, redirects, tempos, hashes, evidencias e issues.

Uma tabela nova so seria justificavel depois, caso seja necessario consultar cada etapa da cadeia como serie historica independente em grande escala. Na V1, `presence_checks.result_json` e `landing_page_qa_runs.technical_results` comportam o detalhe.

## 2. Ads / Traffic OS

### Inventario e qualidade real

`instagram_ads_daily` possui 1.558 linhas entre 10/01/2026 e 13/08/2026. Existem 160 campaign IDs, 166 ad set IDs e 434 ad IDs. A coleta pagina todas as linhas em blocos de 1.000.

| Dimensao | Estado | Evidencia | Recomendacao |
| --- | --- | --- | --- |
| Campaign | Ja existe | nome e `campaign_id` em 1.547/1.558 linhas | Vincular ID Meta a `campaigns` |
| Ad Set | Ja existe | nome e `adset_id` em 1.547/1.558 | Preservar ID como chave |
| Ad | Ja existe | nome e `ad_id` em 1.547/1.558 | Preservar ID como chave |
| Creative | Parcial | nome do anuncio existe; `creative_id` 0/1.558 | Ampliar coletor com creative endpoint |
| Spend | Ja existe | `valor_gasto` | Manter fonte Meta |
| Impressions | Ja existe | `impressoes` | Manter |
| Reach | Ja existe | `alcance` | Manter |
| Frequency | Ja existe | `frequencia` | Manter |
| CPM / CTR / CPC | Ja existe | colunas canonicas | Manter e validar unidade |
| Link Click | Ja existe | 1.558 linhas preenchidas | Validar semantica do action mapping |
| Landing Page View | Parcial | 1.558 preenchidas, mas LPV pode superar link clicks | Auditar mapeamento das actions antes de usar no funil |
| Checkout | Parcial | `initiate_checkouts` preenchido | Confirmar action type Meta |
| Purchase Meta | Parcial | quantidade/valor preenchidos | Nao tratar como venda confirmada Hotmart |
| Video 3s | Ja existe | preenchido | Manter |
| Video 25/50/75/95/100 | Parcial | colunas existem, dados atuais zerados | Validar breakdown/action collector |
| Preview / thumbnail | Falta | 0/1.558 | Buscar creative details sem alterar campanha |
| URL de destino | Falta | 0/1.558 | Coletar creative/link data |
| UTM / URL tags | Falta | 0/1.558 | Coletar e normalizar |
| `landing_key` | Falta | 0/1.558 | Resolver por URL/UTM com confianca declarada |

Existem ainda 5 campanhas Norwyn, 4 materiais, 5 versoes, 1 aprovacao e 1 aprendizado. Essas tabelas modelam planejamento e governanca, mas nao representam a hierarquia operacional Meta por si so.

### Cadeia de atribuicao

Hoje e possivel montar `Campaign -> Ad Set -> Ad` com IDs Meta. `Produto -> Campanha` existe na tabela `campaigns`, e LP/checkout/venda existem em outros modulos. O elo deterministico `Ad/Creative -> LP` esta ausente porque destination URL, UTM e `landing_key` nao foram coletados. Portanto, a cadeia completa `Produto -> Campanha -> Ad Set -> Criativo -> LP -> Checkout -> Venda` e apenas parcial e nao deve ser apresentada como atribuicao confirmada.

### Criativos historicos de Zumbido

Candidatos a controles futuros pelo volume historico, nao por conclusao causal:

| Criativo | Investimento | Impressoes | Link clicks | LPV reportada | Checkouts Meta | Purchases Meta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `VID_22.06_01` | R$ 4.744,67 | 122.939 | 1.095 | 1.918 | 404 | 78 |
| `IMG_22.06_01` | R$ 1.563,25 | 62.126 | 365 | 676 | 180 | 45 |
| `JUL_VID_04` | R$ 55,49 | 1.503 | 12 | 26 | 4 | 0 |
| `AD15 \| IMG` | R$ 53,92 | 1.937 | 26 | 44 | 0 | 0 |
| `AD12 \| IMG` | R$ 51,36 | 1.963 | 29 | 52 | 0 | 0 |

Como LPV supera link clicks em varios casos e nao ha destino/UTM, esses numeros precisam de validacao semantica antes de escolher controle por conversao. `VID_22.06_01` e `IMG_22.06_01` sao as referencias de maior escala observada.

### Traffic OS V1 proposto

1. Corrigir cobertura do coletor: creative ID, preview/thumbnail, destination URL, URL tags e breakdowns de video.
2. Criar camada de leitura, nao uma nova tabela de eventos, que una `instagram_ads_daily` a `campaigns`, produto, LP e tracking por IDs/URL/UTM.
3. Exibir nivel de confianca por elo: confirmado por ID, confirmado por URL/UTM, inferido por nome ou nao atribuivel.
4. Separar Purchase Meta de venda Hotmart confirmada.
5. Tratar `campaign_materials` como biblioteca/governanca de criativo e `instagram_ads_daily` como performance observada.
6. Somente depois avaliar uma tabela de mapeamento duravel entre IDs Meta e entidades Norwyn. Ela e necessaria se os IDs nao puderem ser persistidos nas estruturas existentes sem ambiguidade.

## 3. Atividades e Playbooks

### Inventario existente

O modulo ja possui templates, tarefas de template, projetos, tarefas, dependencias, recorrencias e logs. Criar um projeto com `template_id` chama `atividades_expandir_template`, que materializa tarefas, datas e dependencia por ordem.

HML possui 3 templates, 11 tarefas de template, 1 projeto, 1 tarefa, 0 dependencias materializadas e 0 logs. Os templates atuais sao Lancamento, Acao de Venda e Campanha/Aquecimento.

| Campo desejado | Suporte atual |
| --- | --- |
| Titulo, responsavel, status, prioridade e prazo | Nativo |
| Fase | Parcial: ordem/descricao; sem campo proprio |
| Dependencia | Nativo em `atividades_dependencias` e `depende_ordem` no template |
| Produto e campanha | Nativo na tarefa; nao no projeto/template |
| Landing Page | Parcial: `landing_page_definitions.activity_id` e metadata; sem FK na tarefa |
| O que/como/por que/criterio | Parcial: `descricao`; estruturavel em `metadata` somente na tarefa materializada |
| Evidencia/link/aprendizado | Parcial: `metadata`; sem anexos/evidencias tipadas |
| Aprovacao | `validacao_obrigatoria` e `approval_required` |
| Data de conclusao | Nativo |
| Historico | Tabela de logs existe, mas a base atual tem 0 registros |

Existe drift entre TypeScript/migration inicial e schema real (`parent_id` versus `template_tarefa_id`, `concluida_at` versus `concluida_em`, `descricao` versus `detalhe` em logs). Isso deve ser corrigido antes de ampliar a UI.

### Playbook LP V1 sem novas tabelas

1. Criar um template `Publicar Landing Page` em `atividades_templates`.
2. Cadastrar as atividades em `atividades_template_tarefas`, usando `ordem`, `depende_ordem`, offsets, time, prioridade e validacao.
3. Guardar no `descricao` de cada tarefa os blocos O que fazer, Como fazer, Por que fazer, Criterio de aceite e Evidencia esperada.
4. Ao clicar `+ Iniciar Playbook`, criar projeto com template e parametros de produto, campanha, dominio, oferta, checkout, canais, responsaveis e datas.
5. Expandir pelo RPC existente; em seguida vincular `product_id`, `campaign_id`, `source_module='landing-pages'` e metadata contextual nas tarefas materializadas.
6. Materializar as dependencias reais em `atividades_dependencias` durante a expansao.

Essa V1 exige endpoint transacional e UI, mas nao exige novas tabelas. Para manter os campos totalmente pesquisaveis e validados no template, sera necessaria migration adicionando metadata estruturada ao template/template-task ou colunas especificas. Evidencias com multiplos anexos e aprovadores tambem justificariam schema proprio em fase posterior.

## 4. Ordem recomendada

1. Corrigir o drift de Atividades e documentar/testar a expansao de templates.
2. Cadastrar a Imersao Zumbido nas estruturas Health existentes e unificar o check com Presence.
3. Implementar a cadeia sintetica dos cinco links, sempre como trafego de teste.
4. Criar a leitura executiva de Saude para ESPECIALISTA e diagnostico para ADMIN.
5. Implementar `+ Iniciar Playbook` com o template de LP, sem nova engine.
6. Melhorar o coletor Ads para preencher os campos ja existentes.
7. Criar a camada de resolucao e confianca do Traffic OS.
8. Somente apos medir os gaps, decidir por tabela de mapeamento Ads e estrutura tipada de evidencias/playbooks.

## 5. Mudancas de schema

### Nao exigem schema novo

- Health HTTP/SSL/dominio/checkout/links/imagens/SEO/fingerprint.
- Monitorar os cinco links como assets filhos/discovered links.
- QA sintetico sem contaminacao publica.
- Status executivo por perfil.
- Template LP e expansao em projeto/tarefas.
- V1 do Traffic OS baseada nos campos Ads ja existentes.

### Podem exigir migration pequena

- Corrigir drift entre schema e tipos de Atividades.
- Adicionar metadata estruturada a `atividades_templates` e `atividades_template_tarefas`.
- FK direta de tarefa/projeto para `landing_page_definitions`, se consultas por LP se tornarem frequentes.
- Tabela de mapeamento Meta/Norwyn somente se URL/UTM e IDs nao resolverem o elo de forma duravel.
- Evidencias/anexos tipados e multiplas aprovacoes, quando a operacao exigir.

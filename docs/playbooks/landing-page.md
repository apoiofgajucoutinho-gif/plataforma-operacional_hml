# Playbook Norwyn: Publicar nova Landing Page

Este documento registra o processo operacional real usado na nova LP da Imersao Zumbido e o transforma em um padrao reutilizavel. Ele nao autoriza publicacao em producao, alteracao de DNS, checkout ou campanhas sem aprovacao correspondente.

## Implementacao V1

- Template persistido: `Publicar nova Landing Page`.
- Motor reutilizado: `atividades_expandir_template`.
- Estrutura: 14 fases, 40 atividades operacionais e 39 dependencias sequenciais.
- Datas: os offsets do template sao ajustados proporcionalmente entre a data de inicio e a data alvo do projeto.
- Contexto: produto, campanha, Landing Page e responsavel sao aplicados nas tarefas materializadas.
- Orientacao: cada tarefa registra fase, o que fazer, como fazer, por que fazer, criterio de aceite e evidencia esperada.
- Schema: nenhuma tabela ou coluna nova; o contexto complementar fica em `metadata` das tarefas.

## Como usar

Ao iniciar o playbook, preencher apenas o contexto variavel:

- produto e campanha;
- objetivo, publico e oferta;
- dominio e ambiente;
- checkout/Product ID/Offer ID;
- responsaveis e datas;
- canais e links de entrada;
- ferramenta usada para criar a primeira versao.

Cada atividade deve registrar: titulo, fase, responsavel, status, prioridade, dependencia, prazo, objeto relacionado, o que fazer, como fazer, por que fazer, criterio de aceite, evidencia, link, aprovacao, conclusao e aprendizado.

## Padrao Norwyn

### 1. Briefing e estrategia

- Definir produto, objetivo, oferta, publico e CTA principal.
- Definir referencias visuais, conteudos obrigatorios e campanha associada.
- Criterio de aceite: briefing aprovado e sem campos comerciais criticos pendentes.

### 2. Criar versao inicial

- Montar prompt/briefing para a ferramenta escolhida.
- Gerar a versao inicial e revisar estrutura, identidade e hierarquia.
- Registrar projeto, preview e versao aprovada como referencia.
- A ferramenta e variavel; o processo nao depende de um fornecedor especifico.

### 3. Validacao visual e funcional

- Validar desktop, mobile, Hero, CTA, modulos, oferta, FAQ, imagens, depoimentos e responsividade.
- Registrar pendencias da especialista e aprovacao.
- Criterio de aceite: conteudo e experiencia aprovados nos viewports definidos.

### 4. Fluxo tecnico

- Integrar ao projeto tecnico e versionar em Git.
- Publicar em Preview/HML.
- Registrar commit, deployment e equivalencia com a referencia aprovada.
- Criterio de aceite: build valido e preview rastreavel por commit.

### 5. Tracking

- Definir `landing_key`, produto e campanha.
- Configurar visitor/session, page view, scroll 25/50/75/90, section views, CTA view/click, offer view e checkout click.
- Preservar first touch, current touch e UTMs.
- Marcar trafego de QA como `SIMULATED/test` desde a entrada.
- Criterio de aceite: uma sessao canonica, eventos esperados e nenhuma contaminacao das metricas publicas.

### 6. Checkout

- Selecionar produto e oferta.
- Registrar Product ID e Offer ID.
- Validar URL, atribuicao e smoke somente leitura, sem concluir compra.
- Confirmar preco com o responsavel comercial.
- Criterio de aceite: checkout acessivel e parametros comerciais confirmados.

### 7. Dominio

- Escolher subdominio sem substituir ativo existente.
- Vincular ao projeto de hospedagem e obter o registro DNS solicitado.
- Criar o registro no provedor autorizado, aguardar propagacao e validar DNS, HTTPS, certificado e HTTP.
- Criterio de aceite: dominio retorna a pagina correta por HTTPS e o dominio anterior permanece intacto.

### 8. Links de entrada rastreados

- Definir origens e padrao UTM.
- Preparar Instagram Stories, Instagram Bio, WhatsApp, Site e Meta Ads quando aplicaveis.
- Validar first touch, current touch e origem na Norwyn.
- Criterio de aceite: cada canal aparece com uma unica origem canonica.

### 9. Links curtos

- Criar redirects/rewrite para as rotas aprovadas.
- Preservar UTMs, impedir tracking duplicado e validar cada rota no mobile.
- Usar `noindex/nofollow` quando aplicavel e registrar os links oficiais.
- Criterio de aceite: rota curta chega a LP, mantem atribuicao e nao cria sessao duplicada.

### 10. Saude e QA

- Verificar HTTP, HTTPS, dominio, redirects, LP, tracking, imagens, checkout, SEO basico, mobile e desktop.
- Verificar ausencia de overflow, 404 e divergencia da versao publicada.
- Criterio de aceite: itens essenciais saudaveis e alertas residuais documentados.

### 11. Metricas

- Validar visitantes unicos, sessoes, origem, percentual das sessoes, checkout, first/current touch.
- Excluir `SIMULATED/test`.
- Manter origens oficiais visiveis com zero e uma unica origem canonica por sessao.
- Criterio de aceite: dashboard e eventos brutos reconciliados no periodo de teste.

### 12. Aprovacao final

- Confirmar conteudo, visual, preco, depoimentos, checkout, tracking, dominio, links e saude.
- Criterio de aceite: aprovacoes registradas e nenhum bloqueador aberto.

### 13. Publicacao e distribuicao

- Preparar links por canal e orientar qual URL usar.
- Confirmar preservacao da LP anterior.
- Iniciar distribuicao somente apos autorizacao.
- Criterio de aceite: links oficiais entregues e distribuicao rastreavel.

### 14. Pos-publicacao

- Acompanhar primeiras visitas, origens reais, checkout e Saude.
- Revisar nas primeiras horas e apos 24 horas.
- Registrar problemas e aprendizados.
- Criterio de aceite: primeira janela operacional revisada e incidentes encaminhados.

## Exemplo real: Imersao Zumbido

Os itens abaixo documentam o caso executado; nao sao regras universais.

- Primeira versao visual: criada por prompt no v0.app.
- Landing key: `imersao_zumbido`.
- Dominio novo: `imersaozumbido.fgajulianacoutinho.com.br`.
- Hospedagem: projeto Vercel `lp_ju`.
- Checkout: Product ID `B47092539B`, Offer ID `lov69pen`.
- Links curtos: `/stories`, `/bio`, `/whatsapp`, `/site` e `/ads`.
- Canais oficiais: Instagram Stories, Instagram Link da bio, WhatsApp Grupo, Site Juliana e Meta Ads.
- Regra de QA: eventos sinteticos usam `source_type=SIMULATED` e `traffic_type=test`.
- Regra de atribuicao: uma origem canonica por sessao; origens oficiais continuam visiveis mesmo com zero.
- Protecao aplicada: a LP e o dominio antigos nao foram substituidos.

## Exemplo de atividade

### Configurar subdominio da LP

**O que fazer:** criar e ativar o subdominio oficial.  
**Como fazer:** vincular o dominio na Vercel, obter o CNAME, cadastrar no provedor DNS autorizado e validar HTTPS.  
**Por que fazer:** disponibilizar uma URL oficial sem substituir a pagina anterior.  
**Dependencia:** LP publicada em Preview/HML.  
**Criterio de aceite:** dominio retorna HTTP 200, HTTPS valido e pagina correta.  
**Evidencia:** URL, resultado DNS/HTTPS e registro do deployment.  
**Aprovacao:** responsavel pelo dominio e responsavel comercial, quando aplicavel.

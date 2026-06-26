# PRD 001 — Inteligência Editorial (Beta)

**Produto:** Plataforma Juliana  
**Iniciativa NORWYN:** Editorial Agent — Labs Intelligence  
**Nome exibido no sistema:** Inteligência Editorial (Beta)  
**Módulo proprietário:** Instagram  
**Versão do documento:** 1.0  
**Data:** 24/06/2026  
**Status:** especificação para MVP  
**Implementação:** não iniciada por este documento

---

## 1. Resumo executivo

Inteligência Editorial (Beta) será uma funcionalidade assistida por IA dentro do módulo Instagram da Plataforma Juliana.

Sua finalidade é transformar posts, métricas e comentários públicos recentes em:

- resumo do período;
- sinais editoriais;
- análises;
- insights;
- temas que merecem atenção;
- recomendações prioritárias;
- briefings propostos;
- lacunas de dados;
- decisões pendentes.

A funcionalidade não será um gerador de conteúdo final e não executará nenhuma ação externa.

Ela não deverá:

- escrever carrossel completo;
- entregar roteiro final de Reels;
- criar arte;
- publicar;
- agendar;
- responder comentários;
- operar campanhas;
- alterar CRM;
- enviar materiais ao marketing;
- substituir aprovação humana.

O acesso inicial será exclusivo para:

- `ADMIN`;
- `SUPORTE`.

O perfil `MARKETING_PARTNER` continuará acessando as demais áreas permitidas do Instagram, mas não visualizará nem poderá executar a Inteligência Editorial.

O MVP utilizará:

- até 30 posts;
- até 100 comentários públicos válidos;
- período padrão de 30 dias;
- objetivo do ciclo informado pelo usuário;
- capacidade de produção;
- restrições opcionais;
- até três recomendações;
- até dois briefings.

Os estudos anteriores confirmaram:

- posts e métricas com qualidade suficiente;
- volume adequado para um ciclo assistido;
- comentários utilizáveis sob filtro rigoroso;
- necessidade de anonimização;
- necessidade de manter contexto estratégico e aprovação humana.

---

## 2. Problema

Os dados do Instagram já existem na plataforma, mas permanecem distribuídos entre:

- indicadores;
- rankings;
- tabelas;
- gráficos;
- comentários;
- classificações operacionais.

Esses dados respondem bem “o que aconteceu”, mas ainda exigem interpretação manual para responder:

- por que determinados conteúdos merecem atenção;
- quais padrões são relevantes;
- quais perguntas da audiência podem orientar conteúdo;
- quais recomendações cabem na capacidade atual;
- quais ideias podem virar briefing;
- quais informações ainda faltam;
- quais decisões dependem da Juliana.

A ausência dessa camada de interpretação aumenta o tempo necessário para transformar analytics em decisão editorial.

---

## 3. Objetivo do produto

### 3.1 Objetivo principal

Permitir que Juliana e usuários de Suporte autorizados executem uma análise editorial assistida sobre dados recentes do Instagram e registrem decisões humanas sobre o resultado.

### 3.2 Perguntas que a funcionalidade deve responder

1. O que aconteceu no período?
2. Quais posts se destacaram?
3. Quais sinais editoriais são relevantes?
4. Quais temas merecem atenção?
5. Quais perguntas ou comentários indicam oportunidades?
6. Quais recomendações cabem no objetivo e na capacidade do ciclo?
7. Quais briefings podem ser propostos?
8. Quais lacunas reduzem a confiança?
9. Quais decisões precisam ser tomadas?

### 3.3 Resultados esperados

- menor tempo entre análise e decisão;
- maior clareza sobre evidências;
- recomendações limitadas e priorizadas;
- briefings rastreáveis até os dados;
- decisões registradas;
- aprendizado por feedback humano;
- separação clara entre análise e execução.

### 3.4 Princípios

- evidência antes de recomendação;
- transparência de confiança;
- escopo reduzido;
- revisão humana obrigatória;
- nenhuma ação automática;
- anonimização por padrão;
- indicação explícita de lacunas;
- não confundir correlação com causalidade;
- não inventar dados ausentes.

---

## 4. Não objetivos

Inteligência Editorial (Beta) não tem como objetivo:

- substituir a especialista;
- substituir o time de marketing;
- produzir conteúdo pronto;
- aprovar conteúdo;
- executar calendário editorial;
- operar anúncios;
- responder audiência;
- prever vendas;
- garantir resultado;
- atribuir receita a conteúdo;
- analisar concorrentes;
- funcionar como CRM;
- atuar de forma autônoma.

---

## 5. Usuários e permissões

### 5.1 Usuário primário

**Juliana / Admin**

Necessidades:

- interpretar o desempenho recente;
- validar recomendações;
- decidir prioridades;
- ajustar ou rejeitar propostas;
- transformar recomendações aprovadas em briefings;
- registrar feedback.

### 5.2 Usuário secundário

**Suporte autorizado**

Necessidades:

- preparar uma análise;
- informar contexto;
- revisar evidências;
- organizar decisões;
- registrar feedback;
- apoiar Juliana na leitura.

### 5.3 Usuário futuro

**Marketing**

Fora desta fase.

Motivos:

- funcionalidade beta;
- recomendações ainda precisam de validação;
- risco de uso como orientação automática;
- briefings só devem chegar ao Marketing após aprovação futura;
- o módulo Instagram já está acessível ao perfil, exigindo bloqueio específico da aba.

### 5.4 Matriz de acesso do MVP

| Perfil | Visualiza aba | Gera análise | Visualiza histórico | Decide | Registra feedback |
|---|---:|---:|---:|---:|---:|
| Admin | Sim | Sim | Sim | Sim | Sim |
| Suporte | Sim | Sim | Sim | Sim | Sim |
| Marketing | Não | Não | Não | Não | Não |
| Clínica | Não | Não | Não | Não | Não |
| User/outros | Não | Não | Não | Não | Não |

### 5.5 Camadas de autorização exigidas

#### Camada 1 — Interface

- ocultar a aba para perfis não autorizados;
- não renderizar atalhos, contadores ou histórico.

#### Camada 2 — Servidor

- validar sessão;
- validar tenant;
- validar membership ativa;
- permitir somente `ADMIN` e `SUPORTE`;
- bloquear geração, leitura, decisão e feedback de outros perfis.

#### Camada 3 — Persistência

Caso os resultados sejam persistidos:

- restringir leitura e escrita por tenant;
- permitir somente Admin e Suporte;
- não confiar apenas na ocultação visual.

### 5.6 Acesso direto

Caso um usuário não autorizado tente acessar uma URL ou endpoint:

- responder com bloqueio;
- não retornar dataset;
- não retornar análise;
- não revelar se existe histórico;
- registrar tentativa técnica sem conteúdo sensível.

Mensagem sugerida:

> Esta funcionalidade está disponível somente para perfis autorizados durante a fase Beta.

---

## 6. Local dentro do sistema

### 6.1 Estrutura atual

O módulo Instagram utiliza a rota:

```text
/instagram
```

E possui as abas:

1. Insights;
2. Resultados;
3. Interações.

### 6.2 Navegação recomendada

Adicionar uma quarta aba:

```text
Instagram
├── Insights
├── Resultados
├── Interações
└── Inteligência Editorial (Beta)
```

### 6.3 Justificativa

- preserva o módulo existente;
- mantém análise e inteligência no mesmo contexto;
- evita novo item na sidebar;
- reduz mudança de navegação;
- permite reaproveitar período, posts, métricas e interações;
- diferencia analytics descritivo de interpretação assistida.

### 6.4 Ordem

A aba deve ficar após **Interações**, pois representa uma camada posterior:

```text
dados → resultados → interações → inteligência
```

### 6.5 Estado de navegação

O estado ativo deve ser identificável para:

- navegação interna;
- adoção/páginas acessadas;
- retorno à análise;
- eventual deep link autorizado.

Nome de rastreamento:

```text
Instagram: Inteligência Editorial
```

### 6.6 Responsividade

Em telas menores:

- abas podem ter rolagem horizontal;
- o texto “Beta” deve permanecer visível;
- controles não podem comprimir o conteúdo;
- resultado deve usar blocos verticais;
- tabelas de evidência devem permitir rolagem;
- ações de decisão devem permanecer acessíveis.

---

## 7. Fluxo do usuário

```text
Instagram
  ↓
Inteligência Editorial (Beta)
  ↓
Configurar análise
  ↓
Validar disponibilidade dos dados
  ↓
Preparar dataset
  ↓
Anonimizar comentários
  ↓
Executar análise assistida
  ↓
Apresentar resultado estruturado
  ↓
Revisar evidências
  ↓
Tomar decisões
  ↓
Registrar decisão e feedback
```

### 7.1 Fluxo detalhado

1. Usuário acessa Instagram.
2. Abre Inteligência Editorial (Beta).
3. Sistema valida perfil.
4. Sistema apresenta configuração.
5. Usuário seleciona período.
6. Informa objetivo do ciclo.
7. Informa capacidade de produção.
8. Opcionalmente informa restrições.
9. Clica em **Gerar Análise Editorial**.
10. Sistema valida os campos.
11. Sistema verifica posts e métricas.
12. Sistema seleciona comentários válidos, quando disponíveis.
13. Sistema anonimiza comentários.
14. Sistema prepara dataset limitado.
15. Sistema executa análise assistida.
16. Sistema valida estrutura da resposta.
17. Sistema apresenta o relatório.
18. Usuário revisa sinais, evidências e lacunas.
19. Usuário decide sobre recomendações e briefings.
20. Sistema registra decisões.
21. Usuário pode registrar feedback.

### 7.2 Saídas de decisão

Para cada item:

- aceitar;
- aceitar com ajuste;
- rejeitar;
- adiar;
- pedir aprofundamento;
- transformar em briefing, quando aplicável.

Nenhuma decisão executa publicação, envio ou campanha.

---

## 8. Tela 1 — Configuração da análise

### 8.1 Objetivo

Capturar o contexto mínimo que não existe nos dados brutos.

### 8.2 Campo: período

Opções:

- últimos 7 dias;
- últimos 30 dias;
- personalizado.

Padrão:

```text
Últimos 30 dias
```

Validações:

- início não pode ser posterior ao fim;
- fim não pode ser futuro;
- período personalizado deve respeitar o limite operacional definido;
- mostrar quantidade preliminar de posts, quando disponível.

### 8.3 Campo: objetivo do ciclo

Tipo:

- seleção simples com opção de texto personalizado.

Sugestões:

- fortalecer autoridade;
- preparar lançamento;
- aquecer Formação AASI Premium;
- entender temas com maior resposta;
- identificar dúvidas recorrentes;
- apoiar planejamento editorial;
- outro.

Obrigatório:

```text
Sim
```

Justificativa:

Sem objetivo, desempenho não indica sozinho qual decisão é adequada.

### 8.4 Campo: capacidade de produção

Opções:

- 1 conteúdo;
- 2 conteúdos;
- 3 conteúdos;
- 5 conteúdos.

Padrão:

```text
3 conteúdos
```

Obrigatório:

```text
Sim
```

Uso:

- limitar recomendações;
- evitar propostas incompatíveis com a execução.

### 8.5 Campo: restrições do ciclo

Tipo:

- texto opcional;
- lista de restrições adicionadas pelo usuário.

Exemplos:

- não abordar determinado tema;
- não vender diretamente;
- priorizar conteúdo educativo;
- evitar campanha;
- considerar agenda cheia;
- não usar caso clínico;
- evitar promessa de resultado.

### 8.6 Contexto editorial opcional

Pode permitir informar:

- produto relacionado;
- campanha;
- público prioritário;
- evento relevante;
- observação da especialista.

Esses campos são opcionais no MVP, mas devem ser incorporados ao contexto se preenchidos.

### 8.7 Indicador preliminar de dados

Antes da geração, exibir:

- posts encontrados;
- comentários potencialmente válidos;
- período da última atualização;
- aviso quando comentários não estiverem disponíveis.

Não exibir dados pessoais.

### 8.8 Botão principal

Texto:

```text
Gerar Análise Editorial
```

Comportamento:

- habilitado somente com campos obrigatórios;
- impede submissão dupla;
- inicia estado de processamento;
- não promete tempo exato sem estimativa confiável.

### 8.9 Aviso Beta

> Esta análise é assistida por IA e deve ser revisada antes de orientar qualquer produção.

### 8.10 Microcopy de escopo

> A ferramenta propõe sinais, recomendações e briefings. Ela não cria nem publica conteúdo final.

---

## 9. Tela 2 — Estados de processamento

| Estado | Mensagem | Ação disponível | Fallback |
|---|---|---|---|
| Aguardando configuração | Configure período, objetivo e capacidade para iniciar. | Preencher campos | Manter configuração |
| Preparando dados | Estamos organizando posts, métricas e comentários válidos. | Cancelar retorno visual, se aplicável | Não gerar análise parcial silenciosamente |
| Analisando | A análise editorial está sendo preparada. | Aguardar | Preservar configuração em caso de falha |
| Concluído | Análise concluída e pronta para revisão. | Ver resultado | Abrir relatório |
| Erro | Não foi possível concluir a análise. | Tentar novamente | Exibir erro amigável e ID técnico |
| Análise insuficiente | Os dados encontrados não sustentam uma análise confiável. | Ampliar período | Permitir voltar à configuração |
| Sem dados | Não encontramos posts no período selecionado. | Alterar período | Não chamar IA |
| Sem comentários válidos | A análise seguirá apenas com posts e métricas. | Continuar ou voltar | Registrar lacuna |
| Não autorizado | Esta funcionalidade está restrita durante o Beta. | Voltar | Não expor conteúdo |

### 9.1 Erro de dados insuficientes

Mensagem:

> Não encontramos dados suficientes para gerar uma análise confiável neste período. Tente ampliar o intervalo ou revisar a coleta.

### 9.2 Erro técnico

Mensagem:

> Não foi possível concluir a análise agora. Nenhuma ação foi executada. Tente novamente mais tarde.

Requisitos:

- não mostrar stack trace;
- não mostrar prompt;
- não mostrar token;
- não mostrar dados pessoais;
- preservar referência técnica para logs.

### 9.3 Timeout

Mensagem:

> A análise levou mais tempo que o esperado e foi interrompida com segurança.

Ação:

- tentar novamente;
- reduzir período;
- voltar à configuração.

### 9.4 Resultado inválido

Se a IA não retornar estrutura válida:

- não exibir resposta bruta como resultado final;
- marcar execução como erro de validação;
- permitir nova tentativa;
- registrar falha sem comentários pessoais.

---

## 10. Tela 3 — Resultado da análise

### 10.1 Cabeçalho

Exibir:

- título;
- status Beta;
- período;
- data/hora da geração;
- usuário responsável;
- objetivo do ciclo;
- confiança geral;
- botão de voltar;
- ação de nova análise.

### 10.2 Bloco 1 — Resumo do ciclo

Campos:

- período analisado;
- objetivo informado;
- capacidade de produção;
- restrições consideradas;
- número de posts;
- número de comentários válidos;
- formatos presentes;
- confiança geral;
- principais mudanças;
- atualização da fonte.

Confiança deve ser explicável:

- alta;
- média;
- baixa.

Não usar porcentagem de confiança sem método definido.

### 10.3 Bloco 2 — Principais sinais

Quantidade:

```text
5 a 10
```

Cada sinal:

- título;
- descrição;
- evidência;
- severidade;
- confiança;
- posts relacionados;
- limitação;
- tipo do sinal.

Tipos possíveis:

- oportunidade;
- atenção;
- padrão;
- mudança;
- risco;
- lacuna.

Evidência deve apontar para:

- posts;
- métricas;
- comparação;
- comentários anonimizados.

### 10.4 Bloco 3 — Temas que merecem atenção

Cada tema:

- nome;
- origem: manual ou inferida;
- descrição;
- evidências;
- desempenho;
- comentários relacionados;
- risco de interpretação;
- oportunidade;
- confiança.

Tema inferido deve ser sinalizado como:

```text
Inferido — requer validação
```

### 10.5 Bloco 4 — Perguntas ou comentários recorrentes

Exibir somente se houver comentários válidos.

Cada agrupamento:

- pergunta ou padrão;
- frequência no corpus;
- posts relacionados;
- exemplos anonimizados;
- interpretação;
- nível de confiança.

Se não houver comentários:

> Comentários textuais ainda não possuem qualidade suficiente para esta análise.

Não apresentar:

- nomes;
- usernames;
- IDs pessoais;
- payload bruto;
- texto sensível sem sanitização.

### 10.6 Bloco 5 — Recomendações prioritárias

Limite:

```text
Até 3
```

Cada recomendação:

- título;
- ação sugerida;
- objetivo;
- justificativa;
- evidência;
- prioridade;
- esforço estimado;
- risco;
- métrica de sucesso;
- confiança;
- posts relacionados;
- status da decisão.

Prioridade:

- alta;
- média;
- baixa.

Esforço:

- baixo;
- médio;
- alto.

### 10.7 Bloco 6 — Briefings propostos

Limite:

```text
Até 2
```

Cada briefing:

- título provisório;
- problema ou oportunidade;
- público;
- mensagem central;
- canal/formato;
- entregável esperado;
- restrições;
- CTA sugerida;
- critério de sucesso;
- origem da recomendação;
- evidências;
- confiança;
- status.

O briefing:

- não contém legenda final;
- não contém roteiro final;
- não contém carrossel completo;
- não dispara produção.

### 10.8 Bloco 7 — Lacunas de dados

Exemplos:

- comentários insuficientes;
- comentários não reconciliados;
- ausência de impressões;
- ausência de Stories;
- ausência de DMs;
- tema não classificado;
- objetivo editorial manual;
- mídia não processada;
- período desatualizado;
- formato pouco representado.

Cada lacuna:

- impacto;
- parte da análise afetada;
- se bloqueia ou apenas reduz confiança.

### 10.9 Bloco 8 — Decisões pendentes

Agrupar:

- recomendações sem decisão;
- briefings sem decisão;
- temas que exigem confirmação;
- lacunas que precisam de resposta;
- aprofundamentos solicitados.

Cada item:

- responsável;
- prazo opcional;
- status;
- última atualização.

---

## 11. Dados utilizados

### 11.1 Fonte principal

#### `instagram_posts`

Campos:

- `post_id`;
- `data_postagem`;
- `hora_postagem`;
- `tipo`;
- `tipo_original`;
- `legenda`;
- `permalink`.

#### `instagram_metrics`

Campos:

- `likes`;
- `comentarios`;
- `alcance`;
- `salvos`;
- `compartilhamentos`;
- `engajamento_score`;
- `engajamento_classificacao`;
- atualização da métrica.

### 11.2 Fonte complementar

#### `instagram_interactions`

Usar apenas quando:

```text
source = post_comment
origem = n8n_instagram_comments_collector
external_id preenchido
post_id preenchido
message_text não vazio
mesmo tenant
mesma conta
match exato com instagram_posts.post_id
```

### 11.3 Limites

| Elemento | Limite |
|---|---:|
| Posts | 30 |
| Comentários | 100 |
| Recomendações | 3 |
| Briefings | 2 |
| Período padrão | 30 dias |

### 11.4 Campos enviados para IA

Por post:

- ID público do post;
- data e hora;
- formato;
- legenda;
- métricas;
- contexto manual;
- comentários anonimizados relacionados.

Contexto:

- período;
- objetivo;
- capacidade;
- restrições;
- regras de segurança.

### 11.5 Campos proibidos

- nome do comentarista;
- username;
- ID pessoal;
- payload bruto;
- DMs;
- Stories;
- seguidores individuais;
- tokens;
- dados de autenticação;
- e-mail;
- telefone;
- dados de saúde identificáveis;
- dados de outros tenants.

### 11.6 Dados ausentes

A ausência deve ser declarada, não preenchida artificialmente:

- impressões orgânicas;
- tema canônico;
- pilar;
- voz;
- produto/campanha relacionados;
- transcrição;
- evolução diária.

### 11.7 Dataset insuficiente

Não chamar IA quando:

- não houver posts;
- os posts não tiverem legenda ou métricas mínimas;
- o tenant/conta não puder ser validado;
- o período estiver fora dos limites;
- a preparação falhar.

Comentários não são obrigatórios para chamar IA. Sua ausência reduz o escopo e deve aparecer nas lacunas.

---

## 12. Resultado esperado

### 12.1 Estrutura conceitual da resposta

```text
Resumo
Sinais[]
Temas[]
PerguntasOuComentarios[]
Recomendacoes[0..3]
Briefings[0..2]
Lacunas[]
DecisoesPendentes[]
Confianca
```

### 12.2 Requisitos da resposta

- estrutura validável;
- evidências rastreáveis;
- confiança por bloco;
- linguagem clara;
- sem dados pessoais;
- sem conteúdo final;
- sem promessa de resultado;
- sem ação automática;
- respeito à capacidade;
- respeito às restrições;
- indicação de incerteza.

### 12.3 Confiança

Confiança deve considerar:

- quantidade de posts;
- completude das métricas;
- variedade de formatos;
- comentários válidos;
- contexto manual;
- consistência das evidências.

Não deve ser apresentada como probabilidade matemática se não houver cálculo validado.

### 12.4 Evidência

Cada recomendação e sinal deve informar de onde veio:

- post relacionado;
- métrica;
- comparação;
- comentário anonimizado;
- contexto manual.

Sem evidência suficiente:

- classificar como hipótese;
- reduzir confiança;
- solicitar decisão humana.

---

## 13. Ações de decisão

### 13.1 Ações disponíveis

| Ação | Significado |
|---|---|
| Aceitar | Concordar com o item para consideração humana |
| Aceitar com ajuste | Concordar após registrar alteração |
| Rejeitar | Descartar a proposta |
| Adiar | Manter sem decisão final |
| Pedir aprofundamento | Solicitar nova análise focada |
| Transformar em briefing | Criar briefing proposto a partir de recomendação |

### 13.2 Registro obrigatório

Para cada decisão:

- análise;
- item;
- tipo do item;
- decisão;
- responsável;
- data/hora;
- justificativa opcional;
- ajuste solicitado;
- próxima etapa;
- status anterior e novo.

### 13.3 Regras

- aceitar não publica;
- aceitar não agenda;
- aceitar não envia ao Marketing;
- transformar em briefing não cria conteúdo final;
- rejeitar preserva histórico;
- pedir aprofundamento gera nova execução relacionada, não substitui silenciosamente a anterior;
- decisões devem ser auditáveis.

### 13.4 Status sugeridos

Recomendação:

- pendente;
- aceita;
- aceita com ajuste;
- rejeitada;
- adiada;
- aprofundamento solicitado;
- convertida em briefing.

Briefing:

- proposto;
- em revisão;
- aprovado;
- aprovado com ajuste;
- rejeitado;
- adiado.

---

## 14. Feedback

### 14.1 Objetivo

Registrar utilidade percebida e permitir avaliação futura do Beta.

### 14.2 Campos

- foi útil?;
- foi usado?;
- virou conteúdo?;
- economizou tempo?;
- recomendação foi óbvia?;
- recomendação estava desalinhada?;
- nota de utilidade, 1 a 5;
- nota de clareza, 1 a 5;
- observação;
- data;
- responsável;
- análise relacionada.

### 14.3 MVP

O feedback pode ser:

- manual;
- opcional;
- registrado após a decisão;
- editável pelo responsável;
- sem automação de aprendizado.

### 14.4 Não fazer no MVP

- ajustar modelo automaticamente;
- alterar recomendações históricas;
- treinar com feedback sem consentimento e governança;
- interpretar ausência de feedback como rejeição.

---

## 15. Estratégia conceitual de IA

### 15.1 Entrada

A IA recebe:

- período;
- objetivo;
- capacidade;
- restrições;
- contexto editorial;
- posts e métricas;
- comentários anonimizados;
- definições de saída;
- regras de segurança;
- limites.

### 15.2 Processamento esperado

Conceitualmente:

1. verificar suficiência;
2. resumir período;
3. comparar posts;
4. identificar padrões;
5. analisar comentários válidos;
6. separar evidência de hipótese;
7. considerar objetivo e capacidade;
8. priorizar recomendações;
9. propor briefings;
10. listar lacunas;
11. atribuir confiança qualitativa.

### 15.3 Saída permitida

- resumo;
- sinais;
- análises;
- insights;
- recomendações;
- briefings;
- lacunas;
- decisões pendentes;
- confiança.

### 15.4 Saída proibida

- conteúdo final;
- legenda final;
- carrossel pronto;
- roteiro final;
- arte;
- instrução de publicação;
- promessa de resultado;
- resposta a comentário;
- ação em CRM;
- operação de campanha;
- decisão autônoma.

### 15.5 Regras de comportamento

- declarar incerteza;
- não inventar métrica;
- não inferir causalidade sem evidência;
- respeitar restrições;
- não ultrapassar capacidade;
- não sugerir mais de três recomendações;
- não sugerir mais de dois briefings;
- não revelar dados pessoais;
- não assumir tema heurístico como verdade;
- diferenciar observação, hipótese e recomendação.

### 15.6 Aprofundamento

“Pedir aprofundamento” deve:

- usar um foco definido pelo usuário;
- referenciar a análise anterior;
- manter limites;
- não ampliar automaticamente dados pessoais ou período;
- gerar novo resultado auditável.

---

## 16. Persistência necessária

Nenhuma tabela é criada por este PRD. As entidades abaixo descrevem necessidades funcionais.

### 16.1 Análise editorial

Campos conceituais:

- ID;
- tenant;
- conta;
- usuário;
- período;
- objetivo;
- capacidade;
- restrições;
- contexto;
- status;
- dataset resumido;
- resultado estruturado;
- confiança;
- modelo;
- custo;
- duração;
- timestamps;
- erro.

### 16.2 Recomendação

- análise relacionada;
- título;
- ação;
- justificativa;
- evidências;
- prioridade;
- esforço;
- risco;
- métrica de sucesso;
- confiança;
- status.

### 16.3 Briefing

- análise ou recomendação de origem;
- problema/oportunidade;
- público;
- mensagem;
- formato;
- entregável;
- restrições;
- CTA;
- critério de sucesso;
- evidências;
- status.

### 16.4 Decisão

- item;
- usuário;
- decisão;
- justificativa;
- ajuste;
- próxima etapa;
- timestamp.

### 16.5 Feedback

- análise;
- usuário;
- respostas estruturadas;
- notas;
- observação;
- timestamp.

### 16.6 Execução técnica

- análise;
- status;
- modelo;
- versão da estratégia;
- quantidades;
- tokens;
- custo;
- duração;
- erro sanitizado.

### 16.7 Abordagem MVP

O histórico deve preservar:

- uma execução por análise;
- entrada contextual;
- snapshot estruturado mínimo do dataset;
- saída em JSON estruturado;
- decisões;
- feedback;
- usuário e período.

Não deve persistir desnecessariamente:

- payload bruto de comentários;
- nomes;
- usernames;
- prompts com dados pessoais;
- tokens de integração.

---

## 17. Logs e custo

### 17.1 Campos de execução

- ID da execução;
- análise;
- tenant;
- usuário;
- perfil;
- modelo;
- data/hora;
- posts analisados;
- comentários considerados;
- comentários descartados;
- período;
- tokens de entrada;
- tokens de saída;
- tokens totais;
- custo estimado;
- duração;
- status;
- código do erro;
- tentativa;
- versão da estratégia.

### 17.2 Logs de produto

- análise iniciada;
- análise concluída;
- análise falhou;
- recomendação decidida;
- briefing decidido;
- aprofundamento solicitado;
- feedback registrado.

### 17.3 Dados proibidos em logs

- texto integral de comentário;
- nome;
- username;
- ID pessoal;
- payload bruto;
- token;
- segredo;
- prompt completo com conteúdo pessoal;
- diagnóstico ou dado de saúde.

### 17.4 Controle de custo

O MVP deve prever:

- limite de 30 posts;
- limite de 100 comentários;
- tamanho máximo de legenda/comentário por política futura;
- prevenção de submissão duplicada;
- estimativa de custo por execução;
- total acumulado;
- registro do modelo;
- possibilidade de bloquear execução acima de limite configurado.

### 17.5 Exibição de custo

Para Admin:

- custo estimado por execução;
- consumo acumulado;
- modelo;
- duração.

Para Suporte:

- status e duração;
- custo pode permanecer restrito conforme decisão administrativa.

---

## 18. Segurança e privacidade

### 18.1 Requisitos obrigatórios

- autorização específica para Admin e Suporte;
- isolamento por tenant;
- anonimização antes da IA;
- remoção de payload bruto;
- remoção de nomes e usernames;
- remoção de IDs pessoais;
- logs minimizados;
- revisão humana;
- nenhuma ação externa;
- não usar comentários fora da origem aprovada.

### 18.2 Dados de saúde

Comentários podem conter:

- diagnóstico;
- condição auditiva;
- relato clínico;
- dados de criança ou familiar.

Tratamento:

- sanitizar;
- não apresentar identidade;
- não transformar análise editorial em orientação clínica;
- não reproduzir relato sensível desnecessariamente;
- preferir síntese agregada;
- marcar risco de interpretação.

### 18.3 Texto anonimizado

Substituições conceituais:

```text
[NOME]
[EMAIL]
[TELEFONE]
[LOCAL]
[DADO_DE_SAUDE]
[IDENTIFICADOR]
```

### 18.4 Revisão humana

Deve estar visível:

> Resultado assistido. Recomendações e briefings exigem validação humana antes de qualquer uso.

### 18.5 Separação de finalidade

Comentários usados para:

- identificar linguagem;
- perguntas;
- objeções;
- sinais editoriais.

Não usar nesta fase para:

- atendimento;
- perfil comportamental;
- decisão clínica;
- CRM;
- segmentação individual;
- automação de resposta.

---

## 19. Critérios de aceite

### 19.1 Permissão

- [ ] Apenas Admin e Suporte visualizam a aba.
- [ ] Marketing não visualiza a aba.
- [ ] Acesso direto de Marketing é bloqueado.
- [ ] Dataset e histórico não vazam para perfis bloqueados.

### 19.2 Configuração

- [ ] Usuário seleciona 7 dias, 30 dias ou personalizado.
- [ ] Período padrão é 30 dias.
- [ ] Objetivo é obrigatório.
- [ ] Capacidade é obrigatória.
- [ ] Restrições são opcionais.
- [ ] Aviso Beta é exibido.

### 19.3 Dataset

- [ ] Sistema monta dataset de posts e métricas.
- [ ] Máximo de 30 posts.
- [ ] Inclui comentários válidos quando existirem.
- [ ] Máximo de 100 comentários.
- [ ] Comentários obedecem ao filtro aprovado.
- [ ] Comentários são anonimizados.
- [ ] Payload bruto não é enviado.
- [ ] DMs, Stories e seguidores são excluídos.

### 19.4 Processamento

- [ ] Estados de espera, preparação, análise, conclusão e erro existem.
- [ ] Sem dados não chama a IA.
- [ ] Sem comentários permite análise reduzida.
- [ ] Falha não exibe resposta bruta.
- [ ] Submissão duplicada é evitada.

### 19.5 Resultado

- [ ] Resultado é estruturado em blocos.
- [ ] Resumo apresenta período, objetivo e quantidades.
- [ ] Existem entre 5 e 10 sinais quando suportados.
- [ ] Recomendações são limitadas a 3.
- [ ] Briefings são limitados a 2.
- [ ] Evidências são rastreáveis.
- [ ] Confiança é exibida.
- [ ] Lacunas são exibidas.
- [ ] Comentários ausentes geram mensagem adequada.

### 19.6 Decisão e feedback

- [ ] Usuário registra decisão.
- [ ] Aceitar com ajuste registra o ajuste.
- [ ] Rejeição preserva histórico.
- [ ] Aprofundamento referencia análise anterior.
- [ ] Transformar em briefing não executa produção.
- [ ] Feedback manual pode ser registrado ou está explicitamente diferido.

### 19.7 Segurança

- [ ] Nenhum dado pessoal de comentário chega à IA.
- [ ] Logs não contêm dados sensíveis.
- [ ] Dados de saúde são sanitizados.
- [ ] Revisão humana é informada.
- [ ] Nenhuma publicação automática ocorre.
- [ ] Nenhum envio automático ao Marketing ocorre.

---

## 20. Riscos e mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Recomendações genéricas | Médio/Alto | Média | Exigir objetivo, evidência e contexto |
| Confiança excessiva | Alto | Média | Confiança qualitativa e lacunas explícitas |
| Dados insuficientes | Alto | Média | Validar antes da IA e ampliar período |
| Comentários ruins | Médio | Alta | Filtro, sanitização e exclusão de ruído |
| Custo alto | Médio | Média | Limites, logs e controle por execução |
| Liberação ao Marketing | Alto | Média | Proteção em UI, servidor e persistência |
| Confusão com gerador | Alto | Alta | Microcopy e saídas proibidas |
| Frustração por não criar conteúdo final | Médio | Média/Alta | Explicar valor e entregáveis |
| Uso sem aprovação da Juliana | Alto | Média | Decisão humana e status pendente |
| Dados pessoais expostos | Crítico | Média | Anonimização antes da IA |
| Dados de saúde expostos | Crítico | Média | Sanitização e síntese agregada |
| Conflito com Marketing | Médio/Alto | Média | Não enviar automaticamente; registrar aprovação |
| Dados desatualizados | Alto | Média | Mostrar última atualização e confiança |
| Falsa causalidade | Alto | Média | Linguagem de hipótese e evidência |
| Excesso de escopo | Alto | Alta | Limites rígidos do MVP |
| Tema inferido incorretamente | Médio | Média | Marcar como inferido e pedir validação |
| Formato pouco representado | Médio | Média | Declarar amostra insuficiente |
| Comentário sem post | Alto | Média | Match exato obrigatório |
| Falha do modelo | Médio | Média | Validar estrutura e permitir retry |
| Resposta não estruturada | Médio | Média | Rejeitar resultado inválido |
| Duplicidade de análise | Baixo/Médio | Média | Bloquear duplo clique e usar execução única |
| Histórico com dado pessoal | Crítico | Média | Persistir somente dataset minimizado |
| Aprofundamento aumenta custo | Médio | Média | Limites e confirmação do usuário |
| Briefing interpretado como aprovação | Alto | Média | Status “proposto” e aviso explícito |

---

## 21. Fora do MVP

- geração de carrossel final;
- geração de roteiro final;
- legenda final;
- arte;
- publicação;
- agendamento;
- integração com Studio;
- integração com Automation;
- envio ao Marketing;
- tarefas automáticas;
- CRM;
- WhatsApp;
- e-mail;
- Telegram;
- análise de DMs;
- análise de Stories;
- novos seguidores individuais;
- atribuição de receita;
- previsão de vendas;
- benchmarking;
- análise de concorrentes;
- multicliente;
- autonomia decisória;
- treinamento automático;
- resposta a comentários;
- operação de Ads;
- calendário editorial automático;
- aprovação automática;
- transcrição automática;
- memória individual de audiência.

---

## 22. Dependências para implementação

### 22.1 Dados

- posts e métricas atuais;
- comentários públicos já armazenados;
- regra de reconciliação;
- anonimização;
- última atualização;
- contexto manual.

### 22.2 Produto

- decisão sobre opções de objetivo;
- confirmação das capacidades;
- microcopy Beta;
- definição de confiança;
- definição do feedback mínimo;
- decisão sobre custo visível.

### 22.3 Autorização

- perfil do usuário disponível no contexto;
- bloqueio específico da subfuncionalidade;
- proteção do histórico;
- isolamento por tenant.

### 22.4 IA

- provedor e modelo;
- formato estruturado;
- limites de entrada e saída;
- estimativa de custo;
- tratamento de erro;
- versão da estratégia;
- política de retenção.

### 22.5 Persistência

- histórico de análises;
- recomendações;
- briefings;
- decisões;
- feedback;
- execução/custo.

### 22.6 Observabilidade

- status;
- duração;
- erro;
- volume;
- modelo;
- custo;
- usuário;
- eventos de decisão.

---

## 23. Recomendações de implementação futura

Esta seção define sequência de produto, sem implementar.

### Fase 1 — Fundação do MVP

- autorização específica;
- configuração da análise;
- seleção e anonimização do dataset;
- processamento estruturado;
- resultado em blocos;
- estados de erro;
- persistência da análise;
- logs básicos.

### Fase 2 — Decisão

- ações sobre recomendações;
- briefings propostos;
- histórico;
- justificativas;
- aprofundamento relacionado.

### Fase 3 — Feedback

- notas;
- utilidade;
- uso;
- resultado percebido;
- avaliação de clareza.

### Fase posterior ao Beta

Somente após validação:

- briefings aprovados para Marketing;
- maior cobertura de comentários;
- mídia e transcrição;
- histórico comparativo;
- taxonomia validada;
- automações não executoras;
- outros tenants.

---

## 24. Métricas de sucesso do Beta

### 24.1 Uso

- análises geradas;
- usuários ativos;
- taxa de conclusão;
- recorrência de uso.

### 24.2 Utilidade

- nota média de utilidade;
- nota média de clareza;
- recomendações aceitas;
- recomendações ajustadas;
- briefings aprovados;
- análises consideradas óbvias ou desalinhadas.

### 24.3 Eficiência

- duração média;
- tempo percebido economizado;
- custo médio;
- taxa de erro;
- taxa de dataset insuficiente.

### 24.4 Segurança

- tentativas bloqueadas;
- incidentes de dados pessoais;
- logs com conteúdo indevido;
- execuções sem autorização.

### 24.5 Guardrails

Não usar como métrica de sucesso do Beta:

- aumento de vendas atribuído ao agente;
- crescimento garantido;
- número de conteúdos publicados;
- ROAS;
- autonomia;
- substituição do time.

---

## 25. Decisões de produto consolidadas

1. Nome interno: **Inteligência Editorial (Beta)**.
2. Local: quarta aba do módulo Instagram.
3. Rota base: `/instagram`.
4. Acesso: Admin e Suporte.
5. Marketing bloqueado.
6. Período padrão: 30 dias.
7. Até 30 posts.
8. Até 100 comentários públicos válidos.
9. Objetivo e capacidade obrigatórios.
10. Restrições opcionais.
11. Até três recomendações.
12. Até dois briefings.
13. Comentários são complementares.
14. Posts e métricas são a base principal.
15. Anonimização ocorre antes da IA.
16. Nenhum payload bruto é enviado.
17. Nenhuma ação automática.
18. Toda recomendação exige decisão humana.
19. Briefing é proposta, não conteúdo final.
20. Histórico, decisão, custo e feedback devem ser rastreáveis.

---

## 26. Próximo passo sugerido

Após aprovação deste PRD:

1. transformar os critérios de aceite em plano técnico;
2. definir entidades de persistência;
3. escolher provedor/modelo e limites de custo;
4. especificar o contrato estruturado de entrada e saída;
5. desenhar a interface com base nas telas descritas;
6. implementar primeiro o caminho completo mínimo:

```text
permissão
→ configuração
→ dataset
→ anonimização
→ análise
→ resultado
→ decisão
→ histórico
```

O primeiro teste deve permanecer:

- restrito a Admin/Suporte;
- assistido;
- sem publicação;
- sem envio ao Marketing;
- com revisão obrigatória.

---

## 27. Arquivos criados ou alterados

- Criado: `PRD_001_INTELIGENCIA_EDITORIAL.md`

Nenhum código, migration, tabela, frontend, backend, workflow n8n, Edge Function, API externa, permissão ou dado foi alterado.

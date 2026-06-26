# Reconciliação de Comentários para o Editorial Agent

**Projeto auditado:** Plataforma Juliana  
**Iniciativa:** NORWYN Editorial Agent — Labs Intelligence  
**Data:** 24/06/2026  
**Objeto exclusivo:** vínculo entre comentários, posts e métricas  
**Natureza:** validação documental e técnica, sem alterações no sistema

---

## 1. Resumo executivo

A estrutura atual possui um caminho tecnicamente confiável para relacionar comentários públicos aos respectivos posts, desde que sejam usados apenas registros provenientes do coletor dedicado de comentários.

Nesse coletor:

- o post é obtido diretamente da API de mídia;
- os comentários são buscados no endpoint daquele post;
- cada comentário recebe o mesmo identificador do post em `post_id` e `media_id`;
- o permalink do post também é armazenado;
- o identificador próprio do comentário é gravado em `external_id`;
- a origem é identificada como `n8n_instagram_comments_collector`;
- o tipo é identificado como `post_comment`.

Esse encadeamento fornece uma relação de alta confiança quando:

1. `source = 'post_comment'`;
2. `origem = 'n8n_instagram_comments_collector'`;
3. `instagram_interactions.post_id` coincide exatamente com `instagram_posts.post_id`;
4. tenant e conta também coincidem;
5. o texto do comentário não está vazio.

Entretanto, a auditoria não encontrou dump local da população atual de `instagram_interactions`. Como APIs externas e banco remoto não poderiam ser consultados, não foi possível medir empiricamente:

- taxa real de reconciliação;
- quantidade de órfãos;
- textos vazios;
- spam;
- emojis isolados;
- duplicidade efetiva;
- distribuição entre perguntas, objeções e elogios.

Foi possível auditar vinte posts recentes pela fonte local de posts e métricas. Eles somam 65 comentários contabilizados, mas a existência das 65 linhas textuais correspondentes não pode ser comprovada localmente.

### Decisão

**SIM COM RESTRIÇÕES.**

Os comentários podem entrar no primeiro MVP somente como subconjunto controlado:

- comentários públicos;
- coletados pelo workflow dedicado;
- relacionados por igualdade exata de `post_id`;
- com texto não vazio;
- identificador de comentário presente;
- restritos a período recente;
- anonimizados antes do uso editorial.

DMs, Stories, seguidores, registros genéricos e comentários sem vínculo comprovado devem ficar fora do MVP inicial.

---

## 2. Evidências examinadas

- `supabase/migrations/0002_instagram_analytics.sql`
- `supabase/migrations/0003_instagram_n8n_ingest_view.sql`
- `supabase/migrations/0028_instagram_directs_interactions.sql`
- `supabase/migrations/0030_ocorrencias_module.sql`
- `modules/instagram/Instagram_Directs_Comments_Collector_v1.json`
- `modules/instagram/Instagram_Directs_Interactions_v1.json`
- `modules/instagram/Instagram_Directs_Messages_Collector_v1.json`
- `modules/instagram/Instagram_Directs_Webhook_v1.json`
- `modules/instagram/services/instagram-server.ts`
- `modules/instagram/types/index.ts`
- `Insight.xlsx`
- `EDITORIAL_AGENT_DATA_AUDIT.md`

### Limitação de evidência

Não foram examinados:

- banco Supabase remoto;
- API Meta ao vivo;
- execuções atuais do n8n;
- export real da tabela de interações;
- dados pessoais dos autores.

Assim, a validação é:

- **estruturalmente forte** para o coletor dedicado;
- **empiricamente incompleta** para o conjunto de comentários hoje armazenado.

---

## 3. Parte 1 — Inventário dos comentários

### 3.1 Campos de `instagram_interactions`

| Campo | Tipo | Finalidade | Obrigatório | Confiabilidade | Observações |
|---|---|---|---|---|---|
| `id` | `uuid` | Chave interna | Sim | Alta | Gerada pelo banco |
| `tenant_id` | `uuid` | Segregação da organização | Sim | Alta | FK para `tenants` |
| `account_id` | `uuid` | Conta Instagram | Sim | Alta | FK para `instagram_accounts` |
| `source` | `text` | Tipo de interação | Sim | Média/Alta | Restrito por check após migration 0030 |
| `marketing_type` | `text` | Classificação operacional | Sim | Média | Default `interacao_marketing` |
| `external_id` | `text` | ID externo do comentário/evento | Não | Alta quando vindo da Meta | No coletor dedicado recebe `comment.id` |
| `dedupe_key` | `text` | Chave de deduplicação | Sim | Alta com `external_id` | Fallback é hash de conteúdo e data |
| `profile_username` | `text` | Perfil autor | Não | Média | Dado pessoal; pode receber ID como fallback |
| `profile_name` | `text` | Nome do autor | Não | Média/Baixa | Nem todo evento retorna nome |
| `message_text` | `text` | Texto da interação | Não | Alta quando presente | Pode ser vazio, anexo ou emoji |
| `media_id` | `text` | ID da mídia/conversa | Não | Alta para coletor dedicado | Em DMs pode ser ID da conversa |
| `post_id` | `text` | ID externo do post | Não | Alta no coletor dedicado | Não possui FK |
| `post_permalink` | `text` | Link do post | Não | Média/Alta | Campo auxiliar |
| `interaction_at` | `timestamptz` | Data e hora | Sim | Média/Alta | Fallback pode usar horário da coleta |
| `status` | `text` | Novo, analisado, respondido ou arquivado | Sim | Média | Significado varia conforme origem |
| `potential` | `text` | Potencial operacional | Sim | Baixa/Média | Heurística por palavras-chave |
| `product_topic` | `text` | Tema heurístico | Não | Baixa/Média | Não é taxonomia editorial canônica |
| `next_action` | `text` | Ação sugerida | Não | Baixa/Média | Gerada por regras |
| `origem` | `text` | Workflow de origem | Sim | Alta | Essencial para filtrar proveniência |
| `raw_payload` | `jsonb` | Evento bruto | Sim | Alta como evidência | Pode conter dados pessoais |
| `imported_at` | `timestamptz` | Momento da importação | Sim | Alta | Não é a data da interação |
| `created_at` | `timestamptz` | Criação interna | Sim | Alta | Controle técnico |
| `updated_at` | `timestamptz` | Atualização interna | Sim | Alta | Controle técnico |

### 3.2 Tipos de interação

Após a migration `0030_ocorrencias_module.sql`, os valores aceitos em `source` são:

| Tipo | Representa | Identificação | Confiabilidade |
|---|---|---|---|
| `post_comment` | Comentário público em post | Coletor dedicado ou evento `changes` | Alta no coletor dedicado; média no genérico |
| `direct_message` | Mensagem direta | Normalização de `direct`, `dm`, `message` ou `inbox` | Alta quando vem dos workflows de mensagens |
| `story_reply` | Resposta ou interação de Story | `story`, `stories`, `story_reply` | Média |
| `new_follower` | Novo seguidor | Evento de follow | Média/Alta |

### 3.3 Campos que representam comentários públicos

Para `source = 'post_comment'`:

- `external_id`: ID do comentário;
- `message_text`: texto;
- `profile_username`: autor;
- `profile_name`: nome disponível;
- `post_id`: post comentado;
- `media_id`: também recebe o ID do post no coletor dedicado;
- `post_permalink`: link do post;
- `interaction_at`: data do comentário;
- `raw_payload.comment`: evento original;
- `raw_payload.post`: contexto do post.

### 3.4 Campos que representam DMs

Para `source = 'direct_message'`:

- `external_id`: ID da mensagem;
- `message_text`: mensagem ou marcador de anexo;
- `media_id`: pode representar conversa ou thread;
- `post_id`: normalmente nulo;
- `post_permalink`: normalmente nulo;
- `status`: pode refletir se houve resposta posterior.

DMs não devem ser interpretadas como comentários de post.

### 3.5 Campos que representam Stories

Para `source = 'story_reply'`:

- `message_text`: resposta ou postback;
- `media_id`: pode conter mídia ou referência;
- `post_permalink`: pode conter referência;
- `post_id`: não é garantido;
- `external_id`: ID da mensagem/evento.

Não há garantia de correspondência com `instagram_posts`.

### 3.6 Campos que representam seguidores

Para `source = 'new_follower'`:

- `profile_username` e `profile_name`: identidade disponível;
- `external_id`: ID do evento/perfil;
- `message_text`: pode ser texto artificial como “Novo seguidor”;
- `post_id`: não aplicável.

Seguidores devem ser excluídos da análise de comentários.

### 3.7 Risco de classificação da origem

O normalizador genérico usa `story_reply` como fallback para origens desconhecidas. Portanto, um registro com origem malformada pode ser classificado como Story mesmo sem evidência suficiente.

O coletor dedicado de comentários não sofre desse fallback porque define explicitamente `source = 'post_comment'`.

---

## 4. Parte 2 — Mapeamento com posts

### 4.1 Alternativas de relacionamento

| Alternativa | Existe? | Confiabilidade | Limitações | Risco | Recomendação |
|---|---|---|---|---|---|
| `interactions.post_id = posts.post_id` | Sim | Alta no coletor dedicado | Sem FK; campo opcional | ID ausente ou origem genérica | Regra principal |
| `interactions.media_id = posts.post_id` | Sim | Alta no coletor dedicado | Em DMs, `media_id` significa conversa | Mistura entre tipos | Usar somente em `post_comment` como validação |
| `post_permalink = permalink` | Sim | Média/Alta | Pode estar vazio, variar em formato ou deixar de resolver | Match textual | Fallback exato |
| `external_id` | Sim | Inadequada para post | É ID do comentário, não do post | Falso vínculo | Nunca usar como chave do post |
| `raw_payload.post.post_id` | Sim no coletor dedicado | Alta | Depende de payload preservado | Campo interno do JSON pode variar | Evidência auxiliar |
| `raw_payload.comment` | Sim no coletor dedicado | Não relaciona sozinho | Representa comentário | Confusão de IDs | Usar para auditoria |
| Data + autor + texto | Tecnicamente possível | Baixa | Colisões e alterações | Falso positivo | Não usar para vínculo |
| Data do comentário próxima ao post | Possível | Muito baixa | Comentários podem ocorrer meses depois | Falso positivo elevado | Não usar |

### 4.2 Regra principal recomendada

A regra tecnicamente mais segura é:

```text
mesmo tenant
E mesma conta
E source = post_comment
E origem = n8n_instagram_comments_collector
E interactions.post_id = posts.post_id
```

Validações auxiliares:

```text
interactions.media_id = posts.post_id
E, quando presente,
interactions.post_permalink = posts.permalink
```

O permalink não deve substituir um `post_id` válido. Deve servir como confirmação ou fallback exato.

### 4.3 Por que o coletor dedicado é confiável

O workflow:

1. busca uma lista de posts;
2. envia individualmente o ID de cada post ao endpoint de comentários;
3. recebe os comentários daquele endpoint;
4. injeta no resultado o ID e o permalink do post que originou a chamada.

O comentário não precisa “adivinhar” o post. O contexto do post já existe antes da chamada.

### 4.4 Por que o fluxo genérico é menos confiável

No fluxo genérico:

- `post_id` pode vir de `post_id` ou `media_id`;
- `media_id` pode ter outros significados;
- origem desconhecida pode virar `story_reply`;
- diferentes formatos de webhook são interpretados pela mesma função;
- nem todos os payloads carregam permalink.

Por isso, registros de `origem = 'n8n_instagram_directs'` não devem entrar automaticamente no primeiro conjunto editorial.

### 4.5 Chaves de deduplicação

No coletor dedicado:

- `external_id` recebe `comment.id`;
- `dedupe_key` usa `external_id` quando presente;
- existe unicidade por `tenant_id + dedupe_key`;
- reprocessar o mesmo comentário atualiza a linha existente.

Confiabilidade: **alta**, desde que o ID externo esteja presente.

Quando `external_id` não existe, a chave passa a ser um hash de:

- origem;
- perfil;
- nome;
- texto;
- timestamp.

Esse fallback é menos confiável porque alterações de timestamp, nome ou texto podem gerar outra linha.

---

## 5. Parte 3 — Amostragem

### 5.1 Método possível

Como não há export local da tabela de interações, foi analisada a contagem de comentários registrada nas métricas dos vinte posts mais recentes da fonte `Insight.xlsx`.

Critério:

- deduplicação por `post_id`;
- ordenação decrescente por data;
- seleção dos vinte posts mais recentes.

Período da amostra:

- 30/04/2026 a 20/05/2026.

### 5.2 Resultado da amostra de posts

| Indicador | Resultado |
|---|---:|
| Posts analisados | 20 |
| Posts com comentários contabilizados | 12 |
| Posts sem comentários contabilizados | 8 |
| Total de comentários contabilizados | 65 |
| Média por post | 3,25 |
| Mínimo por post | 0 |
| Máximo por post | 12 |
| Posts com legenda | 20 |

### 5.3 O que a amostra comprova

- existe atividade de comentários em parte relevante dos posts;
- o volume é operacionalmente pequeno para um primeiro ciclo;
- um conjunto de até 100 comentários seria suficiente para representar os vinte posts recentes;
- o valor máximo observado está abaixo do limite de 100 comentários solicitado por post no workflow.

### 5.4 O que a amostra não comprova

As métricas registram contagem, não as linhas textuais. Portanto, não foi possível medir:

| Verificação | Resultado |
|---|---|
| Comentários vazios | Não mensurável com os arquivos locais |
| Comentários repetidos | Não mensurável |
| Comentários não relacionados | Não mensurável |
| Comentários órfãos | Não mensurável |
| Comentários sem identificação de post | Não mensurável |
| Comentários sem texto | Não mensurável |
| Comentários com texto útil | Não mensurável |
| Distribuição por tipo de interação no banco | Não mensurável |

### 5.5 Relação entre contagem e linhas textuais

Os 65 comentários contabilizados não garantem 65 registros em `instagram_interactions`.

Diferenças podem ocorrer por:

- comentários anteriores à implantação do coletor;
- coleta limitada aos 50 posts recentes;
- ausência de paginação;
- comentário removido;
- respostas aninhadas;
- falha de execução;
- permissão da API;
- atraso entre métricas e comentários;
- reprocessamento incompleto.

### 5.6 Limites do coletor

O workflow exportado:

- busca até 50 posts;
- pede até 100 comentários por post;
- não apresenta paginação de posts ou comentários;
- busca campos de comentário, incluindo ID, texto, timestamp, username, autor e curtidas;
- roda, no desenho exportado, a cada hora.

Consequências:

- posts fora dos 50 mais recentes podem não ser cobertos;
- posts com mais de 100 comentários podem ser truncados;
- respostas aninhadas não são explicitamente solicitadas;
- cobertura histórica completa não pode ser presumida.

---

## 6. Parte 4 — Qualidade dos comentários

### 6.1 Avaliação possível

Sem um dump textual, a frequência real das categorias não pode ser estimada com rigor. A tabela abaixo informa:

- se o dado pode existir;
- sua utilidade;
- se a frequência é mensurável nesta auditoria.

| Categoria | Frequência aproximada | Utilidade para o agente | Evidência |
|---|---|---|---|
| Texto útil | Não mensurável | Alta | `message_text` existe |
| Texto vazio | Não mensurável | Nenhuma | Campo é opcional |
| Emoji apenas | Não mensurável | Baixa | Aceito como texto |
| Spam | Não mensurável | Nenhuma/Baixa | Sem classificador específico |
| Pergunta | Não mensurável | Alta | Pode ser inferida do texto |
| Objeção | Não mensurável | Alta | Regras reconhecem risco/preço |
| Elogio | Não mensurável | Média | Regras possuem palavras de elogio |
| Interesse comercial | Não mensurável | Alta | Regras de preço, curso e consulta |
| Comentário técnico | Não mensurável | Alta | Regras reconhecem termos de audiologia |
| Comentário irrelevante | Não mensurável | Baixa | Pode cair em tema genérico |

### 6.2 Capacidade estrutural de classificação

O workflow já contém regras para:

- risco e reclamação;
- preço e inscrição;
- clínica;
- curso e formação;
- palestra e evento;
- dúvida técnica;
- Jiu Jitsu;
- família;
- engajamento por CTA;
- elogio/engajamento geral;
- tema indefinido.

Isso comprova capacidade operacional de separar alguns padrões, mas não comprova a precisão das classificações.

### 6.3 Comentários de CTA

O coletor compara texto do comentário com a legenda do post e possui palavras específicas de CTA.

Valor:

- ajuda a separar resposta de campanha de uma pergunta espontânea;
- reduz a interpretação comercial indevida de palavras curtas.

Risco:

- listas fixas envelhecem;
- palavras podem ter significado fora do CTA;
- ausência do contexto completo do criativo limita a interpretação.

### 6.4 Utilidade editorial esperada

Comentários com maior valor:

1. perguntas;
2. objeções;
3. dúvidas técnicas;
4. interesse comercial;
5. relatos ou reclamações;
6. respostas elaboradas ao conteúdo.

Valor intermediário:

- elogios com justificativa;
- comentários de comunidade;
- respostas familiares/pessoais;
- comentários sobre exemplos do post.

Baixo valor:

- emoji isolado;
- palavra de CTA sem contexto adicional;
- marcação de outro perfil;
- spam;
- repetição;
- texto vazio.

---

## 7. Parte 5 — Confiabilidade

### 7.1 Se o agente receber 100 registros da tabela sem filtro

Não existe evidência local suficiente para atribuir percentuais defensáveis às faixas:

- alta confiança;
- média confiança;
- baixa confiança;
- inutilizáveis.

Qualquer número seria inventado porque o banco real não foi amostrado.

### 7.2 Se o agente receber 100 registros após o filtro estrito

O filtro estrito exige:

- `source = 'post_comment'`;
- origem do coletor dedicado;
- ID externo do comentário;
- `post_id` preenchido;
- correspondência exata com um post;
- mesmo tenant e conta;
- texto não vazio.

Para esse conjunto:

| Dimensão | Confiança esperada |
|---|---|
| Ser comentário público | Alta |
| Pertencer ao post indicado | Alta |
| Não ser duplicado pelo mesmo ID | Alta |
| Data estar correta | Média/Alta |
| Autor estar corretamente identificado | Média |
| Texto ser semanticamente útil | Desconhecida |
| Classificação temática estar correta | Baixa/Média |
| Representar todo o histórico | Baixa |

### 7.3 Estimativa tecnicamente permitida

Não é possível responder “quantos de 100 são úteis” sem observar os textos reais.

É possível afirmar:

- registros que passam pelo filtro estrito têm alta confiança relacional;
- a utilidade semântica ainda precisa de amostra;
- a confiança de vínculo e a qualidade editorial são dimensões diferentes.

### 7.4 Conclusão de confiabilidade

- **vínculo técnico:** alto para o coletor dedicado;
- **completude histórica:** baixa/desconhecida;
- **utilidade do texto:** desconhecida até amostragem;
- **classificação automática atual:** média ou baixa, dependendo da categoria.

---

## 8. Parte 6 — Riscos

| Risco | Impacto | Probabilidade | Mitigação documental para o MVP |
|---|---|---|---|
| Comentário sem post | Alto | Média | Excluir registros sem match exato |
| Comentário duplicado | Médio | Baixa com ID; média sem ID | Exigir `external_id` e dedupe |
| Comentário apagado | Médio | Média | Tratar base como fotografia histórica, não estado atual garantido |
| Mudança/indisponibilidade do permalink | Baixo/Médio | Baixa/Média | Usar `post_id` como principal |
| IDs inconsistentes | Alto | Média em fluxos genéricos | Aceitar apenas origem dedicada |
| Mistura entre DMs e comentários | Alto | Média sem filtro | Exigir `source = post_comment` |
| Limite de 500 registros no serviço | Alto para histórico | Alta | Restringir período e conjunto |
| Payload incompleto | Médio | Média | Exigir campos mínimos |
| Falha de sincronização | Alto | Média | Comparar contagem esperada e coletada |
| Comentários históricos ausentes | Alto | Alta | Não declarar cobertura histórica |
| Limite de 50 posts | Médio/Alto | Alta | Primeiro ciclo restrito ao período recente |
| Limite de 100 comentários/post | Baixo no exemplo atual | Baixa no volume observado | Excluir alegação de cobertura em posts virais |
| Ausência de paginação | Alto em escala | Alta | Registrar limitação da amostra |
| Respostas aninhadas ausentes | Médio | Média | Analisar comentários de primeiro nível |
| Texto vazio ou emoji | Baixo | Provável | Excluir do corpus textual principal |
| Spam | Médio | Desconhecida | Remover da amostra aprovada |
| Tema heurístico incorreto | Médio/Alto | Média | Não usar como verdade sem revisão |
| Perfil identificado | Alto de privacidade | Alta | Anonimizar antes do agente |
| Payload bruto com dados pessoais | Alto | Alta | Não enviar payload bruto ao agente |
| Retenção sem regra editorial | Médio/Alto | Desconhecida | Limitar o ciclo ao necessário |
| LGPD/finalidade | Alto | Média | Usar dados minimizados e finalidade analítica definida |

### 8.1 Comentário apagado

O fluxo faz upsert dos comentários encontrados, mas não há reconciliação de exclusões. Um comentário removido do Instagram pode permanecer no banco.

### 8.2 Sincronização

Métricas e comentários vêm de chamadas diferentes. A contagem de comentários pode estar mais atualizada que as linhas textuais, ou o inverso.

### 8.3 Anonimização e LGPD

Para análise editorial, não é necessário enviar ao agente:

- username;
- nome;
- ID do perfil;
- payload bruto.

O valor analítico está no texto, tipo de intenção e post relacionado. Identidade só deve permanecer quando houver finalidade operacional separada.

---

## 9. Parte 7 — Menor estratégia utilizável

### 9.1 Conjunto mínimo

- últimos 30 dias disponíveis;
- no máximo 100 comentários;
- apenas `source = 'post_comment'`;
- apenas origem do coletor dedicado;
- apenas registros com `external_id`;
- apenas registros com `post_id`;
- somente matches exatos com `instagram_posts.post_id`;
- mesmo tenant e conta;
- apenas texto não vazio;
- autores anonimizados;
- posts com legenda e métricas disponíveis.

### 9.2 Excluir

- DMs;
- Stories;
- seguidores;
- anexos sem texto;
- registros sem post;
- registros órfãos;
- origem genérica;
- duplicados;
- comentários apagados conhecidos;
- spam;
- texto vazio;
- payload bruto;
- identidade do autor;
- comentários acima da janela necessária.

### 9.3 Unidade de análise

Cada unidade deve conter apenas:

- ID interno ou pseudônimo do post;
- data;
- formato;
- legenda;
- métricas;
- texto anonimizado dos comentários válidos;
- quantidade total registrada nas métricas;
- quantidade de comentários textuais efetivamente reconciliados.

### 9.4 Limitação assumida

Esse conjunto não representa:

- todo o histórico;
- todas as respostas;
- todas as conversas;
- comentários apagados;
- replies;
- DMs;
- audiência completa.

Representa uma amostra editorial recente e controlada.

---

## 10. Parte 8 — Decisão para o MVP

### Decisão

**SIM COM RESTRIÇÕES.**

### Restrições exatas

1. Usar somente comentários públicos.
2. Exigir `source = 'post_comment'`.
3. Exigir `origem = 'n8n_instagram_comments_collector'`.
4. Exigir `external_id` do comentário.
5. Exigir `post_id` preenchido.
6. Relacionar por igualdade exata com `instagram_posts.post_id`.
7. Validar tenant e conta.
8. Usar `media_id` e permalink somente como confirmação.
9. Exigir texto não vazio.
10. Remover emoji isolado, spam e registros irrelevantes do corpus principal.
11. Anonimizar nome, username e IDs pessoais.
12. Não enviar `raw_payload` ao agente.
13. Limitar o primeiro ciclo aos últimos 30 dias.
14. Limitar o corpus a até 100 comentários.
15. Não declarar cobertura histórica completa.
16. Não usar tema e potencial atuais como verdade sem revisão.
17. Excluir DMs, Stories e seguidores.
18. Comparar a quantidade textual reconciliada com a contagem de comentários das métricas.

### Motivo

O vínculo criado pelo coletor dedicado é tecnicamente consistente. O risco não está na regra de vínculo desse fluxo, mas na falta de evidência sobre completude e qualidade semântica do corpus atualmente armazenado.

---

## 11. Parte 9 — Pipeline mínimo

Descrição conceitual, sem implementação:

```text
Posts válidos
    ↓
Comentários públicos do coletor dedicado
    ↓
Filtro de origem e campos mínimos
    ↓
Reconciliação por post_id exato
    ↓
Verificação auxiliar por media_id/permalink
    ↓
Deduplicação por external_id
    ↓
Remoção de vazios, spam e ruído
    ↓
Anonimização
    ↓
Separação entre texto útil e interação superficial
    ↓
Classificação assistida
    ↓
Editorial Agent
    ↓
Revisão humana
```

### Entrada mínima

- post;
- legenda;
- formato;
- data;
- métricas;
- comentários reconciliados e anonimizados.

### Saída compatível

- perguntas recorrentes;
- objeções;
- sinais de interesse;
- linguagem usada pela audiência;
- respostas a CTAs;
- dúvidas técnicas;
- lacunas editoriais;
- recomendações e briefings propostos.

---

## 12. Parte 10 — Critérios de aprovação

### 1. O vínculo comentário ↔ post é confiável?

**Sim, para o coletor dedicado e com match exato por `post_id`.**  
Não é confiável de forma geral para todos os registros da tabela.

### 2. Qual regra deve ser utilizada?

Mesma conta e tenant, `source = post_comment`, origem dedicada e igualdade exata entre `instagram_interactions.post_id` e `instagram_posts.post_id`.

### 3. Os comentários agregam valor real?

**Potencialmente sim.** Eles permitem identificar perguntas, objeções, vocabulário, interesse e resposta a CTAs. A frequência real dessas categorias não foi comprovada nesta auditoria.

### 4. É melhor deixar comentários para V2?

Não é necessário deixar todos para V2. Um subconjunto estrito pode entrar no MVP. Cobertura histórica, DMs, replies e automação ampla devem esperar.

### 5. O MVP deve começar apenas com posts e métricas?

Posts e métricas devem formar o núcleo. Comentários devem entrar como camada complementar controlada, não como dependência de toda conclusão.

### 6. Vale o custo adicional?

**Sim, se limitado ao subconjunto estrito.** O custo aumenta muito caso se tente cobrir todo o histórico, múltiplas origens e conversas completas.

### 7. Existe risco elevado de falsa interpretação?

Sim, quando:

- comentários não estão vinculados;
- palavras de CTA são tratadas como interesse espontâneo;
- emoji é interpretado como argumento;
- tema heurístico é aceito sem contexto;
- DMs e comentários são misturados.

Com as restrições definidas, o risco cai para nível administrável em um ciclo assistido.

### 8. A Juliana perceberia valor usando comentários?

Provavelmente sim nos comentários que revelam perguntas, objeções, dúvidas técnicas e linguagem da audiência. Elogios genéricos e emojis agregam pouco valor editorial.

### 9. A complexidade adicional compensa?

Compensa para até 100 comentários recentes e relacionados. Não há evidência de que compense buscar cobertura histórica completa no primeiro ciclo.

### 10. Qual é a recomendação técnica final?

Usar comentários no MVP como camada complementar, com filtro estrito por origem, relação exata, texto válido e anonimização. Não permitir que conclusões dependam exclusivamente dessa camada até a primeira amostra real ser validada.

---

## 13. Análise crítica obrigatória

### O que foi comprovado

- existe tabela com campos adequados;
- existe diferenciação de origem;
- existe coletor dedicado;
- o coletor injeta o ID correto do post;
- existe deduplicação por ID do comentário;
- vinte posts recentes possuem 65 comentários contabilizados;
- o volume observado cabe em um teste pequeno.

### O que não foi comprovado

- que as 65 linhas textuais estão no banco;
- que os comentários atuais são completos;
- que não existem órfãos;
- que não existem vazios, spam ou emojis;
- que as classificações são precisas;
- que o histórico foi coletado;
- que o workflow remoto está ativo e saudável.

### Julgamento independente

Não há evidência suficiente para aprovar indiscriminadamente toda a tabela `instagram_interactions` como fonte do agente.

Há evidência suficiente para aprovar condicionalmente o subconjunto produzido pelo coletor dedicado de comentários, porque o vínculo com o post é definido antes da coleta e preservado em três campos.

A decisão correta não é “usar todos” nem “deixar tudo para V2”. É usar um corpus recente, pequeno, rastreável e anonimizado, mantendo posts e métricas como fonte principal.

---

## 14. O que pode esperar para V2

- DMs completas;
- Stories;
- novos seguidores;
- replies aninhados;
- histórico além da janela recente;
- posts além do limite do coletor;
- comentários acima de 100 por post;
- reconciliação de exclusões;
- status confiável de resposta pública;
- curtidas da especialista;
- classificação automática sem revisão;
- identificação de pessoas;
- memória longitudinal por usuário;
- associação com CRM;
- uso de payload bruto;
- cobertura e paginação completas.

---

## 15. Próximo passo recomendado

Validar uma única amostra no ambiente real, sem nova coleta:

1. selecionar os comentários públicos já existentes dos últimos 30 dias;
2. aplicar as restrições deste documento;
3. limitar a 100 registros;
4. verificar taxa de match exato;
5. contabilizar vazios, emojis, spam e textos úteis;
6. anonimizar;
7. revisar manualmente uma amostra;
8. decidir se o corpus possui qualidade semântica suficiente para o ciclo.

Essa verificação é o único elemento empírico ainda ausente para transformar a aprovação condicional em aprovação definitiva.

---

## 16. Conclusão sobre a reconciliação

### Resposta à hipótese

> Os comentários existentes conseguem ser relacionados aos posts de forma suficientemente confiável para alimentar o primeiro ciclo do Editorial Agent?

**Resposta: sim, estruturalmente, desde que sejam usados apenas comentários do coletor dedicado e com match exato de `post_id`. A qualidade e a completude do corpus existente ainda não foram comprovadas empiricamente.**

### Regra recomendada

```text
source = post_comment
origem = n8n_instagram_comments_collector
external_id preenchido
post_id preenchido
post_id igual ao post_id do post
mesmo tenant
mesma conta
message_text não vazio
```

### Recomendação para o MVP

**SIM COM RESTRIÇÕES.**

Os comentários devem complementar posts e métricas. Não devem ser a única base de uma recomendação editorial no primeiro ciclo.

---

## 17. Arquivos criados ou alterados

- Criado: `EDITORIAL_AGENT_COMMENT_RECONCILIATION.md`

Nenhum código, dado, schema, migration, workflow, frontend, backend, Edge Function, prompt, agente ou integração foi alterado.

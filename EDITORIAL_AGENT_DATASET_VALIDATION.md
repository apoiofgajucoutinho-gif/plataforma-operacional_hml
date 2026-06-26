# Validação do Dataset do Editorial Agent

**Projeto:** Plataforma Juliana  
**Iniciativa:** NORWYN Editorial Agent — Labs Intelligence  
**Data:** 24/06/2026  
**Natureza:** definição e validação documental do dataset mínimo  
**Alterações no sistema:** nenhuma

---

## 1. Resumo executivo

O conjunto quantitativo necessário para o primeiro ciclo assistido do Editorial Agent está disponível e possui boa qualidade.

Na janela de 30 dias mais recente comprovável pela fonte local, entre 21/04/2026 e 20/05/2026, existem:

- 24 posts únicos;
- 24 legendas preenchidas;
- 24 permalinks;
- métricas completas de curtidas, comentários, alcance, salvamentos e compartilhamentos;
- 9 vídeos;
- 14 carrosséis;
- 1 imagem;
- 16 posts com comentários contabilizados;
- 100 comentários contabilizados no total;
- média de 4,17 comentários por post;
- máximo de 12 comentários em um post.

Esse recorte cabe exatamente nos limites definidos para o primeiro ciclo:

- até 30 posts;
- até 100 comentários;
- últimos 30 dias disponíveis.

Há, porém, uma distinção essencial:

- a contagem de 100 comentários está comprovada em `instagram_metrics`;
- as 100 linhas textuais correspondentes não estão materializadas nos arquivos locais auditados;
- a tabela e o coletor dedicado existem, mas a população atual do Supabase não pôde ser consultada.

Assim, o dataset de posts e métricas está pronto. O componente textual de comentários está estruturalmente pronto, mas depende da seleção dos registros já existentes que cumpram a regra de reconciliação aprovada.

### Conclusão

**O Editorial Agent consegue executar o primeiro ciclo: SIM COM RESTRIÇÕES.**

**Prontidão do dataset: PARCIALMENTE PRONTO.**

Ele passa a estar **pronto para MVP** assim que o corpus existente de comentários for materializado com:

- origem dedicada;
- match exato de post;
- texto não vazio;
- deduplicação;
- anonimização.

Não é necessária outra auditoria conceitual. A próxima atividade é preparar o dataset operacional conforme a especificação deste documento e seguir para a implementação do MVP.

---

## 2. Premissas e limitações

### 2.1 Evidências utilizadas

- `Insight.xlsx`;
- `instagram_posts`;
- `instagram_metrics`;
- `instagram_interactions`;
- workflows de comentários;
- migrations e serviços do módulo Instagram;
- `EDITORIAL_AGENT_DATA_AUDIT.md`;
- `EDITORIAL_AGENT_COMMENT_RECONCILIATION.md`.

### 2.2 Limitações

Não foram:

- consultadas APIs externas;
- executadas novas coletas;
- consultado o Supabase remoto;
- alterados dados;
- expostos dados pessoais.

Por isso, o documento valida:

- a composição do dataset;
- a qualidade dos posts e métricas disponíveis localmente;
- a regra de inclusão de comentários;
- a suficiência técnica do conjunto.

Não valida:

- quantos comentários textuais estão atualmente armazenados no ambiente remoto;
- a qualidade semântica de cada comentário existente;
- o estado atual dos workflows remotos.

### 2.3 Interpretação de “últimos 30 dias”

A fonte local de posts termina em 20/05/2026. Portanto, a simulação usa os 30 dias mais recentes comprováveis nessa fonte:

```text
21/04/2026 a 20/05/2026
```

Isso não deve ser confundido com os 30 dias anteriores a 24/06/2026. A seleção operacional deverá usar a data máxima efetivamente existente no ambiente escolhido para o MVP.

---

## 3. Parte 1 — Seleção do dataset

### 3.1 Critérios gerais

| Dimensão | Regra |
|---|---|
| Período | Últimos 30 dias disponíveis |
| Posts | Até 30 |
| Comentários | Até 100 |
| Conta | Uma única conta Instagram |
| Tenant | Um único tenant |
| Comentários permitidos | Apenas públicos |
| Origem permitida | Coletor dedicado |
| Relação | Match exato de `post_id` |

### 3.2 Seleção dos posts

Um post entra quando:

1. pertence ao tenant escolhido;
2. pertence à conta escolhida;
3. possui `post_id`;
4. possui data de publicação;
5. está dentro da janela de 30 dias;
6. possui legenda ou texto editorial utilizável;
7. possui formato identificado;
8. possui pelo menos o conjunto básico de métricas.

Ordenação:

```text
data_postagem decrescente
```

Limite:

```text
30 posts
```

### 3.3 Seleção dos comentários

Um comentário entra somente quando:

```text
source = post_comment
origem = n8n_instagram_comments_collector
external_id preenchido
post_id preenchido
message_text não vazio
mesmo tenant
mesma conta
match exato com instagram_posts.post_id
post incluído na janela do dataset
```

Limite:

```text
100 comentários
```

### 3.4 Exclusões

Excluir:

- DMs;
- Stories;
- novos seguidores;
- origem genérica;
- registros sem `post_id`;
- comentários sem match;
- texto vazio;
- anexos sem texto;
- duplicados;
- spam identificado;
- payload bruto;
- identidade do autor;
- comentários de posts fora do recorte.

### 3.5 Resultado da simulação

| Indicador | Resultado |
|---|---:|
| Janela | 21/04/2026 a 20/05/2026 |
| Posts disponíveis | 24 |
| Limite de posts | 30 |
| Posts selecionáveis | 24 |
| Posts com comentários contabilizados | 16 |
| Comentários contabilizados | 100 |
| Limite de comentários | 100 |
| Média de comentários/post | 4,17 |
| Mínimo | 0 |
| Máximo | 12 |
| Legendas preenchidas | 24 de 24 |
| Permalinks preenchidos | 24 de 24 |
| Curtidas preenchidas | 24 de 24 |
| Contagem de comentários preenchida | 24 de 24 |
| Alcance preenchido | 24 de 24 |
| Salvamentos preenchidos | 24 de 24 |
| Compartilhamentos preenchidos | 24 de 24 |

### 3.6 Variedade de formatos

| Formato original | Quantidade | Participação aproximada |
|---|---:|---:|
| Carrossel | 14 | 58% |
| Vídeo/Reel | 9 | 38% |
| Imagem | 1 | 4% |

Existe variedade suficiente para comparar vídeo e carrossel. O formato imagem está sub-representado e não deve sustentar conclusões fortes isoladamente.

### 3.7 Duplicidade

A fonte completa possui sete IDs repetidos em 115 linhas. A seleção deve manter apenas um registro por `post_id`.

Essa duplicidade é administrável e não bloqueia o ciclo.

---

## 4. Parte 2 — Estrutura do dataset

## 4.1 Campos de POST

| Campo conceitual | Fonte atual | Uso | Obrigatoriedade | Observação |
|---|---|---|---|---|
| `post_id` | `instagram_posts.post_id` | Relacionamento e rastreabilidade | Obrigatório | ID externo da publicação |
| `data` | `data_postagem` | Contexto temporal | Obrigatório | Formato de data consistente |
| `hora` | `hora_postagem` | Análise de horário | Opcional recomendado | Pode ser nulo |
| `formato` | `tipo` | Comparação de formato | Obrigatório | Usar valor normalizado |
| `formato_original` | `tipo_original` | Contexto técnico | Opcional | Preserva origem Meta |
| `legenda` | `legenda` | Análise textual | Obrigatório | Texto editorial principal |
| `permalink` | `permalink` | Rastreabilidade/revisão | Opcional recomendado | Não é necessário ao raciocínio |
| `alcance` | métricas | Desempenho | Obrigatório | Tratar ausência como nulo, não zero |
| `impressoes` | Não existe no orgânico | Desempenho | Não utilizar | Não inventar a partir de Ads |
| `curtidas` | `likes` | Engajamento | Obrigatório | Métrica básica |
| `comentarios_contagem` | `comentarios` | Engajamento | Obrigatório | Não confundir com textos |
| `compartilhamentos` | `compartilhamentos` | Distribuição | Obrigatório | Disponível na amostra |
| `salvamentos` | `salvos` | Valor percebido | Obrigatório | Disponível na amostra |
| `engajamento_taxa` | `engajamento_score` | Comparação | Opcional recomendado | Informar fórmula |
| `engajamento_classificacao` | classificação | Sinal operacional | Opcional | Não tratar como verdade universal |
| `tema` | Não existe canonicamente | Contexto editorial | Manual/opcional | Preenchido ou inferido com revisão |
| `pilar_editorial` | Não existe | Contexto estratégico | Manual/opcional | Primeiro ciclo |
| `objetivo_editorial` | Não existe | Interpretação | Manual/recomendado | Eleva a qualidade |
| `produto_relacionado` | Relação ausente | Contexto comercial | Manual/opcional | Quando aplicável |
| `campanha_relacionada` | Relação ausente | Contexto | Manual/opcional | Não inferir de Ads automaticamente |
| `modo_de_voz` | Não existe | Análise de linguagem | Manual/opcional | Pode ser inferido e revisado |
| `raw_payload` | JSON bruto | Nenhum uso necessário | Não utilizar | Excesso e risco |
| `tenant_id` | Banco | Filtro técnico | Não enviar | Dataset já é escopado |
| `account_id` | Banco | Filtro técnico | Não enviar | Dataset já é escopado |
| `id` interno UUID | Banco | Operação interna | Não utilizar no agente | `post_id` basta |

### 4.2 Campos mínimos obrigatórios por post

```text
post_id
data
formato
legenda
alcance
curtidas
comentarios_contagem
salvamentos
compartilhamentos
```

### 4.3 Campos de COMENTÁRIO

| Campo conceitual | Fonte | Uso | Obrigatoriedade | Tratamento |
|---|---|---|---|---|
| `texto` | `message_text` | Análise semântica | Obrigatório | Anonimizar conteúdo pessoal |
| `data` | `interaction_at` | Contexto temporal | Opcional recomendado | Reduzir precisão se necessário |
| `post_id` | `post_id` | Relação com post | Obrigatório | Match exato |
| `external_id` | `external_id` | Deduplicação | Obrigatório antes da anonimização | Substituir por hash ou remover |
| `origem` | `origem` | Proveniência | Obrigatório para seleção | Pode permanecer como metadado |
| `source` | `source` | Garantir comentário público | Obrigatório para seleção | Pode permanecer |
| `profile_username` | perfil | Identidade | Não utilizar | Remover |
| `profile_name` | perfil | Identidade | Não utilizar | Remover |
| `media_id` | mídia | Validação auxiliar | Não enviar ao agente | Remover após reconciliação |
| `post_permalink` | link | Validação auxiliar | Opcional | Redundante após vínculo |
| `status` | operacional | Atendimento | Não utilizar no núcleo editorial | Separar da análise |
| `potential` | heurística | Priorização | Opcional, baixa confiança | Não usar como rótulo verdadeiro |
| `product_topic` | heurística | Tema | Opcional, baixa confiança | Revisão humana |
| `next_action` | heurística | Operação | Não utilizar | Pode contaminar a análise |
| `raw_payload` | evento bruto | Auditoria | Nunca enviar | Remover |
| `tenant_id` | banco | Escopo | Não enviar | Remover |
| `account_id` | banco | Escopo | Não enviar | Remover |

### 4.4 Campos mínimos por comentário

```text
comment_ref anonimizada
post_id
data
texto anonimizado
source
origem
```

### 4.5 Campos descartados

Descartar antes da entrega:

- IDs internos de banco;
- tenant e account IDs;
- nome e username;
- ID pessoal do autor;
- media ID após validação;
- payload bruto;
- ações sugeridas;
- status de suporte;
- metadados técnicos de importação;
- timestamps internos;
- campos sem uso editorial.

---

## 5. Parte 3 — Anonimização

### 5.1 Campos removidos

Remover integralmente:

- `profile_username`;
- `profile_name`;
- IDs do perfil;
- sender ID;
- recipient ID;
- conversation ID;
- `tenant_id`;
- `account_id`;
- `raw_payload`;
- links pessoais presentes no payload;
- telefone;
- e-mail;
- CPF ou documento;
- endereço;
- qualquer dado que identifique diretamente uma pessoa.

### 5.2 Campos que podem permanecer

- `post_id`, por identificar conteúdo público, não o autor do comentário;
- data do post;
- formato;
- legenda institucional;
- métricas agregadas;
- texto do comentário após sanitização;
- origem técnica do coletor;
- tipo `post_comment`;
- data do comentário, preferencialmente sem precisão desnecessária;
- permalink público do post, quando necessário para revisão humana.

### 5.3 Campos que podem virar hash

- `external_id` do comentário;
- identificador interno do comentário;
- identificador do autor, somente se for indispensável detectar repetição sem revelar identidade.

O hash deve ser usado apenas para:

- deduplicação;
- rastreabilidade;
- agrupamento técnico.

O agente não precisa conhecer o valor original.

### 5.4 Campos que nunca devem chegar ao agente

- `raw_payload`;
- access tokens;
- IDs pessoais;
- nomes e usernames;
- e-mails;
- telefones;
- IDs de conversa;
- dados de autenticação;
- metadados desnecessários;
- histórico completo de uma pessoa;
- DMs e Stories neste ciclo.

### 5.5 Anonimização do texto

Remover identidade dos campos não basta. O próprio comentário pode conter:

- nome completo;
- telefone;
- e-mail;
- cidade/endereço;
- diagnóstico;
- condição de saúde;
- dados de familiares;
- relato individual identificável.

O texto enviado deve ser sanitizado, substituindo dados identificáveis por marcadores conceituais, por exemplo:

```text
[NOME]
[EMAIL]
[TELEFONE]
[LOCAL]
[DADO_DE_SAUDE]
```

### 5.6 LGPD

O uso pretendido deve observar:

- finalidade definida;
- minimização;
- acesso restrito;
- retenção limitada;
- separação entre análise editorial e atendimento;
- não reutilização de identidade;
- revisão humana;
- possibilidade de exclusão quando aplicável.

O risco principal não é usar métricas agregadas. É enviar texto bruto com identidade ou dados de saúde sem necessidade editorial.

---

## 6. Parte 4 — Qualidade do dataset

| Dimensão | Classificação | Justificativa |
|---|---|---|
| Legendas | Alta | 24 de 24 preenchidas |
| Métricas básicas | Alta | 24 de 24 completas |
| Formatos | Média/Alta | Vídeo e carrossel bem representados; imagem baixa |
| Volume de posts | Alta para MVP | 24 dentro do limite de 30 |
| Contagem de comentários | Alta | 100 no período |
| Comentários textuais | Desconhecida | Linhas reais não disponíveis localmente |
| Relação comentário-post | Alta sob filtro | Coletor dedicado injeta o ID do post |
| Histórico | Média | Janela suficiente para ciclo; não para sazonalidade longa |
| Contexto editorial | Baixa | Tema, objetivo e pilar ausentes |
| Atualidade local | Média/Baixa | Fonte termina em maio |
| Duplicidade de posts | Média | Sete duplicatas na fonte completa; deduplicação simples |
| Duplicidade de comentários | Desconhecida/baixa estrutural | ID externo permite upsert |
| Ruído textual | Desconhecida | Corpus não foi materializado |
| Privacidade | Média | Campos permitem anonimização, mas texto precisa sanitização |

### 6.1 Existe legenda suficiente?

**Sim.** Todos os 24 posts possuem legenda.

### 6.2 Existe comentário suficiente?

**Contagem: sim. Texto: ainda não comprovado.**

O período possui exatamente 100 comentários contabilizados, volume adequado ao limite. Falta validar quantos possuem linha textual reconciliada e útil.

### 6.3 Existe variedade de formatos?

**Sim, com restrição.**

Vídeo e carrossel possuem volume útil. Imagem possui apenas um post e não deve gerar conclusão estatística isolada.

### 6.4 Existe volume adequado?

**Sim para MVP.**

Vinte e quatro posts permitem comparação assistida sem exceder a capacidade de revisão humana.

### 6.5 Existe histórico adequado?

**Sim para um ciclo, não para produção.**

Trinta dias são suficientes para o primeiro ciclo. Não são suficientes para sazonalidade, tendências anuais ou mudança estrutural.

### 6.6 Existe contexto suficiente?

**Parcialmente.**

Existe contexto no texto e nas métricas, mas faltam:

- objetivo;
- tema validado;
- pilar;
- voz;
- campanha;
- produto;
- restrições;
- capacidade.

### 6.7 Existe ruído?

**Provavelmente, mas não mensurável.**

Emojis, respostas curtas, CTA, spam e elogios genéricos são esperados em comentários públicos. O corpus textual precisa de filtragem.

### 6.8 Existe duplicidade?

- posts: sim, sete IDs repetidos na fonte completa;
- dataset final: deve manter apenas um registro por `post_id`;
- comentários: deduplicação estrutural por `external_id`, mas resultado real não validado.

### 6.9 Existe ausência de campo crítico?

Para posts e métricas: **não**.

Para o dataset editorial completo: a ausência empiricamente não resolvida é o corpus textual reconciliado dos comentários.

---

## 7. Parte 5 — O que o agente receberá

Exemplo apenas estrutural, sem dados reais:

```json
{
  "ciclo": {
    "periodo_inicio": "AAAA-MM-DD",
    "periodo_fim": "AAAA-MM-DD",
    "objetivo_do_ciclo": "PREENCHIMENTO_MANUAL",
    "restricoes": ["PREENCHIMENTO_MANUAL"],
    "capacidade_semanal": "PREENCHIMENTO_MANUAL"
  },
  "posts": [
    {
      "post_id": "POST_PUBLICO_001",
      "data": "AAAA-MM-DD",
      "hora": "HH:MM:SS",
      "formato": "Carrossel",
      "legenda": "TEXTO_EDITORIAL_DO_POST",
      "permalink": "URL_PUBLICA_OPCIONAL",
      "metricas": {
        "alcance": 0,
        "curtidas": 0,
        "comentarios_contagem": 0,
        "salvamentos": 0,
        "compartilhamentos": 0,
        "engajamento_taxa": 0
      },
      "contexto_manual": {
        "tema": "PREENCHIMENTO_MANUAL_OU_NAO_INFORMADO",
        "pilar_editorial": "PREENCHIMENTO_MANUAL_OU_NAO_INFORMADO",
        "objetivo_editorial": "PREENCHIMENTO_MANUAL_OU_NAO_INFORMADO",
        "produto_relacionado": "PREENCHIMENTO_MANUAL_OU_NAO_INFORMADO",
        "modo_de_voz": "PREENCHIMENTO_MANUAL_OU_NAO_INFORMADO"
      },
      "comentarios": [
        {
          "comment_ref": "HASH_001",
          "data": "AAAA-MM-DD",
          "texto": "COMENTARIO_ANONIMIZADO",
          "source": "post_comment",
          "origem": "n8n_instagram_comments_collector"
        }
      ]
    }
  ]
}
```

### 7.1 O agente não receberá

- nome;
- username;
- IDs pessoais;
- payload bruto;
- DMs;
- Stories;
- seguidores individuais;
- dados de atendimento;
- tokens;
- dados técnicos sem função analítica.

---

## 8. Parte 6 — Lacunas

### 8.1 Campos que não existem

- impressões orgânicas;
- tema canônico;
- pilar;
- voz;
- objetivo editorial;
- objetivo do ciclo;
- produto associado por relação;
- campanha associada;
- restrições;
- capacidade semanal;
- mídia estruturada;
- transcrição;
- snapshots das métricas.

### 8.2 Campos inferíveis

Com revisão humana:

- tema provável;
- modo de voz;
- CTA;
- intenção;
- perguntas;
- objeções;
- sinais de interesse;
- padrões de linguagem;
- possíveis lacunas editoriais.

Não devem ser tratados como fatos sem validação.

### 8.3 Campos preenchidos manualmente

- objetivo do ciclo;
- tema validado;
- pilar;
- objetivo do post;
- produto;
- campanha;
- voz;
- restrições;
- capacidade semanal;
- eventos relevantes;
- observações estratégicas.

### 8.4 Campos que não fazem falta no MVP

- impressões orgânicas;
- DMs completas;
- Stories completos;
- CRM;
- Revenue;
- atribuição de vendas;
- demografia;
- respostas automáticas;
- histórico anual;
- publicação e agendamento;
- mídia processada automaticamente.

### 8.5 Lacuna operacional principal

Materializar, a partir dos dados já existentes, o subconjunto textual de comentários que passe pelas regras de:

- origem;
- vínculo;
- texto;
- deduplicação;
- anonimização.

---

## 9. Parte 7 — Primeiro ciclo

Com esse dataset, o Editorial Agent consegue produzir:

| Saída | Capacidade |
|---|---|
| Sinais | Sim |
| Análises | Sim |
| Insights | Sim |
| Recomendações | Sim, assistidas |
| Briefings | Sim, propostos |

### Decisão

**SIM COM RESTRIÇÕES.**

### Justificativa

O conjunto contém volume, variedade, texto editorial e métricas suficientes.

As restrições são:

1. comentários entram somente após filtro e anonimização;
2. posts e métricas formam a fonte principal;
3. tema, objetivo, pilar e voz permanecem manuais ou inferidos com revisão;
4. conclusões não podem depender da representatividade completa dos comentários;
5. imagem está sub-representada;
6. o ciclo representa 30 dias, não tendência histórica longa.

---

## 10. Parte 8 — Prontidão

### Classificação

**PARCIALMENTE PRONTO.**

### Componentes prontos

- seleção de posts;
- legendas;
- formatos;
- métricas;
- limite e período;
- estrutura do dataset;
- regra de reconciliação;
- regra de anonimização;
- volume para teste.

### Componente pendente

- materialização e validação do corpus textual de comentários já armazenados.

### Por que ainda não é “pronto para MVP”?

Porque a missão definiu comentários como parte do dataset. A existência de contagem não comprova que as linhas textuais válidas e anonimizáveis estão disponíveis.

### Por que não é “não pronto”?

Porque:

- o núcleo de posts e métricas está completo;
- o coletor e a tabela de comentários existem;
- a regra de relacionamento é confiável;
- o volume cabe exatamente no teste;
- não há ausência estrutural que exija nova arquitetura.

### Pronto para produção?

**Não.**

Faltam evidências de:

- completude;
- monitoramento;
- qualidade contínua;
- política operacional de anonimização;
- atualização recente;
- estabilidade em escala;
- cobertura histórica.

---

## 11. Parte 9 — Recomendação final

### 11.1 Menor entrega operacional

Um pacote revisável contendo:

- 24 posts dos 30 dias mais recentes disponíveis;
- métricas completas;
- até 100 comentários públicos reconciliados;
- comentários anonimizados;
- contexto editorial manual do ciclo;
- lista explícita de campos ausentes;
- saída do agente submetida à revisão humana.

### 11.2 Menor entrega técnica

Um dataset estático e controlado, seguindo a estrutura conceitual deste documento, sem:

- publicação;
- automação;
- CRM;
- DMs;
- Stories;
- execução de campanha;
- resposta automática.

### 11.3 Próxima atividade

Preparar o dataset operacional com os registros já existentes:

1. selecionar a janela;
2. deduplicar posts;
3. anexar métricas;
4. selecionar comentários válidos;
5. reconciliar;
6. anonimizar;
7. preencher contexto manual;
8. seguir para implementação do MVP assistido.

Não é necessária uma nova auditoria conceitual após essa preparação.

---

## 12. Análise crítica obrigatória

### 1. Existe algum dado que impediria o MVP?

Não para o núcleo de posts e métricas. Para o dataset completo, somente a ausência de comentários textuais reconciliáveis no ambiente real impediria a camada de comentários.

### 2. O dataset representa bem a operação Juliana?

Representa bem a operação orgânica recente em vídeo e carrossel. Representa pouco posts estáticos e não representa operação anual, DMs, Stories ou conversão.

### 3. Existe excesso de dados?

Sim, se forem incluídos:

- payload bruto;
- identidade;
- IDs técnicos;
- DMs;
- status operacional;
- ações heurísticas;
- metadados sem função editorial.

### 4. Existe falta de dados?

Sim:

- contexto editorial;
- mídia;
- impressões;
- comentários textuais comprovados;
- histórico de evolução;
- campanha e produto associados.

A maior parte não bloqueia o MVP.

### 5. O agente receberia contexto suficiente?

Contexto quantitativo e textual do post: sim. Contexto estratégico: somente com preenchimento manual.

### 6. Qual é o maior risco?

Tratar comentários contabilizados como se fossem um corpus textual completo e representativo.

### 7. O maior risco é técnico ou de negócio?

É principalmente de governança de dados e interpretação de negócio. A estrutura técnica de posts e vínculo dedicado é suficiente.

### 8. Vale iniciar o MVP agora?

**Sim.**

O volume é adequado e o risco pode ser controlado por revisão humana e comentários restritos.

### 9. O que deve permanecer manual?

- objetivo;
- contexto;
- tema;
- pilar;
- voz;
- produto;
- campanha;
- restrições;
- capacidade;
- validação dos comentários;
- aprovação dos briefings.

### 10. O que deve ser automatizado apenas depois?

- atualização contínua do dataset;
- anonimização sistemática;
- classificação;
- snapshots;
- mídia/transcrição;
- monitoramento;
- cobertura histórica;
- associação automática a produto/campanha.

---

## 13. Síntese final

### Estrutura do dataset

- até 30 posts;
- até 100 comentários;
- últimos 30 dias disponíveis;
- posts, legendas, formatos e métricas;
- comentários públicos reconciliados;
- contexto estratégico manual.

### Qualidade

- posts: alta;
- métricas: alta;
- formatos: média/alta;
- histórico: médio;
- comentários textuais: desconhecido até materialização;
- contexto editorial: baixo sem entrada manual.

### Lacunas

A única lacuna operacional imediata é materializar e anonimizar os comentários existentes que passam pelo filtro aprovado.

### Prontidão

**Parcialmente pronto, muito próximo de pronto para MVP.**

### Recomendação

Preparar o dataset operacional e seguir para a implementação do MVP assistido. Não ampliar o escopo antes do primeiro ciclo.

---

## 14. Arquivos criados ou alterados

- Criado: `EDITORIAL_AGENT_DATASET_VALIDATION.md`

Nenhum código, banco, migration, workflow, frontend, backend, Edge Function, integração ou dado foi alterado.

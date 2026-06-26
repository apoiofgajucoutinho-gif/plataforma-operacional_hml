begin;



with existing as (

  select id from public.tenants where nome = 'Juliana Coutinho' limit 1

), inserted as (

  insert into public.tenants (nome, tipo)

  select 'Juliana Coutinho', 'cliente'

  where not exists (select 1 from existing)

  returning id

), tenant as (

  select id from existing union all select id from inserted limit 1

)

insert into public.instagram_accounts (tenant_id, nome, username)

select id, 'Juliana Coutinho', 'fga.jucoutinho' from tenant

on conflict (tenant_id, username) do update set nome = excluded.nome;



with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18105642653498907',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-12'::date,
    '14:36:41'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Onde você escolhe sentar na vida? 🪑

Não é mania. Escolher sempre a mesma cadeira no restaurante, o mesmo canto na mesa de reuniões ou a mesma posição no sofá da família é, muitas vezes, o peso silencioso da perda unilateral. 🛑

Atendi uma psicóloga que vivia exatamente assim. Antes de cada sessão, ela precisava organizar todo o ambiente: onde o paciente sentaria e onde ela precisava estar para conseguir exercer sua profissão. A escuta era o centro do trabalho dela, mas a energia gasta apenas para se posicionar era exaustiva.

Quando adaptamos um sistema CROS ou uma prótese ancorada, não estamos apenas "levando o som de um lado para o outro". Estamos devolvendo algo muito mais precioso: a liberdade.

A liberdade de não precisar evitar lugares, de não precisar se organizar milimetricamente para ouvir e, principalmente, a liberdade de escolher onde quer sentar na vida. É sobre isso que a nossa profissão trata: impacto real e autonomia. 🚀

Compartilhe este vídeo para que mais pessoas entendam que a Audiologia vai muito além do decibel. É sobre devolver a vida.',
    'https://www.instagram.com/reel/DYPf5MXtOIM/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18105642653498907", "tipo_postagem": "VIDEO", "likes": 11.0, "comentarios": 0.0, "data_postagem": "2026-05-12 00:00:00", "hora_postagem": "14:36:41", "legenda": "Onde você escolhe sentar na vida? 🪑\n\nNão é mania. Escolher sempre a mesma cadeira no restaurante, o mesmo canto na mesa de reuniões ou a mesma posição no sofá da família é, muitas vezes, o peso silencioso da perda unilateral. 🛑\n\nAtendi uma psicóloga que vivia exatamente assim. Antes de cada sessão, ela precisava organizar todo o ambiente: onde o paciente sentaria e onde ela precisava estar para conseguir exercer sua profissão. A escuta era o centro do trabalho dela, mas a energia gasta apenas para se posicionar era exaustiva.\n\nQuando adaptamos um sistema CROS ou uma prótese ancorada, não estamos apenas \"levando o som de um lado para o outro\". Estamos devolvendo algo muito mais precioso: a liberdade.\n\nA liberdade de não precisar evitar lugares, de não precisar se organizar milimetricamente para ouvir e, principalmente, a liberdade de escolher onde quer sentar na vida. É sobre isso que a nossa profissão trata: impacto real e autonomia. 🚀\n\nCompartilhe este vídeo para que mais pessoas entendam que a Audiologia vai muito além do decibel. É sobre devolver a vida.", "permalink": "https://www.instagram.com/reel/DYPf5MXtOIM/", "reach": 312.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  11,
  0,
  312,
  0,
  0,
  0.035256,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18105642653498907", "tipo_postagem": "VIDEO", "likes": 11.0, "comentarios": 0.0, "data_postagem": "2026-05-12 00:00:00", "hora_postagem": "14:36:41", "legenda": "Onde você escolhe sentar na vida? 🪑\n\nNão é mania. Escolher sempre a mesma cadeira no restaurante, o mesmo canto na mesa de reuniões ou a mesma posição no sofá da família é, muitas vezes, o peso silencioso da perda unilateral. 🛑\n\nAtendi uma psicóloga que vivia exatamente assim. Antes de cada sessão, ela precisava organizar todo o ambiente: onde o paciente sentaria e onde ela precisava estar para conseguir exercer sua profissão. A escuta era o centro do trabalho dela, mas a energia gasta apenas para se posicionar era exaustiva.\n\nQuando adaptamos um sistema CROS ou uma prótese ancorada, não estamos apenas \"levando o som de um lado para o outro\". Estamos devolvendo algo muito mais precioso: a liberdade.\n\nA liberdade de não precisar evitar lugares, de não precisar se organizar milimetricamente para ouvir e, principalmente, a liberdade de escolher onde quer sentar na vida. É sobre isso que a nossa profissão trata: impacto real e autonomia. 🚀\n\nCompartilhe este vídeo para que mais pessoas entendam que a Audiologia vai muito além do decibel. É sobre devolver a vida.", "permalink": "https://www.instagram.com/reel/DYPf5MXtOIM/", "reach": 312.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18091415284984412',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-11'::date,
    '23:31:44'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Na audiologia pediátrica, a técnica e a ética caminham juntas.

Adaptar um AASI em uma criança não é apenas uma questão de "ajuste", é uma responsabilidade direta com o futuro e o desenvolvimento dela. Para sair do comum e entregar resultados de excelência, você precisa dominar os 5 pilares inegociáveis: do diagnóstico de precisão ao aconselhamento familiar.

O RECD e o Mapeamento de Fala não são opcionais; são a sua única garantia de que o som está seguro e audível. Se você não mede, você apenas estima. E na pediatria, a margem de erro deve ser zero. 🛑

🚀 OFERTA EXCLUSIVA:
Nos próximos dias, ao entrar para a Formação AASI, você ganha de bônus a Imersão em Pediatria. É a sua chance de entender mais os detalhes dessa população tão única. 

👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYN4eLnGvzs/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18091415284984412", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 24.0, "comentarios": 4.0, "data_postagem": "2026-05-11 00:00:00", "hora_postagem": "23:31:44", "legenda": "Na audiologia pediátrica, a técnica e a ética caminham juntas.\n\nAdaptar um AASI em uma criança não é apenas uma questão de \"ajuste\", é uma responsabilidade direta com o futuro e o desenvolvimento dela. Para sair do comum e entregar resultados de excelência, você precisa dominar os 5 pilares inegociáveis: do diagnóstico de precisão ao aconselhamento familiar.\n\nO RECD e o Mapeamento de Fala não são opcionais; são a sua única garantia de que o som está seguro e audível. Se você não mede, você apenas estima. E na pediatria, a margem de erro deve ser zero. 🛑\n\n🚀 OFERTA EXCLUSIVA:\nNos próximos dias, ao entrar para a Formação AASI, você ganha de bônus a Imersão em Pediatria. É a sua chance de entender mais os detalhes dessa população tão única. \n\n👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYN4eLnGvzs/", "reach": 903.0, "saved": 5.0, "shares": 7.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  24,
  4,
  903,
  5,
  7,
  0.036545,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18091415284984412", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 24.0, "comentarios": 4.0, "data_postagem": "2026-05-11 00:00:00", "hora_postagem": "23:31:44", "legenda": "Na audiologia pediátrica, a técnica e a ética caminham juntas.\n\nAdaptar um AASI em uma criança não é apenas uma questão de \"ajuste\", é uma responsabilidade direta com o futuro e o desenvolvimento dela. Para sair do comum e entregar resultados de excelência, você precisa dominar os 5 pilares inegociáveis: do diagnóstico de precisão ao aconselhamento familiar.\n\nO RECD e o Mapeamento de Fala não são opcionais; são a sua única garantia de que o som está seguro e audível. Se você não mede, você apenas estima. E na pediatria, a margem de erro deve ser zero. 🛑\n\n🚀 OFERTA EXCLUSIVA:\nNos próximos dias, ao entrar para a Formação AASI, você ganha de bônus a Imersão em Pediatria. É a sua chance de entender mais os detalhes dessa população tão única. \n\n👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYN4eLnGvzs/", "reach": 903.0, "saved": 5.0, "shares": 7.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18077083115336009',
    '2026-05-19 23:00:07'::timestamptz,
    '2026-05-09'::date,
    '00:46:16'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Na audiologia pediátrica, o "achismo" custa caro. 🛑

O RECD (Real-Ear-to-Coupler Difference) não é um luxo ou um protocolo opcional. Ele é a única forma de garantir que o que o software diz que está entregando é, de fato, o que está chegando ao tímpano daquela criança.

Orelhas de crianças variam drasticamente. Usar médias de software é como dar um sapato de tamanho "médio" para todas as crianças de 2 anos: para algumas vai apertar, para outras vai cair. No aparelho auditivo, isso significa desconforto ou privação sensorial.

Se você quer ser a fono que resolve casos complexos e traz segurança para as famílias, você precisa dominar o RECD.

👉 Comenta "CRIANÇA" para garantir sua vaga na Formação AASI com bônus de Pediatria!',
    'https://www.instagram.com/p/DYGSnZtDGkf/',
    '{"data_coleta": "2026-05-19 23:00:07", "post_id": "18077083115336009", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 32.0, "comentarios": 0.0, "data_postagem": "2026-05-09 00:00:00", "hora_postagem": "00:46:16", "legenda": "Na audiologia pediátrica, o \"achismo\" custa caro. 🛑\n\nO RECD (Real-Ear-to-Coupler Difference) não é um luxo ou um protocolo opcional. Ele é a única forma de garantir que o que o software diz que está entregando é, de fato, o que está chegando ao tímpano daquela criança.\n\nOrelhas de crianças variam drasticamente. Usar médias de software é como dar um sapato de tamanho \"médio\" para todas as crianças de 2 anos: para algumas vai apertar, para outras vai cair. No aparelho auditivo, isso significa desconforto ou privação sensorial.\n\nSe você quer ser a fono que resolve casos complexos e traz segurança para as famílias, você precisa dominar o RECD.\n\n👉 Comenta \"CRIANÇA\" para garantir sua vaga na Formação AASI com bônus de Pediatria!", "permalink": "https://www.instagram.com/p/DYGSnZtDGkf/", "reach": 721.0, "saved": 4.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  32,
  0,
  721,
  4,
  2,
  0.049931,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-19 23:00:07", "post_id": "18077083115336009", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 32.0, "comentarios": 0.0, "data_postagem": "2026-05-09 00:00:00", "hora_postagem": "00:46:16", "legenda": "Na audiologia pediátrica, o \"achismo\" custa caro. 🛑\n\nO RECD (Real-Ear-to-Coupler Difference) não é um luxo ou um protocolo opcional. Ele é a única forma de garantir que o que o software diz que está entregando é, de fato, o que está chegando ao tímpano daquela criança.\n\nOrelhas de crianças variam drasticamente. Usar médias de software é como dar um sapato de tamanho \"médio\" para todas as crianças de 2 anos: para algumas vai apertar, para outras vai cair. No aparelho auditivo, isso significa desconforto ou privação sensorial.\n\nSe você quer ser a fono que resolve casos complexos e traz segurança para as famílias, você precisa dominar o RECD.\n\n👉 Comenta \"CRIANÇA\" para garantir sua vaga na Formação AASI com bônus de Pediatria!", "permalink": "https://www.instagram.com/p/DYGSnZtDGkf/", "reach": 721.0, "saved": 4.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18088650668022479',
    '2026-05-18 23:00:07'::timestamptz,
    '2026-05-07'::date,
    '23:46:53'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O George Pig tem perda auditiva. E na vida real, o diagnóstico dele poderia ter sido "TDAH" ou "birra". 🛑

É assustador o número de crianças que chegam ao consultório medicadas ou em terapias intensivas (como ABA) sem nunca terem passado por uma audiometria básica. O comportamento é o reflexo de como essa criança percebe o mundo — e se ela não ouve bem, ela não processa bem.

Como fonoaudiólogas, nossa responsabilidade é clara: não se fecha laudo comportamental sem antes descartar alterações auditivas periféricas ou centrais.

O "detalhe" que falta no diagnóstico pode ser o que está mudando (para pior) a vida dessa criança. Vamos disseminar o conhecimento certo e garantir que a Audiologia seja o primeiro passo, não o último.

👉 Comenta "CRIANÇA" para garantir sua vaga na Formação AASI com bônus de Pediatria!',
    'https://www.instagram.com/p/DYDnBmEmm_I/',
    '{"data_coleta": "2026-05-18 23:00:07", "post_id": "18088650668022479", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 446.0, "comentarios": 12.0, "data_postagem": "2026-05-07 00:00:00", "hora_postagem": "23:46:53", "legenda": "O George Pig tem perda auditiva. E na vida real, o diagnóstico dele poderia ter sido \"TDAH\" ou \"birra\". 🛑\n\nÉ assustador o número de crianças que chegam ao consultório medicadas ou em terapias intensivas (como ABA) sem nunca terem passado por uma audiometria básica. O comportamento é o reflexo de como essa criança percebe o mundo — e se ela não ouve bem, ela não processa bem.\n\nComo fonoaudiólogas, nossa responsabilidade é clara: não se fecha laudo comportamental sem antes descartar alterações auditivas periféricas ou centrais.\n\nO \"detalhe\" que falta no diagnóstico pode ser o que está mudando (para pior) a vida dessa criança. Vamos disseminar o conhecimento certo e garantir que a Audiologia seja o primeiro passo, não o último.\n\n👉 Comenta \"CRIANÇA\" para garantir sua vaga na Formação AASI com bônus de Pediatria!", "permalink": "https://www.instagram.com/p/DYDnBmEmm_I/", "reach": 8581.0, "saved": 62.0, "shares": 142.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  446,
  12,
  8581,
  62,
  142,
  0.060599,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-18 23:00:07", "post_id": "18088650668022479", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 446.0, "comentarios": 12.0, "data_postagem": "2026-05-07 00:00:00", "hora_postagem": "23:46:53", "legenda": "O George Pig tem perda auditiva. E na vida real, o diagnóstico dele poderia ter sido \"TDAH\" ou \"birra\". 🛑\n\nÉ assustador o número de crianças que chegam ao consultório medicadas ou em terapias intensivas (como ABA) sem nunca terem passado por uma audiometria básica. O comportamento é o reflexo de como essa criança percebe o mundo — e se ela não ouve bem, ela não processa bem.\n\nComo fonoaudiólogas, nossa responsabilidade é clara: não se fecha laudo comportamental sem antes descartar alterações auditivas periféricas ou centrais.\n\nO \"detalhe\" que falta no diagnóstico pode ser o que está mudando (para pior) a vida dessa criança. Vamos disseminar o conhecimento certo e garantir que a Audiologia seja o primeiro passo, não o último.\n\n👉 Comenta \"CRIANÇA\" para garantir sua vaga na Formação AASI com bônus de Pediatria!", "permalink": "https://www.instagram.com/p/DYDnBmEmm_I/", "reach": 8581.0, "saved": 62.0, "shares": 142.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17908506879224033',
    '2026-05-17 23:00:07'::timestamptz,
    '2026-05-07'::date,
    '14:57:05'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Um photodump de abril
Um mês intenso mas extremamente lindo
Aniversário de 4 anos do Lucca (mas já?!), palestra no EIA, início de novos projetos, novo encontro presencial (amo ❤️), novas aulas ao vivo com os alunos, Jiu-jitsu (encontrem a melhor foto do treino 😂), e muito MUITO amor com a família ❤️🫶🏼
Obrigada por tanto, Deus 🙏🏼❤️',
    'https://www.instagram.com/p/DYCqZRpDvEe/',
    '{"data_coleta": "2026-05-17 23:00:07", "post_id": "17908506879224033", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 78.0, "comentarios": 11.0, "data_postagem": "2026-05-07 00:00:00", "hora_postagem": "14:57:05", "legenda": "Um photodump de abril\nUm mês intenso mas extremamente lindo\nAniversário de 4 anos do Lucca (mas já?!), palestra no EIA, início de novos projetos, novo encontro presencial (amo ❤️), novas aulas ao vivo com os alunos, Jiu-jitsu (encontrem a melhor foto do treino 😂), e muito MUITO amor com a família ❤️🫶🏼\nObrigada por tanto, Deus 🙏🏼❤️", "permalink": "https://www.instagram.com/p/DYCqZRpDvEe/", "reach": 829.0, "saved": 0.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  78,
  11,
  829,
  0,
  2,
  0.107358,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-17 23:00:07", "post_id": "17908506879224033", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 78.0, "comentarios": 11.0, "data_postagem": "2026-05-07 00:00:00", "hora_postagem": "14:57:05", "legenda": "Um photodump de abril\nUm mês intenso mas extremamente lindo\nAniversário de 4 anos do Lucca (mas já?!), palestra no EIA, início de novos projetos, novo encontro presencial (amo ❤️), novas aulas ao vivo com os alunos, Jiu-jitsu (encontrem a melhor foto do treino 😂), e muito MUITO amor com a família ❤️🫶🏼\nObrigada por tanto, Deus 🙏🏼❤️", "permalink": "https://www.instagram.com/p/DYCqZRpDvEe/", "reach": 829.0, "saved": 0.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-13 00:13:41'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-13 00:13:41", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": null, "saved": null, "shares": null}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  10,
  3,
  null,
  null,
  null,
  null,
  'N/A'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:13:41", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": null, "saved": null, "shares": null}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18063299165416316',
    '2026-05-14 23:00:07'::timestamptz,
    '2026-05-06'::date,
    '00:11:40'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Ali não era apenas uma sala de aula, era um laboratório de transformação. 

Reviver esse encontro presencial de Verificação Objetiva reforça o meu propósito: tirar a fonoaudiologia do "achismo" e trazer para a segurança da prática baseada em evidências.

Ver as alunas colocando a mão na massa, ajustando equipamentos, medindo e discutindo casos reais até o complexo se tornar natural, é o que eu chamo de Raciocínio Clínico em movimento. Do RECD ao rebaixamento de frequência, cada etapa foi desenhada para que a segurança clínica seja um pilar inegociável na rotina de cada uma.

Obrigada a todos que fizeram desse dia uma experiência inesquecível. A fonoaudiologia premium se faz assim: com técnica, prática e propósito. 🚀

👉 Você também quer vivenciar um dia de prática comigo aqui na clínica? Me conta aqui nos comentários!',
    'https://www.instagram.com/reel/DX-gHsPt6Zo/',
    '{"data_coleta": "2026-05-14 23:00:07", "post_id": "18063299165416316", "tipo_postagem": "VIDEO", "likes": 54.0, "comentarios": 2.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "00:11:40", "legenda": "Ali não era apenas uma sala de aula, era um laboratório de transformação. \n\nReviver esse encontro presencial de Verificação Objetiva reforça o meu propósito: tirar a fonoaudiologia do \"achismo\" e trazer para a segurança da prática baseada em evidências.\n\nVer as alunas colocando a mão na massa, ajustando equipamentos, medindo e discutindo casos reais até o complexo se tornar natural, é o que eu chamo de Raciocínio Clínico em movimento. Do RECD ao rebaixamento de frequência, cada etapa foi desenhada para que a segurança clínica seja um pilar inegociável na rotina de cada uma.\n\nObrigada a todos que fizeram desse dia uma experiência inesquecível. A fonoaudiologia premium se faz assim: com técnica, prática e propósito. 🚀\n\n👉 Você também quer vivenciar um dia de prática comigo aqui na clínica? Me conta aqui nos comentários!", "permalink": "https://www.instagram.com/reel/DX-gHsPt6Zo/", "reach": 947.0, "saved": 2.0, "shares": 6.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  54,
  2,
  947,
  2,
  6,
  0.061246,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-14 23:00:07", "post_id": "18063299165416316", "tipo_postagem": "VIDEO", "likes": 54.0, "comentarios": 2.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "00:11:40", "legenda": "Ali não era apenas uma sala de aula, era um laboratório de transformação. \n\nReviver esse encontro presencial de Verificação Objetiva reforça o meu propósito: tirar a fonoaudiologia do \"achismo\" e trazer para a segurança da prática baseada em evidências.\n\nVer as alunas colocando a mão na massa, ajustando equipamentos, medindo e discutindo casos reais até o complexo se tornar natural, é o que eu chamo de Raciocínio Clínico em movimento. Do RECD ao rebaixamento de frequência, cada etapa foi desenhada para que a segurança clínica seja um pilar inegociável na rotina de cada uma.\n\nObrigada a todos que fizeram desse dia uma experiência inesquecível. A fonoaudiologia premium se faz assim: com técnica, prática e propósito. 🚀\n\n👉 Você também quer vivenciar um dia de prática comigo aqui na clínica? Me conta aqui nos comentários!", "permalink": "https://www.instagram.com/reel/DX-gHsPt6Zo/", "reach": 947.0, "saved": 2.0, "shares": 6.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18068264459339235',
    '2026-05-14 23:00:07'::timestamptz,
    '2026-05-05'::date,
    '15:10:32'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'A pediatria não aceita amadores. 👶

Um erro no RECD ou um diagnóstico incompleto pode atrasar anos de desenvolvimento de fala e linguagem de uma criança. Se você sente frio na barriga quando um bebê entra no seu consultório, você precisa de método.

Esta semana, estamos com uma condição especial para a Formação AASI. Ao se inscrever, você garante sua vaga na minha próxima Imersão em Pediatria.

É a oportunidade de dominar do básico ao avançado, com segurança total.👉 

Comenta "EU QUERO" aqui embaixo que meu comercial vai entrar em contato com você agora.',
    'https://www.instagram.com/p/DX9iV82DiL8/',
    '{"data_coleta": "2026-05-14 23:00:07", "post_id": "18068264459339235", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 10.0, "comentarios": 0.0, "data_postagem": "2026-05-05 00:00:00", "hora_postagem": "15:10:32", "legenda": "A pediatria não aceita amadores. 👶\n\nUm erro no RECD ou um diagnóstico incompleto pode atrasar anos de desenvolvimento de fala e linguagem de uma criança. Se você sente frio na barriga quando um bebê entra no seu consultório, você precisa de método.\n\nEsta semana, estamos com uma condição especial para a Formação AASI. Ao se inscrever, você garante sua vaga na minha próxima Imersão em Pediatria.\n\nÉ a oportunidade de dominar do básico ao avançado, com segurança total.👉 \n\nComenta \"EU QUERO\" aqui embaixo que meu comercial vai entrar em contato com você agora.", "permalink": "https://www.instagram.com/p/DX9iV82DiL8/", "reach": 465.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  10,
  0,
  465,
  0,
  0,
  0.021505,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-14 23:00:07", "post_id": "18068264459339235", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 10.0, "comentarios": 0.0, "data_postagem": "2026-05-05 00:00:00", "hora_postagem": "15:10:32", "legenda": "A pediatria não aceita amadores. 👶\n\nUm erro no RECD ou um diagnóstico incompleto pode atrasar anos de desenvolvimento de fala e linguagem de uma criança. Se você sente frio na barriga quando um bebê entra no seu consultório, você precisa de método.\n\nEsta semana, estamos com uma condição especial para a Formação AASI. Ao se inscrever, você garante sua vaga na minha próxima Imersão em Pediatria.\n\nÉ a oportunidade de dominar do básico ao avançado, com segurança total.👉 \n\nComenta \"EU QUERO\" aqui embaixo que meu comercial vai entrar em contato com você agora.", "permalink": "https://www.instagram.com/p/DX9iV82DiL8/", "reach": 465.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18081060182270997',
    '2026-05-14 01:46:32'::timestamptz,
    '2026-05-04'::date,
    '21:54:18'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O mercado de audiologia em 2024 não aceita mais o "arroz com feijão". 🛑

O paciente que chega ao seu consultório hoje já pesquisou no Google, já viu vídeos no YouTube e não quer apenas comprar um aparelho. Ele busca uma especialista que domine o que o software não resolve sozinho: o zumbido incapacitante, a queixa persistente no ruído e a insegurança do diagnóstico.

Ser uma Fono Premium é ter o Raciocínio Clínico como sua maior ferramenta de venda. É parar de brigar por preço e passar a ser escolhida pelo valor que você entrega. 

💎Se você quer essa segurança para atender de bebês a idosos, a hora é agora.

👉 Digite "PREMIUM" nos comentários que o meu time comercial vai te enviar todos os detalhes e o link com a condição especial no Direct!',
    'https://www.instagram.com/p/DX7rwZjmuJG/',
    '{"data_coleta": "2026-05-14 01:46:32", "post_id": "18081060182270997", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 32.0, "comentarios": 8.0, "data_postagem": "2026-05-04 00:00:00", "hora_postagem": "21:54:18", "legenda": "O mercado de audiologia em 2024 não aceita mais o \"arroz com feijão\". 🛑\n\nO paciente que chega ao seu consultório hoje já pesquisou no Google, já viu vídeos no YouTube e não quer apenas comprar um aparelho. Ele busca uma especialista que domine o que o software não resolve sozinho: o zumbido incapacitante, a queixa persistente no ruído e a insegurança do diagnóstico.\n\nSer uma Fono Premium é ter o Raciocínio Clínico como sua maior ferramenta de venda. É parar de brigar por preço e passar a ser escolhida pelo valor que você entrega. \n\n💎Se você quer essa segurança para atender de bebês a idosos, a hora é agora.\n\n👉 Digite \"PREMIUM\" nos comentários que o meu time comercial vai te enviar todos os detalhes e o link com a condição especial no Direct!", "permalink": "https://www.instagram.com/p/DX7rwZjmuJG/", "reach": 903.0, "saved": 2.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  32,
  8,
  903,
  2,
  2,
  0.046512,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-14 01:46:32", "post_id": "18081060182270997", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 32.0, "comentarios": 8.0, "data_postagem": "2026-05-04 00:00:00", "hora_postagem": "21:54:18", "legenda": "O mercado de audiologia em 2024 não aceita mais o \"arroz com feijão\". 🛑\n\nO paciente que chega ao seu consultório hoje já pesquisou no Google, já viu vídeos no YouTube e não quer apenas comprar um aparelho. Ele busca uma especialista que domine o que o software não resolve sozinho: o zumbido incapacitante, a queixa persistente no ruído e a insegurança do diagnóstico.\n\nSer uma Fono Premium é ter o Raciocínio Clínico como sua maior ferramenta de venda. É parar de brigar por preço e passar a ser escolhida pelo valor que você entrega. \n\n💎Se você quer essa segurança para atender de bebês a idosos, a hora é agora.\n\n👉 Digite \"PREMIUM\" nos comentários que o meu time comercial vai te enviar todos os detalhes e o link com a condição especial no Direct!", "permalink": "https://www.instagram.com/p/DX7rwZjmuJG/", "reach": 903.0, "saved": 2.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18074802836244565',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-05-04'::date,
    '19:16:48'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O som está metálico. E agora? 🛑 (Parte 2/2)

Essa é a queixa clássica em perdas descendentes. O paciente, em privação auditiva há anos, estranha o ganho nos agudos. Mas o ajuste fino vai muito além de apenas "baixar o volume".

O segredo está no diagnóstico diferencial:
1️⃣ É falta de costume? Traçamos metas graduais de ganho e aconselhamento.
2️⃣ É distorção por Zona Morta? Entramos com algoritmos de rebaixamento de frequência.

E o que fazer para não errar? Verificação objetiva (microfone sonda) e testes comportamentais de fala.

🧠👉 Como você conduz essa queixa de som metálico no seu consultório? Comenta aqui embaixo!',
    'https://www.instagram.com/reel/DX7ZjQzNULY/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18074802836244565", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-05-04 00:00:00", "hora_postagem": "19:16:48", "legenda": "O som está metálico. E agora? 🛑 (Parte 2/2)\n\nEssa é a queixa clássica em perdas descendentes. O paciente, em privação auditiva há anos, estranha o ganho nos agudos. Mas o ajuste fino vai muito além de apenas \"baixar o volume\".\n\nO segredo está no diagnóstico diferencial:\n1️⃣ É falta de costume? Traçamos metas graduais de ganho e aconselhamento.\n2️⃣ É distorção por Zona Morta? Entramos com algoritmos de rebaixamento de frequência.\n\nE o que fazer para não errar? Verificação objetiva (microfone sonda) e testes comportamentais de fala.\n\n🧠👉 Como você conduz essa queixa de som metálico no seu consultório? Comenta aqui embaixo!", "permalink": "https://www.instagram.com/reel/DX7ZjQzNULY/", "reach": 552.0, "saved": 5.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  34,
  2,
  552,
  5,
  3,
  0.074275,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18074802836244565", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-05-04 00:00:00", "hora_postagem": "19:16:48", "legenda": "O som está metálico. E agora? 🛑 (Parte 2/2)\n\nEssa é a queixa clássica em perdas descendentes. O paciente, em privação auditiva há anos, estranha o ganho nos agudos. Mas o ajuste fino vai muito além de apenas \"baixar o volume\".\n\nO segredo está no diagnóstico diferencial:\n1️⃣ É falta de costume? Traçamos metas graduais de ganho e aconselhamento.\n2️⃣ É distorção por Zona Morta? Entramos com algoritmos de rebaixamento de frequência.\n\nE o que fazer para não errar? Verificação objetiva (microfone sonda) e testes comportamentais de fala.\n\n🧠👉 Como você conduz essa queixa de som metálico no seu consultório? Comenta aqui embaixo!", "permalink": "https://www.instagram.com/reel/DX7ZjQzNULY/", "reach": 552.0, "saved": 5.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18094920890143110',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-30'::date,
    '22:28:57'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O silêncio na pediatria custa caro. 👶

🛑Cada mês que uma criança passa sem a amplificação correta, é um atraso no desenvolvimento de linguagem que pode nunca ser recuperado. Mas o medo de errar o ajuste não pode te travar.

👉 Comenta "CRIANÇA" aqui embaixo para receber a condição especial e falar com o meu comercial.',
    'https://www.instagram.com/p/DXxcisEmg4c/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18094920890143110", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 18.0, "comentarios": 0.0, "data_postagem": "2026-04-30 00:00:00", "hora_postagem": "22:28:57", "legenda": "O silêncio na pediatria custa caro. 👶\n\n🛑Cada mês que uma criança passa sem a amplificação correta, é um atraso no desenvolvimento de linguagem que pode nunca ser recuperado. Mas o medo de errar o ajuste não pode te travar.\n\n👉 Comenta \"CRIANÇA\" aqui embaixo para receber a condição especial e falar com o meu comercial.", "permalink": "https://www.instagram.com/p/DXxcisEmg4c/", "reach": 660.0, "saved": 1.0, "shares": 5.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  18,
  0,
  660,
  1,
  5,
  0.028788,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18094920890143110", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 18.0, "comentarios": 0.0, "data_postagem": "2026-04-30 00:00:00", "hora_postagem": "22:28:57", "legenda": "O silêncio na pediatria custa caro. 👶\n\n🛑Cada mês que uma criança passa sem a amplificação correta, é um atraso no desenvolvimento de linguagem que pode nunca ser recuperado. Mas o medo de errar o ajuste não pode te travar.\n\n👉 Comenta \"CRIANÇA\" aqui embaixo para receber a condição especial e falar com o meu comercial.", "permalink": "https://www.instagram.com/p/DXxcisEmg4c/", "reach": 660.0, "saved": 1.0, "shares": 5.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18010658624891735',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-30'::date,
    '17:27:41'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Você já se perdeu tanto nos ajustes que teve que resetar o aparelho e começar do zero? 🛑

Esse é o erro número 1 que eu vejo no consultório: tentar resolver uma queixa na base da "tentativa e erro". Quando você mexe em várias funções ao mesmo tempo, você perde o parâmetro do que realmente funcionou ou piorou a situação.

O ajuste fino de excelência exige que você esmiúce a queixa e valide hipóteses. Menos cliques aleatórios, mais raciocínio clínico. 🧠

Esta é a Parte 1. Mais tarde posto a Parte 2 com o próximo passo para você dominar essa conduta.

👉 Você já passou por esse sufoco de ter que recomeçar um ajuste do zero? Me conta aqui nos comentários!',
    'https://www.instagram.com/reel/DXw58EFNCgr/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18010658624891735", "tipo_postagem": "VIDEO", "likes": 19.0, "comentarios": 0.0, "data_postagem": "2026-04-30 00:00:00", "hora_postagem": "17:27:41", "legenda": "Você já se perdeu tanto nos ajustes que teve que resetar o aparelho e começar do zero? 🛑\n\nEsse é o erro número 1 que eu vejo no consultório: tentar resolver uma queixa na base da \"tentativa e erro\". Quando você mexe em várias funções ao mesmo tempo, você perde o parâmetro do que realmente funcionou ou piorou a situação.\n\nO ajuste fino de excelência exige que você esmiúce a queixa e valide hipóteses. Menos cliques aleatórios, mais raciocínio clínico. 🧠\n\nEsta é a Parte 1. Mais tarde posto a Parte 2 com o próximo passo para você dominar essa conduta.\n\n👉 Você já passou por esse sufoco de ter que recomeçar um ajuste do zero? Me conta aqui nos comentários!", "permalink": "https://www.instagram.com/reel/DXw58EFNCgr/", "reach": 760.0, "saved": 2.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  19,
  0,
  760,
  2,
  0,
  0.027632,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18010658624891735", "tipo_postagem": "VIDEO", "likes": 19.0, "comentarios": 0.0, "data_postagem": "2026-04-30 00:00:00", "hora_postagem": "17:27:41", "legenda": "Você já se perdeu tanto nos ajustes que teve que resetar o aparelho e começar do zero? 🛑\n\nEsse é o erro número 1 que eu vejo no consultório: tentar resolver uma queixa na base da \"tentativa e erro\". Quando você mexe em várias funções ao mesmo tempo, você perde o parâmetro do que realmente funcionou ou piorou a situação.\n\nO ajuste fino de excelência exige que você esmiúce a queixa e valide hipóteses. Menos cliques aleatórios, mais raciocínio clínico. 🧠\n\nEsta é a Parte 1. Mais tarde posto a Parte 2 com o próximo passo para você dominar essa conduta.\n\n👉 Você já passou por esse sufoco de ter que recomeçar um ajuste do zero? Me conta aqui nos comentários!", "permalink": "https://www.instagram.com/reel/DXw58EFNCgr/", "reach": 760.0, "saved": 2.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18042494081569804',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-29'::date,
    '15:12:39'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O software é uma ferramenta, não o seu cérebro clínico. 🛑

A fonoaudiologia evoluiu, e o paciente de hoje busca uma especialista, não apenas alguém que aperta botões no computador.

Ser uma Fono Premium significa dominar a tecnologia para que ela trabalhe a seu favor — e não o contrário. É ter a segurança de realizar um mapeamento de fala preciso e saber exatamente como agir em casos complexos, como perdas unilaterais.

 OPORTUNIDADE ÚNICA: Ao garantir sua vaga na Formação AASI, você não apenas domina a seleção e adaptação de AASI, mas também ganha de bônus a minha próxima Imersão em Pediatria.

É o combo perfeito para você se tornar a maior referência da sua região, atendendo de bebês a idosos com excelência.🚀

👉 Digite OFERTA aqui nos comentários para receber os detalhes e o link com a condição especial diretamente no seu Direct!',
    'https://www.instagram.com/p/DXuF0Pujm3B/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18042494081569804", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 24.0, "comentarios": 8.0, "data_postagem": "2026-04-29 00:00:00", "hora_postagem": "15:12:39", "legenda": "O software é uma ferramenta, não o seu cérebro clínico. 🛑\n\nA fonoaudiologia evoluiu, e o paciente de hoje busca uma especialista, não apenas alguém que aperta botões no computador.\n\nSer uma Fono Premium significa dominar a tecnologia para que ela trabalhe a seu favor — e não o contrário. É ter a segurança de realizar um mapeamento de fala preciso e saber exatamente como agir em casos complexos, como perdas unilaterais.\n\n OPORTUNIDADE ÚNICA: Ao garantir sua vaga na Formação AASI, você não apenas domina a seleção e adaptação de AASI, mas também ganha de bônus a minha próxima Imersão em Pediatria.\n\nÉ o combo perfeito para você se tornar a maior referência da sua região, atendendo de bebês a idosos com excelência.🚀\n\n👉 Digite OFERTA aqui nos comentários para receber os detalhes e o link com a condição especial diretamente no seu Direct!", "permalink": "https://www.instagram.com/p/DXuF0Pujm3B/", "reach": 814.0, "saved": 5.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  24,
  8,
  814,
  5,
  1,
  0.045455,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18042494081569804", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 24.0, "comentarios": 8.0, "data_postagem": "2026-04-29 00:00:00", "hora_postagem": "15:12:39", "legenda": "O software é uma ferramenta, não o seu cérebro clínico. 🛑\n\nA fonoaudiologia evoluiu, e o paciente de hoje busca uma especialista, não apenas alguém que aperta botões no computador.\n\nSer uma Fono Premium significa dominar a tecnologia para que ela trabalhe a seu favor — e não o contrário. É ter a segurança de realizar um mapeamento de fala preciso e saber exatamente como agir em casos complexos, como perdas unilaterais.\n\n OPORTUNIDADE ÚNICA: Ao garantir sua vaga na Formação AASI, você não apenas domina a seleção e adaptação de AASI, mas também ganha de bônus a minha próxima Imersão em Pediatria.\n\nÉ o combo perfeito para você se tornar a maior referência da sua região, atendendo de bebês a idosos com excelência.🚀\n\n👉 Digite OFERTA aqui nos comentários para receber os detalhes e o link com a condição especial diretamente no seu Direct!", "permalink": "https://www.instagram.com/p/DXuF0Pujm3B/", "reach": 814.0, "saved": 5.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17925520182295753',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-27'::date,
    '20:37:24'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O aparelho auditivo não falhou. O diagnóstico falhou. 🛑

Muitas vezes, a criança não evolui na terapia e o primeiro culpado apontado é a tecnologia. Mas a verdade pode estar meses atrás, no dia do exame.

Basear uma adaptação pediátrica apenas no BERA Click é como tentar montar um quebra-cabeça sem ver a imagem da caixa. O Click não nos dá a configuração da perda nem a sensibilidade para frequências específicas. Sem isso, a regulagem do aparelho é baseada em "achismo", não em dados.

Na pediatria, a regra é clara: sem Crosscheck, não existe diagnóstico. 🧠

Esse post te mostra o checklist obrigatório para um diagnóstico completo e uma intervenção que realmente priorize o desenvolvimento da fala e linguagem.

👉 Salve este post para consultar sempre que receber um caso de diagnóstico incompleto na sua clínica!',
    'https://www.instagram.com/p/DXphZCkmkSg/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17925520182295753", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 67.0, "comentarios": 4.0, "data_postagem": "2026-04-27 00:00:00", "hora_postagem": "20:37:24", "legenda": "O aparelho auditivo não falhou. O diagnóstico falhou. 🛑\n\nMuitas vezes, a criança não evolui na terapia e o primeiro culpado apontado é a tecnologia. Mas a verdade pode estar meses atrás, no dia do exame.\n\nBasear uma adaptação pediátrica apenas no BERA Click é como tentar montar um quebra-cabeça sem ver a imagem da caixa. O Click não nos dá a configuração da perda nem a sensibilidade para frequências específicas. Sem isso, a regulagem do aparelho é baseada em \"achismo\", não em dados.\n\nNa pediatria, a regra é clara: sem Crosscheck, não existe diagnóstico. 🧠\n\nEsse post te mostra o checklist obrigatório para um diagnóstico completo e uma intervenção que realmente priorize o desenvolvimento da fala e linguagem.\n\n👉 Salve este post para consultar sempre que receber um caso de diagnóstico incompleto na sua clínica!", "permalink": "https://www.instagram.com/p/DXphZCkmkSg/", "reach": 1623.0, "saved": 15.0, "shares": 10.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  67,
  4,
  1623,
  15,
  10,
  0.052988,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17925520182295753", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 67.0, "comentarios": 4.0, "data_postagem": "2026-04-27 00:00:00", "hora_postagem": "20:37:24", "legenda": "O aparelho auditivo não falhou. O diagnóstico falhou. 🛑\n\nMuitas vezes, a criança não evolui na terapia e o primeiro culpado apontado é a tecnologia. Mas a verdade pode estar meses atrás, no dia do exame.\n\nBasear uma adaptação pediátrica apenas no BERA Click é como tentar montar um quebra-cabeça sem ver a imagem da caixa. O Click não nos dá a configuração da perda nem a sensibilidade para frequências específicas. Sem isso, a regulagem do aparelho é baseada em \"achismo\", não em dados.\n\nNa pediatria, a regra é clara: sem Crosscheck, não existe diagnóstico. 🧠\n\nEsse post te mostra o checklist obrigatório para um diagnóstico completo e uma intervenção que realmente priorize o desenvolvimento da fala e linguagem.\n\n👉 Salve este post para consultar sempre que receber um caso de diagnóstico incompleto na sua clínica!", "permalink": "https://www.instagram.com/p/DXphZCkmkSg/", "reach": 1623.0, "saved": 15.0, "shares": 10.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18049733798558456',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-22'::date,
    '23:09:53'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Chega até arrepiar!
Qual outro filme você acrescentaria na lista?? #audiologia',
    'https://www.instagram.com/reel/DXc6zGDjYwT/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18049733798558456", "tipo_postagem": "VIDEO", "likes": 147.0, "comentarios": 11.0, "data_postagem": "2026-04-22 00:00:00", "hora_postagem": "23:09:53", "legenda": "Chega até arrepiar!\nQual outro filme você acrescentaria na lista?? #audiologia", "permalink": "https://www.instagram.com/reel/DXc6zGDjYwT/", "reach": 3014.0, "saved": 12.0, "shares": 6.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  147,
  11,
  3014,
  12,
  6,
  0.056403,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18049733798558456", "tipo_postagem": "VIDEO", "likes": 147.0, "comentarios": 11.0, "data_postagem": "2026-04-22 00:00:00", "hora_postagem": "23:09:53", "legenda": "Chega até arrepiar!\nQual outro filme você acrescentaria na lista?? #audiologia", "permalink": "https://www.instagram.com/reel/DXc6zGDjYwT/", "reach": 3014.0, "saved": 12.0, "shares": 6.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17949959016134663',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-22'::date,
    '13:41:59'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Reuni tudo o que você precisa sobre fisiologia, evidência científica e prática clínica para discutir casos complexos e aplicar na sua rotina, deixando a decoreba de lado e entendendo o que realmente faz.

Comente MAPA para receber o link e garantir sua vaga!

#fonoaudiologia #fonodiologa #audiologista #diagnósticoaudio #raciocinioclinico #fono #educaçãoaudiológica #mapa #aasi',
    'https://www.instagram.com/p/DXb54Gnjs02/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17949959016134663", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 23.0, "comentarios": 12.0, "data_postagem": "2026-04-22 00:00:00", "hora_postagem": "13:41:59", "legenda": "Reuni tudo o que você precisa sobre fisiologia, evidência científica e prática clínica para discutir casos complexos e aplicar na sua rotina, deixando a decoreba de lado e entendendo o que realmente faz.\n\nComente MAPA para receber o link e garantir sua vaga!\n\n#fonoaudiologia #fonodiologa #audiologista #diagnósticoaudio #raciocinioclinico #fono #educaçãoaudiológica #mapa #aasi", "permalink": "https://www.instagram.com/p/DXb54Gnjs02/", "reach": 521.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  23,
  12,
  521,
  1,
  0,
  0.069098,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17949959016134663", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 23.0, "comentarios": 12.0, "data_postagem": "2026-04-22 00:00:00", "hora_postagem": "13:41:59", "legenda": "Reuni tudo o que você precisa sobre fisiologia, evidência científica e prática clínica para discutir casos complexos e aplicar na sua rotina, deixando a decoreba de lado e entendendo o que realmente faz.\n\nComente MAPA para receber o link e garantir sua vaga!\n\n#fonoaudiologia #fonodiologa #audiologista #diagnósticoaudio #raciocinioclinico #fono #educaçãoaudiológica #mapa #aasi", "permalink": "https://www.instagram.com/p/DXb54Gnjs02/", "reach": 521.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18327860233145276',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-20'::date,
    '12:53:40'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Um meme que representa a fono muito bem.

⬇️ Continue nos comentários: Morreu de tanto…

.

.

.

#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #RaciocínioClínico',
    'https://www.instagram.com/p/DXWqwZGDgK_/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18327860233145276", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 562.0, "comentarios": 17.0, "data_postagem": "2026-04-20 00:00:00", "hora_postagem": "12:53:40", "legenda": "Um meme que representa a fono muito bem.\n\n⬇️ Continue nos comentários: Morreu de tanto…\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #RaciocínioClínico", "permalink": "https://www.instagram.com/p/DXWqwZGDgK_/", "reach": 13537.0, "saved": 48.0, "shares": 231.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  562,
  17,
  13537,
  48,
  231,
  0.046318,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18327860233145276", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 562.0, "comentarios": 17.0, "data_postagem": "2026-04-20 00:00:00", "hora_postagem": "12:53:40", "legenda": "Um meme que representa a fono muito bem.\n\n⬇️ Continue nos comentários: Morreu de tanto…\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #RaciocínioClínico", "permalink": "https://www.instagram.com/p/DXWqwZGDgK_/", "reach": 13537.0, "saved": 48.0, "shares": 231.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18077187293404696',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-18'::date,
    '21:24:31'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Eu nem sei por onde começar a agradecer por TANTA coisa boa!

@audiologiabrasil @michelemvg @cil21 Muito muito obrigada pelo convite para participar do EIA2026, em uma mesa tão especial, ao lado de referências. Foi uma imensa honra, uma grande realização!

@elisabiasehopman @nay_aandrade @lepagliuso @gio.wanna_ e Diego, obrigada por toda parceria, amizade e apoio de sempre! É um grande privilégio estar ao lado de vocês!

As minhas referências em audiologia, que é sempre uma grande alegria poder rever e escutar! @fga.dra.anaterezamagalhaes @goffivaleria  @jeziela_moro @fernandaurelio @michelemvg 

@fonobrunamedeiros @jk.lima amei conhecê-los pessoalmente!! Vamos montar esse feat!

E, ÓBVIO, um agradecimento especial para toooooodos os alunos e seguidores que encontrei pelo congresso, pelo carinho, pelas conversas e por deixarem esse encontro ainda mais especial!

Tudo aqui começou como um sonho e vocês me ajudam a realiza-lo todos os dias ❤️❤️❤️',
    'https://www.instagram.com/p/DXSboP_mrAJ/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18077187293404696", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 317.0, "comentarios": 51.0, "data_postagem": "2026-04-18 00:00:00", "hora_postagem": "21:24:31", "legenda": "Eu nem sei por onde começar a agradecer por TANTA coisa boa!\n\n@audiologiabrasil @michelemvg @cil21 Muito muito obrigada pelo convite para participar do EIA2026, em uma mesa tão especial, ao lado de referências. Foi uma imensa honra, uma grande realização!\n\n@elisabiasehopman @nay_aandrade @lepagliuso @gio.wanna_ e Diego, obrigada por toda parceria, amizade e apoio de sempre! É um grande privilégio estar ao lado de vocês!\n\nAs minhas referências em audiologia, que é sempre uma grande alegria poder rever e escutar! @fga.dra.anaterezamagalhaes @goffivaleria  @jeziela_moro @fernandaurelio @michelemvg \n\n@fonobrunamedeiros @jk.lima amei conhecê-los pessoalmente!! Vamos montar esse feat!\n\nE, ÓBVIO, um agradecimento especial para toooooodos os alunos e seguidores que encontrei pelo congresso, pelo carinho, pelas conversas e por deixarem esse encontro ainda mais especial!\n\nTudo aqui começou como um sonho e vocês me ajudam a realiza-lo todos os dias ❤️❤️❤️", "permalink": "https://www.instagram.com/p/DXSboP_mrAJ/", "reach": 2761.0, "saved": 2.0, "shares": 5.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  317,
  51,
  2761,
  2,
  5,
  0.134009,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18077187293404696", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 317.0, "comentarios": 51.0, "data_postagem": "2026-04-18 00:00:00", "hora_postagem": "21:24:31", "legenda": "Eu nem sei por onde começar a agradecer por TANTA coisa boa!\n\n@audiologiabrasil @michelemvg @cil21 Muito muito obrigada pelo convite para participar do EIA2026, em uma mesa tão especial, ao lado de referências. Foi uma imensa honra, uma grande realização!\n\n@elisabiasehopman @nay_aandrade @lepagliuso @gio.wanna_ e Diego, obrigada por toda parceria, amizade e apoio de sempre! É um grande privilégio estar ao lado de vocês!\n\nAs minhas referências em audiologia, que é sempre uma grande alegria poder rever e escutar! @fga.dra.anaterezamagalhaes @goffivaleria  @jeziela_moro @fernandaurelio @michelemvg \n\n@fonobrunamedeiros @jk.lima amei conhecê-los pessoalmente!! Vamos montar esse feat!\n\nE, ÓBVIO, um agradecimento especial para toooooodos os alunos e seguidores que encontrei pelo congresso, pelo carinho, pelas conversas e por deixarem esse encontro ainda mais especial!\n\nTudo aqui começou como um sonho e vocês me ajudam a realiza-lo todos os dias ❤️❤️❤️", "permalink": "https://www.instagram.com/p/DXSboP_mrAJ/", "reach": 2761.0, "saved": 2.0, "shares": 5.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18059101454687022',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-16'::date,
    '12:14:31'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Um meme que representa o fono muito bem.

⬇️ Continue nos comentários, morreu de tanto…

.

.

.

#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #raciocinioclinico',
    'https://www.instagram.com/reel/DXMTCTRDccv/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18059101454687022", "tipo_postagem": "VIDEO", "likes": 147.0, "comentarios": 9.0, "data_postagem": "2026-04-16 00:00:00", "hora_postagem": "12:14:31", "legenda": "Um meme que representa o fono muito bem.\n\n⬇️ Continue nos comentários, morreu de tanto…\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #raciocinioclinico", "permalink": "https://www.instagram.com/reel/DXMTCTRDccv/", "reach": 2132.0, "saved": 7.0, "shares": 103.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  147,
  9,
  2132,
  7,
  103,
  0.076454,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18059101454687022", "tipo_postagem": "VIDEO", "likes": 147.0, "comentarios": 9.0, "data_postagem": "2026-04-16 00:00:00", "hora_postagem": "12:14:31", "legenda": "Um meme que representa o fono muito bem.\n\n⬇️ Continue nos comentários, morreu de tanto…\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #Aprendizado #Perseverança #raciocinioclinico", "permalink": "https://www.instagram.com/reel/DXMTCTRDccv/", "reach": 2132.0, "saved": 7.0, "shares": 103.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18099534803082706',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-15'::date,
    '18:54:01'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '14 anos que minha vida é com você. 
14 anos da minha melhor decisão até a família que construímos, muito melhor do que qualquer sonho que já tive. 
Obrigada por ser tudo pra mim.
Te amo cada dia mais, até o infinito ❤️🫶🏼',
    'https://www.instagram.com/reel/DXKbbcUDYex/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18099534803082706", "tipo_postagem": "VIDEO", "likes": 97.0, "comentarios": 12.0, "data_postagem": "2026-04-15 00:00:00", "hora_postagem": "18:54:01", "legenda": "14 anos que minha vida é com você. \n14 anos da minha melhor decisão até a família que construímos, muito melhor do que qualquer sonho que já tive. \nObrigada por ser tudo pra mim.\nTe amo cada dia mais, até o infinito ❤️🫶🏼", "permalink": "https://www.instagram.com/reel/DXKbbcUDYex/", "reach": 1194.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  97,
  12,
  1194,
  1,
  0,
  0.092127,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18099534803082706", "tipo_postagem": "VIDEO", "likes": 97.0, "comentarios": 12.0, "data_postagem": "2026-04-15 00:00:00", "hora_postagem": "18:54:01", "legenda": "14 anos que minha vida é com você. \n14 anos da minha melhor decisão até a família que construímos, muito melhor do que qualquer sonho que já tive. \nObrigada por ser tudo pra mim.\nTe amo cada dia mais, até o infinito ❤️🫶🏼", "permalink": "https://www.instagram.com/reel/DXKbbcUDYex/", "reach": 1194.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18138442867518418',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-15'::date,
    '14:48:45'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.

E é possível usar esses pilares em todas as etapas da adaptação do AASI. 

Me conta: qual estratégia vc não deixa de usar nos seus atendimentos?',
    'https://www.instagram.com/p/DXJ_881Dn4E/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18138442867518418", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 119.0, "comentarios": 2.0, "data_postagem": "2026-04-15 00:00:00", "hora_postagem": "14:48:45", "legenda": "Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.\n\nE é possível usar esses pilares em todas as etapas da adaptação do AASI. \n\nMe conta: qual estratégia vc não deixa de usar nos seus atendimentos?", "permalink": "https://www.instagram.com/p/DXJ_881Dn4E/", "reach": 1102.0, "saved": 34.0, "shares": 13.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  119,
  2,
  1102,
  34,
  13,
  0.140653,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18138442867518418", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 119.0, "comentarios": 2.0, "data_postagem": "2026-04-15 00:00:00", "hora_postagem": "14:48:45", "legenda": "Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.\n\nE é possível usar esses pilares em todas as etapas da adaptação do AASI. \n\nMe conta: qual estratégia vc não deixa de usar nos seus atendimentos?", "permalink": "https://www.instagram.com/p/DXJ_881Dn4E/", "reach": 1102.0, "saved": 34.0, "shares": 13.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18090334988239890',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-13'::date,
    '22:58:17'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O audiologista : A

🤣

Sinceramente, todos os dias são novas dificuldades!

Mas o importante é que sempre podemos aprender e ajudar nossos pacientes!

#aasi #aparelhosauditivos #ouvirbem #fono #fonodiologa #audiologista #audiologia #meme #memesbrasil #memesaudiologia',
    'https://www.instagram.com/reel/DXFuVDejRnE/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090334988239890", "tipo_postagem": "VIDEO", "likes": 882.0, "comentarios": 67.0, "data_postagem": "2026-04-13 00:00:00", "hora_postagem": "22:58:17", "legenda": "O audiologista : A\n\n🤣\n\nSinceramente, todos os dias são novas dificuldades!\n\nMas o importante é que sempre podemos aprender e ajudar nossos pacientes!\n\n#aasi #aparelhosauditivos #ouvirbem #fono #fonodiologa #audiologista #audiologia #meme #memesbrasil #memesaudiologia", "permalink": "https://www.instagram.com/reel/DXFuVDejRnE/", "reach": 15349.0, "saved": 70.0, "shares": 362.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  882,
  67,
  15349,
  70,
  362,
  0.066389,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090334988239890", "tipo_postagem": "VIDEO", "likes": 882.0, "comentarios": 67.0, "data_postagem": "2026-04-13 00:00:00", "hora_postagem": "22:58:17", "legenda": "O audiologista : A\n\n🤣\n\nSinceramente, todos os dias são novas dificuldades!\n\nMas o importante é que sempre podemos aprender e ajudar nossos pacientes!\n\n#aasi #aparelhosauditivos #ouvirbem #fono #fonodiologa #audiologista #audiologia #meme #memesbrasil #memesaudiologia", "permalink": "https://www.instagram.com/reel/DXFuVDejRnE/", "reach": 15349.0, "saved": 70.0, "shares": 362.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17985722120976590',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-13'::date,
    '12:38:08'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.

E é possível usar esses pilares em todas as etapas da adaptação do AASI. 

Me conta: qual estratégia vc não deixa de usar nos seus atendimentos?',
    'https://www.instagram.com/p/DXEnajMjkbm/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17985722120976590", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 108.0, "comentarios": 2.0, "data_postagem": "2026-04-13 00:00:00", "hora_postagem": "12:38:08", "legenda": "Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.\n\nE é possível usar esses pilares em todas as etapas da adaptação do AASI. \n\nMe conta: qual estratégia vc não deixa de usar nos seus atendimentos?", "permalink": "https://www.instagram.com/p/DXEnajMjkbm/", "reach": 1112.0, "saved": 21.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  108,
  2,
  1112,
  21,
  3,
  0.117806,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17985722120976590", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 108.0, "comentarios": 2.0, "data_postagem": "2026-04-13 00:00:00", "hora_postagem": "12:38:08", "legenda": "Dois princípios que irão transformar seus atendimentos clínicos: conexão com seu paciente e estratégias reais para nortear a regulagem e a orientação de forma mais objetiva. Esses são dois pilares que considero fundamentais para uma prática premium no AASI.\n\nE é possível usar esses pilares em todas as etapas da adaptação do AASI. \n\nMe conta: qual estratégia vc não deixa de usar nos seus atendimentos?", "permalink": "https://www.instagram.com/p/DXEnajMjkbm/", "reach": 1112.0, "saved": 21.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18210897136334013',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-10'::date,
    '18:12:17'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Rachel Green tem um lugar no meu coração ❤️🫶

Qual sua frase preferida da Rachel Green?! Me conta aqui 👇🏽',
    'https://www.instagram.com/p/DW9fRXYGjYW/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18210897136334013", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 180.0, "comentarios": 0.0, "data_postagem": "2026-04-10 00:00:00", "hora_postagem": "18:12:17", "legenda": "Rachel Green tem um lugar no meu coração ❤️🫶\n\nQual sua frase preferida da Rachel Green?! Me conta aqui 👇🏽", "permalink": "https://www.instagram.com/p/DW9fRXYGjYW/", "reach": 2313.0, "saved": 17.0, "shares": 26.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  180,
  0,
  2313,
  17,
  26,
  0.085171,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18210897136334013", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 180.0, "comentarios": 0.0, "data_postagem": "2026-04-10 00:00:00", "hora_postagem": "18:12:17", "legenda": "Rachel Green tem um lugar no meu coração ❤️🫶\n\nQual sua frase preferida da Rachel Green?! Me conta aqui 👇🏽", "permalink": "https://www.instagram.com/p/DW9fRXYGjYW/", "reach": 2313.0, "saved": 17.0, "shares": 26.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17941577490016386',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-09'::date,
    '20:32:25'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Não é incrível?

Você pode comentar aqui e receber como bônus uma aula completa sobre HIPERACUSIA e materiais de suporte.

Comente Zumbido e receba agora!

.

.

.

.

#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #fonoaudiólogo #audiologia #RaciocínioClínico #zumbidonoouvido',
    'https://www.instagram.com/p/DW7Kg2xmrqn/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17941577490016386", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 16.0, "comentarios": 10.0, "data_postagem": "2026-04-09 00:00:00", "hora_postagem": "20:32:25", "legenda": "Não é incrível?\n\nVocê pode comentar aqui e receber como bônus uma aula completa sobre HIPERACUSIA e materiais de suporte.\n\nComente Zumbido e receba agora!\n\n.\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #fonoaudiólogo #audiologia #RaciocínioClínico #zumbidonoouvido", "permalink": "https://www.instagram.com/p/DW7Kg2xmrqn/", "reach": 531.0, "saved": 5.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  16,
  10,
  531,
  5,
  0,
  0.058380,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17941577490016386", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 16.0, "comentarios": 10.0, "data_postagem": "2026-04-09 00:00:00", "hora_postagem": "20:32:25", "legenda": "Não é incrível?\n\nVocê pode comentar aqui e receber como bônus uma aula completa sobre HIPERACUSIA e materiais de suporte.\n\nComente Zumbido e receba agora!\n\n.\n\n.\n\n.\n\n.\n\n#Fonoaudiologia #RaciocínioClínico #EducaçãoAudiológica #Fisiologia #Imitanciometria #ExameComQualidade #fonoaudiólogo #audiologia #RaciocínioClínico #zumbidonoouvido", "permalink": "https://www.instagram.com/p/DW7Kg2xmrqn/", "reach": 531.0, "saved": 5.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18088983488241701',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-07'::date,
    '20:44:44'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O maior causador de devolução de aparelhos auditivos não é a tecnologia, é a quebra de expectativa. 🛑

Se você entrega o AASI e não prepara o cérebro (e o emocional) do paciente para o que vai acontecer nos primeiros 15 dias, ele vai achar que o aparelho "está com defeito" ou que "é ruim".

A reabilitação auditiva exige um pacto de confiança entre você e o paciente. Fale a verdade desde o primeiro minuto. O desconforto inicial faz parte da aclimatação.

👉 Qual dessas verdades é a mais difícil do paciente aceitar aí na sua clínica? Me conta nos comentários! E já salva esse checklist para não esquecer de falar nada na sua próxima entrega.',
    'https://www.instagram.com/reel/DW2CTSYjWyZ/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18088983488241701", "tipo_postagem": "VIDEO", "likes": 168.0, "comentarios": 7.0, "data_postagem": "2026-04-07 00:00:00", "hora_postagem": "20:44:44", "legenda": "O maior causador de devolução de aparelhos auditivos não é a tecnologia, é a quebra de expectativa. 🛑\n\nSe você entrega o AASI e não prepara o cérebro (e o emocional) do paciente para o que vai acontecer nos primeiros 15 dias, ele vai achar que o aparelho \"está com defeito\" ou que \"é ruim\".\n\nA reabilitação auditiva exige um pacto de confiança entre você e o paciente. Fale a verdade desde o primeiro minuto. O desconforto inicial faz parte da aclimatação.\n\n👉 Qual dessas verdades é a mais difícil do paciente aceitar aí na sua clínica? Me conta nos comentários! E já salva esse checklist para não esquecer de falar nada na sua próxima entrega.", "permalink": "https://www.instagram.com/reel/DW2CTSYjWyZ/", "reach": 3206.0, "saved": 51.0, "shares": 52.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  168,
  7,
  3206,
  51,
  52,
  0.070493,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18088983488241701", "tipo_postagem": "VIDEO", "likes": 168.0, "comentarios": 7.0, "data_postagem": "2026-04-07 00:00:00", "hora_postagem": "20:44:44", "legenda": "O maior causador de devolução de aparelhos auditivos não é a tecnologia, é a quebra de expectativa. 🛑\n\nSe você entrega o AASI e não prepara o cérebro (e o emocional) do paciente para o que vai acontecer nos primeiros 15 dias, ele vai achar que o aparelho \"está com defeito\" ou que \"é ruim\".\n\nA reabilitação auditiva exige um pacto de confiança entre você e o paciente. Fale a verdade desde o primeiro minuto. O desconforto inicial faz parte da aclimatação.\n\n👉 Qual dessas verdades é a mais difícil do paciente aceitar aí na sua clínica? Me conta nos comentários! E já salva esse checklist para não esquecer de falar nada na sua próxima entrega.", "permalink": "https://www.instagram.com/reel/DW2CTSYjWyZ/", "reach": 3206.0, "saved": 51.0, "shares": 52.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18024865022635342',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-06'::date,
    '16:31:16'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '06.04.2026
4 anos que temos o privilégio de ser seus pais, te ver crescer, desbravar o mundo, aprender tudo e se tornar esse menininho cheio de amor e carinho. 
Que Deus abençoe, proteja e ilumine cada passa seu. 
Te amamos além do infinito, meu amor. Feliz 4 anos ❤️',
    'https://www.instagram.com/reel/DWzAK9tDswB/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18024865022635342", "tipo_postagem": "VIDEO", "likes": 74.0, "comentarios": 20.0, "data_postagem": "2026-04-06 00:00:00", "hora_postagem": "16:31:16", "legenda": "06.04.2026\n4 anos que temos o privilégio de ser seus pais, te ver crescer, desbravar o mundo, aprender tudo e se tornar esse menininho cheio de amor e carinho. \nQue Deus abençoe, proteja e ilumine cada passa seu. \nTe amamos além do infinito, meu amor. Feliz 4 anos ❤️", "permalink": "https://www.instagram.com/reel/DWzAK9tDswB/", "reach": 863.0, "saved": 2.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  74,
  20,
  863,
  2,
  0,
  0.111240,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18024865022635342", "tipo_postagem": "VIDEO", "likes": 74.0, "comentarios": 20.0, "data_postagem": "2026-04-06 00:00:00", "hora_postagem": "16:31:16", "legenda": "06.04.2026\n4 anos que temos o privilégio de ser seus pais, te ver crescer, desbravar o mundo, aprender tudo e se tornar esse menininho cheio de amor e carinho. \nQue Deus abençoe, proteja e ilumine cada passa seu. \nTe amamos além do infinito, meu amor. Feliz 4 anos ❤️", "permalink": "https://www.instagram.com/reel/DWzAK9tDswB/", "reach": 863.0, "saved": 2.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18093776597278827',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-03'::date,
    '14:08:38'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Criança NÃO é um adulto em miniatura (e muito menos "só uma orelha pequena") ❌

Se você atende pediatria usando os mesmos parâmetros de software e regras de prescrição de um adulto, você está caminhando por uma linha muito fina entre dois erros clínicos trágicos:

1️⃣ Superamplificar e causar um trauma acústico irreversível no bebê.

2️⃣ Subamplificar e atrasar todo o desenvolvimento de fala e linguagem dessa criança.

Na pediatria, o tempo voa e a margem de erro é ZERO. O "First Fit" do software não faz o trabalho por você. É obrigatório dominar medidas como o RECD e ter protocolos extremamente rigorosos desde o primeiro diagnóstico.

Esse é um dos nichos mais rentáveis, lindos e gratificantes da audiologia, mas a regra do mercado é muito clara: a pediatria não aceita amadores.

Quer ter segurança absoluta para atender os pequenos?

Dentro do Combo Fono Premium, nós teremos DUAS imersões completas focadas 100% em Pediatria, além de todos os outros treinamentos avançados.

🚨 AS VAGAS ENCERRAM HOJE!
👉 Clique no link da bio, garanta o seu Combo com a condição inédita de Mês do Consumidor e blinde a sua conduta clínica.',
    'https://www.instagram.com/reel/DWrBvK9DZfS/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18093776597278827", "tipo_postagem": "VIDEO", "likes": 31.0, "comentarios": 0.0, "data_postagem": "2026-04-03 00:00:00", "hora_postagem": "14:08:38", "legenda": "Criança NÃO é um adulto em miniatura (e muito menos \"só uma orelha pequena\") ❌\n\nSe você atende pediatria usando os mesmos parâmetros de software e regras de prescrição de um adulto, você está caminhando por uma linha muito fina entre dois erros clínicos trágicos:\n\n1️⃣ Superamplificar e causar um trauma acústico irreversível no bebê.\n\n2️⃣ Subamplificar e atrasar todo o desenvolvimento de fala e linguagem dessa criança.\n\nNa pediatria, o tempo voa e a margem de erro é ZERO. O \"First Fit\" do software não faz o trabalho por você. É obrigatório dominar medidas como o RECD e ter protocolos extremamente rigorosos desde o primeiro diagnóstico.\n\nEsse é um dos nichos mais rentáveis, lindos e gratificantes da audiologia, mas a regra do mercado é muito clara: a pediatria não aceita amadores.\n\nQuer ter segurança absoluta para atender os pequenos?\n\nDentro do Combo Fono Premium, nós teremos DUAS imersões completas focadas 100% em Pediatria, além de todos os outros treinamentos avançados.\n\n🚨 AS VAGAS ENCERRAM HOJE!\n👉 Clique no link da bio, garanta o seu Combo com a condição inédita de Mês do Consumidor e blinde a sua conduta clínica.", "permalink": "https://www.instagram.com/reel/DWrBvK9DZfS/", "reach": 838.0, "saved": 3.0, "shares": 7.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  31,
  0,
  838,
  3,
  7,
  0.040573,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18093776597278827", "tipo_postagem": "VIDEO", "likes": 31.0, "comentarios": 0.0, "data_postagem": "2026-04-03 00:00:00", "hora_postagem": "14:08:38", "legenda": "Criança NÃO é um adulto em miniatura (e muito menos \"só uma orelha pequena\") ❌\n\nSe você atende pediatria usando os mesmos parâmetros de software e regras de prescrição de um adulto, você está caminhando por uma linha muito fina entre dois erros clínicos trágicos:\n\n1️⃣ Superamplificar e causar um trauma acústico irreversível no bebê.\n\n2️⃣ Subamplificar e atrasar todo o desenvolvimento de fala e linguagem dessa criança.\n\nNa pediatria, o tempo voa e a margem de erro é ZERO. O \"First Fit\" do software não faz o trabalho por você. É obrigatório dominar medidas como o RECD e ter protocolos extremamente rigorosos desde o primeiro diagnóstico.\n\nEsse é um dos nichos mais rentáveis, lindos e gratificantes da audiologia, mas a regra do mercado é muito clara: a pediatria não aceita amadores.\n\nQuer ter segurança absoluta para atender os pequenos?\n\nDentro do Combo Fono Premium, nós teremos DUAS imersões completas focadas 100% em Pediatria, além de todos os outros treinamentos avançados.\n\n🚨 AS VAGAS ENCERRAM HOJE!\n👉 Clique no link da bio, garanta o seu Combo com a condição inédita de Mês do Consumidor e blinde a sua conduta clínica.", "permalink": "https://www.instagram.com/reel/DWrBvK9DZfS/", "reach": 838.0, "saved": 3.0, "shares": 7.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17890329750332579',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-02'::date,
    '17:57:49'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O maior pesadelo da sua clínica não é perder uma venda. É o paciente comprar, guardar o aparelho na gaveta e falar para a cidade inteira que o seu serviço não presta. ❌

Sabe por que isso acontece? A literatura é clara: os 3 maiores motivos de abandono são a falta de benefício percebido, o excesso de ruído e o desconforto (físico ou auditivo).

Se a sua conduta se resume a plugar o aparelho no software e jogar 100% do ganho prescrito logo no primeiro dia, você está empurrando esse paciente direto para a gaveta.

Adaptação é um PROCESSO, não um evento. 🧠

Você precisa dominar o mapeamento inteligente, o ajuste fino progressivo e o acompanhamento que fideliza. É exatamente isso que eu te ensino do zero ao avançado na Formação AASI Premium.

E o melhor: ela tem Certificação reconhecida pelo MEC e é o carro-chefe do nosso Combo Fono Premium.🚨 AS INSCRIÇÕES SE ENCERRAM EM POUCOS DIAS!

Você está a um clique de levar a Formação AASI e mais 7 treinamentos completos com o maior desconto do ano.

👉 Clique no link da minha bio e garanta o seu Combo (Especial Mês do Consumidor) antes que a oferta saia do ar. Blinde a sua clínica contra devoluções!',
    'https://www.instagram.com/reel/DWo2_wLjeD3/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17890329750332579", "tipo_postagem": "VIDEO", "likes": 23.0, "comentarios": 0.0, "data_postagem": "2026-04-02 00:00:00", "hora_postagem": "17:57:49", "legenda": "O maior pesadelo da sua clínica não é perder uma venda. É o paciente comprar, guardar o aparelho na gaveta e falar para a cidade inteira que o seu serviço não presta. ❌\n\nSabe por que isso acontece? A literatura é clara: os 3 maiores motivos de abandono são a falta de benefício percebido, o excesso de ruído e o desconforto (físico ou auditivo).\n\nSe a sua conduta se resume a plugar o aparelho no software e jogar 100% do ganho prescrito logo no primeiro dia, você está empurrando esse paciente direto para a gaveta.\n\nAdaptação é um PROCESSO, não um evento. 🧠\n\nVocê precisa dominar o mapeamento inteligente, o ajuste fino progressivo e o acompanhamento que fideliza. É exatamente isso que eu te ensino do zero ao avançado na Formação AASI Premium.\n\nE o melhor: ela tem Certificação reconhecida pelo MEC e é o carro-chefe do nosso Combo Fono Premium.🚨 AS INSCRIÇÕES SE ENCERRAM EM POUCOS DIAS!\n\nVocê está a um clique de levar a Formação AASI e mais 7 treinamentos completos com o maior desconto do ano.\n\n👉 Clique no link da minha bio e garanta o seu Combo (Especial Mês do Consumidor) antes que a oferta saia do ar. Blinde a sua clínica contra devoluções!", "permalink": "https://www.instagram.com/reel/DWo2_wLjeD3/", "reach": 609.0, "saved": 2.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  23,
  0,
  609,
  2,
  0,
  0.041051,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17890329750332579", "tipo_postagem": "VIDEO", "likes": 23.0, "comentarios": 0.0, "data_postagem": "2026-04-02 00:00:00", "hora_postagem": "17:57:49", "legenda": "O maior pesadelo da sua clínica não é perder uma venda. É o paciente comprar, guardar o aparelho na gaveta e falar para a cidade inteira que o seu serviço não presta. ❌\n\nSabe por que isso acontece? A literatura é clara: os 3 maiores motivos de abandono são a falta de benefício percebido, o excesso de ruído e o desconforto (físico ou auditivo).\n\nSe a sua conduta se resume a plugar o aparelho no software e jogar 100% do ganho prescrito logo no primeiro dia, você está empurrando esse paciente direto para a gaveta.\n\nAdaptação é um PROCESSO, não um evento. 🧠\n\nVocê precisa dominar o mapeamento inteligente, o ajuste fino progressivo e o acompanhamento que fideliza. É exatamente isso que eu te ensino do zero ao avançado na Formação AASI Premium.\n\nE o melhor: ela tem Certificação reconhecida pelo MEC e é o carro-chefe do nosso Combo Fono Premium.🚨 AS INSCRIÇÕES SE ENCERRAM EM POUCOS DIAS!\n\nVocê está a um clique de levar a Formação AASI e mais 7 treinamentos completos com o maior desconto do ano.\n\n👉 Clique no link da minha bio e garanta o seu Combo (Especial Mês do Consumidor) antes que a oferta saia do ar. Blinde a sua clínica contra devoluções!", "permalink": "https://www.instagram.com/reel/DWo2_wLjeD3/", "reach": 609.0, "saved": 2.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18112969429705018',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-04-01'::date,
    '18:46:50'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O caso desse vídeo é o retrato perfeito do que acontece todos os dias. O paciente chega desenganado por outros médicos porque acha que "escuta bem". Mas quando você vai para a cabine e faz a audiometria e a acufenometria, a ciência acontece: o *pitch* do zumbido bate exatamente onde a curva auditiva começa a cair.

Quando você domina a fisiologia e a conduta clínica para reabilitar um caso complexo como esse, você não ganha apenas um paciente. Você ganha um fã que indica a sua clínica para a cidade inteira. É o fim da briga por preço.

Mas para ter essa segurança e mudar a vida das pessoas, você precisa de método. E é exatamente isso que eu te entrego no Combo Fono Premium.

🚨 AS INSCRIÇÕES ESTÃO ABERTAS!
Reuni meus 8 melhores treinamentos (incluindo a Imersão Zumbido e o Mapa do Raciocínio Clínico) em um acervo definitivo.

👉 Clique no link da minha bio e garanta o seu acesso com o super desconto do Mês do Consumidor. A oferta vai durar pouquíssimos dias. Te vejo do outro lado!',
    'https://www.instagram.com/reel/DWmX8LLjVaH/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18112969429705018", "tipo_postagem": "VIDEO", "likes": 41.0, "comentarios": 0.0, "data_postagem": "2026-04-01 00:00:00", "hora_postagem": "18:46:50", "legenda": "O caso desse vídeo é o retrato perfeito do que acontece todos os dias. O paciente chega desenganado por outros médicos porque acha que \"escuta bem\". Mas quando você vai para a cabine e faz a audiometria e a acufenometria, a ciência acontece: o *pitch* do zumbido bate exatamente onde a curva auditiva começa a cair.\n\nQuando você domina a fisiologia e a conduta clínica para reabilitar um caso complexo como esse, você não ganha apenas um paciente. Você ganha um fã que indica a sua clínica para a cidade inteira. É o fim da briga por preço.\n\nMas para ter essa segurança e mudar a vida das pessoas, você precisa de método. E é exatamente isso que eu te entrego no Combo Fono Premium.\n\n🚨 AS INSCRIÇÕES ESTÃO ABERTAS!\nReuni meus 8 melhores treinamentos (incluindo a Imersão Zumbido e o Mapa do Raciocínio Clínico) em um acervo definitivo.\n\n👉 Clique no link da minha bio e garanta o seu acesso com o super desconto do Mês do Consumidor. A oferta vai durar pouquíssimos dias. Te vejo do outro lado!", "permalink": "https://www.instagram.com/reel/DWmX8LLjVaH/", "reach": 782.0, "saved": 2.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  41,
  0,
  782,
  2,
  1,
  0.054987,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18112969429705018", "tipo_postagem": "VIDEO", "likes": 41.0, "comentarios": 0.0, "data_postagem": "2026-04-01 00:00:00", "hora_postagem": "18:46:50", "legenda": "O caso desse vídeo é o retrato perfeito do que acontece todos os dias. O paciente chega desenganado por outros médicos porque acha que \"escuta bem\". Mas quando você vai para a cabine e faz a audiometria e a acufenometria, a ciência acontece: o *pitch* do zumbido bate exatamente onde a curva auditiva começa a cair.\n\nQuando você domina a fisiologia e a conduta clínica para reabilitar um caso complexo como esse, você não ganha apenas um paciente. Você ganha um fã que indica a sua clínica para a cidade inteira. É o fim da briga por preço.\n\nMas para ter essa segurança e mudar a vida das pessoas, você precisa de método. E é exatamente isso que eu te entrego no Combo Fono Premium.\n\n🚨 AS INSCRIÇÕES ESTÃO ABERTAS!\nReuni meus 8 melhores treinamentos (incluindo a Imersão Zumbido e o Mapa do Raciocínio Clínico) em um acervo definitivo.\n\n👉 Clique no link da minha bio e garanta o seu acesso com o super desconto do Mês do Consumidor. A oferta vai durar pouquíssimos dias. Te vejo do outro lado!", "permalink": "https://www.instagram.com/reel/DWmX8LLjVaH/", "reach": 782.0, "saved": 2.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18075541100179565',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-31'::date,
    '21:15:30'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '🚨 Quase colocaram um aparelho auditivo potente em uma criança com audição NORMAL.

O motivo? Uma rolha de cera que a profissional anterior não viu porque pulou o básico: o Raciocínio Clínico (Crosscheck).

Imagina o trauma acústico e o impacto irreversível no desenvolvimento dessa criança de 2 anos se a gente simplesmente confiasse no encaminhamento médico e no primeiro exame que ela trouxe?

Fonoaudiologia não é só plugar o aparelho no software e dar o "First Fit". É diagnóstico. É cruzar dados. É entender de patologias e anatomia antes mesmo de pensar em amplificação. Se você não domina o Crosscheck, você é um perigo para o seu paciente (seja ele adulto ou criança).

Você não se torna uma Fono Premium pelo equipamento que tem, mas pelo cérebro que comanda a conduta. 🧠

É exatamente por isso que o Combo Fono Premium vai muito além do ajuste fino. Ele te entrega desde a base da fisiologia e audiometria (adulto e infantil) até a resolução de casos complexos como Zumbido e sistema CROS.⏳ As inscrições estão ABERTAS!

Aproveite a nossa condição especial e inédita de Mês do Consumidor. Ela vai durar pouquíssimos dias.👉 Clique no link da minha bio, garanta o seu acervo completo com 8 treinamentos e blinde a sua conduta clínica de erros como esse.',
    'https://www.instagram.com/reel/DWkEMQTjZVj/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18075541100179565", "tipo_postagem": "VIDEO", "likes": 273.0, "comentarios": 30.0, "data_postagem": "2026-03-31 00:00:00", "hora_postagem": "21:15:30", "legenda": "🚨 Quase colocaram um aparelho auditivo potente em uma criança com audição NORMAL.\n\nO motivo? Uma rolha de cera que a profissional anterior não viu porque pulou o básico: o Raciocínio Clínico (Crosscheck).\n\nImagina o trauma acústico e o impacto irreversível no desenvolvimento dessa criança de 2 anos se a gente simplesmente confiasse no encaminhamento médico e no primeiro exame que ela trouxe?\n\nFonoaudiologia não é só plugar o aparelho no software e dar o \"First Fit\". É diagnóstico. É cruzar dados. É entender de patologias e anatomia antes mesmo de pensar em amplificação. Se você não domina o Crosscheck, você é um perigo para o seu paciente (seja ele adulto ou criança).\n\nVocê não se torna uma Fono Premium pelo equipamento que tem, mas pelo cérebro que comanda a conduta. 🧠\n\nÉ exatamente por isso que o Combo Fono Premium vai muito além do ajuste fino. Ele te entrega desde a base da fisiologia e audiometria (adulto e infantil) até a resolução de casos complexos como Zumbido e sistema CROS.⏳ As inscrições estão ABERTAS!\n\nAproveite a nossa condição especial e inédita de Mês do Consumidor. Ela vai durar pouquíssimos dias.👉 Clique no link da minha bio, garanta o seu acervo completo com 8 treinamentos e blinde a sua conduta clínica de erros como esse.", "permalink": "https://www.instagram.com/reel/DWkEMQTjZVj/", "reach": 3527.0, "saved": 24.0, "shares": 47.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  273,
  30,
  3527,
  24,
  47,
  0.092713,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18075541100179565", "tipo_postagem": "VIDEO", "likes": 273.0, "comentarios": 30.0, "data_postagem": "2026-03-31 00:00:00", "hora_postagem": "21:15:30", "legenda": "🚨 Quase colocaram um aparelho auditivo potente em uma criança com audição NORMAL.\n\nO motivo? Uma rolha de cera que a profissional anterior não viu porque pulou o básico: o Raciocínio Clínico (Crosscheck).\n\nImagina o trauma acústico e o impacto irreversível no desenvolvimento dessa criança de 2 anos se a gente simplesmente confiasse no encaminhamento médico e no primeiro exame que ela trouxe?\n\nFonoaudiologia não é só plugar o aparelho no software e dar o \"First Fit\". É diagnóstico. É cruzar dados. É entender de patologias e anatomia antes mesmo de pensar em amplificação. Se você não domina o Crosscheck, você é um perigo para o seu paciente (seja ele adulto ou criança).\n\nVocê não se torna uma Fono Premium pelo equipamento que tem, mas pelo cérebro que comanda a conduta. 🧠\n\nÉ exatamente por isso que o Combo Fono Premium vai muito além do ajuste fino. Ele te entrega desde a base da fisiologia e audiometria (adulto e infantil) até a resolução de casos complexos como Zumbido e sistema CROS.⏳ As inscrições estão ABERTAS!\n\nAproveite a nossa condição especial e inédita de Mês do Consumidor. Ela vai durar pouquíssimos dias.👉 Clique no link da minha bio, garanta o seu acervo completo com 8 treinamentos e blinde a sua conduta clínica de erros como esse.", "permalink": "https://www.instagram.com/reel/DWkEMQTjZVj/", "reach": 3527.0, "saved": 24.0, "shares": 47.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18082586081379008',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-30'::date,
    '22:02:08'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    '🚨 ESTÃO ABERTAS AS INSCRIÇÕES! 🚨

Chegou a hora de dar um basta na insegurança clínica e parar de depender do "First Fit".

O Combo Fono Premium está no ar com 8 treinamentos completos e um desconto histórico de Mês do Consumidor.

👉 Clique no link da bio e garanta o seu acervo definitivo agora mesmo!',
    'https://www.instagram.com/p/DWhk1KJmlcY/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18082586081379008", "tipo_postagem": "IMAGE", "likes": 6.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "22:02:08", "legenda": "🚨 ESTÃO ABERTAS AS INSCRIÇÕES! 🚨\n\nChegou a hora de dar um basta na insegurança clínica e parar de depender do \"First Fit\".\n\nO Combo Fono Premium está no ar com 8 treinamentos completos e um desconto histórico de Mês do Consumidor.\n\n👉 Clique no link da bio e garanta o seu acervo definitivo agora mesmo!", "permalink": "https://www.instagram.com/p/DWhk1KJmlcY/", "reach": 380.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  6,
  0,
  380,
  1,
  0,
  0.018421,
  'Ruim'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18082586081379008", "tipo_postagem": "IMAGE", "likes": 6.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "22:02:08", "legenda": "🚨 ESTÃO ABERTAS AS INSCRIÇÕES! 🚨\n\nChegou a hora de dar um basta na insegurança clínica e parar de depender do \"First Fit\".\n\nO Combo Fono Premium está no ar com 8 treinamentos completos e um desconto histórico de Mês do Consumidor.\n\n👉 Clique no link da bio e garanta o seu acervo definitivo agora mesmo!", "permalink": "https://www.instagram.com/p/DWhk1KJmlcY/", "reach": 380.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17851059021659527',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-30'::date,
    '18:15:44'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Faltam exatamente 4 horas para a revelação da oferta do Combo Fono Premium. 

Eu reuni Formação AASI, Imersão Zumbido, Imersão Cros e Bicros, Imersão em Pediatria, Imersão Além do AASI, Mapa do Raciocínio Clínico, Masterclass de verificação de rebaixamento de frequência e Protocolo Fono Premium.

O desconto que vou liberar às 19h no Grupo VIP é algo que nunca fiz e provavelmente nunca mais farei. 

Fique atenta ao seu WhatsApp!',
    'https://www.instagram.com/p/DWhK65lmpER/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17851059021659527", "tipo_postagem": "IMAGE", "likes": 5.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "18:15:44", "legenda": "Faltam exatamente 4 horas para a revelação da oferta do Combo Fono Premium. \n\nEu reuni Formação AASI, Imersão Zumbido, Imersão Cros e Bicros, Imersão em Pediatria, Imersão Além do AASI, Mapa do Raciocínio Clínico, Masterclass de verificação de rebaixamento de frequência e Protocolo Fono Premium.\n\nO desconto que vou liberar às 19h no Grupo VIP é algo que nunca fiz e provavelmente nunca mais farei. \n\nFique atenta ao seu WhatsApp!", "permalink": "https://www.instagram.com/p/DWhK65lmpER/", "reach": 349.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  5,
  0,
  349,
  0,
  0,
  0.014327,
  'Ruim'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17851059021659527", "tipo_postagem": "IMAGE", "likes": 5.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "18:15:44", "legenda": "Faltam exatamente 4 horas para a revelação da oferta do Combo Fono Premium. \n\nEu reuni Formação AASI, Imersão Zumbido, Imersão Cros e Bicros, Imersão em Pediatria, Imersão Além do AASI, Mapa do Raciocínio Clínico, Masterclass de verificação de rebaixamento de frequência e Protocolo Fono Premium.\n\nO desconto que vou liberar às 19h no Grupo VIP é algo que nunca fiz e provavelmente nunca mais farei. \n\nFique atenta ao seu WhatsApp!", "permalink": "https://www.instagram.com/p/DWhK65lmpER/", "reach": 349.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18099517591948721',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-30'::date,
    '12:11:06'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Vamos fazer uma conta rápida e dolorosa. Quanto custa um paciente que entra na sua clínica com zumbido, percebe a sua insegurança, e vai fechar o tratamento na concorrência?

Não é só o valor daquela consulta. É o valor do aparelho que ele não comprou com você. São as indicações que ele não vai fazer. É o famoso LTV (Lifetime Value) jogado no lixo.

A sua insegurança técnica é o "imposto" mais caro que você paga hoje.

Para estancar essa ferida, eu criei o Combo Fono Premium. São 8 treinamentos (da Pediatria à Masterclass de Rebaixamento de Frequência) para você ter resposta para qualquer caso clínico que entrar pela sua porta.

Amanhã é o último dia de espera. Na segunda-feira, eu vou liberar esse acervo com um desconto que, literalmente, se paga com um paciente que você deixar de perder.

🚨 O link será enviado EXCLUSIVAMENTE no nosso Grupo VIP.

👉 Digite COMBO nos comentários e entre no grupo agora. Pare de financiar a concorrência.',
    'https://www.instagram.com/p/DWghMUbDs5z/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18099517591948721", "tipo_postagem": "IMAGE", "likes": 6.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "12:11:06", "legenda": "Vamos fazer uma conta rápida e dolorosa. Quanto custa um paciente que entra na sua clínica com zumbido, percebe a sua insegurança, e vai fechar o tratamento na concorrência?\n\nNão é só o valor daquela consulta. É o valor do aparelho que ele não comprou com você. São as indicações que ele não vai fazer. É o famoso LTV (Lifetime Value) jogado no lixo.\n\nA sua insegurança técnica é o \"imposto\" mais caro que você paga hoje.\n\nPara estancar essa ferida, eu criei o Combo Fono Premium. São 8 treinamentos (da Pediatria à Masterclass de Rebaixamento de Frequência) para você ter resposta para qualquer caso clínico que entrar pela sua porta.\n\nAmanhã é o último dia de espera. Na segunda-feira, eu vou liberar esse acervo com um desconto que, literalmente, se paga com um paciente que você deixar de perder.\n\n🚨 O link será enviado EXCLUSIVAMENTE no nosso Grupo VIP.\n\n👉 Digite COMBO nos comentários e entre no grupo agora. Pare de financiar a concorrência.", "permalink": "https://www.instagram.com/p/DWghMUbDs5z/", "reach": 595.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  6,
  0,
  595,
  1,
  0,
  0.011765,
  'Ruim'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18099517591948721", "tipo_postagem": "IMAGE", "likes": 6.0, "comentarios": 0.0, "data_postagem": "2026-03-30 00:00:00", "hora_postagem": "12:11:06", "legenda": "Vamos fazer uma conta rápida e dolorosa. Quanto custa um paciente que entra na sua clínica com zumbido, percebe a sua insegurança, e vai fechar o tratamento na concorrência?\n\nNão é só o valor daquela consulta. É o valor do aparelho que ele não comprou com você. São as indicações que ele não vai fazer. É o famoso LTV (Lifetime Value) jogado no lixo.\n\nA sua insegurança técnica é o \"imposto\" mais caro que você paga hoje.\n\nPara estancar essa ferida, eu criei o Combo Fono Premium. São 8 treinamentos (da Pediatria à Masterclass de Rebaixamento de Frequência) para você ter resposta para qualquer caso clínico que entrar pela sua porta.\n\nAmanhã é o último dia de espera. Na segunda-feira, eu vou liberar esse acervo com um desconto que, literalmente, se paga com um paciente que você deixar de perder.\n\n🚨 O link será enviado EXCLUSIVAMENTE no nosso Grupo VIP.\n\n👉 Digite COMBO nos comentários e entre no grupo agora. Pare de financiar a concorrência.", "permalink": "https://www.instagram.com/p/DWghMUbDs5z/", "reach": 595.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18115211029659271',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-29'::date,
    '19:02:30'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O mercado de audiologia está se dividindo em dois grupos muito claros: as profissionais que brigam por preço e as profissionais que têm fila de espera.

De qual lado você quer estar?

O paciente particular é exigente. Ele percebe a sua postura desde a anamnese. Se você não tem protocolos claros ou não domina tecnologias avançadas, você vira commodity.

Para te deixar à frente, eu reuni os meus 8 melhores treinamentos no Combo Fono Premium.

👉 Digite COMBO nos comentários e entre no grupo agora.',
    'https://www.instagram.com/p/DWerenLGrOZ/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18115211029659271", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 1.0, "data_postagem": "2026-03-29 00:00:00", "hora_postagem": "19:02:30", "legenda": "O mercado de audiologia está se dividindo em dois grupos muito claros: as profissionais que brigam por preço e as profissionais que têm fila de espera.\n\nDe qual lado você quer estar?\n\nO paciente particular é exigente. Ele percebe a sua postura desde a anamnese. Se você não tem protocolos claros ou não domina tecnologias avançadas, você vira commodity.\n\nPara te deixar à frente, eu reuni os meus 8 melhores treinamentos no Combo Fono Premium.\n\n👉 Digite COMBO nos comentários e entre no grupo agora.", "permalink": "https://www.instagram.com/p/DWerenLGrOZ/", "reach": 628.0, "saved": 5.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  13,
  1,
  628,
  5,
  0,
  0.030255,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18115211029659271", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 1.0, "data_postagem": "2026-03-29 00:00:00", "hora_postagem": "19:02:30", "legenda": "O mercado de audiologia está se dividindo em dois grupos muito claros: as profissionais que brigam por preço e as profissionais que têm fila de espera.\n\nDe qual lado você quer estar?\n\nO paciente particular é exigente. Ele percebe a sua postura desde a anamnese. Se você não tem protocolos claros ou não domina tecnologias avançadas, você vira commodity.\n\nPara te deixar à frente, eu reuni os meus 8 melhores treinamentos no Combo Fono Premium.\n\n👉 Digite COMBO nos comentários e entre no grupo agora.", "permalink": "https://www.instagram.com/p/DWerenLGrOZ/", "reach": 628.0, "saved": 5.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17968547250040944',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-28'::date,
    '14:30:07'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Você já parou para pensar que o problema não é a falta de estrutura da sua clínica, mas a falta de um método claro de atendimento?

Equipamentos são fundamentais, mas eles são apenas ferramentas. Quem comanda é você. Se você ainda depende do "First Fit" ou encaminha pacientes complexos (como zumbido e perdas unilaterais) por insegurança, você está deixando muito dinheiro na mesa.

Neste Mês do Consumidor, eu reuní meus 8 treinamentos mais procurados (incluindo Formação AASI, Mapa do Raciocínio Clínico e Imersão Zumbido) no Combo Fono Premium.

🚨 O super desconto de mês do consumidor para esse combo vai ser revelado na segunda-feira, APENAS no Grupo VIP.

👉 Digite VIP aqui nos comentários para entrar no grupo da oferta',
    'https://www.instagram.com/p/DWbngsIjhKI/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17968547250040944", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 12.0, "comentarios": 5.0, "data_postagem": "2026-03-28 00:00:00", "hora_postagem": "14:30:07", "legenda": "Você já parou para pensar que o problema não é a falta de estrutura da sua clínica, mas a falta de um método claro de atendimento?\n\nEquipamentos são fundamentais, mas eles são apenas ferramentas. Quem comanda é você. Se você ainda depende do \"First Fit\" ou encaminha pacientes complexos (como zumbido e perdas unilaterais) por insegurança, você está deixando muito dinheiro na mesa.\n\nNeste Mês do Consumidor, eu reuní meus 8 treinamentos mais procurados (incluindo Formação AASI, Mapa do Raciocínio Clínico e Imersão Zumbido) no Combo Fono Premium.\n\n🚨 O super desconto de mês do consumidor para esse combo vai ser revelado na segunda-feira, APENAS no Grupo VIP.\n\n👉 Digite VIP aqui nos comentários para entrar no grupo da oferta", "permalink": "https://www.instagram.com/p/DWbngsIjhKI/", "reach": 453.0, "saved": 0.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  12,
  5,
  453,
  0,
  2,
  0.037528,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17968547250040944", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 12.0, "comentarios": 5.0, "data_postagem": "2026-03-28 00:00:00", "hora_postagem": "14:30:07", "legenda": "Você já parou para pensar que o problema não é a falta de estrutura da sua clínica, mas a falta de um método claro de atendimento?\n\nEquipamentos são fundamentais, mas eles são apenas ferramentas. Quem comanda é você. Se você ainda depende do \"First Fit\" ou encaminha pacientes complexos (como zumbido e perdas unilaterais) por insegurança, você está deixando muito dinheiro na mesa.\n\nNeste Mês do Consumidor, eu reuní meus 8 treinamentos mais procurados (incluindo Formação AASI, Mapa do Raciocínio Clínico e Imersão Zumbido) no Combo Fono Premium.\n\n🚨 O super desconto de mês do consumidor para esse combo vai ser revelado na segunda-feira, APENAS no Grupo VIP.\n\n👉 Digite VIP aqui nos comentários para entrar no grupo da oferta", "permalink": "https://www.instagram.com/p/DWbngsIjhKI/", "reach": 453.0, "saved": 0.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18084060233462541',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-27'::date,
    '14:55:41'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '"O seu lado bom dá conta." ❌ Se você já disse (ou pensou) isso, nós precisamos conversar.

A verdade nua e crua? Muitas vezes, o paciente sai sem solução não porque "não tem jeito", mas porque você tem insegurança. O medo de errar na indicação de um sistema CROS/BiCROS, de uma prótese ancorada no osso ou de não saber quando encaminhar para o Implante Coclear faz com que você perca a chance de mudar uma vida (e de faturar com um caso de alto valor).

Dominar casos complexos é o que te transforma em uma Fono Premium. E eu vou te dar o mapa exato para isso. 👇

Neste Mês do Consumidor, eu criei o Combo Fono Premium. Reuni 8 treinamentos (incluindo a Formação AASI Premium, Imersão Cros e BiCros e a Imersão Além do AASI) para blindar a sua conduta clínica.

👉 Digite COMBO aqui nos comentários que eu te mando o link do grupo agora mesmo no seu Direct.',
    'https://www.instagram.com/reel/DWZFi0MDTzU/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084060233462541", "tipo_postagem": "VIDEO", "likes": 61.0, "comentarios": 11.0, "data_postagem": "2026-03-27 00:00:00", "hora_postagem": "14:55:41", "legenda": "\"O seu lado bom dá conta.\" ❌ Se você já disse (ou pensou) isso, nós precisamos conversar.\n\nA verdade nua e crua? Muitas vezes, o paciente sai sem solução não porque \"não tem jeito\", mas porque você tem insegurança. O medo de errar na indicação de um sistema CROS/BiCROS, de uma prótese ancorada no osso ou de não saber quando encaminhar para o Implante Coclear faz com que você perca a chance de mudar uma vida (e de faturar com um caso de alto valor).\n\nDominar casos complexos é o que te transforma em uma Fono Premium. E eu vou te dar o mapa exato para isso. 👇\n\nNeste Mês do Consumidor, eu criei o Combo Fono Premium. Reuni 8 treinamentos (incluindo a Formação AASI Premium, Imersão Cros e BiCros e a Imersão Além do AASI) para blindar a sua conduta clínica.\n\n👉 Digite COMBO aqui nos comentários que eu te mando o link do grupo agora mesmo no seu Direct.", "permalink": "https://www.instagram.com/reel/DWZFi0MDTzU/", "reach": 876.0, "saved": 4.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  61,
  11,
  876,
  4,
  3,
  0.086758,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084060233462541", "tipo_postagem": "VIDEO", "likes": 61.0, "comentarios": 11.0, "data_postagem": "2026-03-27 00:00:00", "hora_postagem": "14:55:41", "legenda": "\"O seu lado bom dá conta.\" ❌ Se você já disse (ou pensou) isso, nós precisamos conversar.\n\nA verdade nua e crua? Muitas vezes, o paciente sai sem solução não porque \"não tem jeito\", mas porque você tem insegurança. O medo de errar na indicação de um sistema CROS/BiCROS, de uma prótese ancorada no osso ou de não saber quando encaminhar para o Implante Coclear faz com que você perca a chance de mudar uma vida (e de faturar com um caso de alto valor).\n\nDominar casos complexos é o que te transforma em uma Fono Premium. E eu vou te dar o mapa exato para isso. 👇\n\nNeste Mês do Consumidor, eu criei o Combo Fono Premium. Reuni 8 treinamentos (incluindo a Formação AASI Premium, Imersão Cros e BiCros e a Imersão Além do AASI) para blindar a sua conduta clínica.\n\n👉 Digite COMBO aqui nos comentários que eu te mando o link do grupo agora mesmo no seu Direct.", "permalink": "https://www.instagram.com/reel/DWZFi0MDTzU/", "reach": 876.0, "saved": 4.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18139584547503024',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-26'::date,
    '20:40:27'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Aquelas curvas perfeitas que aparecem no software do AASI estão te enganando. ❌

A verdade nua e crua é que o software te entrega apenas uma estimativa. Dois pacientes com a exata mesma audiometria podem ter respostas acústicas completamente diferentes dentro do conduto auditivo.

Se você apenas clica no "First Fit" e confia cegamente no gráfico da tela, você está trabalhando na base do achismo. Sem a verificação objetiva, você não sabe se os sons fracos estão audíveis, se os fortes estão confortáveis ou se o rebaixamento de frequência está realmente funcionando.

A verificação objetiva é o que tira a venda dos seus olhos. Mas atenção: ela sozinha não faz milagre. É o seu Raciocínio Clínico que vai interpretar esses dados e comandar o ajuste fino com precisão. Uma Fono Premium usa o software a seu favor, ela não é refém dele.

Neste Mês do Consumidor, eu decidi liberar o mapa completo da Audiologia Premium. Reuni os meus 8 mais pedidos treinamentos no Combo Fono Premium: desde a base da avaliação e mascaramento, até adaptação de AASI, verificação objetiva, zumbido e sistema CROS

🚨 Vou liberar esse acervo APENAS para quem estiver no nosso Grupo VIP no WhatsApp.
👉 Digite VIP aqui nos comentários que eu te mando o link de convite agora mesmo no seu Direct.',
    'https://www.instagram.com/reel/DWXIDlfjbBS/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18139584547503024", "tipo_postagem": "VIDEO", "likes": 15.0, "comentarios": 2.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "20:40:27", "legenda": "Aquelas curvas perfeitas que aparecem no software do AASI estão te enganando. ❌\n\nA verdade nua e crua é que o software te entrega apenas uma estimativa. Dois pacientes com a exata mesma audiometria podem ter respostas acústicas completamente diferentes dentro do conduto auditivo.\n\nSe você apenas clica no \"First Fit\" e confia cegamente no gráfico da tela, você está trabalhando na base do achismo. Sem a verificação objetiva, você não sabe se os sons fracos estão audíveis, se os fortes estão confortáveis ou se o rebaixamento de frequência está realmente funcionando.\n\nA verificação objetiva é o que tira a venda dos seus olhos. Mas atenção: ela sozinha não faz milagre. É o seu Raciocínio Clínico que vai interpretar esses dados e comandar o ajuste fino com precisão. Uma Fono Premium usa o software a seu favor, ela não é refém dele.\n\nNeste Mês do Consumidor, eu decidi liberar o mapa completo da Audiologia Premium. Reuni os meus 8 mais pedidos treinamentos no Combo Fono Premium: desde a base da avaliação e mascaramento, até adaptação de AASI, verificação objetiva, zumbido e sistema CROS\n\n🚨 Vou liberar esse acervo APENAS para quem estiver no nosso Grupo VIP no WhatsApp.\n👉 Digite VIP aqui nos comentários que eu te mando o link de convite agora mesmo no seu Direct.", "permalink": "https://www.instagram.com/reel/DWXIDlfjbBS/", "reach": 490.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  15,
  2,
  490,
  1,
  0,
  0.036735,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18139584547503024", "tipo_postagem": "VIDEO", "likes": 15.0, "comentarios": 2.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "20:40:27", "legenda": "Aquelas curvas perfeitas que aparecem no software do AASI estão te enganando. ❌\n\nA verdade nua e crua é que o software te entrega apenas uma estimativa. Dois pacientes com a exata mesma audiometria podem ter respostas acústicas completamente diferentes dentro do conduto auditivo.\n\nSe você apenas clica no \"First Fit\" e confia cegamente no gráfico da tela, você está trabalhando na base do achismo. Sem a verificação objetiva, você não sabe se os sons fracos estão audíveis, se os fortes estão confortáveis ou se o rebaixamento de frequência está realmente funcionando.\n\nA verificação objetiva é o que tira a venda dos seus olhos. Mas atenção: ela sozinha não faz milagre. É o seu Raciocínio Clínico que vai interpretar esses dados e comandar o ajuste fino com precisão. Uma Fono Premium usa o software a seu favor, ela não é refém dele.\n\nNeste Mês do Consumidor, eu decidi liberar o mapa completo da Audiologia Premium. Reuni os meus 8 mais pedidos treinamentos no Combo Fono Premium: desde a base da avaliação e mascaramento, até adaptação de AASI, verificação objetiva, zumbido e sistema CROS\n\n🚨 Vou liberar esse acervo APENAS para quem estiver no nosso Grupo VIP no WhatsApp.\n👉 Digite VIP aqui nos comentários que eu te mando o link de convite agora mesmo no seu Direct.", "permalink": "https://www.instagram.com/reel/DWXIDlfjbBS/", "reach": 490.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18091777721153959',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-26'::date,
    '16:29:55'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'LIVE: 3 ajustes finos que o first-fit não resolve',
    'https://www.instagram.com/reel/DWWrmBPDqQf/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18091777721153959", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 1.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "16:29:55", "legenda": "LIVE: 3 ajustes finos que o first-fit não resolve", "permalink": "https://www.instagram.com/reel/DWWrmBPDqQf/", "reach": 441.0, "saved": 2.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  26,
  1,
  441,
  2,
  1,
  0.065760,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18091777721153959", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 1.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "16:29:55", "legenda": "LIVE: 3 ajustes finos que o first-fit não resolve", "permalink": "https://www.instagram.com/reel/DWWrmBPDqQf/", "reach": 441.0, "saved": 2.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18110924320825482',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-26'::date,
    '12:02:55'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'A diferença entre uma Fono que briga por preço e uma Fono Premium com agenda lotada é uma só: Segurança Técnica. 💎

O paciente percebe quando você domina a verificação objetiva e o raciocínio clínico, sem depender do "First Fit". Para sair do nível "Ok", você precisa de método.

E é exatamente isso que eu vou te entregar. 👇

Neste Mês do Consumidor, criei o Combo Fono Premium, com nada mais, nada menos que:
✅ Formação AASI Premium ✅ Mapa do Raciocínio Clínico ✅ Imersão Zumbido ✅ Imersão Cros e BiCro ✅ Imersão Além do AASI ✅ Protocolo Fono Premium ✅ Masterclass de Rebaixamento ✅ Imersão em Pediatria

🚨 Vou liberar esse pacote completo APENAS no Grupo VIP no WhatsApp.

👉 Clique no link da minha bio, faça seu cadastro rápido e entre no grupo agora.

O mercado está cheio de profissionais medianos. Chegou a sua hora de subir de nível. Te vejo lá! 🚀',
    'https://www.instagram.com/p/DWWNE4KDj92/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18110924320825482", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 0.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "12:02:55", "legenda": "A diferença entre uma Fono que briga por preço e uma Fono Premium com agenda lotada é uma só: Segurança Técnica. 💎\n\nO paciente percebe quando você domina a verificação objetiva e o raciocínio clínico, sem depender do \"First Fit\". Para sair do nível \"Ok\", você precisa de método.\n\nE é exatamente isso que eu vou te entregar. 👇\n\nNeste Mês do Consumidor, criei o Combo Fono Premium, com nada mais, nada menos que:\n✅ Formação AASI Premium ✅ Mapa do Raciocínio Clínico ✅ Imersão Zumbido ✅ Imersão Cros e BiCro ✅ Imersão Além do AASI ✅ Protocolo Fono Premium ✅ Masterclass de Rebaixamento ✅ Imersão em Pediatria\n\n🚨 Vou liberar esse pacote completo APENAS no Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro rápido e entre no grupo agora.\n\nO mercado está cheio de profissionais medianos. Chegou a sua hora de subir de nível. Te vejo lá! 🚀", "permalink": "https://www.instagram.com/p/DWWNE4KDj92/", "reach": 1033.0, "saved": 3.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  29,
  0,
  1033,
  3,
  1,
  0.030978,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18110924320825482", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 0.0, "data_postagem": "2026-03-26 00:00:00", "hora_postagem": "12:02:55", "legenda": "A diferença entre uma Fono que briga por preço e uma Fono Premium com agenda lotada é uma só: Segurança Técnica. 💎\n\nO paciente percebe quando você domina a verificação objetiva e o raciocínio clínico, sem depender do \"First Fit\". Para sair do nível \"Ok\", você precisa de método.\n\nE é exatamente isso que eu vou te entregar. 👇\n\nNeste Mês do Consumidor, criei o Combo Fono Premium, com nada mais, nada menos que:\n✅ Formação AASI Premium ✅ Mapa do Raciocínio Clínico ✅ Imersão Zumbido ✅ Imersão Cros e BiCro ✅ Imersão Além do AASI ✅ Protocolo Fono Premium ✅ Masterclass de Rebaixamento ✅ Imersão em Pediatria\n\n🚨 Vou liberar esse pacote completo APENAS no Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro rápido e entre no grupo agora.\n\nO mercado está cheio de profissionais medianos. Chegou a sua hora de subir de nível. Te vejo lá! 🚀", "permalink": "https://www.instagram.com/p/DWWNE4KDj92/", "reach": 1033.0, "saved": 3.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18093284033038228',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-25'::date,
    '23:13:19'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Que atire a primeira pedra a Fono que nunca liberou um paciente e ficou com aquele frio na barriga pensando: "Será que o ajuste ficou bom mesmo? Será que eu deveria ter investigado mais aquele zumbido? Será que a indicação dessa tecnologia foi a melhor?".

Eu sei como é isso, meu amor. Trabalhar na base do "achismo" ou confiando cegamente no "First Fit" é exaustivo e suga a nossa energia. A insegurança clínica é o maior ladrão de faturamento que existe.

Mas e se você tivesse um mapa exato? Um passo a passo prático para nunca mais travar em nenhum caso?

Foi exatamente para te dar essa paz de espírito que eu decidi criar o Combo Fono Premium.

São 8 treinamentos para você dominar de uma vez por todas a audiologia:
✅ Formação AASI Premium
✅ Mapa do Raciocínio Clínico
✅ Imersão Zumbido
✅ Imersão Cros e BiCros
✅ Imersão Além do AASI
✅ Protocolo Fono Premium
✅ Masterclass de Rebaixamento de Frequência
✅ Imersão em Pediatria

🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP no WhatsApp.

👉 Clique no link da bio, faça o seu cadastro e entre no Grupo VIP agora mesmo para não perder essa oportunidade.

Quem ficar de fora não vai receber o link com o super desconto. Chega de insegurança clínica, assuma o controle dos seus atendimentos. Te vejo lá dentro! 💎',
    'https://www.instagram.com/p/DWU1AMWmipp/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18093284033038228", "tipo_postagem": "IMAGE", "likes": 14.0, "comentarios": 0.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "23:13:19", "legenda": "Que atire a primeira pedra a Fono que nunca liberou um paciente e ficou com aquele frio na barriga pensando: \"Será que o ajuste ficou bom mesmo? Será que eu deveria ter investigado mais aquele zumbido? Será que a indicação dessa tecnologia foi a melhor?\".\n\nEu sei como é isso, meu amor. Trabalhar na base do \"achismo\" ou confiando cegamente no \"First Fit\" é exaustivo e suga a nossa energia. A insegurança clínica é o maior ladrão de faturamento que existe.\n\nMas e se você tivesse um mapa exato? Um passo a passo prático para nunca mais travar em nenhum caso?\n\nFoi exatamente para te dar essa paz de espírito que eu decidi criar o Combo Fono Premium.\n\nSão 8 treinamentos para você dominar de uma vez por todas a audiologia:\n✅ Formação AASI Premium\n✅ Mapa do Raciocínio Clínico\n✅ Imersão Zumbido\n✅ Imersão Cros e BiCros\n✅ Imersão Além do AASI\n✅ Protocolo Fono Premium\n✅ Masterclass de Rebaixamento de Frequência\n✅ Imersão em Pediatria\n\n🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP no WhatsApp.\n\n👉 Clique no link da bio, faça o seu cadastro e entre no Grupo VIP agora mesmo para não perder essa oportunidade.\n\nQuem ficar de fora não vai receber o link com o super desconto. Chega de insegurança clínica, assuma o controle dos seus atendimentos. Te vejo lá dentro! 💎", "permalink": "https://www.instagram.com/p/DWU1AMWmipp/", "reach": 605.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  14,
  0,
  605,
  0,
  0,
  0.023140,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18093284033038228", "tipo_postagem": "IMAGE", "likes": 14.0, "comentarios": 0.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "23:13:19", "legenda": "Que atire a primeira pedra a Fono que nunca liberou um paciente e ficou com aquele frio na barriga pensando: \"Será que o ajuste ficou bom mesmo? Será que eu deveria ter investigado mais aquele zumbido? Será que a indicação dessa tecnologia foi a melhor?\".\n\nEu sei como é isso, meu amor. Trabalhar na base do \"achismo\" ou confiando cegamente no \"First Fit\" é exaustivo e suga a nossa energia. A insegurança clínica é o maior ladrão de faturamento que existe.\n\nMas e se você tivesse um mapa exato? Um passo a passo prático para nunca mais travar em nenhum caso?\n\nFoi exatamente para te dar essa paz de espírito que eu decidi criar o Combo Fono Premium.\n\nSão 8 treinamentos para você dominar de uma vez por todas a audiologia:\n✅ Formação AASI Premium\n✅ Mapa do Raciocínio Clínico\n✅ Imersão Zumbido\n✅ Imersão Cros e BiCros\n✅ Imersão Além do AASI\n✅ Protocolo Fono Premium\n✅ Masterclass de Rebaixamento de Frequência\n✅ Imersão em Pediatria\n\n🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP no WhatsApp.\n\n👉 Clique no link da bio, faça o seu cadastro e entre no Grupo VIP agora mesmo para não perder essa oportunidade.\n\nQuem ficar de fora não vai receber o link com o super desconto. Chega de insegurança clínica, assuma o controle dos seus atendimentos. Te vejo lá dentro! 💎", "permalink": "https://www.instagram.com/p/DWU1AMWmipp/", "reach": 605.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18088899212593383',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-25'::date,
    '18:01:04'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Quem topa amanhã às 13h??',
    'https://www.instagram.com/p/DWURH5ZDrxE/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18088899212593383", "tipo_postagem": "IMAGE", "likes": 17.0, "comentarios": 1.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "18:01:04", "legenda": "Quem topa amanhã às 13h??", "permalink": "https://www.instagram.com/p/DWURH5ZDrxE/", "reach": 568.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  17,
  1,
  568,
  1,
  0,
  0.033451,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18088899212593383", "tipo_postagem": "IMAGE", "likes": 17.0, "comentarios": 1.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "18:01:04", "legenda": "Quem topa amanhã às 13h??", "permalink": "https://www.instagram.com/p/DWURH5ZDrxE/", "reach": 568.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18097525649284617',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-25'::date,
    '15:29:06'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O seu paciente demora anos para buscar ajuda. Quando ele finalmente senta na sua cadeira, ele está cheio de dúvidas e inseguranças.

Se nesse momento crucial ele perceber que você também está insegura na indicação, no raciocínio clínico ou no ajuste... ele simplesmente não volta. O paciente compra a sua segurança antes de comprar o aparelho.

Para te dar essa postura inabalável, neste Mês do Consumidor eu criei o Combo Fono Premium. Reuni os meus 8 melhores treinamentos (incluindo Formação AASI, Mapa do Raciocínio Clínico, Zumbido, Cros, Pediatria e muito mais) em um único acervo.

🚨 Vou liberar esse pacote completo APENAS no nosso Grupo VIP no WhatsApp.

👉 Clique no link da bio, faça seu cadastro rápido e entre no grupo agora para não perder. Chega de perder pacientes por insegurança 💎',
    'https://www.instagram.com/reel/DWT_u8JjWfL/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18097525649284617", "tipo_postagem": "VIDEO", "likes": 37.0, "comentarios": 2.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "15:29:06", "legenda": "O seu paciente demora anos para buscar ajuda. Quando ele finalmente senta na sua cadeira, ele está cheio de dúvidas e inseguranças.\n\nSe nesse momento crucial ele perceber que você também está insegura na indicação, no raciocínio clínico ou no ajuste... ele simplesmente não volta. O paciente compra a sua segurança antes de comprar o aparelho.\n\nPara te dar essa postura inabalável, neste Mês do Consumidor eu criei o Combo Fono Premium. Reuni os meus 8 melhores treinamentos (incluindo Formação AASI, Mapa do Raciocínio Clínico, Zumbido, Cros, Pediatria e muito mais) em um único acervo.\n\n🚨 Vou liberar esse pacote completo APENAS no nosso Grupo VIP no WhatsApp.\n\n👉 Clique no link da bio, faça seu cadastro rápido e entre no grupo agora para não perder. Chega de perder pacientes por insegurança 💎", "permalink": "https://www.instagram.com/reel/DWT_u8JjWfL/", "reach": 1081.0, "saved": 3.0, "shares": 4.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  37,
  2,
  1081,
  3,
  4,
  0.038853,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18097525649284617", "tipo_postagem": "VIDEO", "likes": 37.0, "comentarios": 2.0, "data_postagem": "2026-03-25 00:00:00", "hora_postagem": "15:29:06", "legenda": "O seu paciente demora anos para buscar ajuda. Quando ele finalmente senta na sua cadeira, ele está cheio de dúvidas e inseguranças.\n\nSe nesse momento crucial ele perceber que você também está insegura na indicação, no raciocínio clínico ou no ajuste... ele simplesmente não volta. O paciente compra a sua segurança antes de comprar o aparelho.\n\nPara te dar essa postura inabalável, neste Mês do Consumidor eu criei o Combo Fono Premium. Reuni os meus 8 melhores treinamentos (incluindo Formação AASI, Mapa do Raciocínio Clínico, Zumbido, Cros, Pediatria e muito mais) em um único acervo.\n\n🚨 Vou liberar esse pacote completo APENAS no nosso Grupo VIP no WhatsApp.\n\n👉 Clique no link da bio, faça seu cadastro rápido e entre no grupo agora para não perder. Chega de perder pacientes por insegurança 💎", "permalink": "https://www.instagram.com/reel/DWT_u8JjWfL/", "reach": 1081.0, "saved": 3.0, "shares": 4.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18062568494675768',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-24'::date,
    '22:28:31'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '"A audiometria deu normal, então está tudo bem." ❌ Essa é a pior frase que um paciente com zumbido pode ouvir.

Assim como no caso do Chris Martin, o zumbido muitas vezes aparece ANTES da perda auditiva ser captada no exame convencional. É o primeiro "grito de socorro" do sistema auditivo. Se você não sabe investigar além do básico, o paciente vai embora frustrado e sem solução.

Para te dar segurança absoluta no manejo do zumbido e em casos complexos, eu criei o Combo Fono Premium. Reuni a minha Imersão Zumbido e mais 7 treinamentos (Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão em Pediatria, Imersão Cros e BiCros, Imersão Além do AASI, Masterclass de verificação de rebaixamento de frequência e o Protocolo Fono Premium) em um acervo especial de Mês do Consumidor.

🚨 Vou liberar esse pacote APENAS no Grupo VIP no WhatsApp.

👉 Clique no link da minha bio, faça seu cadastro e entre no grupo agora para não perder.

Chega de insegurança na hora de avaliar. Te vejo lá no grupo! 💎',
    'https://www.instagram.com/reel/DWSKyJAjd0f/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18062568494675768", "tipo_postagem": "VIDEO", "likes": 95.0, "comentarios": 6.0, "data_postagem": "2026-03-24 00:00:00", "hora_postagem": "22:28:31", "legenda": "\"A audiometria deu normal, então está tudo bem.\" ❌ Essa é a pior frase que um paciente com zumbido pode ouvir.\n\nAssim como no caso do Chris Martin, o zumbido muitas vezes aparece ANTES da perda auditiva ser captada no exame convencional. É o primeiro \"grito de socorro\" do sistema auditivo. Se você não sabe investigar além do básico, o paciente vai embora frustrado e sem solução.\n\nPara te dar segurança absoluta no manejo do zumbido e em casos complexos, eu criei o Combo Fono Premium. Reuni a minha Imersão Zumbido e mais 7 treinamentos (Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão em Pediatria, Imersão Cros e BiCros, Imersão Além do AASI, Masterclass de verificação de rebaixamento de frequência e o Protocolo Fono Premium) em um acervo especial de Mês do Consumidor.\n\n🚨 Vou liberar esse pacote APENAS no Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro e entre no grupo agora para não perder.\n\nChega de insegurança na hora de avaliar. Te vejo lá no grupo! 💎", "permalink": "https://www.instagram.com/reel/DWSKyJAjd0f/", "reach": 2421.0, "saved": 16.0, "shares": 12.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  95,
  6,
  2421,
  16,
  12,
  0.048327,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18062568494675768", "tipo_postagem": "VIDEO", "likes": 95.0, "comentarios": 6.0, "data_postagem": "2026-03-24 00:00:00", "hora_postagem": "22:28:31", "legenda": "\"A audiometria deu normal, então está tudo bem.\" ❌ Essa é a pior frase que um paciente com zumbido pode ouvir.\n\nAssim como no caso do Chris Martin, o zumbido muitas vezes aparece ANTES da perda auditiva ser captada no exame convencional. É o primeiro \"grito de socorro\" do sistema auditivo. Se você não sabe investigar além do básico, o paciente vai embora frustrado e sem solução.\n\nPara te dar segurança absoluta no manejo do zumbido e em casos complexos, eu criei o Combo Fono Premium. Reuni a minha Imersão Zumbido e mais 7 treinamentos (Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão em Pediatria, Imersão Cros e BiCros, Imersão Além do AASI, Masterclass de verificação de rebaixamento de frequência e o Protocolo Fono Premium) em um acervo especial de Mês do Consumidor.\n\n🚨 Vou liberar esse pacote APENAS no Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro e entre no grupo agora para não perder.\n\nChega de insegurança na hora de avaliar. Te vejo lá no grupo! 💎", "permalink": "https://www.instagram.com/reel/DWSKyJAjd0f/", "reach": 2421.0, "saved": 16.0, "shares": 12.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18572024791003598',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-24'::date,
    '19:31:38'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Quantos "NÃO" você respondeu nesse teste? 😬 Seja sincera aqui comigo! 👇

Trabalhar no piloto automático, dependendo apenas do "First Fit" do software ou torcendo para não aparecer um caso complexo de zumbido ou perda unilateral na agenda, é exaustivo.

A sua insegurança clínica é o maior ladrão do seu faturamento hoje. O paciente percebe quando você hesita na hora de cruzar os dados ou fazer um ajuste fino. Mas calma, a culpa não é sua. A faculdade nos dá a teoria, mas esconde a prática nua e crua do dia a dia no consultório.

Foi exatamente para dar um basta nisso que eu decidi abrir a minha "caixa preta". 📦✨

Neste Mês do Consumidor, eu reuni os meus 8 melhores treinamentos (incluindo Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão Zumbido, Imersão Cros e BiCros, Imersão em Pediatria, Protocolo Fono Premium e Masterclass de Verificação de rebaixamento de frequência) em um único acervo: o Combo Fono Premium. É o mapa definitivo para você ter segurança absoluta em qualquer atendimento.

🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP.

👉 Clique no link da minha bio, faça o seu cadastro rápido e entre no Grupo VIP agora mesmo.

Quem estiver fora do grupo não vai receber o link com o super desconto. Chegou a hora de se tornar a Fono Premium que a sua região disputa. Te vejo lá dentro! 💎',
    'https://www.instagram.com/p/DWR21j-GmIX/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18572024791003598", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-24 00:00:00", "hora_postagem": "19:31:38", "legenda": "Quantos \"NÃO\" você respondeu nesse teste? 😬 Seja sincera aqui comigo! 👇\n\nTrabalhar no piloto automático, dependendo apenas do \"First Fit\" do software ou torcendo para não aparecer um caso complexo de zumbido ou perda unilateral na agenda, é exaustivo.\n\nA sua insegurança clínica é o maior ladrão do seu faturamento hoje. O paciente percebe quando você hesita na hora de cruzar os dados ou fazer um ajuste fino. Mas calma, a culpa não é sua. A faculdade nos dá a teoria, mas esconde a prática nua e crua do dia a dia no consultório.\n\nFoi exatamente para dar um basta nisso que eu decidi abrir a minha \"caixa preta\". 📦✨\n\nNeste Mês do Consumidor, eu reuni os meus 8 melhores treinamentos (incluindo Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão Zumbido, Imersão Cros e BiCros, Imersão em Pediatria, Protocolo Fono Premium e Masterclass de Verificação de rebaixamento de frequência) em um único acervo: o Combo Fono Premium. É o mapa definitivo para você ter segurança absoluta em qualquer atendimento.\n\n🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP.\n\n👉 Clique no link da minha bio, faça o seu cadastro rápido e entre no Grupo VIP agora mesmo.\n\nQuem estiver fora do grupo não vai receber o link com o super desconto. Chegou a hora de se tornar a Fono Premium que a sua região disputa. Te vejo lá dentro! 💎", "permalink": "https://www.instagram.com/p/DWR21j-GmIX/", "reach": 803.0, "saved": 7.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  27,
  0,
  803,
  7,
  3,
  0.042341,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18572024791003598", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-24 00:00:00", "hora_postagem": "19:31:38", "legenda": "Quantos \"NÃO\" você respondeu nesse teste? 😬 Seja sincera aqui comigo! 👇\n\nTrabalhar no piloto automático, dependendo apenas do \"First Fit\" do software ou torcendo para não aparecer um caso complexo de zumbido ou perda unilateral na agenda, é exaustivo.\n\nA sua insegurança clínica é o maior ladrão do seu faturamento hoje. O paciente percebe quando você hesita na hora de cruzar os dados ou fazer um ajuste fino. Mas calma, a culpa não é sua. A faculdade nos dá a teoria, mas esconde a prática nua e crua do dia a dia no consultório.\n\nFoi exatamente para dar um basta nisso que eu decidi abrir a minha \"caixa preta\". 📦✨\n\nNeste Mês do Consumidor, eu reuni os meus 8 melhores treinamentos (incluindo Formação AASI Premium, Mapa do Raciocínio Clínico, Imersão Zumbido, Imersão Cros e BiCros, Imersão em Pediatria, Protocolo Fono Premium e Masterclass de Verificação de rebaixamento de frequência) em um único acervo: o Combo Fono Premium. É o mapa definitivo para você ter segurança absoluta em qualquer atendimento.\n\n🚨 PRESTE MUITA ATENÇÃO: Essa oferta será revelada APENAS dentro do Grupo VIP.\n\n👉 Clique no link da minha bio, faça o seu cadastro rápido e entre no Grupo VIP agora mesmo.\n\nQuem estiver fora do grupo não vai receber o link com o super desconto. Chegou a hora de se tornar a Fono Premium que a sua região disputa. Te vejo lá dentro! 💎", "permalink": "https://www.instagram.com/p/DWR21j-GmIX/", "reach": 803.0, "saved": 7.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17993961836763339',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-23'::date,
    '18:07:03'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O audiograma isolado não conta toda a história do seu paciente.

📉Casos como perdas unilaterais, microtia ou perdas leves com grande impacto funcional exigem Raciocínio Clínico afiado. Não dá para ser refém do óbvio, focar só no gráfico e ignorar o esforço auditivo de quem senta na sua frente. Indicar a reabilitação correta com segurança é o que separa uma fonoaudióloga comum de uma Fono Premium.

E é para te dar essa segurança absoluta em qualquer caso clínico que eu preparei algo inédito👇

Neste Mês do Consumidor eu criei o Combo Fono Premium: meus melhores treinamentos juntos!
Formação AASI Premium, 
Mapa do Raciocínio Clínico,
Imersão Zumbido, 
Masterclass Rebaixamento de frequência 
Imersão Cros e BiCros, 
Imersão Além do AASI 
Protocolo Fono Premium

É um acervo completo para se transformar na sua melhor versão de Fono!

🚨 ATENÇÃO: Na próxima segunda-feira, vou liberar uma oferta especial para esse combo. Mas essa condição será revelada APENAS dentro do Grupo VIP no WhatsApp.

👉 Clique no link da minha bio, faça seu cadastro  e entre no grupo VIP agora mesmo. Te vejo lá dentro!',
    'https://www.instagram.com/reel/DWPIFnbjXsz/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17993961836763339", "tipo_postagem": "VIDEO", "likes": 49.0, "comentarios": 2.0, "data_postagem": "2026-03-23 00:00:00", "hora_postagem": "18:07:03", "legenda": "O audiograma isolado não conta toda a história do seu paciente.\n\n📉Casos como perdas unilaterais, microtia ou perdas leves com grande impacto funcional exigem Raciocínio Clínico afiado. Não dá para ser refém do óbvio, focar só no gráfico e ignorar o esforço auditivo de quem senta na sua frente. Indicar a reabilitação correta com segurança é o que separa uma fonoaudióloga comum de uma Fono Premium.\n\nE é para te dar essa segurança absoluta em qualquer caso clínico que eu preparei algo inédito👇\n\nNeste Mês do Consumidor eu criei o Combo Fono Premium: meus melhores treinamentos juntos!\nFormação AASI Premium, \nMapa do Raciocínio Clínico,\nImersão Zumbido, \nMasterclass Rebaixamento de frequência \nImersão Cros e BiCros, \nImersão Além do AASI \nProtocolo Fono Premium\n\nÉ um acervo completo para se transformar na sua melhor versão de Fono!\n\n🚨 ATENÇÃO: Na próxima segunda-feira, vou liberar uma oferta especial para esse combo. Mas essa condição será revelada APENAS dentro do Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro  e entre no grupo VIP agora mesmo. Te vejo lá dentro!", "permalink": "https://www.instagram.com/reel/DWPIFnbjXsz/", "reach": 706.0, "saved": 7.0, "shares": 4.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  49,
  2,
  706,
  7,
  4,
  0.082153,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17993961836763339", "tipo_postagem": "VIDEO", "likes": 49.0, "comentarios": 2.0, "data_postagem": "2026-03-23 00:00:00", "hora_postagem": "18:07:03", "legenda": "O audiograma isolado não conta toda a história do seu paciente.\n\n📉Casos como perdas unilaterais, microtia ou perdas leves com grande impacto funcional exigem Raciocínio Clínico afiado. Não dá para ser refém do óbvio, focar só no gráfico e ignorar o esforço auditivo de quem senta na sua frente. Indicar a reabilitação correta com segurança é o que separa uma fonoaudióloga comum de uma Fono Premium.\n\nE é para te dar essa segurança absoluta em qualquer caso clínico que eu preparei algo inédito👇\n\nNeste Mês do Consumidor eu criei o Combo Fono Premium: meus melhores treinamentos juntos!\nFormação AASI Premium, \nMapa do Raciocínio Clínico,\nImersão Zumbido, \nMasterclass Rebaixamento de frequência \nImersão Cros e BiCros, \nImersão Além do AASI \nProtocolo Fono Premium\n\nÉ um acervo completo para se transformar na sua melhor versão de Fono!\n\n🚨 ATENÇÃO: Na próxima segunda-feira, vou liberar uma oferta especial para esse combo. Mas essa condição será revelada APENAS dentro do Grupo VIP no WhatsApp.\n\n👉 Clique no link da minha bio, faça seu cadastro  e entre no grupo VIP agora mesmo. Te vejo lá dentro!", "permalink": "https://www.instagram.com/reel/DWPIFnbjXsz/", "reach": 706.0, "saved": 7.0, "shares": 4.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18054860534705580',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-20'::date,
    '22:31:12'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Quando eu mostrei para a minha equipe o que eu queria fazer neste Mês do Consumidor, eles disseram: “Ju, você tem certeza? É muita coisa!”.
E eu respondi: “Tenho. As fonos precisam disso.”
Eu passei os últimos dias reunindo absolutamente TUDO o que uma fonoaudióloga precisa para sair da insegurança e se tornar uma referência em Audiologia. Desde a base do AASI, passando pelo Zumbido, até as Tecnologias Auditivas mais avançadas.
Eu não posso falar mais nada por enquanto. Mas se você quer lotar sua agenda e ter paz de espírito nos atendimentos... Prepare-se. Falta pouco! ⏳🔥',
    'https://www.instagram.com/p/DWH4KnXDY_G/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18054860534705580", "tipo_postagem": "IMAGE", "likes": 36.0, "comentarios": 2.0, "data_postagem": "2026-03-20 00:00:00", "hora_postagem": "22:31:12", "legenda": "Quando eu mostrei para a minha equipe o que eu queria fazer neste Mês do Consumidor, eles disseram: “Ju, você tem certeza? É muita coisa!”.\nE eu respondi: “Tenho. As fonos precisam disso.”\nEu passei os últimos dias reunindo absolutamente TUDO o que uma fonoaudióloga precisa para sair da insegurança e se tornar uma referência em Audiologia. Desde a base do AASI, passando pelo Zumbido, até as Tecnologias Auditivas mais avançadas.\nEu não posso falar mais nada por enquanto. Mas se você quer lotar sua agenda e ter paz de espírito nos atendimentos... Prepare-se. Falta pouco! ⏳🔥", "permalink": "https://www.instagram.com/p/DWH4KnXDY_G/", "reach": 789.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  36,
  2,
  789,
  0,
  0,
  0.048162,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18054860534705580", "tipo_postagem": "IMAGE", "likes": 36.0, "comentarios": 2.0, "data_postagem": "2026-03-20 00:00:00", "hora_postagem": "22:31:12", "legenda": "Quando eu mostrei para a minha equipe o que eu queria fazer neste Mês do Consumidor, eles disseram: “Ju, você tem certeza? É muita coisa!”.\nE eu respondi: “Tenho. As fonos precisam disso.”\nEu passei os últimos dias reunindo absolutamente TUDO o que uma fonoaudióloga precisa para sair da insegurança e se tornar uma referência em Audiologia. Desde a base do AASI, passando pelo Zumbido, até as Tecnologias Auditivas mais avançadas.\nEu não posso falar mais nada por enquanto. Mas se você quer lotar sua agenda e ter paz de espírito nos atendimentos... Prepare-se. Falta pouco! ⏳🔥", "permalink": "https://www.instagram.com/p/DWH4KnXDY_G/", "reach": 789.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18146864509481971',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-19'::date,
    '20:34:50'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Conhecer tecnologias auditivas além do AASI não é só um “plus”: é posicionamento.

Quando você amplia o seu repertório, você:
• entrega mais soluções reais pro paciente 
• se diferencia no mercado 
• deixa de depender só do básico 
• e aumenta o seu potencial! 

Isso faz parte de uma formação verdadeiramente completa. Daquelas que te tiram do “first-fit” e te colocam no nível de raciocínio clínico estratégico.

E é exatamente sobre isso que vem aí…

Preparei uma surpresa pra semana que vem 👀🔥 
Se eu fosse você, ficava de olho por aqui.',
    'https://www.instagram.com/reel/DWFF8bdDRGd/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18146864509481971", "tipo_postagem": "VIDEO", "likes": 56.0, "comentarios": 1.0, "data_postagem": "2026-03-19 00:00:00", "hora_postagem": "20:34:50", "legenda": "Conhecer tecnologias auditivas além do AASI não é só um “plus”: é posicionamento.\n\nQuando você amplia o seu repertório, você:\n• entrega mais soluções reais pro paciente \n• se diferencia no mercado \n• deixa de depender só do básico \n• e aumenta o seu potencial! \n\nIsso faz parte de uma formação verdadeiramente completa. Daquelas que te tiram do “first-fit” e te colocam no nível de raciocínio clínico estratégico.\n\nE é exatamente sobre isso que vem aí…\n\nPreparei uma surpresa pra semana que vem 👀🔥 \nSe eu fosse você, ficava de olho por aqui.", "permalink": "https://www.instagram.com/reel/DWFF8bdDRGd/", "reach": 1205.0, "saved": 6.0, "shares": 6.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  56,
  1,
  1205,
  6,
  6,
  0.052282,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18146864509481971", "tipo_postagem": "VIDEO", "likes": 56.0, "comentarios": 1.0, "data_postagem": "2026-03-19 00:00:00", "hora_postagem": "20:34:50", "legenda": "Conhecer tecnologias auditivas além do AASI não é só um “plus”: é posicionamento.\n\nQuando você amplia o seu repertório, você:\n• entrega mais soluções reais pro paciente \n• se diferencia no mercado \n• deixa de depender só do básico \n• e aumenta o seu potencial! \n\nIsso faz parte de uma formação verdadeiramente completa. Daquelas que te tiram do “first-fit” e te colocam no nível de raciocínio clínico estratégico.\n\nE é exatamente sobre isso que vem aí…\n\nPreparei uma surpresa pra semana que vem 👀🔥 \nSe eu fosse você, ficava de olho por aqui.", "permalink": "https://www.instagram.com/reel/DWFF8bdDRGd/", "reach": 1205.0, "saved": 6.0, "shares": 6.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18009961532839973',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-18'::date,
    '20:35:50'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Aguardem 👀👀',
    'https://www.instagram.com/p/DWChal9msMB/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18009961532839973", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 0.0, "data_postagem": "2026-03-18 00:00:00", "hora_postagem": "20:35:50", "legenda": "Aguardem 👀👀", "permalink": "https://www.instagram.com/p/DWChal9msMB/", "reach": 759.0, "saved": 3.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  29,
  0,
  759,
  3,
  1,
  0.042161,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18009961532839973", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 0.0, "data_postagem": "2026-03-18 00:00:00", "hora_postagem": "20:35:50", "legenda": "Aguardem 👀👀", "permalink": "https://www.instagram.com/p/DWChal9msMB/", "reach": 759.0, "saved": 3.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18027209039619173',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-16'::date,
    '21:35:22'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Se você deu um ‘check’ mental em algum desses 5 pontos... nós precisamos conversar, meu amor. 😅

O mercado de Audiologia não perdoa quem trabalha na base do achismo. O paciente percebe quando você está insegura na hora de indicar um sistema CROS, quando você não sabe conduzir uma terapia sonora para zumbido, ou quando você simplesmente aceita o que o software do AASI manda.

A boa notícia? Tudo isso é falta de protocolo e método. E método se aprende.

Neste Mês do Consumidor, eu vou fazer um movimento inédito para acabar com essa insegurança clínica de uma vez por todas. Estou preparando algo que vai te entregar o mapa completo da Fono Premium.

O segredo está guardado a sete chaves, mas quem estiver me acompanhando por aqui nos próximos dias vai ter uma vantagem absurda. Fique de olho! 👀🔥

Me conta aqui nos comentários: qual desses 5 pontos hoje é o seu maior desafio na clínica?',
    'https://www.instagram.com/reel/DV9ek9ZDQ_W/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18027209039619173", "tipo_postagem": "VIDEO", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-16 00:00:00", "hora_postagem": "21:35:22", "legenda": "Se você deu um ‘check’ mental em algum desses 5 pontos... nós precisamos conversar, meu amor. 😅\n\nO mercado de Audiologia não perdoa quem trabalha na base do achismo. O paciente percebe quando você está insegura na hora de indicar um sistema CROS, quando você não sabe conduzir uma terapia sonora para zumbido, ou quando você simplesmente aceita o que o software do AASI manda.\n\nA boa notícia? Tudo isso é falta de protocolo e método. E método se aprende.\n\nNeste Mês do Consumidor, eu vou fazer um movimento inédito para acabar com essa insegurança clínica de uma vez por todas. Estou preparando algo que vai te entregar o mapa completo da Fono Premium.\n\nO segredo está guardado a sete chaves, mas quem estiver me acompanhando por aqui nos próximos dias vai ter uma vantagem absurda. Fique de olho! 👀🔥\n\nMe conta aqui nos comentários: qual desses 5 pontos hoje é o seu maior desafio na clínica?", "permalink": "https://www.instagram.com/reel/DV9ek9ZDQ_W/", "reach": 1442.0, "saved": 6.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  27,
  0,
  1442,
  6,
  1,
  0.022885,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18027209039619173", "tipo_postagem": "VIDEO", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-16 00:00:00", "hora_postagem": "21:35:22", "legenda": "Se você deu um ‘check’ mental em algum desses 5 pontos... nós precisamos conversar, meu amor. 😅\n\nO mercado de Audiologia não perdoa quem trabalha na base do achismo. O paciente percebe quando você está insegura na hora de indicar um sistema CROS, quando você não sabe conduzir uma terapia sonora para zumbido, ou quando você simplesmente aceita o que o software do AASI manda.\n\nA boa notícia? Tudo isso é falta de protocolo e método. E método se aprende.\n\nNeste Mês do Consumidor, eu vou fazer um movimento inédito para acabar com essa insegurança clínica de uma vez por todas. Estou preparando algo que vai te entregar o mapa completo da Fono Premium.\n\nO segredo está guardado a sete chaves, mas quem estiver me acompanhando por aqui nos próximos dias vai ter uma vantagem absurda. Fique de olho! 👀🔥\n\nMe conta aqui nos comentários: qual desses 5 pontos hoje é o seu maior desafio na clínica?", "permalink": "https://www.instagram.com/reel/DV9ek9ZDQ_W/", "reach": 1442.0, "saved": 6.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18072040163545678',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-12'::date,
    '18:19:28'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Na avaliação audiológica, um resultado isolado não conta toda a história. Por isso usamos o princípio do crosscheck: a confirmação das informações por meio de diferentes testes.

Quando cruzamos dados da audiometria tonal VA, VO, audiometria vocal, timpanometria, reflexo acústicos e, quando necessário,limiar de desconforto, conseguimos verificar se os resultados fazem sentido entre si.

Esse cuidado é essencial para identificar corretamente se a perda auditiva é condutiva ou sensorioneural, garantindo um laudo mais confiável e seguro.
Tem aula de tudo isso lá dentro do MRC (Mapa do raciocínio Clínico)

Na audiologia, confirmar é tão importante quanto medir!
Compartilha esse post com alguém que gosta de áudio tanto quanto você!

#audiologia #saudeauditiva #fonoaudiologia',
    'https://www.instagram.com/p/DVy1CiEGm0A/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18072040163545678", "tipo_postagem": "IMAGE", "likes": 181.0, "comentarios": 0.0, "data_postagem": "2026-03-12 00:00:00", "hora_postagem": "18:19:28", "legenda": "Na avaliação audiológica, um resultado isolado não conta toda a história. Por isso usamos o princípio do crosscheck: a confirmação das informações por meio de diferentes testes.\n\nQuando cruzamos dados da audiometria tonal VA, VO, audiometria vocal, timpanometria, reflexo acústicos e, quando necessário,limiar de desconforto, conseguimos verificar se os resultados fazem sentido entre si.\n\nEsse cuidado é essencial para identificar corretamente se a perda auditiva é condutiva ou sensorioneural, garantindo um laudo mais confiável e seguro.\nTem aula de tudo isso lá dentro do MRC (Mapa do raciocínio Clínico)\n\nNa audiologia, confirmar é tão importante quanto medir!\nCompartilha esse post com alguém que gosta de áudio tanto quanto você!\n\n#audiologia #saudeauditiva #fonoaudiologia", "permalink": "https://www.instagram.com/p/DVy1CiEGm0A/", "reach": 2587.0, "saved": 105.0, "shares": 47.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  181,
  0,
  2587,
  105,
  47,
  0.110553,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18072040163545678", "tipo_postagem": "IMAGE", "likes": 181.0, "comentarios": 0.0, "data_postagem": "2026-03-12 00:00:00", "hora_postagem": "18:19:28", "legenda": "Na avaliação audiológica, um resultado isolado não conta toda a história. Por isso usamos o princípio do crosscheck: a confirmação das informações por meio de diferentes testes.\n\nQuando cruzamos dados da audiometria tonal VA, VO, audiometria vocal, timpanometria, reflexo acústicos e, quando necessário,limiar de desconforto, conseguimos verificar se os resultados fazem sentido entre si.\n\nEsse cuidado é essencial para identificar corretamente se a perda auditiva é condutiva ou sensorioneural, garantindo um laudo mais confiável e seguro.\nTem aula de tudo isso lá dentro do MRC (Mapa do raciocínio Clínico)\n\nNa audiologia, confirmar é tão importante quanto medir!\nCompartilha esse post com alguém que gosta de áudio tanto quanto você!\n\n#audiologia #saudeauditiva #fonoaudiologia", "permalink": "https://www.instagram.com/p/DVy1CiEGm0A/", "reach": 2587.0, "saved": 105.0, "shares": 47.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17921592537259411',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-11'::date,
    '18:16:31'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'A avaliação eletrofisiológica da audição em sono natural é possível quando há boa colaboração dos pais e aplicação adequada do protocolo de privação do sono. 😃

Esse cuidado faz parte de uma avaliação auditiva completa, fundamental para investigar com precisão a audição do bebê ou da criança.

Contar com uma equipe especializada em audiologia infantil faz toda a diferença para que o exame seja realizado com segurança, conforto e confiabilidade!

Se seu filho precisa realizar o BERA/PEATE em sono natural, entre em contato conosco.

Coordenação do Serviço de BERA
Fga. Elisa De Biase Hopman
Fgo. Diego Ormundo

Equipe de Fonoaudiólogos Temprano: 
Bruna Capalbo
Giovanna Costa
Juliana Coutinho
Elidiane Fugiwara
Nayara Januário

Edição e criação do vídeo:
Fga. Giovanna Costa',
    'https://www.instagram.com/reel/DVwPtnXjTmP/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17921592537259411", "tipo_postagem": "VIDEO", "likes": 99.0, "comentarios": 5.0, "data_postagem": "2026-03-11 00:00:00", "hora_postagem": "18:16:31", "legenda": "A avaliação eletrofisiológica da audição em sono natural é possível quando há boa colaboração dos pais e aplicação adequada do protocolo de privação do sono. 😃\n\nEsse cuidado faz parte de uma avaliação auditiva completa, fundamental para investigar com precisão a audição do bebê ou da criança.\n\nContar com uma equipe especializada em audiologia infantil faz toda a diferença para que o exame seja realizado com segurança, conforto e confiabilidade!\n\nSe seu filho precisa realizar o BERA/PEATE em sono natural, entre em contato conosco.\n\nCoordenação do Serviço de BERA\nFga. Elisa De Biase Hopman\nFgo. Diego Ormundo\n\nEquipe de Fonoaudiólogos Temprano: \nBruna Capalbo\nGiovanna Costa\nJuliana Coutinho\nElidiane Fugiwara\nNayara Januário\n\nEdição e criação do vídeo:\nFga. Giovanna Costa", "permalink": "https://www.instagram.com/reel/DVwPtnXjTmP/", "reach": 2301.0, "saved": 12.0, "shares": 8.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  99,
  5,
  2301,
  12,
  8,
  0.050413,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17921592537259411", "tipo_postagem": "VIDEO", "likes": 99.0, "comentarios": 5.0, "data_postagem": "2026-03-11 00:00:00", "hora_postagem": "18:16:31", "legenda": "A avaliação eletrofisiológica da audição em sono natural é possível quando há boa colaboração dos pais e aplicação adequada do protocolo de privação do sono. 😃\n\nEsse cuidado faz parte de uma avaliação auditiva completa, fundamental para investigar com precisão a audição do bebê ou da criança.\n\nContar com uma equipe especializada em audiologia infantil faz toda a diferença para que o exame seja realizado com segurança, conforto e confiabilidade!\n\nSe seu filho precisa realizar o BERA/PEATE em sono natural, entre em contato conosco.\n\nCoordenação do Serviço de BERA\nFga. Elisa De Biase Hopman\nFgo. Diego Ormundo\n\nEquipe de Fonoaudiólogos Temprano: \nBruna Capalbo\nGiovanna Costa\nJuliana Coutinho\nElidiane Fugiwara\nNayara Januário\n\nEdição e criação do vídeo:\nFga. Giovanna Costa", "permalink": "https://www.instagram.com/reel/DVwPtnXjTmP/", "reach": 2301.0, "saved": 12.0, "shares": 8.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18094991558082965',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-08'::date,
    '18:01:45'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Em um mundo em que tantas pessoas querem competir o tempo todo, eu tenho muito orgulho de ver as minhas alunas e amigas mulheres aqui que escolhem algo diferente: apoiar, levantar e celebrar as conquistas umas das outras.

Hoje eu só quero exaltar minhas alunas e lembrar da força, da coragem e da sensibilidade que existem em cada uma de nós. Ser mulher é equilibrar tantas coisas ao mesmo tempo e, ainda assim, continuar juntas, crescendo, aprendendo e abrindo caminhos.

Feliz Dia das Mulheres turma. Orgulho de vocês ❤️',
    'https://www.instagram.com/p/DVof1VrjiQ9/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18094991558082965", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 260.0, "comentarios": 11.0, "data_postagem": "2026-03-08 00:00:00", "hora_postagem": "18:01:45", "legenda": "Em um mundo em que tantas pessoas querem competir o tempo todo, eu tenho muito orgulho de ver as minhas alunas e amigas mulheres aqui que escolhem algo diferente: apoiar, levantar e celebrar as conquistas umas das outras.\n\nHoje eu só quero exaltar minhas alunas e lembrar da força, da coragem e da sensibilidade que existem em cada uma de nós. Ser mulher é equilibrar tantas coisas ao mesmo tempo e, ainda assim, continuar juntas, crescendo, aprendendo e abrindo caminhos.\n\nFeliz Dia das Mulheres turma. Orgulho de vocês ❤️", "permalink": "https://www.instagram.com/p/DVof1VrjiQ9/", "reach": 4173.0, "saved": 3.0, "shares": 4.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  260,
  11,
  4173,
  3,
  4,
  0.065660,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18094991558082965", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 260.0, "comentarios": 11.0, "data_postagem": "2026-03-08 00:00:00", "hora_postagem": "18:01:45", "legenda": "Em um mundo em que tantas pessoas querem competir o tempo todo, eu tenho muito orgulho de ver as minhas alunas e amigas mulheres aqui que escolhem algo diferente: apoiar, levantar e celebrar as conquistas umas das outras.\n\nHoje eu só quero exaltar minhas alunas e lembrar da força, da coragem e da sensibilidade que existem em cada uma de nós. Ser mulher é equilibrar tantas coisas ao mesmo tempo e, ainda assim, continuar juntas, crescendo, aprendendo e abrindo caminhos.\n\nFeliz Dia das Mulheres turma. Orgulho de vocês ❤️", "permalink": "https://www.instagram.com/p/DVof1VrjiQ9/", "reach": 4173.0, "saved": 3.0, "shares": 4.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17891039937430694',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-08'::date,
    '14:18:01'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Tem coisas que a gente aprende sobre ser mulher… que ninguém deveria precisar aprender.

Esses dias eu vi uma entrevista que ficou na minha cabeça, e vou aproveitar esse dia para contar.

Dizia que mulheres muito simpáticas, que sorriem o tempo todo e tentam ser agradáveis… podem ser percebidas como mais vulneráveis por agressores.

Aquilo me marcou.

Porque fomos ensinadas exatamente isso:
Sempre ser gentis, não confrontar, não incomodar.

Mas a realidade nem sempre é gentil com as mulheres.

Foi no jiu-jitsu que eu comecei a entender algo importante.

Minha mestre @amandaauane sempre fala:
o maior aprendizado do jiu-jitsu é não congelar. 
Aprender a lutar é só uma consequência.

Aprender a perceber riscos.
Aprender a se proteger.
Aprender a se defender se um dia — Deus me livre —precisar.

Em um país com índices tão altos de violência contra mulheres, isso muda tudo.

O jiu-jitsu não me ensinou a brigar.

Está me ensinando a confiar mais em mim. A ter segurança. Postura. Força.

E nesse Dia das Mulheres, desejo que a gente tenha essa força dentro de nós…
mas (mais importante!) que a gente nunca precise usá-la!! 🙏🏼
Porque não quero viver em um mundo que educação é percebido como vulnerabilidade.
💪🏼💪🏼

Feliz Dia. ❤️🫶🏼',
    'https://www.instagram.com/p/DVoGOmkDuSu/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17891039937430694", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 43.0, "comentarios": 12.0, "data_postagem": "2026-03-08 00:00:00", "hora_postagem": "14:18:01", "legenda": "Tem coisas que a gente aprende sobre ser mulher… que ninguém deveria precisar aprender.\n\nEsses dias eu vi uma entrevista que ficou na minha cabeça, e vou aproveitar esse dia para contar.\n\nDizia que mulheres muito simpáticas, que sorriem o tempo todo e tentam ser agradáveis… podem ser percebidas como mais vulneráveis por agressores.\n\nAquilo me marcou.\n\nPorque fomos ensinadas exatamente isso:\nSempre ser gentis, não confrontar, não incomodar.\n\nMas a realidade nem sempre é gentil com as mulheres.\n\nFoi no jiu-jitsu que eu comecei a entender algo importante.\n\nMinha mestre @amandaauane sempre fala:\no maior aprendizado do jiu-jitsu é não congelar. \nAprender a lutar é só uma consequência.\n\nAprender a perceber riscos.\nAprender a se proteger.\nAprender a se defender se um dia — Deus me livre —precisar.\n\nEm um país com índices tão altos de violência contra mulheres, isso muda tudo.\n\nO jiu-jitsu não me ensinou a brigar.\n\nEstá me ensinando a confiar mais em mim. A ter segurança. Postura. Força.\n\nE nesse Dia das Mulheres, desejo que a gente tenha essa força dentro de nós…\nmas (mais importante!) que a gente nunca precise usá-la!! 🙏🏼\nPorque não quero viver em um mundo que educação é percebido como vulnerabilidade.\n💪🏼💪🏼\n\nFeliz Dia. ❤️🫶🏼", "permalink": "https://www.instagram.com/p/DVoGOmkDuSu/", "reach": 961.0, "saved": 1.0, "shares": 5.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  43,
  12,
  961,
  1,
  5,
  0.058273,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17891039937430694", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 43.0, "comentarios": 12.0, "data_postagem": "2026-03-08 00:00:00", "hora_postagem": "14:18:01", "legenda": "Tem coisas que a gente aprende sobre ser mulher… que ninguém deveria precisar aprender.\n\nEsses dias eu vi uma entrevista que ficou na minha cabeça, e vou aproveitar esse dia para contar.\n\nDizia que mulheres muito simpáticas, que sorriem o tempo todo e tentam ser agradáveis… podem ser percebidas como mais vulneráveis por agressores.\n\nAquilo me marcou.\n\nPorque fomos ensinadas exatamente isso:\nSempre ser gentis, não confrontar, não incomodar.\n\nMas a realidade nem sempre é gentil com as mulheres.\n\nFoi no jiu-jitsu que eu comecei a entender algo importante.\n\nMinha mestre @amandaauane sempre fala:\no maior aprendizado do jiu-jitsu é não congelar. \nAprender a lutar é só uma consequência.\n\nAprender a perceber riscos.\nAprender a se proteger.\nAprender a se defender se um dia — Deus me livre —precisar.\n\nEm um país com índices tão altos de violência contra mulheres, isso muda tudo.\n\nO jiu-jitsu não me ensinou a brigar.\n\nEstá me ensinando a confiar mais em mim. A ter segurança. Postura. Força.\n\nE nesse Dia das Mulheres, desejo que a gente tenha essa força dentro de nós…\nmas (mais importante!) que a gente nunca precise usá-la!! 🙏🏼\nPorque não quero viver em um mundo que educação é percebido como vulnerabilidade.\n💪🏼💪🏼\n\nFeliz Dia. ❤️🫶🏼", "permalink": "https://www.instagram.com/p/DVoGOmkDuSu/", "reach": 961.0, "saved": 1.0, "shares": 5.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17992685735924724',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-05'::date,
    '23:36:20'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Ai que máximo! Eu tô preparando um material tão lindo para a nossa Imersão deste sábado às 8h30. 😍
E digo mais: vamos falar sobre prótese ancorada no osso, implante coclear e um modelo de relatório (para médico ou convênio!) 

Nós vamos mergulhar fundo e destrinchar todo o protocolo clínico. Eu quero ver todas as minhas alunas dominando perdas unilaterais e virando referência!

 Quem ficar de fora, vai perder a chance de dominar um nicho super premium.

 ⏳ O prazo para ganhar a Imersão de presente está acabando. Clica no link da bio e vem pra Formação AASI!',
    'https://www.instagram.com/p/DVhXvKlmg2-/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17992685735924724", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-05 00:00:00", "hora_postagem": "23:36:20", "legenda": "Ai que máximo! Eu tô preparando um material tão lindo para a nossa Imersão deste sábado às 8h30. 😍\nE digo mais: vamos falar sobre prótese ancorada no osso, implante coclear e um modelo de relatório (para médico ou convênio!) \n\nNós vamos mergulhar fundo e destrinchar todo o protocolo clínico. Eu quero ver todas as minhas alunas dominando perdas unilaterais e virando referência!\n\n Quem ficar de fora, vai perder a chance de dominar um nicho super premium.\n\n ⏳ O prazo para ganhar a Imersão de presente está acabando. Clica no link da bio e vem pra Formação AASI!", "permalink": "https://www.instagram.com/p/DVhXvKlmg2-/", "reach": 384.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  13,
  0,
  384,
  1,
  0,
  0.036458,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17992685735924724", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-05 00:00:00", "hora_postagem": "23:36:20", "legenda": "Ai que máximo! Eu tô preparando um material tão lindo para a nossa Imersão deste sábado às 8h30. 😍\nE digo mais: vamos falar sobre prótese ancorada no osso, implante coclear e um modelo de relatório (para médico ou convênio!) \n\nNós vamos mergulhar fundo e destrinchar todo o protocolo clínico. Eu quero ver todas as minhas alunas dominando perdas unilaterais e virando referência!\n\n Quem ficar de fora, vai perder a chance de dominar um nicho super premium.\n\n ⏳ O prazo para ganhar a Imersão de presente está acabando. Clica no link da bio e vem pra Formação AASI!", "permalink": "https://www.instagram.com/p/DVhXvKlmg2-/", "reach": 384.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18116504644626783',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-05'::date,
    '15:31:23'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    '“Ju, eu queria muito entrar na Formação, mas tô sem dinheiro agora...”

 Meu amor, deixa eu te falar uma coisa com muito carinho: vamos fazer uma continha rápida juntas? Quanto custa UMA devolução de aparelho premium porque o ajuste fino não ficou legal? Quanto custa perder UM paciente particular porque você não se sentiu segura para atender um caso complexo, como perda assimétrica?

 O custo de continuar insegura é muito maior que o valor da Formação AASI. Com poucos pacientes que você fideliza usando o raciocínio clínico correto, você paga a Formação inteira e ainda sobra o seu rico dinheirinho!

 Não veja como gasto, aquilo que é um investimento com potencial dei transformar a sua carreira. Temos diversos casos de abertura de clínica, promoção, expansão de clínicas, mudança de trabalho para outro de salário maior, e até concurso para ser professora de universidade federal!
A nossa turma tá linda, e o bônus da Imersão de sábado tá quase acabando. O link tá na bio! ❤️',
    'https://www.instagram.com/p/DVggJocjtxs/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18116504644626783", "tipo_postagem": "IMAGE", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-05 00:00:00", "hora_postagem": "15:31:23", "legenda": "“Ju, eu queria muito entrar na Formação, mas tô sem dinheiro agora...”\n\n Meu amor, deixa eu te falar uma coisa com muito carinho: vamos fazer uma continha rápida juntas? Quanto custa UMA devolução de aparelho premium porque o ajuste fino não ficou legal? Quanto custa perder UM paciente particular porque você não se sentiu segura para atender um caso complexo, como perda assimétrica?\n\n O custo de continuar insegura é muito maior que o valor da Formação AASI. Com poucos pacientes que você fideliza usando o raciocínio clínico correto, você paga a Formação inteira e ainda sobra o seu rico dinheirinho!\n\n Não veja como gasto, aquilo que é um investimento com potencial dei transformar a sua carreira. Temos diversos casos de abertura de clínica, promoção, expansão de clínicas, mudança de trabalho para outro de salário maior, e até concurso para ser professora de universidade federal!\nA nossa turma tá linda, e o bônus da Imersão de sábado tá quase acabando. O link tá na bio! ❤️", "permalink": "https://www.instagram.com/p/DVggJocjtxs/", "reach": 453.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  27,
  0,
  453,
  0,
  0,
  0.059603,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18116504644626783", "tipo_postagem": "IMAGE", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-03-05 00:00:00", "hora_postagem": "15:31:23", "legenda": "“Ju, eu queria muito entrar na Formação, mas tô sem dinheiro agora...”\n\n Meu amor, deixa eu te falar uma coisa com muito carinho: vamos fazer uma continha rápida juntas? Quanto custa UMA devolução de aparelho premium porque o ajuste fino não ficou legal? Quanto custa perder UM paciente particular porque você não se sentiu segura para atender um caso complexo, como perda assimétrica?\n\n O custo de continuar insegura é muito maior que o valor da Formação AASI. Com poucos pacientes que você fideliza usando o raciocínio clínico correto, você paga a Formação inteira e ainda sobra o seu rico dinheirinho!\n\n Não veja como gasto, aquilo que é um investimento com potencial dei transformar a sua carreira. Temos diversos casos de abertura de clínica, promoção, expansão de clínicas, mudança de trabalho para outro de salário maior, e até concurso para ser professora de universidade federal!\nA nossa turma tá linda, e o bônus da Imersão de sábado tá quase acabando. O link tá na bio! ❤️", "permalink": "https://www.instagram.com/p/DVggJocjtxs/", "reach": 453.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17933366976189359',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-04'::date,
    '20:41:58'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Pelo amor de Deus, parem de adivinhar ajustes! 🙏

 A verificação objetiva é a sua maior aliada. É ela que te dá a segurança de bater no peito e dizer: “Dona Maria, o seu aparelho está programado perfeitamente para a sua perda”.

 Eu sei que no começo a sonda assusta, deixa a gente de cabelo em pé. Mas eu te prometo que na Formação AASI eu simplifico tudo para você aplicar amanhã no seu consultório.

 👉 Clica no link da bio, garante sua vaga e vem ganhar a Imersão CROS e BiCROS de bônus!
CUPOM DE DESCONTO: 300off',
    'https://www.instagram.com/reel/DVee9rzEpxD/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17933366976189359", "tipo_postagem": "VIDEO", "likes": 15.0, "comentarios": 4.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "20:41:58", "legenda": "Pelo amor de Deus, parem de adivinhar ajustes! 🙏\n\n A verificação objetiva é a sua maior aliada. É ela que te dá a segurança de bater no peito e dizer: “Dona Maria, o seu aparelho está programado perfeitamente para a sua perda”.\n\n Eu sei que no começo a sonda assusta, deixa a gente de cabelo em pé. Mas eu te prometo que na Formação AASI eu simplifico tudo para você aplicar amanhã no seu consultório.\n\n 👉 Clica no link da bio, garante sua vaga e vem ganhar a Imersão CROS e BiCROS de bônus!\nCUPOM DE DESCONTO: 300off", "permalink": "https://www.instagram.com/reel/DVee9rzEpxD/", "reach": 448.0, "saved": 1.0, "shares": 4.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  15,
  4,
  448,
  1,
  4,
  0.044643,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17933366976189359", "tipo_postagem": "VIDEO", "likes": 15.0, "comentarios": 4.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "20:41:58", "legenda": "Pelo amor de Deus, parem de adivinhar ajustes! 🙏\n\n A verificação objetiva é a sua maior aliada. É ela que te dá a segurança de bater no peito e dizer: “Dona Maria, o seu aparelho está programado perfeitamente para a sua perda”.\n\n Eu sei que no começo a sonda assusta, deixa a gente de cabelo em pé. Mas eu te prometo que na Formação AASI eu simplifico tudo para você aplicar amanhã no seu consultório.\n\n 👉 Clica no link da bio, garante sua vaga e vem ganhar a Imersão CROS e BiCROS de bônus!\nCUPOM DE DESCONTO: 300off", "permalink": "https://www.instagram.com/reel/DVee9rzEpxD/", "reach": 448.0, "saved": 1.0, "shares": 4.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18041801732727407',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-04'::date,
    '14:11:25'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Vocês me corrijam se eu estiver errada, mas a teoria a gente até entende, o problema é na hora de sentar na frente do software e fazer os ajustes, né? 😅

Saber a diferença entre CROS e BiCROS é só o começo. O pulo do gato está em saber ajustar o ganho sem sobrecarregar a orelha melhor e validar se o paciente realmente está tendo benefício no dia a dia.

Neste sábado, nós vamos ter uma Imersão Ao Vivo maravilhosa só sobre isso! E você pode participar de graça.

 É só garantir sua vaga na Formação AASI hoje. CUPOM DE DESCONTO ATÉ SEXTA. Cupom: 300off
O link tá na bio, meu amor! Vem! 🔗',
    'https://www.instagram.com/p/DVdySuTjrJ-/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18041801732727407", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 191.0, "comentarios": 6.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "14:11:25", "legenda": "Vocês me corrijam se eu estiver errada, mas a teoria a gente até entende, o problema é na hora de sentar na frente do software e fazer os ajustes, né? 😅\n\nSaber a diferença entre CROS e BiCROS é só o começo. O pulo do gato está em saber ajustar o ganho sem sobrecarregar a orelha melhor e validar se o paciente realmente está tendo benefício no dia a dia.\n\nNeste sábado, nós vamos ter uma Imersão Ao Vivo maravilhosa só sobre isso! E você pode participar de graça.\n\n É só garantir sua vaga na Formação AASI hoje. CUPOM DE DESCONTO ATÉ SEXTA. Cupom: 300off\nO link tá na bio, meu amor! Vem! 🔗", "permalink": "https://www.instagram.com/p/DVdySuTjrJ-/", "reach": 2609.0, "saved": 66.0, "shares": 33.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  191,
  6,
  2609,
  66,
  33,
  0.100805,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18041801732727407", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 191.0, "comentarios": 6.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "14:11:25", "legenda": "Vocês me corrijam se eu estiver errada, mas a teoria a gente até entende, o problema é na hora de sentar na frente do software e fazer os ajustes, né? 😅\n\nSaber a diferença entre CROS e BiCROS é só o começo. O pulo do gato está em saber ajustar o ganho sem sobrecarregar a orelha melhor e validar se o paciente realmente está tendo benefício no dia a dia.\n\nNeste sábado, nós vamos ter uma Imersão Ao Vivo maravilhosa só sobre isso! E você pode participar de graça.\n\n É só garantir sua vaga na Formação AASI hoje. CUPOM DE DESCONTO ATÉ SEXTA. Cupom: 300off\nO link tá na bio, meu amor! Vem! 🔗", "permalink": "https://www.instagram.com/p/DVdySuTjrJ-/", "reach": 2609.0, "saved": 66.0, "shares": 33.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17991731027763434',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-04'::date,
    '00:30:56'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '🚨 GENTE, ESTÃO ABERTAS AS INSCRIÇÕES PARA A FORMAÇÃO AASI! 🚨

 Ai que coisa linda poder anunciar isso para vocês! Chegou a hora de deixar a insegurança para trás e dominar o raciocínio clínico de verdade. Na Formação AASI, eu pego na sua mão e te ensino o meu Método PREMIUM.

 🎁 E olha esse PRESENTE (Só para quem entrar essa semana): Você vai ganhar acesso VIP e ao vivo à minha Imersão CROS e BiCROS (que vai acontecer neste sábado, 07/03). Nós vamos destrinchar juntas todo o protocolo para perdas unilaterais e assimétricas.

 Não tem previsão para outra oportunidade assim, tá? 👉 Clica no link da minha bio e vem fazer parte da nossa turma. Tô te esperando!',
    'https://www.instagram.com/reel/DVcUVEMDL1C/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17991731027763434", "tipo_postagem": "VIDEO", "likes": 224.0, "comentarios": 13.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "00:30:56", "legenda": "🚨 GENTE, ESTÃO ABERTAS AS INSCRIÇÕES PARA A FORMAÇÃO AASI! 🚨\n\n Ai que coisa linda poder anunciar isso para vocês! Chegou a hora de deixar a insegurança para trás e dominar o raciocínio clínico de verdade. Na Formação AASI, eu pego na sua mão e te ensino o meu Método PREMIUM.\n\n 🎁 E olha esse PRESENTE (Só para quem entrar essa semana): Você vai ganhar acesso VIP e ao vivo à minha Imersão CROS e BiCROS (que vai acontecer neste sábado, 07/03). Nós vamos destrinchar juntas todo o protocolo para perdas unilaterais e assimétricas.\n\n Não tem previsão para outra oportunidade assim, tá? 👉 Clica no link da minha bio e vem fazer parte da nossa turma. Tô te esperando!", "permalink": "https://www.instagram.com/reel/DVcUVEMDL1C/", "reach": 4244.0, "saved": 26.0, "shares": 25.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  224,
  13,
  4244,
  26,
  25,
  0.061970,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17991731027763434", "tipo_postagem": "VIDEO", "likes": 224.0, "comentarios": 13.0, "data_postagem": "2026-03-04 00:00:00", "hora_postagem": "00:30:56", "legenda": "🚨 GENTE, ESTÃO ABERTAS AS INSCRIÇÕES PARA A FORMAÇÃO AASI! 🚨\n\n Ai que coisa linda poder anunciar isso para vocês! Chegou a hora de deixar a insegurança para trás e dominar o raciocínio clínico de verdade. Na Formação AASI, eu pego na sua mão e te ensino o meu Método PREMIUM.\n\n 🎁 E olha esse PRESENTE (Só para quem entrar essa semana): Você vai ganhar acesso VIP e ao vivo à minha Imersão CROS e BiCROS (que vai acontecer neste sábado, 07/03). Nós vamos destrinchar juntas todo o protocolo para perdas unilaterais e assimétricas.\n\n Não tem previsão para outra oportunidade assim, tá? 👉 Clica no link da minha bio e vem fazer parte da nossa turma. Tô te esperando!", "permalink": "https://www.instagram.com/reel/DVcUVEMDL1C/", "reach": 4244.0, "saved": 26.0, "shares": 25.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17878556886480521',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-03'::date,
    '14:22:35'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Meu amor, deixa eu te fazer uma pergunta muito sincera: quantas vezes você já perdeu noites de sono preocupada com aquele caso que não conseguiu resolver? 😔

A insegurança técnica é normal no começo, eu mesma já tive muito medo! Mas quando ela paralisa o seu crescimento, ela começa a custar caro. Custa o seu tempo, a sua paz e o seu rico dinheirinho com devoluções que poderiam ser evitadas.

A boa notícia? Segurança não é dom, é método e mão-na-massa! Quando você entende a fisiologia, faz uma regulagem inteligente e domina as etapas do aparelho auditivo, seu raciocínio clínico te permite pegar casos mais complexos!.

É exatamente essa transformação que nós vivemos na Formação AASI. E hoje à noite, eu vou abrir uma oportunidade com um presente que, olha... tá que é um máximo! Nos vemos às 20h! ✨',
    'https://www.instagram.com/p/DVbOs6gjqK-/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17878556886480521", "tipo_postagem": "IMAGE", "likes": 24.0, "comentarios": 0.0, "data_postagem": "2026-03-03 00:00:00", "hora_postagem": "14:22:35", "legenda": "Meu amor, deixa eu te fazer uma pergunta muito sincera: quantas vezes você já perdeu noites de sono preocupada com aquele caso que não conseguiu resolver? 😔\n\nA insegurança técnica é normal no começo, eu mesma já tive muito medo! Mas quando ela paralisa o seu crescimento, ela começa a custar caro. Custa o seu tempo, a sua paz e o seu rico dinheirinho com devoluções que poderiam ser evitadas.\n\nA boa notícia? Segurança não é dom, é método e mão-na-massa! Quando você entende a fisiologia, faz uma regulagem inteligente e domina as etapas do aparelho auditivo, seu raciocínio clínico te permite pegar casos mais complexos!.\n\nÉ exatamente essa transformação que nós vivemos na Formação AASI. E hoje à noite, eu vou abrir uma oportunidade com um presente que, olha... tá que é um máximo! Nos vemos às 20h! ✨", "permalink": "https://www.instagram.com/p/DVbOs6gjqK-/", "reach": 809.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  24,
  0,
  809,
  0,
  0,
  0.029666,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17878556886480521", "tipo_postagem": "IMAGE", "likes": 24.0, "comentarios": 0.0, "data_postagem": "2026-03-03 00:00:00", "hora_postagem": "14:22:35", "legenda": "Meu amor, deixa eu te fazer uma pergunta muito sincera: quantas vezes você já perdeu noites de sono preocupada com aquele caso que não conseguiu resolver? 😔\n\nA insegurança técnica é normal no começo, eu mesma já tive muito medo! Mas quando ela paralisa o seu crescimento, ela começa a custar caro. Custa o seu tempo, a sua paz e o seu rico dinheirinho com devoluções que poderiam ser evitadas.\n\nA boa notícia? Segurança não é dom, é método e mão-na-massa! Quando você entende a fisiologia, faz uma regulagem inteligente e domina as etapas do aparelho auditivo, seu raciocínio clínico te permite pegar casos mais complexos!.\n\nÉ exatamente essa transformação que nós vivemos na Formação AASI. E hoje à noite, eu vou abrir uma oportunidade com um presente que, olha... tá que é um máximo! Nos vemos às 20h! ✨", "permalink": "https://www.instagram.com/p/DVbOs6gjqK-/", "reach": 809.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17895627039409777',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-02'::date,
    '22:47:42'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Gente, o “First-Fit” (aquele ajuste automático do software) é uma facilidade, mas não pode ser o seu único recurso. Se você depende só dele, na hora que o paciente traz uma queixa complexa, o desespero bate, né?

E o pior: isso gera devolução de aparelho e impede você de cobrar o valor que você realmente merece pelo seu atendimento.

Para ser uma Fono Premium, você precisa saber o porquê de cada clique. Amanhã, às 20h, eu vou liberar algo que vai mudar a vida de vocês. Ativem as notificações, tá? ❤️',
    'https://www.instagram.com/p/DVZjyctDoa0/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17895627039409777", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-02 00:00:00", "hora_postagem": "22:47:42", "legenda": "Gente, o “First-Fit” (aquele ajuste automático do software) é uma facilidade, mas não pode ser o seu único recurso. Se você depende só dele, na hora que o paciente traz uma queixa complexa, o desespero bate, né?\n\nE o pior: isso gera devolução de aparelho e impede você de cobrar o valor que você realmente merece pelo seu atendimento.\n\nPara ser uma Fono Premium, você precisa saber o porquê de cada clique. Amanhã, às 20h, eu vou liberar algo que vai mudar a vida de vocês. Ativem as notificações, tá? ❤️", "permalink": "https://www.instagram.com/p/DVZjyctDoa0/", "reach": 623.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  13,
  0,
  623,
  1,
  0,
  0.022472,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17895627039409777", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-02 00:00:00", "hora_postagem": "22:47:42", "legenda": "Gente, o “First-Fit” (aquele ajuste automático do software) é uma facilidade, mas não pode ser o seu único recurso. Se você depende só dele, na hora que o paciente traz uma queixa complexa, o desespero bate, né?\n\nE o pior: isso gera devolução de aparelho e impede você de cobrar o valor que você realmente merece pelo seu atendimento.\n\nPara ser uma Fono Premium, você precisa saber o porquê de cada clique. Amanhã, às 20h, eu vou liberar algo que vai mudar a vida de vocês. Ativem as notificações, tá? ❤️", "permalink": "https://www.instagram.com/p/DVZjyctDoa0/", "reach": 623.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18113030575731513',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-03-02'::date,
    '19:47:42'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Eu sei que dá um frio na barriga quando chega um paciente com perda unilateral, mas pare de fugir deles! 🛑
Olha esses 5 motivos para você dominar esse assunto de uma vez por todas:
1. Os pacientes estão desesperados por ajuda: O paciente não aguenta mais ter suas queixas subestimadas e escutar que “não tem o que fazer”, que ele “já tem um lado bom pra ouvir”.... e continuar sem entender nada no ruído, cansado, com sobrecarga... Quem resolve isso, vira uma autoridade inquestionável para ele.
2. É um nicho Premium (Oceano Azul): Pouquíssimas fonoaudiólogas dominam a regulagem e verificação de CROS e BiCROS. Quem domina esse nicho sai na frente, se diferencia na região e pode cobrar mais pelo atendimento.
3.Você pode expandir seus atendimentos. A perda auditiva unilateral te abre as portas para também trabalhar com prótese ancorada no osso, microfone remoto e até implante coclear! 
4. Chega de devolução: saber regular e verificar o CROS do jeito certo, te tira aquela frustração de o paciente devolver o aparelho porque “não viu diferença” e você ficar insegura do que fez!
5. Você pode aprender isso comigo, AO VIVO! Na próxima aula da Formação AASI🎁',
    'https://www.instagram.com/reel/DVZPK6LEpWu/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18113030575731513", "tipo_postagem": "VIDEO", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-02 00:00:00", "hora_postagem": "19:47:42", "legenda": "Eu sei que dá um frio na barriga quando chega um paciente com perda unilateral, mas pare de fugir deles! 🛑\nOlha esses 5 motivos para você dominar esse assunto de uma vez por todas:\n1. Os pacientes estão desesperados por ajuda: O paciente não aguenta mais ter suas queixas subestimadas e escutar que “não tem o que fazer”, que ele “já tem um lado bom pra ouvir”.... e continuar sem entender nada no ruído, cansado, com sobrecarga... Quem resolve isso, vira uma autoridade inquestionável para ele.\n2. É um nicho Premium (Oceano Azul): Pouquíssimas fonoaudiólogas dominam a regulagem e verificação de CROS e BiCROS. Quem domina esse nicho sai na frente, se diferencia na região e pode cobrar mais pelo atendimento.\n3.Você pode expandir seus atendimentos. A perda auditiva unilateral te abre as portas para também trabalhar com prótese ancorada no osso, microfone remoto e até implante coclear! \n4. Chega de devolução: saber regular e verificar o CROS do jeito certo, te tira aquela frustração de o paciente devolver o aparelho porque “não viu diferença” e você ficar insegura do que fez!\n5. Você pode aprender isso comigo, AO VIVO! Na próxima aula da Formação AASI🎁", "permalink": "https://www.instagram.com/reel/DVZPK6LEpWu/", "reach": 714.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  13,
  0,
  714,
  1,
  0,
  0.019608,
  'Ruim'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18113030575731513", "tipo_postagem": "VIDEO", "likes": 13.0, "comentarios": 0.0, "data_postagem": "2026-03-02 00:00:00", "hora_postagem": "19:47:42", "legenda": "Eu sei que dá um frio na barriga quando chega um paciente com perda unilateral, mas pare de fugir deles! 🛑\nOlha esses 5 motivos para você dominar esse assunto de uma vez por todas:\n1. Os pacientes estão desesperados por ajuda: O paciente não aguenta mais ter suas queixas subestimadas e escutar que “não tem o que fazer”, que ele “já tem um lado bom pra ouvir”.... e continuar sem entender nada no ruído, cansado, com sobrecarga... Quem resolve isso, vira uma autoridade inquestionável para ele.\n2. É um nicho Premium (Oceano Azul): Pouquíssimas fonoaudiólogas dominam a regulagem e verificação de CROS e BiCROS. Quem domina esse nicho sai na frente, se diferencia na região e pode cobrar mais pelo atendimento.\n3.Você pode expandir seus atendimentos. A perda auditiva unilateral te abre as portas para também trabalhar com prótese ancorada no osso, microfone remoto e até implante coclear! \n4. Chega de devolução: saber regular e verificar o CROS do jeito certo, te tira aquela frustração de o paciente devolver o aparelho porque “não viu diferença” e você ficar insegura do que fez!\n5. Você pode aprender isso comigo, AO VIVO! Na próxima aula da Formação AASI🎁", "permalink": "https://www.instagram.com/reel/DVZPK6LEpWu/", "reach": 714.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18092949790828253',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-24'::date,
    '17:54:04'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '1. Perda auditiva leve:
Perda leve não é sinônimo de ausência de impacto. Evidências mostram aumento do esforço auditivo, maior demanda cognitiva para compreensão da fala, fadiga e prejuízo funcional, especialmente em ambientes ruidosos. Quando há queixa consistente e impacto mensurável na comunicação, a amplificação é clinicamente justificável, independentemente do grau audiométrico isolado.

2. Perda auditiva restrita às frequências agudas:
A preservação de limiares em graves não garante boa inteligibilidade. A perda em altas frequências compromete a audibilidade de consoantes, a compreensão da fala no ruído e aumenta o esforço auditivo. Nesses casos, a média tonal pode subestimar o prejuízo, e a indicação deve ser baseada em função comunicativa, não apenas em dB.

3. Perda auditiva unilateral (de qualquer grau):
A assimetria auditiva impacta localização sonora, percepção espacial e compreensão em ambientes complexos, além de aumentar o esforço auditivo. Diretrizes atuais reconhecem que a perda unilateral não é benigna. A indicação de tecnologia deve considerar impacto funcional, presença de zumbido e objetivos do paciente, e não se restringe ao grau da perda.

4. Perda auditiva associada a microtia:
Limitações anatômicas não eliminam a necessidade de acesso auditivo. Em casos de microtia, a intervenção com tecnologia específica (aparelho de condução óssea) deve ser considerada.

Infelizmente muitos desses casos na recebem orientação e indicação e ficam perdidos! Com muitos pacientes precisando de ajuda. Não vamos deixar! Vamos espalhar a informação correta 💪🏼👊🏼✨',
    'https://www.instagram.com/reel/DVJlGjyjn_t/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18092949790828253", "tipo_postagem": "VIDEO", "likes": 263.0, "comentarios": 12.0, "data_postagem": "2026-02-24 00:00:00", "hora_postagem": "17:54:04", "legenda": "1. Perda auditiva leve:\nPerda leve não é sinônimo de ausência de impacto. Evidências mostram aumento do esforço auditivo, maior demanda cognitiva para compreensão da fala, fadiga e prejuízo funcional, especialmente em ambientes ruidosos. Quando há queixa consistente e impacto mensurável na comunicação, a amplificação é clinicamente justificável, independentemente do grau audiométrico isolado.\n\n2. Perda auditiva restrita às frequências agudas:\nA preservação de limiares em graves não garante boa inteligibilidade. A perda em altas frequências compromete a audibilidade de consoantes, a compreensão da fala no ruído e aumenta o esforço auditivo. Nesses casos, a média tonal pode subestimar o prejuízo, e a indicação deve ser baseada em função comunicativa, não apenas em dB.\n\n3. Perda auditiva unilateral (de qualquer grau):\nA assimetria auditiva impacta localização sonora, percepção espacial e compreensão em ambientes complexos, além de aumentar o esforço auditivo. Diretrizes atuais reconhecem que a perda unilateral não é benigna. A indicação de tecnologia deve considerar impacto funcional, presença de zumbido e objetivos do paciente, e não se restringe ao grau da perda.\n\n4. Perda auditiva associada a microtia:\nLimitações anatômicas não eliminam a necessidade de acesso auditivo. Em casos de microtia, a intervenção com tecnologia específica (aparelho de condução óssea) deve ser considerada.\n\nInfelizmente muitos desses casos na recebem orientação e indicação e ficam perdidos! Com muitos pacientes precisando de ajuda. Não vamos deixar! Vamos espalhar a informação correta 💪🏼👊🏼✨", "permalink": "https://www.instagram.com/reel/DVJlGjyjn_t/", "reach": 5743.0, "saved": 93.0, "shares": 43.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  263,
  12,
  5743,
  93,
  43,
  0.064078,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18092949790828253", "tipo_postagem": "VIDEO", "likes": 263.0, "comentarios": 12.0, "data_postagem": "2026-02-24 00:00:00", "hora_postagem": "17:54:04", "legenda": "1. Perda auditiva leve:\nPerda leve não é sinônimo de ausência de impacto. Evidências mostram aumento do esforço auditivo, maior demanda cognitiva para compreensão da fala, fadiga e prejuízo funcional, especialmente em ambientes ruidosos. Quando há queixa consistente e impacto mensurável na comunicação, a amplificação é clinicamente justificável, independentemente do grau audiométrico isolado.\n\n2. Perda auditiva restrita às frequências agudas:\nA preservação de limiares em graves não garante boa inteligibilidade. A perda em altas frequências compromete a audibilidade de consoantes, a compreensão da fala no ruído e aumenta o esforço auditivo. Nesses casos, a média tonal pode subestimar o prejuízo, e a indicação deve ser baseada em função comunicativa, não apenas em dB.\n\n3. Perda auditiva unilateral (de qualquer grau):\nA assimetria auditiva impacta localização sonora, percepção espacial e compreensão em ambientes complexos, além de aumentar o esforço auditivo. Diretrizes atuais reconhecem que a perda unilateral não é benigna. A indicação de tecnologia deve considerar impacto funcional, presença de zumbido e objetivos do paciente, e não se restringe ao grau da perda.\n\n4. Perda auditiva associada a microtia:\nLimitações anatômicas não eliminam a necessidade de acesso auditivo. Em casos de microtia, a intervenção com tecnologia específica (aparelho de condução óssea) deve ser considerada.\n\nInfelizmente muitos desses casos na recebem orientação e indicação e ficam perdidos! Com muitos pacientes precisando de ajuda. Não vamos deixar! Vamos espalhar a informação correta 💪🏼👊🏼✨", "permalink": "https://www.instagram.com/reel/DVJlGjyjn_t/", "reach": 5743.0, "saved": 93.0, "shares": 43.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18060346637694140',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-23'::date,
    '14:50:51'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Aí a gente se garante 😂 entrando na trend!',
    'https://www.instagram.com/reel/DVGrkS3jmFX/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18060346637694140", "tipo_postagem": "VIDEO", "likes": 203.0, "comentarios": 15.0, "data_postagem": "2026-02-23 00:00:00", "hora_postagem": "14:50:51", "legenda": "Aí a gente se garante 😂 entrando na trend!", "permalink": "https://www.instagram.com/reel/DVGrkS3jmFX/", "reach": 3732.0, "saved": 9.0, "shares": 10.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  203,
  15,
  3732,
  9,
  10,
  0.060825,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18060346637694140", "tipo_postagem": "VIDEO", "likes": 203.0, "comentarios": 15.0, "data_postagem": "2026-02-23 00:00:00", "hora_postagem": "14:50:51", "legenda": "Aí a gente se garante 😂 entrando na trend!", "permalink": "https://www.instagram.com/reel/DVGrkS3jmFX/", "reach": 3732.0, "saved": 9.0, "shares": 10.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18160228966410731',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-19'::date,
    '18:09:58'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Czinha ou Czona?? Crosscheck SEMPRE!! Uma curva C pode não ser só uma disfunção tubária passageira.

Uma curva mais negativa que -200daPa, com GAP e reflexo AUSENTE, mesmo sendo uma curva C com um super pico, pode indicar secreção!

Essa proposta de sub-dividir a curva C em C1 e C2 começou com Margolis,1987. 

E, entenda:
Não estou dizendo que você precisa usar essa literatura e referenciar desse jeito!!

 Só mostrando que ficar preso em decorar números de uma só tabela, pode perder a riqueza e complexidade que é o sistema auditivo! 

E uma Fono premium tem os olhos bem atentos! Raciocínio clínico acima de tudo!✨🫶🏼',
    'https://www.instagram.com/reel/DU8uLrBjuZ_/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18160228966410731", "tipo_postagem": "VIDEO", "likes": 43.0, "comentarios": 6.0, "data_postagem": "2026-02-19 00:00:00", "hora_postagem": "18:09:58", "legenda": "Czinha ou Czona?? Crosscheck SEMPRE!! Uma curva C pode não ser só uma disfunção tubária passageira.\n\nUma curva mais negativa que -200daPa, com GAP e reflexo AUSENTE, mesmo sendo uma curva C com um super pico, pode indicar secreção!\n\nEssa proposta de sub-dividir a curva C em C1 e C2 começou com Margolis,1987. \n\nE, entenda:\nNão estou dizendo que você precisa usar essa literatura e referenciar desse jeito!!\n\n Só mostrando que ficar preso em decorar números de uma só tabela, pode perder a riqueza e complexidade que é o sistema auditivo! \n\nE uma Fono premium tem os olhos bem atentos! Raciocínio clínico acima de tudo!✨🫶🏼", "permalink": "https://www.instagram.com/reel/DU8uLrBjuZ_/", "reach": 857.0, "saved": 11.0, "shares": 8.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  43,
  6,
  857,
  11,
  8,
  0.070012,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18160228966410731", "tipo_postagem": "VIDEO", "likes": 43.0, "comentarios": 6.0, "data_postagem": "2026-02-19 00:00:00", "hora_postagem": "18:09:58", "legenda": "Czinha ou Czona?? Crosscheck SEMPRE!! Uma curva C pode não ser só uma disfunção tubária passageira.\n\nUma curva mais negativa que -200daPa, com GAP e reflexo AUSENTE, mesmo sendo uma curva C com um super pico, pode indicar secreção!\n\nEssa proposta de sub-dividir a curva C em C1 e C2 começou com Margolis,1987. \n\nE, entenda:\nNão estou dizendo que você precisa usar essa literatura e referenciar desse jeito!!\n\n Só mostrando que ficar preso em decorar números de uma só tabela, pode perder a riqueza e complexidade que é o sistema auditivo! \n\nE uma Fono premium tem os olhos bem atentos! Raciocínio clínico acima de tudo!✨🫶🏼", "permalink": "https://www.instagram.com/reel/DU8uLrBjuZ_/", "reach": 857.0, "saved": 11.0, "shares": 8.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18192630493346123',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-13'::date,
    '21:55:07'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Quais os maiores erros que você pega na avaliação infantil e atrasa o diagnóstico??
Isso não pode acontecer! 
Por isso na @tempranoaudiologia @clinicaaura o atendimento especializado em audiologia infantil conta com fonos experientes na área e os exames completos para todas as faixas etárias!',
    'https://www.instagram.com/reel/DUtsCtxkivJ/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18192630493346123", "tipo_postagem": "VIDEO", "likes": 120.0, "comentarios": 10.0, "data_postagem": "2026-02-13 00:00:00", "hora_postagem": "21:55:07", "legenda": "Quais os maiores erros que você pega na avaliação infantil e atrasa o diagnóstico??\nIsso não pode acontecer! \nPor isso na @tempranoaudiologia @clinicaaura o atendimento especializado em audiologia infantil conta com fonos experientes na área e os exames completos para todas as faixas etárias!", "permalink": "https://www.instagram.com/reel/DUtsCtxkivJ/", "reach": 2552.0, "saved": 12.0, "shares": 18.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  120,
  10,
  2552,
  12,
  18,
  0.055643,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18192630493346123", "tipo_postagem": "VIDEO", "likes": 120.0, "comentarios": 10.0, "data_postagem": "2026-02-13 00:00:00", "hora_postagem": "21:55:07", "legenda": "Quais os maiores erros que você pega na avaliação infantil e atrasa o diagnóstico??\nIsso não pode acontecer! \nPor isso na @tempranoaudiologia @clinicaaura o atendimento especializado em audiologia infantil conta com fonos experientes na área e os exames completos para todas as faixas etárias!", "permalink": "https://www.instagram.com/reel/DUtsCtxkivJ/", "reach": 2552.0, "saved": 12.0, "shares": 18.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17911426026312996',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-11'::date,
    '18:43:01'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'E o Georgie tem perda auditiva! Antes de qualquer diagnóstico comportamental (agitado, desatento, teimoso), deve ser descartada alteração auditiva periférica e central! Fono, é nosso momento de brilhar! Ajude a disseminar esse conhecimento, aproveitando o hype!#fonoaudiologia #audiologia #aasi',
    'https://www.instagram.com/reel/DUoMdo4DlDP/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17911426026312996", "tipo_postagem": "VIDEO", "likes": 213.0, "comentarios": 14.0, "data_postagem": "2026-02-11 00:00:00", "hora_postagem": "18:43:01", "legenda": "E o Georgie tem perda auditiva! Antes de qualquer diagnóstico comportamental (agitado, desatento, teimoso), deve ser descartada alteração auditiva periférica e central! Fono, é nosso momento de brilhar! Ajude a disseminar esse conhecimento, aproveitando o hype!#fonoaudiologia #audiologia #aasi", "permalink": "https://www.instagram.com/reel/DUoMdo4DlDP/", "reach": 4664.0, "saved": 19.0, "shares": 54.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  213,
  14,
  4664,
  19,
  54,
  0.052744,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17911426026312996", "tipo_postagem": "VIDEO", "likes": 213.0, "comentarios": 14.0, "data_postagem": "2026-02-11 00:00:00", "hora_postagem": "18:43:01", "legenda": "E o Georgie tem perda auditiva! Antes de qualquer diagnóstico comportamental (agitado, desatento, teimoso), deve ser descartada alteração auditiva periférica e central! Fono, é nosso momento de brilhar! Ajude a disseminar esse conhecimento, aproveitando o hype!#fonoaudiologia #audiologia #aasi", "permalink": "https://www.instagram.com/reel/DUoMdo4DlDP/", "reach": 4664.0, "saved": 19.0, "shares": 54.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17897927622243717',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-10'::date,
    '18:30:15'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Quando a clínica vira sala de aula 🫶🏼❤️✨',
    'https://www.instagram.com/reel/DUlmLSkDp-y/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17897927622243717", "tipo_postagem": "VIDEO", "likes": 67.0, "comentarios": 10.0, "data_postagem": "2026-02-10 00:00:00", "hora_postagem": "18:30:15", "legenda": "Quando a clínica vira sala de aula 🫶🏼❤️✨", "permalink": "https://www.instagram.com/reel/DUlmLSkDp-y/", "reach": 1141.0, "saved": 1.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  67,
  10,
  1141,
  1,
  2,
  0.068361,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17897927622243717", "tipo_postagem": "VIDEO", "likes": 67.0, "comentarios": 10.0, "data_postagem": "2026-02-10 00:00:00", "hora_postagem": "18:30:15", "legenda": "Quando a clínica vira sala de aula 🫶🏼❤️✨", "permalink": "https://www.instagram.com/reel/DUlmLSkDp-y/", "reach": 1141.0, "saved": 1.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18151323562453743',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-09'::date,
    '15:07:59'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Acordei ácida 😂🤪',
    'https://www.instagram.com/p/DUiqYg0DowD/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18151323562453743", "tipo_postagem": "IMAGE", "likes": 22.0, "comentarios": 2.0, "data_postagem": "2026-02-09 00:00:00", "hora_postagem": "15:07:59", "legenda": "Acordei ácida 😂🤪", "permalink": "https://www.instagram.com/p/DUiqYg0DowD/", "reach": 892.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  22,
  2,
  892,
  0,
  0,
  0.026906,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18151323562453743", "tipo_postagem": "IMAGE", "likes": 22.0, "comentarios": 2.0, "data_postagem": "2026-02-09 00:00:00", "hora_postagem": "15:07:59", "legenda": "Acordei ácida 😂🤪", "permalink": "https://www.instagram.com/p/DUiqYg0DowD/", "reach": 892.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18440161813110475',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-07'::date,
    '23:33:37'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Entrando na trend depois de tanto bullying 😂😂😂😂 fazer o que se eu amo esse jiu-jítsu 🤪🥋',
    'https://www.instagram.com/reel/DUeanlkjj73/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18440161813110475", "tipo_postagem": "VIDEO", "likes": 39.0, "comentarios": 17.0, "data_postagem": "2026-02-07 00:00:00", "hora_postagem": "23:33:37", "legenda": "Entrando na trend depois de tanto bullying 😂😂😂😂 fazer o que se eu amo esse jiu-jítsu 🤪🥋", "permalink": "https://www.instagram.com/reel/DUeanlkjj73/", "reach": 1686.0, "saved": 1.0, "shares": 6.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  39,
  17,
  1686,
  1,
  6,
  0.033808,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18440161813110475", "tipo_postagem": "VIDEO", "likes": 39.0, "comentarios": 17.0, "data_postagem": "2026-02-07 00:00:00", "hora_postagem": "23:33:37", "legenda": "Entrando na trend depois de tanto bullying 😂😂😂😂 fazer o que se eu amo esse jiu-jítsu 🤪🥋", "permalink": "https://www.instagram.com/reel/DUeanlkjj73/", "reach": 1686.0, "saved": 1.0, "shares": 6.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17864315769569123',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-06'::date,
    '16:40:36'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '1️⃣ Iniciar a adaptação sem uma avaliação prévia completa
Sem uma avaliação que realmente guie decisões, a adaptação vira tentativa e erro.

2️⃣ Aplicar protocolos padrão sem raciocínio clínico individualizado
Cada paciente tem história, demanda funcional e tolerância sonora diferentes… e isso precisa entrar na decisão.

3️⃣ Ajustar no software sem verificação
O que o software mostra nem sempre é o que chega ao conduto auditivo. Verificação não é detalhe técnico: é o que garante que o ajuste faz sentido na vida real.

4️⃣ Regular pensando só em alvos, ignorando conforto, esforço auditivo e etc
Target atingido não significa escuta confortável. Se o paciente se cansa, usa pouco, sente desconforto, ou evita situações sociais, algo não está funcionando.

5️⃣ Pular testes de fala e não acompanhar a evolução clínica
Sem validação funcional e acompanhamento, não existe evidência de benefício — só suposição. Evolução clínica precisa ser medida, registrada e revisada.

🔎 Avaliação, verificação e validação não são etapas extras.
São o que sustenta resultado, adesão e valor clínico.

📒 O Planner da Fono Premium foi criado para te ajudar a estruturar cada uma dessas etapas, com clareza, método e raciocínio clínico.

👉 Use o planner para transformar adaptação em processo. Sem esquecimento, sem perder tempo, com raciocínio clínico claro. LINK NA BIO',
    'https://www.instagram.com/reel/DUbGYxZDmuq/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17864315769569123", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-02-06 00:00:00", "hora_postagem": "16:40:36", "legenda": "1️⃣ Iniciar a adaptação sem uma avaliação prévia completa\nSem uma avaliação que realmente guie decisões, a adaptação vira tentativa e erro.\n\n2️⃣ Aplicar protocolos padrão sem raciocínio clínico individualizado\nCada paciente tem história, demanda funcional e tolerância sonora diferentes… e isso precisa entrar na decisão.\n\n3️⃣ Ajustar no software sem verificação\nO que o software mostra nem sempre é o que chega ao conduto auditivo. Verificação não é detalhe técnico: é o que garante que o ajuste faz sentido na vida real.\n\n4️⃣ Regular pensando só em alvos, ignorando conforto, esforço auditivo e etc\nTarget atingido não significa escuta confortável. Se o paciente se cansa, usa pouco, sente desconforto, ou evita situações sociais, algo não está funcionando.\n\n5️⃣ Pular testes de fala e não acompanhar a evolução clínica\nSem validação funcional e acompanhamento, não existe evidência de benefício — só suposição. Evolução clínica precisa ser medida, registrada e revisada.\n\n🔎 Avaliação, verificação e validação não são etapas extras.\nSão o que sustenta resultado, adesão e valor clínico.\n\n📒 O Planner da Fono Premium foi criado para te ajudar a estruturar cada uma dessas etapas, com clareza, método e raciocínio clínico.\n\n👉 Use o planner para transformar adaptação em processo. Sem esquecimento, sem perder tempo, com raciocínio clínico claro. LINK NA BIO", "permalink": "https://www.instagram.com/reel/DUbGYxZDmuq/", "reach": 873.0, "saved": 3.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  34,
  2,
  873,
  3,
  0,
  0.044674,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17864315769569123", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-02-06 00:00:00", "hora_postagem": "16:40:36", "legenda": "1️⃣ Iniciar a adaptação sem uma avaliação prévia completa\nSem uma avaliação que realmente guie decisões, a adaptação vira tentativa e erro.\n\n2️⃣ Aplicar protocolos padrão sem raciocínio clínico individualizado\nCada paciente tem história, demanda funcional e tolerância sonora diferentes… e isso precisa entrar na decisão.\n\n3️⃣ Ajustar no software sem verificação\nO que o software mostra nem sempre é o que chega ao conduto auditivo. Verificação não é detalhe técnico: é o que garante que o ajuste faz sentido na vida real.\n\n4️⃣ Regular pensando só em alvos, ignorando conforto, esforço auditivo e etc\nTarget atingido não significa escuta confortável. Se o paciente se cansa, usa pouco, sente desconforto, ou evita situações sociais, algo não está funcionando.\n\n5️⃣ Pular testes de fala e não acompanhar a evolução clínica\nSem validação funcional e acompanhamento, não existe evidência de benefício — só suposição. Evolução clínica precisa ser medida, registrada e revisada.\n\n🔎 Avaliação, verificação e validação não são etapas extras.\nSão o que sustenta resultado, adesão e valor clínico.\n\n📒 O Planner da Fono Premium foi criado para te ajudar a estruturar cada uma dessas etapas, com clareza, método e raciocínio clínico.\n\n👉 Use o planner para transformar adaptação em processo. Sem esquecimento, sem perder tempo, com raciocínio clínico claro. LINK NA BIO", "permalink": "https://www.instagram.com/reel/DUbGYxZDmuq/", "reach": 873.0, "saved": 3.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17849411262633831',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-02-04'::date,
    '21:50:38'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Confesso que não superei o fim de Young Sheldon. Mas gosto muito de Georgie and Mandy hahaha o que mais vocês acrescentariam de frases do Sheldon?',
    'https://www.instagram.com/p/DUWglsukiIz/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17849411262633831", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 106.0, "comentarios": 10.0, "data_postagem": "2026-02-04 00:00:00", "hora_postagem": "21:50:38", "legenda": "Confesso que não superei o fim de Young Sheldon. Mas gosto muito de Georgie and Mandy hahaha o que mais vocês acrescentariam de frases do Sheldon?", "permalink": "https://www.instagram.com/p/DUWglsukiIz/", "reach": 1953.0, "saved": 13.0, "shares": 23.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  106,
  10,
  1953,
  13,
  23,
  0.066052,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17849411262633831", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 106.0, "comentarios": 10.0, "data_postagem": "2026-02-04 00:00:00", "hora_postagem": "21:50:38", "legenda": "Confesso que não superei o fim de Young Sheldon. Mas gosto muito de Georgie and Mandy hahaha o que mais vocês acrescentariam de frases do Sheldon?", "permalink": "https://www.instagram.com/p/DUWglsukiIz/", "reach": 1953.0, "saved": 13.0, "shares": 23.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18057232931361922',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-31'::date,
    '17:29:28'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Um resumo de janeiro 🫶🏼🙏🏼',
    'https://www.instagram.com/p/DULvhXXDtm0/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18057232931361922", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 91.0, "comentarios": 2.0, "data_postagem": "2026-01-31 00:00:00", "hora_postagem": "17:29:28", "legenda": "Um resumo de janeiro 🫶🏼🙏🏼", "permalink": "https://www.instagram.com/p/DULvhXXDtm0/", "reach": 964.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  91,
  2,
  964,
  1,
  0,
  0.097510,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18057232931361922", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 91.0, "comentarios": 2.0, "data_postagem": "2026-01-31 00:00:00", "hora_postagem": "17:29:28", "legenda": "Um resumo de janeiro 🫶🏼🙏🏼", "permalink": "https://www.instagram.com/p/DULvhXXDtm0/", "reach": 964.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18027698402604043',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-30'::date,
    '19:47:30'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    '✅ 8 documentos exclusivos EDITÁVEIS
✅ Relatório estruturado de verificação objetiva
✅ Anamnese clínica completa
✅ Avaliação audiológica organizada
✅ Protocolos de verificação e validação

📅 31/01 (sábado) às 8h30
💰 R$ 97
🔗 Link na bio
TE VEJO LÁ! 💜',
    'https://www.instagram.com/p/DUJahegElLT/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18027698402604043", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 52.0, "comentarios": 0.0, "data_postagem": "2026-01-30 00:00:00", "hora_postagem": "19:47:30", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUJahegElLT/", "reach": 1088.0, "saved": 7.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  52,
  0,
  1088,
  7,
  1,
  0.054228,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18027698402604043", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 52.0, "comentarios": 0.0, "data_postagem": "2026-01-30 00:00:00", "hora_postagem": "19:47:30", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUJahegElLT/", "reach": 1088.0, "saved": 7.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18084252742901832',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-29'::date,
    '15:30:00'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    '✅ 8 documentos exclusivos EDITÁVEIS
✅ Relatório estruturado de verificação objetiva
✅ Anamnese clínica completa
✅ Avaliação audiológica organizada
✅ Protocolos de verificação e validação

📅 31/01 (sábado) às 8h30
💰 R$ 97
🔗 Link na bio
TE VEJO LÁ! 💜',
    'https://www.instagram.com/p/DUGYUrXjn6A/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084252742901832", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 8.0, "comentarios": 0.0, "data_postagem": "2026-01-29 00:00:00", "hora_postagem": "15:30:00", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUGYUrXjn6A/", "reach": 293.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  8,
  0,
  293,
  1,
  0,
  0.030717,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084252742901832", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 8.0, "comentarios": 0.0, "data_postagem": "2026-01-29 00:00:00", "hora_postagem": "15:30:00", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUGYUrXjn6A/", "reach": 293.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18084739378897776',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-28'::date,
    '15:35:22'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '✅ 8 documentos exclusivos EDITÁVEIS
✅ Relatório estruturado de verificação objetiva
✅ Anamnese clínica completa
✅ Avaliação audiológica organizada
✅ Protocolos de verificação e validação',
    'https://www.instagram.com/reel/DUDz8M3DQm9/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084739378897776", "tipo_postagem": "VIDEO", "likes": 10.0, "comentarios": 0.0, "data_postagem": "2026-01-28 00:00:00", "hora_postagem": "15:35:22", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação", "permalink": "https://www.instagram.com/reel/DUDz8M3DQm9/", "reach": 468.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  10,
  0,
  468,
  1,
  0,
  0.023504,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18084739378897776", "tipo_postagem": "VIDEO", "likes": 10.0, "comentarios": 0.0, "data_postagem": "2026-01-28 00:00:00", "hora_postagem": "15:35:22", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação", "permalink": "https://www.instagram.com/reel/DUDz8M3DQm9/", "reach": 468.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18098530654903941',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-27'::date,
    '16:01:50'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    '✅ 8 documentos exclusivos EDITÁVEIS
✅ Relatório estruturado de verificação objetiva
✅ Anamnese clínica completa
✅ Avaliação audiológica organizada
✅ Protocolos de verificação e validação

📅 31/01 (sábado) às 8h30
💰 R$ 97
🔗 Link na bio
TE VEJO LÁ! 💜',
    'https://www.instagram.com/p/DUBSUB6Dm2X/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18098530654903941", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 9.0, "data_postagem": "2026-01-27 00:00:00", "hora_postagem": "16:01:50", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUBSUB6Dm2X/", "reach": 520.0, "saved": 5.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  29,
  9,
  520,
  5,
  2,
  0.082692,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18098530654903941", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 29.0, "comentarios": 9.0, "data_postagem": "2026-01-27 00:00:00", "hora_postagem": "16:01:50", "legenda": "✅ 8 documentos exclusivos EDITÁVEIS\n✅ Relatório estruturado de verificação objetiva\n✅ Anamnese clínica completa\n✅ Avaliação audiológica organizada\n✅ Protocolos de verificação e validação\n\n📅 31/01 (sábado) às 8h30\n💰 R$ 97\n🔗 Link na bio\nTE VEJO LÁ! 💜", "permalink": "https://www.instagram.com/p/DUBSUB6Dm2X/", "reach": 520.0, "saved": 5.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17927222166055963',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-26'::date,
    '21:00:00'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Sábado dia 31/01 às 8h30 vou dar uma aula de planejamento estratégico e clínico, para a turma da Formação AASI, com OITO documentos para te ajudar a definir os processos da sua clínica!
(Modelo de anamnese, avaliação, verificação, validação e acompanhamento. Vou explicar cada um deles na aula!)

Comenta aqui PLANNER se você quer participar da aula! Atenção: são apenas algumas vagas!',
    'https://www.instagram.com/reel/DT_PrhMjjf-/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17927222166055963", "tipo_postagem": "VIDEO", "likes": 16.0, "comentarios": 8.0, "data_postagem": "2026-01-26 00:00:00", "hora_postagem": "21:00:00", "legenda": "Sábado dia 31/01 às 8h30 vou dar uma aula de planejamento estratégico e clínico, para a turma da Formação AASI, com OITO documentos para te ajudar a definir os processos da sua clínica!\n(Modelo de anamnese, avaliação, verificação, validação e acompanhamento. Vou explicar cada um deles na aula!)\n\nComenta aqui PLANNER se você quer participar da aula! Atenção: são apenas algumas vagas!", "permalink": "https://www.instagram.com/reel/DT_PrhMjjf-/", "reach": 931.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  16,
  8,
  931,
  0,
  0,
  0.025779,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17927222166055963", "tipo_postagem": "VIDEO", "likes": 16.0, "comentarios": 8.0, "data_postagem": "2026-01-26 00:00:00", "hora_postagem": "21:00:00", "legenda": "Sábado dia 31/01 às 8h30 vou dar uma aula de planejamento estratégico e clínico, para a turma da Formação AASI, com OITO documentos para te ajudar a definir os processos da sua clínica!\n(Modelo de anamnese, avaliação, verificação, validação e acompanhamento. Vou explicar cada um deles na aula!)\n\nComenta aqui PLANNER se você quer participar da aula! Atenção: são apenas algumas vagas!", "permalink": "https://www.instagram.com/reel/DT_PrhMjjf-/", "reach": 931.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18140243422477536',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-26'::date,
    '13:39:01'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Um dos documentos do Planner da Fono Premium 2026 é um modelo de checklist e relatório de verificação objetiva, para ajudar no dia a dia a estruturar e organizar o raciocínio clínico! Tirando aquela insegurança de “será que fiz tudo? Será que está faltando algo?”, te economizando tempo!
Quer participar da aula de 31/01 de planejamento e ter acesso aos 8 documentos? Comenta aqui PLANNER que eu te envio o link no direct',
    'https://www.instagram.com/reel/DT-ct9uDseS/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18140243422477536", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-01-26 00:00:00", "hora_postagem": "13:39:01", "legenda": "Um dos documentos do Planner da Fono Premium 2026 é um modelo de checklist e relatório de verificação objetiva, para ajudar no dia a dia a estruturar e organizar o raciocínio clínico! Tirando aquela insegurança de “será que fiz tudo? Será que está faltando algo?”, te economizando tempo!\nQuer participar da aula de 31/01 de planejamento e ter acesso aos 8 documentos? Comenta aqui PLANNER que eu te envio o link no direct", "permalink": "https://www.instagram.com/reel/DT-ct9uDseS/", "reach": 611.0, "saved": 2.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  34,
  2,
  611,
  2,
  0,
  0.062193,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18140243422477536", "tipo_postagem": "VIDEO", "likes": 34.0, "comentarios": 2.0, "data_postagem": "2026-01-26 00:00:00", "hora_postagem": "13:39:01", "legenda": "Um dos documentos do Planner da Fono Premium 2026 é um modelo de checklist e relatório de verificação objetiva, para ajudar no dia a dia a estruturar e organizar o raciocínio clínico! Tirando aquela insegurança de “será que fiz tudo? Será que está faltando algo?”, te economizando tempo!\nQuer participar da aula de 31/01 de planejamento e ter acesso aos 8 documentos? Comenta aqui PLANNER que eu te envio o link no direct", "permalink": "https://www.instagram.com/reel/DT-ct9uDseS/", "reach": 611.0, "saved": 2.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18080056457006494',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-23'::date,
    '21:06:53'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Já conheciam? Me conta nos comentários o que acharam da qualidade!',
    'https://www.instagram.com/reel/DT3h4YuEsF_/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18080056457006494", "tipo_postagem": "VIDEO", "likes": 1176.0, "comentarios": 268.0, "data_postagem": "2026-01-23 00:00:00", "hora_postagem": "21:06:53", "legenda": "Já conheciam? Me conta nos comentários o que acharam da qualidade!", "permalink": "https://www.instagram.com/reel/DT3h4YuEsF_/", "reach": 21028.0, "saved": 210.0, "shares": 459.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  1176,
  268,
  21028,
  210,
  459,
  0.078657,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18080056457006494", "tipo_postagem": "VIDEO", "likes": 1176.0, "comentarios": 268.0, "data_postagem": "2026-01-23 00:00:00", "hora_postagem": "21:06:53", "legenda": "Já conheciam? Me conta nos comentários o que acharam da qualidade!", "permalink": "https://www.instagram.com/reel/DT3h4YuEsF_/", "reach": 21028.0, "saved": 210.0, "shares": 459.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18058591166660991',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-22'::date,
    '16:00:00'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Quero saber se vocês já conheciam esse dispositivo!! O que acharam?? To quase comprando para testar! Comentem aqui se vocês querem ver essa parte 2😅 vídeo da rede vizinha @thehearingdocontiktok Dr. Karp',
    'https://www.instagram.com/reel/DT0TW2JDuig/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18058591166660991", "tipo_postagem": "VIDEO", "likes": 41.0, "comentarios": 15.0, "data_postagem": "2026-01-22 00:00:00", "hora_postagem": "16:00:00", "legenda": "Quero saber se vocês já conheciam esse dispositivo!! O que acharam?? To quase comprando para testar! Comentem aqui se vocês querem ver essa parte 2😅 vídeo da rede vizinha @thehearingdocontiktok Dr. Karp", "permalink": "https://www.instagram.com/reel/DT0TW2JDuig/", "reach": 1161.0, "saved": 5.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  41,
  15,
  1161,
  5,
  2,
  0.052541,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18058591166660991", "tipo_postagem": "VIDEO", "likes": 41.0, "comentarios": 15.0, "data_postagem": "2026-01-22 00:00:00", "hora_postagem": "16:00:00", "legenda": "Quero saber se vocês já conheciam esse dispositivo!! O que acharam?? To quase comprando para testar! Comentem aqui se vocês querem ver essa parte 2😅 vídeo da rede vizinha @thehearingdocontiktok Dr. Karp", "permalink": "https://www.instagram.com/reel/DT0TW2JDuig/", "reach": 1161.0, "saved": 5.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18103005565695469',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-22'::date,
    '14:25:42'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Por hoje é isso',
    'https://www.instagram.com/p/DT0PVePDsqz/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18103005565695469", "tipo_postagem": "IMAGE", "likes": 69.0, "comentarios": 11.0, "data_postagem": "2026-01-22 00:00:00", "hora_postagem": "14:25:42", "legenda": "Por hoje é isso", "permalink": "https://www.instagram.com/p/DT0PVePDsqz/", "reach": 1664.0, "saved": 3.0, "shares": 15.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  69,
  11,
  1664,
  3,
  15,
  0.049880,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18103005565695469", "tipo_postagem": "IMAGE", "likes": 69.0, "comentarios": 11.0, "data_postagem": "2026-01-22 00:00:00", "hora_postagem": "14:25:42", "legenda": "Por hoje é isso", "permalink": "https://www.instagram.com/p/DT0PVePDsqz/", "reach": 1664.0, "saved": 3.0, "shares": 15.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18068851625415957',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-21'::date,
    '15:50:44'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Coisas que eu jamais faria em uma timpanometria

Timpanometria não é sobre encaixar números em uma tabela.
É sobre raciocínio clínico, contexto do paciente e tomada de decisão responsável.

❌ Olhar apenas ml e daPa sem entender a morfologia da curva
❌ “Ajustar” valores para a curva caber no padrão
❌ Ignorar história clínica, otorreia ou cirurgias prévias
❌ Executar exame como protocolo automático, sem reflexão

👉 A fono premium não executa exames.
Ela interpreta, cruza informações e decide com segurança.

É isso que diferencia quem só segue equipamento de quem se torna referência clínica.

Se você acredita que
✨ ciência vem antes do software
✨ excelência vem antes
✨ paciente merece mais do que um exame automático

Seu lugar é aqui',
    'https://www.instagram.com/p/DTx0RdXDmVV/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18068851625415957", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 83.0, "comentarios": 0.0, "data_postagem": "2026-01-21 00:00:00", "hora_postagem": "15:50:44", "legenda": "Coisas que eu jamais faria em uma timpanometria\n\nTimpanometria não é sobre encaixar números em uma tabela.\nÉ sobre raciocínio clínico, contexto do paciente e tomada de decisão responsável.\n\n❌ Olhar apenas ml e daPa sem entender a morfologia da curva\n❌ “Ajustar” valores para a curva caber no padrão\n❌ Ignorar história clínica, otorreia ou cirurgias prévias\n❌ Executar exame como protocolo automático, sem reflexão\n\n👉 A fono premium não executa exames.\nEla interpreta, cruza informações e decide com segurança.\n\nÉ isso que diferencia quem só segue equipamento de quem se torna referência clínica.\n\nSe você acredita que\n✨ ciência vem antes do software\n✨ excelência vem antes\n✨ paciente merece mais do que um exame automático\n\nSeu lugar é aqui", "permalink": "https://www.instagram.com/p/DTx0RdXDmVV/", "reach": 1275.0, "saved": 14.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  83,
  0,
  1275,
  14,
  2,
  0.076078,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18068851625415957", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 83.0, "comentarios": 0.0, "data_postagem": "2026-01-21 00:00:00", "hora_postagem": "15:50:44", "legenda": "Coisas que eu jamais faria em uma timpanometria\n\nTimpanometria não é sobre encaixar números em uma tabela.\nÉ sobre raciocínio clínico, contexto do paciente e tomada de decisão responsável.\n\n❌ Olhar apenas ml e daPa sem entender a morfologia da curva\n❌ “Ajustar” valores para a curva caber no padrão\n❌ Ignorar história clínica, otorreia ou cirurgias prévias\n❌ Executar exame como protocolo automático, sem reflexão\n\n👉 A fono premium não executa exames.\nEla interpreta, cruza informações e decide com segurança.\n\nÉ isso que diferencia quem só segue equipamento de quem se torna referência clínica.\n\nSe você acredita que\n✨ ciência vem antes do software\n✨ excelência vem antes\n✨ paciente merece mais do que um exame automático\n\nSeu lugar é aqui", "permalink": "https://www.instagram.com/p/DTx0RdXDmVV/", "reach": 1275.0, "saved": 14.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18552295231015340',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-19'::date,
    '20:29:08'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Essas frases parecem inofensivas.
Mas, para quem convive com zumbido, elas atrasam diagnóstico, tratamento e aumentam sofrimento.

Zumbido não é frescura,
não é “coisa da cabeça”,
e não deve ser normalizado sem investigação.

Quando o profissional minimiza, o paciente desiste.
E quando desiste, o zumbido ganha espaço.

📌 Informação correta também é tratamento.',
    'https://www.instagram.com/reel/DTtKgioEhFZ/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18552295231015340", "tipo_postagem": "VIDEO", "likes": 31.0, "comentarios": 0.0, "data_postagem": "2026-01-19 00:00:00", "hora_postagem": "20:29:08", "legenda": "Essas frases parecem inofensivas.\nMas, para quem convive com zumbido, elas atrasam diagnóstico, tratamento e aumentam sofrimento.\n\nZumbido não é frescura,\nnão é “coisa da cabeça”,\ne não deve ser normalizado sem investigação.\n\nQuando o profissional minimiza, o paciente desiste.\nE quando desiste, o zumbido ganha espaço.\n\n📌 Informação correta também é tratamento.", "permalink": "https://www.instagram.com/reel/DTtKgioEhFZ/", "reach": 1056.0, "saved": 6.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  31,
  0,
  1056,
  6,
  1,
  0.035038,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18552295231015340", "tipo_postagem": "VIDEO", "likes": 31.0, "comentarios": 0.0, "data_postagem": "2026-01-19 00:00:00", "hora_postagem": "20:29:08", "legenda": "Essas frases parecem inofensivas.\nMas, para quem convive com zumbido, elas atrasam diagnóstico, tratamento e aumentam sofrimento.\n\nZumbido não é frescura,\nnão é “coisa da cabeça”,\ne não deve ser normalizado sem investigação.\n\nQuando o profissional minimiza, o paciente desiste.\nE quando desiste, o zumbido ganha espaço.\n\n📌 Informação correta também é tratamento.", "permalink": "https://www.instagram.com/reel/DTtKgioEhFZ/", "reach": 1056.0, "saved": 6.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17852913507606776',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-12'::date,
    '21:00:00'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Perda auditiva unilateral não é indicação automática de AASI.
Antes de qualquer prescrição, essas 5 perguntas precisam estar claras ⬇️

1️⃣ Qual é o impacto funcional real dessa perda?
Audiograma não mostra tudo. Queixa no ruído, localização sonora e fadiga auditiva pesam mais do que o “grau” isolado.

2️⃣ A orelha melhor é realmente normal?
Uma perda mínima ou leve pode passar despercebida pelo paciente, por conta dessa comparação entre os lados. Mas mesmo uma perde leve DEVE SER reabilitada! E aí, iss implica na tecnologia que vamo utilizar 

3️⃣ Tipo, grau e configuração sustentam qual estratégia?
Nem toda perda unilateral responde bem à adaptação convencional. Estratégia precisa ser individualizada.

4️⃣ Há zumbido ou outra queixa associada?
Zumbido, especialmente de grau severo ou incapacitante, pode mudar completamente o plano de manejo.

5️⃣ O paciente entende limites e expectativas do AASI?
Alinhar expectativa é parte do tratamento. Sem isso, a chance de frustração é alta.

📌 AASI não é sobre “igualar orelhas”.
É sobre função, estratégia e tomada de decisão clínica consciente.

👉 Siga o perfil para conteúdos profundos sobre audiologia, AASI e raciocínio clínico aplicado.',
    'https://www.instagram.com/reel/DTbMnl_jgk-/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17852913507606776", "tipo_postagem": "VIDEO", "likes": 33.0, "comentarios": 0.0, "data_postagem": "2026-01-12 00:00:00", "hora_postagem": "21:00:00", "legenda": "Perda auditiva unilateral não é indicação automática de AASI.\nAntes de qualquer prescrição, essas 5 perguntas precisam estar claras ⬇️\n\n1️⃣ Qual é o impacto funcional real dessa perda?\nAudiograma não mostra tudo. Queixa no ruído, localização sonora e fadiga auditiva pesam mais do que o “grau” isolado.\n\n2️⃣ A orelha melhor é realmente normal?\nUma perda mínima ou leve pode passar despercebida pelo paciente, por conta dessa comparação entre os lados. Mas mesmo uma perde leve DEVE SER reabilitada! E aí, iss implica na tecnologia que vamo utilizar \n\n3️⃣ Tipo, grau e configuração sustentam qual estratégia?\nNem toda perda unilateral responde bem à adaptação convencional. Estratégia precisa ser individualizada.\n\n4️⃣ Há zumbido ou outra queixa associada?\nZumbido, especialmente de grau severo ou incapacitante, pode mudar completamente o plano de manejo.\n\n5️⃣ O paciente entende limites e expectativas do AASI?\nAlinhar expectativa é parte do tratamento. Sem isso, a chance de frustração é alta.\n\n📌 AASI não é sobre “igualar orelhas”.\nÉ sobre função, estratégia e tomada de decisão clínica consciente.\n\n👉 Siga o perfil para conteúdos profundos sobre audiologia, AASI e raciocínio clínico aplicado.", "permalink": "https://www.instagram.com/reel/DTbMnl_jgk-/", "reach": 931.0, "saved": 14.0, "shares": 4.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  33,
  0,
  931,
  14,
  4,
  0.050483,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17852913507606776", "tipo_postagem": "VIDEO", "likes": 33.0, "comentarios": 0.0, "data_postagem": "2026-01-12 00:00:00", "hora_postagem": "21:00:00", "legenda": "Perda auditiva unilateral não é indicação automática de AASI.\nAntes de qualquer prescrição, essas 5 perguntas precisam estar claras ⬇️\n\n1️⃣ Qual é o impacto funcional real dessa perda?\nAudiograma não mostra tudo. Queixa no ruído, localização sonora e fadiga auditiva pesam mais do que o “grau” isolado.\n\n2️⃣ A orelha melhor é realmente normal?\nUma perda mínima ou leve pode passar despercebida pelo paciente, por conta dessa comparação entre os lados. Mas mesmo uma perde leve DEVE SER reabilitada! E aí, iss implica na tecnologia que vamo utilizar \n\n3️⃣ Tipo, grau e configuração sustentam qual estratégia?\nNem toda perda unilateral responde bem à adaptação convencional. Estratégia precisa ser individualizada.\n\n4️⃣ Há zumbido ou outra queixa associada?\nZumbido, especialmente de grau severo ou incapacitante, pode mudar completamente o plano de manejo.\n\n5️⃣ O paciente entende limites e expectativas do AASI?\nAlinhar expectativa é parte do tratamento. Sem isso, a chance de frustração é alta.\n\n📌 AASI não é sobre “igualar orelhas”.\nÉ sobre função, estratégia e tomada de decisão clínica consciente.\n\n👉 Siga o perfil para conteúdos profundos sobre audiologia, AASI e raciocínio clínico aplicado.", "permalink": "https://www.instagram.com/reel/DTbMnl_jgk-/", "reach": 931.0, "saved": 14.0, "shares": 4.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17851271577586184',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-11'::date,
    '22:51:25'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Nem sempre o grau da perda auditiva, sozinho, é suficiente para definir a potência ideal do aparelho auditivo.

A adaptação correta vai muito além do audiograma. É preciso considerar fatores como:
• possibilidade de zonas mortas cocleares
• nível de conforto do paciente
• tamanho do campo dinâmico
• tolerância a sons intensos
• e a percepção individual de fala

Cada ouvido responde de forma única, e a personalização é essencial para garantir conforto, segurança e melhor desempenho auditivo.

👉 Quer entender mais sobre adaptação auditiva baseada em evidências? Siga meu perfil e acompanhe os conteúdos.',
    'https://www.instagram.com/p/DTY0d7AkrSs/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17851271577586184", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 141.0, "comentarios": 4.0, "data_postagem": "2026-01-11 00:00:00", "hora_postagem": "22:51:25", "legenda": "Nem sempre o grau da perda auditiva, sozinho, é suficiente para definir a potência ideal do aparelho auditivo.\n\nA adaptação correta vai muito além do audiograma. É preciso considerar fatores como:\n• possibilidade de zonas mortas cocleares\n• nível de conforto do paciente\n• tamanho do campo dinâmico\n• tolerância a sons intensos\n• e a percepção individual de fala\n\nCada ouvido responde de forma única, e a personalização é essencial para garantir conforto, segurança e melhor desempenho auditivo.\n\n👉 Quer entender mais sobre adaptação auditiva baseada em evidências? Siga meu perfil e acompanhe os conteúdos.", "permalink": "https://www.instagram.com/p/DTY0d7AkrSs/", "reach": 2379.0, "saved": 35.0, "shares": 18.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  141,
  4,
  2379,
  35,
  18,
  0.075662,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17851271577586184", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 141.0, "comentarios": 4.0, "data_postagem": "2026-01-11 00:00:00", "hora_postagem": "22:51:25", "legenda": "Nem sempre o grau da perda auditiva, sozinho, é suficiente para definir a potência ideal do aparelho auditivo.\n\nA adaptação correta vai muito além do audiograma. É preciso considerar fatores como:\n• possibilidade de zonas mortas cocleares\n• nível de conforto do paciente\n• tamanho do campo dinâmico\n• tolerância a sons intensos\n• e a percepção individual de fala\n\nCada ouvido responde de forma única, e a personalização é essencial para garantir conforto, segurança e melhor desempenho auditivo.\n\n👉 Quer entender mais sobre adaptação auditiva baseada em evidências? Siga meu perfil e acompanhe os conteúdos.", "permalink": "https://www.instagram.com/p/DTY0d7AkrSs/", "reach": 2379.0, "saved": 35.0, "shares": 18.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18102733702691230',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-08'::date,
    '20:39:22'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Mais canais no aparelho auditivo = melhor som?
Depende. E essa é a parte que quase ninguém explica.

Os canais são divisões do som que permitem ao aparelho tratar frequências diferentes de forma independente.
✔️ Vantagem: mais possibilidade de ajuste fino, melhor adaptação a perdas complexas, funcionamento de  algoritmos, maior controle do conforto auditivo.

Mas atenção:
⚠️ Desvantagem: mais canais não significam, automaticamente, melhor compreensão de fala… pode aumentar distorção, dar delay no processamento e piorar a experiência do paciente.

No fim, o que faz a diferença não é o número de canais sozinho.
O aparelho precisa combinar uma quantidade razoável de canal, com algoritmos e, mais importante, o raciocínio clínico da Fono para fazer a avaliação, regulagem e verificação!

É melhor um aparelho com 10 canais bem regulado e verificado, do que 56 canais subamplificado, cortando sons de fala 🤷🏼‍♀️

Se esse conteúdo te ajudou a entender melhor o AASI, compartilha com alguém que ainda acredita que “quanto mais canais, melhor”.',
    'https://www.instagram.com/reel/DTQ2mTcEtrW/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18102733702691230", "tipo_postagem": "VIDEO", "likes": 70.0, "comentarios": 5.0, "data_postagem": "2026-01-08 00:00:00", "hora_postagem": "20:39:22", "legenda": "Mais canais no aparelho auditivo = melhor som?\nDepende. E essa é a parte que quase ninguém explica.\n\nOs canais são divisões do som que permitem ao aparelho tratar frequências diferentes de forma independente.\n✔️ Vantagem: mais possibilidade de ajuste fino, melhor adaptação a perdas complexas, funcionamento de  algoritmos, maior controle do conforto auditivo.\n\nMas atenção:\n⚠️ Desvantagem: mais canais não significam, automaticamente, melhor compreensão de fala… pode aumentar distorção, dar delay no processamento e piorar a experiência do paciente.\n\nNo fim, o que faz a diferença não é o número de canais sozinho.\nO aparelho precisa combinar uma quantidade razoável de canal, com algoritmos e, mais importante, o raciocínio clínico da Fono para fazer a avaliação, regulagem e verificação!\n\nÉ melhor um aparelho com 10 canais bem regulado e verificado, do que 56 canais subamplificado, cortando sons de fala 🤷🏼‍♀️\n\nSe esse conteúdo te ajudou a entender melhor o AASI, compartilha com alguém que ainda acredita que “quanto mais canais, melhor”.", "permalink": "https://www.instagram.com/reel/DTQ2mTcEtrW/", "reach": 917.0, "saved": 10.0, "shares": 5.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  70,
  5,
  917,
  10,
  5,
  0.092694,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18102733702691230", "tipo_postagem": "VIDEO", "likes": 70.0, "comentarios": 5.0, "data_postagem": "2026-01-08 00:00:00", "hora_postagem": "20:39:22", "legenda": "Mais canais no aparelho auditivo = melhor som?\nDepende. E essa é a parte que quase ninguém explica.\n\nOs canais são divisões do som que permitem ao aparelho tratar frequências diferentes de forma independente.\n✔️ Vantagem: mais possibilidade de ajuste fino, melhor adaptação a perdas complexas, funcionamento de  algoritmos, maior controle do conforto auditivo.\n\nMas atenção:\n⚠️ Desvantagem: mais canais não significam, automaticamente, melhor compreensão de fala… pode aumentar distorção, dar delay no processamento e piorar a experiência do paciente.\n\nNo fim, o que faz a diferença não é o número de canais sozinho.\nO aparelho precisa combinar uma quantidade razoável de canal, com algoritmos e, mais importante, o raciocínio clínico da Fono para fazer a avaliação, regulagem e verificação!\n\nÉ melhor um aparelho com 10 canais bem regulado e verificado, do que 56 canais subamplificado, cortando sons de fala 🤷🏼‍♀️\n\nSe esse conteúdo te ajudou a entender melhor o AASI, compartilha com alguém que ainda acredita que “quanto mais canais, melhor”.", "permalink": "https://www.instagram.com/reel/DTQ2mTcEtrW/", "reach": 917.0, "saved": 10.0, "shares": 5.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17865205776551200',
    '2026-05-13 00:13:41'::timestamptz,
    '2026-01-07'::date,
    '21:44:42'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '4 verdades difíceis sobre AASI na perda auditiva unilateral

1️⃣ Nem todo caso terá benefício com adaptação convencional
Na perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.

2️⃣ O objetivo nem sempre é “igualar” as orelhas
A “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.

3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva
Cada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.

4️⃣ Pode ser considerada prótese ancorada no osso
A prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.

Perda unilateral exige raciocínio clínico — não protocolo automático.

Me siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨',
    'https://www.instagram.com/reel/DTOZPhKks-w/',
    '{"data_coleta": "2026-05-13 00:13:41", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": null, "saved": null, "shares": null}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  55,
  2,
  null,
  null,
  null,
  null,
  'N/A'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:13:41", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": null, "saved": null, "shares": null}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18090475997053305',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-04'::date,
    '22:12:05'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Bora começar a primeira semana útil do ano com um casinho?? 
Me conta nos comentários o que você faria! E amanhã conto nos stories o que aconteceu 👀',
    'https://www.instagram.com/p/DTGuZqEkgEI/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090475997053305", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 19.0, "comentarios": 4.0, "data_postagem": "2026-01-04 00:00:00", "hora_postagem": "22:12:05", "legenda": "Bora começar a primeira semana útil do ano com um casinho?? \nMe conta nos comentários o que você faria! E amanhã conto nos stories o que aconteceu 👀", "permalink": "https://www.instagram.com/p/DTGuZqEkgEI/", "reach": 1061.0, "saved": 1.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  19,
  4,
  1061,
  1,
  0,
  0.022620,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090475997053305", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 19.0, "comentarios": 4.0, "data_postagem": "2026-01-04 00:00:00", "hora_postagem": "22:12:05", "legenda": "Bora começar a primeira semana útil do ano com um casinho?? \nMe conta nos comentários o que você faria! E amanhã conto nos stories o que aconteceu 👀", "permalink": "https://www.instagram.com/p/DTGuZqEkgEI/", "reach": 1061.0, "saved": 1.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18108607267567555',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-03'::date,
    '00:19:32'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Aproveitem essa receita porque sério… é absurdamente boa. Vai virar nossa tradição de ano novo rsrs aproveitem a blogueiragem na cozinha!',
    'https://www.instagram.com/reel/DTBzTH-jHjW/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18108607267567555", "tipo_postagem": "VIDEO", "likes": 162.0, "comentarios": 11.0, "data_postagem": "2026-01-03 00:00:00", "hora_postagem": "00:19:32", "legenda": "Aproveitem essa receita porque sério… é absurdamente boa. Vai virar nossa tradição de ano novo rsrs aproveitem a blogueiragem na cozinha!", "permalink": "https://www.instagram.com/reel/DTBzTH-jHjW/", "reach": 3595.0, "saved": 55.0, "shares": 49.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  162,
  11,
  3595,
  55,
  49,
  0.063421,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18108607267567555", "tipo_postagem": "VIDEO", "likes": 162.0, "comentarios": 11.0, "data_postagem": "2026-01-03 00:00:00", "hora_postagem": "00:19:32", "legenda": "Aproveitem essa receita porque sério… é absurdamente boa. Vai virar nossa tradição de ano novo rsrs aproveitem a blogueiragem na cozinha!", "permalink": "https://www.instagram.com/reel/DTBzTH-jHjW/", "reach": 3595.0, "saved": 55.0, "shares": 49.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17856736725593261',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-02'::date,
    '18:18:10'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Comenta EU QUERO que vou no seu direct te explicar sobre a Formação AASI ❤️🌹',
    'https://www.instagram.com/reel/DTBKAUPjhyj/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17856736725593261", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 10.0, "data_postagem": "2026-01-02 00:00:00", "hora_postagem": "18:18:10", "legenda": "Comenta EU QUERO que vou no seu direct te explicar sobre a Formação AASI ❤️🌹", "permalink": "https://www.instagram.com/reel/DTBKAUPjhyj/", "reach": 628.0, "saved": 1.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  26,
  10,
  628,
  1,
  2,
  0.058917,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17856736725593261", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 10.0, "data_postagem": "2026-01-02 00:00:00", "hora_postagem": "18:18:10", "legenda": "Comenta EU QUERO que vou no seu direct te explicar sobre a Formação AASI ❤️🌹", "permalink": "https://www.instagram.com/reel/DTBKAUPjhyj/", "reach": 628.0, "saved": 1.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18095606809922055',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-31'::date,
    '15:35:00'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    '2025 valeu a pena ❤️ 
Obrigada por fazerem parte disso!',
    'https://www.instagram.com/p/DS7t3l0DC7a/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18095606809922055", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 88.0, "comentarios": 4.0, "data_postagem": "2025-12-31 00:00:00", "hora_postagem": "15:35:00", "legenda": "2025 valeu a pena ❤️ \nObrigada por fazerem parte disso!", "permalink": "https://www.instagram.com/p/DS7t3l0DC7a/", "reach": 918.0, "saved": 0.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  88,
  4,
  918,
  0,
  1,
  0.100218,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18095606809922055", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 88.0, "comentarios": 4.0, "data_postagem": "2025-12-31 00:00:00", "hora_postagem": "15:35:00", "legenda": "2025 valeu a pena ❤️ \nObrigada por fazerem parte disso!", "permalink": "https://www.instagram.com/p/DS7t3l0DC7a/", "reach": 918.0, "saved": 0.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18052270442401223',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-29'::date,
    '20:29:36'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'A perda auditiva em apenas uma orelha não é “compensável” pelo outro lado. Ela gera consequências funcionais claras no dia a dia (e ignorá-las compromete diagnóstico, orientação e reabilitação).

1. Dificuldade de localização sonora
A localização depende da comparação entre as duas orelhas (diferença de tempo e intensidade do som). Com uma orelha comprometida, o cérebro perde essa referência, dificultando identificar de onde o som vem — o que impacta segurança e comunicação.

2. Piora importante da compreensão no ruído
Em ambientes ruidosos, a orelha melhor não “dá conta” sozinha. A perda da escuta binaural reduz a separação fala-ruído, o efeito squelch, tornando conversas em restaurantes, reuniões e salas de aula muito mais desafiadoras.

3. Aumento do esforço auditivo
Para entender a fala, o paciente precisa usar mais recursos cognitivos: atenção, memória e processamento top-down. Ouvir passa a ser um trabalho ativo, não automático.

4. Fadiga cognitiva ao longo do dia
Esse esforço contínuo cobra seu preço. É comum o paciente relatar cansaço mental, dor de cabeça, irritabilidade e queda de rendimento no fim do dia.

5. Efeito sombra da cabeça
A cabeça atua como uma barreira acústica. Sons que vêm do lado da orelha pior chegam atenuados à orelha melhor, especialmente nas altas frequências, prejudicando ainda mais a inteligibilidade da fala. 

Compartilha com aquela sua amiga Fono que gosta de estudar com você 🫶🏼',
    'https://www.instagram.com/reel/DS3FkZ8ktzp/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18052270442401223", "tipo_postagem": "VIDEO", "likes": 68.0, "comentarios": 12.0, "data_postagem": "2025-12-29 00:00:00", "hora_postagem": "20:29:36", "legenda": "A perda auditiva em apenas uma orelha não é “compensável” pelo outro lado. Ela gera consequências funcionais claras no dia a dia (e ignorá-las compromete diagnóstico, orientação e reabilitação).\n\n1. Dificuldade de localização sonora\nA localização depende da comparação entre as duas orelhas (diferença de tempo e intensidade do som). Com uma orelha comprometida, o cérebro perde essa referência, dificultando identificar de onde o som vem — o que impacta segurança e comunicação.\n\n2. Piora importante da compreensão no ruído\nEm ambientes ruidosos, a orelha melhor não “dá conta” sozinha. A perda da escuta binaural reduz a separação fala-ruído, o efeito squelch, tornando conversas em restaurantes, reuniões e salas de aula muito mais desafiadoras.\n\n3. Aumento do esforço auditivo\nPara entender a fala, o paciente precisa usar mais recursos cognitivos: atenção, memória e processamento top-down. Ouvir passa a ser um trabalho ativo, não automático.\n\n4. Fadiga cognitiva ao longo do dia\nEsse esforço contínuo cobra seu preço. É comum o paciente relatar cansaço mental, dor de cabeça, irritabilidade e queda de rendimento no fim do dia.\n\n5. Efeito sombra da cabeça\nA cabeça atua como uma barreira acústica. Sons que vêm do lado da orelha pior chegam atenuados à orelha melhor, especialmente nas altas frequências, prejudicando ainda mais a inteligibilidade da fala. \n\nCompartilha com aquela sua amiga Fono que gosta de estudar com você 🫶🏼", "permalink": "https://www.instagram.com/reel/DS3FkZ8ktzp/", "reach": 1537.0, "saved": 22.0, "shares": 9.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  68,
  12,
  1537,
  22,
  9,
  0.066363,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18052270442401223", "tipo_postagem": "VIDEO", "likes": 68.0, "comentarios": 12.0, "data_postagem": "2025-12-29 00:00:00", "hora_postagem": "20:29:36", "legenda": "A perda auditiva em apenas uma orelha não é “compensável” pelo outro lado. Ela gera consequências funcionais claras no dia a dia (e ignorá-las compromete diagnóstico, orientação e reabilitação).\n\n1. Dificuldade de localização sonora\nA localização depende da comparação entre as duas orelhas (diferença de tempo e intensidade do som). Com uma orelha comprometida, o cérebro perde essa referência, dificultando identificar de onde o som vem — o que impacta segurança e comunicação.\n\n2. Piora importante da compreensão no ruído\nEm ambientes ruidosos, a orelha melhor não “dá conta” sozinha. A perda da escuta binaural reduz a separação fala-ruído, o efeito squelch, tornando conversas em restaurantes, reuniões e salas de aula muito mais desafiadoras.\n\n3. Aumento do esforço auditivo\nPara entender a fala, o paciente precisa usar mais recursos cognitivos: atenção, memória e processamento top-down. Ouvir passa a ser um trabalho ativo, não automático.\n\n4. Fadiga cognitiva ao longo do dia\nEsse esforço contínuo cobra seu preço. É comum o paciente relatar cansaço mental, dor de cabeça, irritabilidade e queda de rendimento no fim do dia.\n\n5. Efeito sombra da cabeça\nA cabeça atua como uma barreira acústica. Sons que vêm do lado da orelha pior chegam atenuados à orelha melhor, especialmente nas altas frequências, prejudicando ainda mais a inteligibilidade da fala. \n\nCompartilha com aquela sua amiga Fono que gosta de estudar com você 🫶🏼", "permalink": "https://www.instagram.com/reel/DS3FkZ8ktzp/", "reach": 1537.0, "saved": 22.0, "shares": 9.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18108025912722828',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-26'::date,
    '21:07:44'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Papai Noel ainda tá lendo a cartinha de vocês hein 👀',
    'https://www.instagram.com/p/DSvb4hSkiYk/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18108025912722828", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 9.0, "comentarios": 0.0, "data_postagem": "2025-12-26 00:00:00", "hora_postagem": "21:07:44", "legenda": "Papai Noel ainda tá lendo a cartinha de vocês hein 👀", "permalink": "https://www.instagram.com/p/DSvb4hSkiYk/", "reach": 896.0, "saved": 2.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  9,
  0,
  896,
  2,
  0,
  0.012277,
  'Ruim'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18108025912722828", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 9.0, "comentarios": 0.0, "data_postagem": "2025-12-26 00:00:00", "hora_postagem": "21:07:44", "legenda": "Papai Noel ainda tá lendo a cartinha de vocês hein 👀", "permalink": "https://www.instagram.com/p/DSvb4hSkiYk/", "reach": 896.0, "saved": 2.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17856041688590908',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-24'::date,
    '18:22:08'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Deus poderia ter escolhido qualquer forma de vir ao mundo, mas escolheu nascer em uma família, para nos ensinar que o amor, o cuidado e a fé começam no lar. Que Deus menino abençoe vocês e renove nossa fé, propósito e caminhada. Feliz Natal 🎄🎁 ✨🫶🏼',
    'https://www.instagram.com/reel/DSp-_MHjk4H/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17856041688590908", "tipo_postagem": "VIDEO", "likes": 90.0, "comentarios": 15.0, "data_postagem": "2025-12-24 00:00:00", "hora_postagem": "18:22:08", "legenda": "Deus poderia ter escolhido qualquer forma de vir ao mundo, mas escolheu nascer em uma família, para nos ensinar que o amor, o cuidado e a fé começam no lar. Que Deus menino abençoe vocês e renove nossa fé, propósito e caminhada. Feliz Natal 🎄🎁 ✨🫶🏼", "permalink": "https://www.instagram.com/reel/DSp-_MHjk4H/", "reach": 887.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  90,
  15,
  887,
  0,
  0,
  0.118377,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17856041688590908", "tipo_postagem": "VIDEO", "likes": 90.0, "comentarios": 15.0, "data_postagem": "2025-12-24 00:00:00", "hora_postagem": "18:22:08", "legenda": "Deus poderia ter escolhido qualquer forma de vir ao mundo, mas escolheu nascer em uma família, para nos ensinar que o amor, o cuidado e a fé começam no lar. Que Deus menino abençoe vocês e renove nossa fé, propósito e caminhada. Feliz Natal 🎄🎁 ✨🫶🏼", "permalink": "https://www.instagram.com/reel/DSp-_MHjk4H/", "reach": 887.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17970963242830749',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-24'::date,
    '15:30:47'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Um pequeno guia para presentear uma Fono, caso ainda não tenha comprado o presente de amigo secreto 😂😂 já manda pra quem vai te dar algum desses kkkk (PS: aceito depois tbm 🤪) #audiologia #fonoaudiologia',
    'https://www.instagram.com/p/DSpru0dDnqO/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17970963242830749", "tipo_postagem": "IMAGE", "likes": 24.0, "comentarios": 0.0, "data_postagem": "2025-12-24 00:00:00", "hora_postagem": "15:30:47", "legenda": "Um pequeno guia para presentear uma Fono, caso ainda não tenha comprado o presente de amigo secreto 😂😂 já manda pra quem vai te dar algum desses kkkk (PS: aceito depois tbm 🤪) #audiologia #fonoaudiologia", "permalink": "https://www.instagram.com/p/DSpru0dDnqO/", "reach": 702.0, "saved": 1.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  24,
  0,
  702,
  1,
  1,
  0.035613,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "17970963242830749", "tipo_postagem": "IMAGE", "likes": 24.0, "comentarios": 0.0, "data_postagem": "2025-12-24 00:00:00", "hora_postagem": "15:30:47", "legenda": "Um pequeno guia para presentear uma Fono, caso ainda não tenha comprado o presente de amigo secreto 😂😂 já manda pra quem vai te dar algum desses kkkk (PS: aceito depois tbm 🤪) #audiologia #fonoaudiologia", "permalink": "https://www.instagram.com/p/DSpru0dDnqO/", "reach": 702.0, "saved": 1.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18074186396049522',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-22'::date,
    '21:29:33'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'A audiometria é essencial.
Mas ela não é o diagnóstico completo.

Existem informações críticas para a tomada de decisão clínica que não aparecem no audiograma — e ignorá-las compromete o resultado final, especialmente na adaptação de AASI.

A audiometria não te conta:

1️⃣ Como o paciente entende fala no ruído
Limiar tonal não prediz desempenho funcional em ambientes reais.

2️⃣ O impacto funcional da perda no dia a dia
Esforço auditivo, fadiga cognitiva, memória e participação social não aparecem em dB.

3️⃣ O impacto do zumbido
Zumbido altera atenção, tolerância ao som e percepção de benefício — mesmo com limiares semelhantes.

4️⃣ Expectativa e motivação para o AASI
Sem alinhar expectativa, não existe adesão nem fidelização.

👉 Quem amplia a avaliação cuida, decide melhor e entrega resultado.

Audiologia clínica é interpretação. Não é só gráfico.

Compartilhe com uma Fono premium!

#AudiologiaClínica #AvaliaçãoAudiológica #AASI #Fonoaudiologia #RaciocínioClínico Zumbido FonoPremium',
    'https://www.instagram.com/reel/DSlLIUDkuh7/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18074186396049522", "tipo_postagem": "VIDEO", "likes": 43.0, "comentarios": 2.0, "data_postagem": "2025-12-22 00:00:00", "hora_postagem": "21:29:33", "legenda": "A audiometria é essencial.\nMas ela não é o diagnóstico completo.\n\nExistem informações críticas para a tomada de decisão clínica que não aparecem no audiograma — e ignorá-las compromete o resultado final, especialmente na adaptação de AASI.\n\nA audiometria não te conta:\n\n1️⃣ Como o paciente entende fala no ruído\nLimiar tonal não prediz desempenho funcional em ambientes reais.\n\n2️⃣ O impacto funcional da perda no dia a dia\nEsforço auditivo, fadiga cognitiva, memória e participação social não aparecem em dB.\n\n3️⃣ O impacto do zumbido\nZumbido altera atenção, tolerância ao som e percepção de benefício — mesmo com limiares semelhantes.\n\n4️⃣ Expectativa e motivação para o AASI\nSem alinhar expectativa, não existe adesão nem fidelização.\n\n👉 Quem amplia a avaliação cuida, decide melhor e entrega resultado.\n\nAudiologia clínica é interpretação. Não é só gráfico.\n\nCompartilhe com uma Fono premium!\n\n#AudiologiaClínica #AvaliaçãoAudiológica #AASI #Fonoaudiologia #RaciocínioClínico Zumbido FonoPremium", "permalink": "https://www.instagram.com/reel/DSlLIUDkuh7/", "reach": 1483.0, "saved": 9.0, "shares": 2.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  43,
  2,
  1483,
  9,
  2,
  0.036413,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18074186396049522", "tipo_postagem": "VIDEO", "likes": 43.0, "comentarios": 2.0, "data_postagem": "2025-12-22 00:00:00", "hora_postagem": "21:29:33", "legenda": "A audiometria é essencial.\nMas ela não é o diagnóstico completo.\n\nExistem informações críticas para a tomada de decisão clínica que não aparecem no audiograma — e ignorá-las compromete o resultado final, especialmente na adaptação de AASI.\n\nA audiometria não te conta:\n\n1️⃣ Como o paciente entende fala no ruído\nLimiar tonal não prediz desempenho funcional em ambientes reais.\n\n2️⃣ O impacto funcional da perda no dia a dia\nEsforço auditivo, fadiga cognitiva, memória e participação social não aparecem em dB.\n\n3️⃣ O impacto do zumbido\nZumbido altera atenção, tolerância ao som e percepção de benefício — mesmo com limiares semelhantes.\n\n4️⃣ Expectativa e motivação para o AASI\nSem alinhar expectativa, não existe adesão nem fidelização.\n\n👉 Quem amplia a avaliação cuida, decide melhor e entrega resultado.\n\nAudiologia clínica é interpretação. Não é só gráfico.\n\nCompartilhe com uma Fono premium!\n\n#AudiologiaClínica #AvaliaçãoAudiológica #AASI #Fonoaudiologia #RaciocínioClínico Zumbido FonoPremium", "permalink": "https://www.instagram.com/reel/DSlLIUDkuh7/", "reach": 1483.0, "saved": 9.0, "shares": 2.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18090335626940130',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-19'::date,
    '20:36:33'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Qual vocês acrescentariam? 😂😂😂',
    'https://www.instagram.com/p/DSdWwAFEmhT/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090335626940130", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 72.0, "comentarios": 14.0, "data_postagem": "2025-12-19 00:00:00", "hora_postagem": "20:36:33", "legenda": "Qual vocês acrescentariam? 😂😂😂", "permalink": "https://www.instagram.com/p/DSdWwAFEmhT/", "reach": 1073.0, "saved": 2.0, "shares": 10.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  72,
  14,
  1073,
  2,
  10,
  0.082013,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18090335626940130", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 72.0, "comentarios": 14.0, "data_postagem": "2025-12-19 00:00:00", "hora_postagem": "20:36:33", "legenda": "Qual vocês acrescentariam? 😂😂😂", "permalink": "https://www.instagram.com/p/DSdWwAFEmhT/", "reach": 1073.0, "saved": 2.0, "shares": 10.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18076698671255995',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-18'::date,
    '20:42:23'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Existem zumbidos mais complexos do que “puramente” uma neuroplasticodade da perda auditiva. Me conta aqui: qua sua maior dificuldade para trabalhar com zumbido?? 🐝',
    'https://www.instagram.com/reel/DSayh7VkigI/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18076698671255995", "tipo_postagem": "VIDEO", "likes": 76.0, "comentarios": 2.0, "data_postagem": "2025-12-18 00:00:00", "hora_postagem": "20:42:23", "legenda": "Existem zumbidos mais complexos do que “puramente” uma neuroplasticodade da perda auditiva. Me conta aqui: qua sua maior dificuldade para trabalhar com zumbido?? 🐝", "permalink": "https://www.instagram.com/reel/DSayh7VkigI/", "reach": 1063.0, "saved": 7.0, "shares": 6.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  76,
  2,
  1063,
  7,
  6,
  0.079962,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18076698671255995", "tipo_postagem": "VIDEO", "likes": 76.0, "comentarios": 2.0, "data_postagem": "2025-12-18 00:00:00", "hora_postagem": "20:42:23", "legenda": "Existem zumbidos mais complexos do que “puramente” uma neuroplasticodade da perda auditiva. Me conta aqui: qua sua maior dificuldade para trabalhar com zumbido?? 🐝", "permalink": "https://www.instagram.com/reel/DSayh7VkigI/", "reach": 1063.0, "saved": 7.0, "shares": 6.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18101057875769403',
    '2026-05-13 00:43:13'::timestamptz,
    '2025-12-17'::date,
    '20:50:15'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Cada paciente é único!',
    'https://www.instagram.com/reel/DSYOqeMEtdI/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18101057875769403", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 0.0, "data_postagem": "2025-12-17 00:00:00", "hora_postagem": "20:50:15", "legenda": "Cada paciente é único!", "permalink": "https://www.instagram.com/reel/DSYOqeMEtdI/", "reach": 682.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  26,
  0,
  682,
  0,
  0,
  0.038123,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": "18101057875769403", "tipo_postagem": "VIDEO", "likes": 26.0, "comentarios": 0.0, "data_postagem": "2025-12-17 00:00:00", "hora_postagem": "20:50:15", "legenda": "Cada paciente é único!", "permalink": "https://www.instagram.com/reel/DSYOqeMEtdI/", "reach": 682.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": null, "saved": null, "shares": null}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  10,
  3,
  null,
  null,
  null,
  null,
  'N/A'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": null, "saved": null, "shares": null}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17865205776551200',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-07'::date,
    '21:44:42'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '4 verdades difíceis sobre AASI na perda auditiva unilateral

1️⃣ Nem todo caso terá benefício com adaptação convencional
Na perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.

2️⃣ O objetivo nem sempre é “igualar” as orelhas
A “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.

3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva
Cada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.

4️⃣ Pode ser considerada prótese ancorada no osso
A prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.

Perda unilateral exige raciocínio clínico — não protocolo automático.

Me siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨',
    'https://www.instagram.com/reel/DTOZPhKks-w/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": null, "saved": null, "shares": null}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  55,
  2,
  null,
  null,
  null,
  null,
  'N/A'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": null, "saved": null, "shares": null}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 599.0, "saved": 7.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  10,
  3,
  599,
  7,
  3,
  0.033389,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 10.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 599.0, "saved": 7.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17865205776551200',
    '2026-05-13 00:43:13'::timestamptz,
    '2026-01-07'::date,
    '21:44:42'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '4 verdades difíceis sobre AASI na perda auditiva unilateral

1️⃣ Nem todo caso terá benefício com adaptação convencional
Na perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.

2️⃣ O objetivo nem sempre é “igualar” as orelhas
A “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.

3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva
Cada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.

4️⃣ Pode ser considerada prótese ancorada no osso
A prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.

Perda unilateral exige raciocínio clínico — não protocolo automático.

Me siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨',
    'https://www.instagram.com/reel/DTOZPhKks-w/',
    '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": 1404.0, "saved": 14.0, "shares": 5.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  55,
  2,
  1404,
  14,
  5,
  0.050570,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-13 00:43:13", "post_id": 1.78652057765512e+16, "tipo_postagem": "VIDEO", "likes": 55.0, "comentarios": 2.0, "data_postagem": "2026-01-07 00:00:00", "hora_postagem": "21:44:42", "legenda": "4 verdades difíceis sobre AASI na perda auditiva unilateral\n\n1️⃣ Nem todo caso terá benefício com adaptação convencional\nNa perda unilateral, a amplificação nem sempre gera ganho funcional real. Em alguns casos, o paciente percebe pouco benefício, maior esforço auditivo ou até piora do conforto. Depende muito da audição remanescente.\n\n2️⃣ O objetivo nem sempre é “igualar” as orelhas\nA “simetria audiométrica” nem sempre é possível. Nesses casos, o foco deve ser melhorar compreensão de fala, reduzir esforço auditivo e ampliar funcionalidade, respeitando os limites da orelha afetada.\n\n3️⃣ A estratégia depende do tipo e grau da perda, risco de zona morta e qualidade auditiva\nCada perfi exige uma conduta diferente. Ignorar zona morta ou qualidade auditiva residual leva a ajustes ineficazes e expectativas irreais.\n\n4️⃣ Pode ser considerada prótese ancorada no osso\nA prótese ancorada no osso pode e deve ser considerada na SSD! Tem vantagens e desvantagens que devem ser consideradas junto do médico e paciente.\n\nPerda unilateral exige raciocínio clínico — não protocolo automático.\n\nMe siga para conteúdos técnicos sobre AASI, indicação correta e decisões clínicas que fazem diferença no resultado do paciente 😍❤️✨", "permalink": "https://www.instagram.com/reel/DTOZPhKks-w/", "reach": 1404.0, "saved": 14.0, "shares": 5.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18109957144861814',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-13'::date,
    '23:49:54'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '"Vi um aparelho muito mais barato na internet." E agora? 🛑

Sua primeira reação é defender o preço? Explicar a marca? O recurso X ou Y? Antes de ir por esse caminho, eu te convido a mudar a chave: o paciente não está comprando uma caixa, ele está comprando um processo de reabilitação.

A diferença entre um amplificador genérico e uma adaptação premium não está no dispositivo em si, mas no que acontece antes, durante e depois:
✅ Avaliação audiológica completa;
✅ Testes de fala e Verificação Objetiva;
✅ Acompanhamento contínuo da reabilitação auditiva.

Um amplificador de internet apenas aumenta o som, muitas vezes sem o processamento adequado para a perda do paciente. O resultado? Mais ruído, menos conforto e zero acompanhamento. Quando você mostra o valor do seu processo e do seu raciocínio clínico, a comparação de preço deixa de fazer sentido.

O amplificador é genérico. A audição é única.

Compartilhe este vídeo para que mais colegas aprendam a posicionar o valor da nossa entrega! 🚀',
    'https://www.instagram.com/reel/DYTEC2ftd4i/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18109957144861814", "tipo_postagem": "VIDEO", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-05-13 00:00:00", "hora_postagem": "23:49:54", "legenda": "\"Vi um aparelho muito mais barato na internet.\" E agora? 🛑\n\nSua primeira reação é defender o preço? Explicar a marca? O recurso X ou Y? Antes de ir por esse caminho, eu te convido a mudar a chave: o paciente não está comprando uma caixa, ele está comprando um processo de reabilitação.\n\nA diferença entre um amplificador genérico e uma adaptação premium não está no dispositivo em si, mas no que acontece antes, durante e depois:\n✅ Avaliação audiológica completa;\n✅ Testes de fala e Verificação Objetiva;\n✅ Acompanhamento contínuo da reabilitação auditiva.\n\nUm amplificador de internet apenas aumenta o som, muitas vezes sem o processamento adequado para a perda do paciente. O resultado? Mais ruído, menos conforto e zero acompanhamento. Quando você mostra o valor do seu processo e do seu raciocínio clínico, a comparação de preço deixa de fazer sentido.\n\nO amplificador é genérico. A audição é única.\n\nCompartilhe este vídeo para que mais colegas aprendam a posicionar o valor da nossa entrega! 🚀", "permalink": "https://www.instagram.com/reel/DYTEC2ftd4i/", "reach": 883.0, "saved": 2.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  27,
  0,
  883,
  2,
  1,
  0.032843,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18109957144861814", "tipo_postagem": "VIDEO", "likes": 27.0, "comentarios": 0.0, "data_postagem": "2026-05-13 00:00:00", "hora_postagem": "23:49:54", "legenda": "\"Vi um aparelho muito mais barato na internet.\" E agora? 🛑\n\nSua primeira reação é defender o preço? Explicar a marca? O recurso X ou Y? Antes de ir por esse caminho, eu te convido a mudar a chave: o paciente não está comprando uma caixa, ele está comprando um processo de reabilitação.\n\nA diferença entre um amplificador genérico e uma adaptação premium não está no dispositivo em si, mas no que acontece antes, durante e depois:\n✅ Avaliação audiológica completa;\n✅ Testes de fala e Verificação Objetiva;\n✅ Acompanhamento contínuo da reabilitação auditiva.\n\nUm amplificador de internet apenas aumenta o som, muitas vezes sem o processamento adequado para a perda do paciente. O resultado? Mais ruído, menos conforto e zero acompanhamento. Quando você mostra o valor do seu processo e do seu raciocínio clínico, a comparação de preço deixa de fazer sentido.\n\nO amplificador é genérico. A audição é única.\n\nCompartilhe este vídeo para que mais colegas aprendam a posicionar o valor da nossa entrega! 🚀", "permalink": "https://www.instagram.com/reel/DYTEC2ftd4i/", "reach": 883.0, "saved": 2.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-14 01:46:32'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-14 01:46:32", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 616.0, "saved": 7.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  11,
  3,
  616,
  7,
  3,
  0.034091,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-14 01:46:32", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 616.0, "saved": 7.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17963646639112878',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-14'::date,
    '16:40:49'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'O BERA Click é uma ferramenta incrível, mas ele não é diagnóstico para adaptação de AASI. 🛑

Muitas fonos ainda sentem aquele "frio na barriga" ao receber um bebê no consultório porque tentam basear sua conduta em exames incompletos. O Click não te dá a configuração da perda, não te dá frequência exata… e sem isso, sua regulagem é um tiro no escuro.

Na pediatria, a margem de erro é ZERO. O acesso aos sons da fala depende da sua precisão técnica hoje. Se você quer parar de "estimar" e passar a diagnosticar com segurança, você precisa de método. 🚀 

OFERTA EXCLUSIVA: Ao entrar para a Formação AASI nos próximos dias, você ganha de bônus a Imersão em Pediatria AO VIVO. 

👉 Comenta EU QUERO aqui embaixo e eu te mando os detalhes no Direct!',
    'https://www.instagram.com/p/DYU31FXDt4J/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17963646639112878", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 28.0, "comentarios": 6.0, "data_postagem": "2026-05-14 00:00:00", "hora_postagem": "16:40:49", "legenda": "O BERA Click é uma ferramenta incrível, mas ele não é diagnóstico para adaptação de AASI. 🛑\n\nMuitas fonos ainda sentem aquele \"frio na barriga\" ao receber um bebê no consultório porque tentam basear sua conduta em exames incompletos. O Click não te dá a configuração da perda, não te dá frequência exata… e sem isso, sua regulagem é um tiro no escuro.\n\nNa pediatria, a margem de erro é ZERO. O acesso aos sons da fala depende da sua precisão técnica hoje. Se você quer parar de \"estimar\" e passar a diagnosticar com segurança, você precisa de método. 🚀 \n\nOFERTA EXCLUSIVA: Ao entrar para a Formação AASI nos próximos dias, você ganha de bônus a Imersão em Pediatria AO VIVO. \n\n👉 Comenta EU QUERO aqui embaixo e eu te mando os detalhes no Direct!", "permalink": "https://www.instagram.com/p/DYU31FXDt4J/", "reach": 375.0, "saved": 6.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  28,
  6,
  375,
  6,
  1,
  0.106667,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17963646639112878", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 28.0, "comentarios": 6.0, "data_postagem": "2026-05-14 00:00:00", "hora_postagem": "16:40:49", "legenda": "O BERA Click é uma ferramenta incrível, mas ele não é diagnóstico para adaptação de AASI. 🛑\n\nMuitas fonos ainda sentem aquele \"frio na barriga\" ao receber um bebê no consultório porque tentam basear sua conduta em exames incompletos. O Click não te dá a configuração da perda, não te dá frequência exata… e sem isso, sua regulagem é um tiro no escuro.\n\nNa pediatria, a margem de erro é ZERO. O acesso aos sons da fala depende da sua precisão técnica hoje. Se você quer parar de \"estimar\" e passar a diagnosticar com segurança, você precisa de método. 🚀 \n\nOFERTA EXCLUSIVA: Ao entrar para a Formação AASI nos próximos dias, você ganha de bônus a Imersão em Pediatria AO VIVO. \n\n👉 Comenta EU QUERO aqui embaixo e eu te mando os detalhes no Direct!", "permalink": "https://www.instagram.com/p/DYU31FXDt4J/", "reach": 375.0, "saved": 6.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-14 23:00:07'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-14 23:00:07", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 623.0, "saved": 7.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  11,
  3,
  623,
  7,
  3,
  0.033708,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-14 23:00:07", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 623.0, "saved": 7.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18088690463613840',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-15'::date,
    '22:46:26'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'Um caso, um pitaco: O paciente recusa o Implante Coclear. E agora? 👂🛑

No quadro de hoje, o cenário é comum, mas desafiador: paciente com perda auditiva severa a profunda, sem benefício com o AASI, mas que se recusa terminantemente a falar sobre o Implante Coclear.

Muitas vezes, essa recusa não é uma escolha consciente, mas fruto da desinformação. ⚠️

O que eu mais vejo no consultório são pacientes reféns de mitos de internet ou "fake news" de grupos de família: "dá raio na cabeça", "a voz fica esquisita", "não funciona" ou o clássico "não tenho mais idade para isso".

A chave aqui é o seu papel como Fono Premium: saber orientar é o ponto principal para uma comunicação de sucesso. Se o paciente está desinformado, é sua responsabilidade técnica desmistificar esses pontos. Implante Coclear não tem limitação de idade — enquanto houver condições cirúrgicas, há possibilidade de ganho de qualidade de vida.

Entenda o "porquê" por trás do "não". Muitas vezes, o que separa o seu paciente de uma audição funcional é apenas a sua capacidade de orientar com autoridade e embasamento. 

Quer ter segurança absoluta para conduzir casos complexos e fazer indicações precisas que transformam a vida dos seus pacientes? Ao entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes no seu Direct!',
    'https://www.instagram.com/reel/DYYGXZbNmRa/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18088690463613840", "tipo_postagem": "VIDEO", "likes": 21.0, "comentarios": 2.0, "data_postagem": "2026-05-15 00:00:00", "hora_postagem": "22:46:26", "legenda": "Um caso, um pitaco: O paciente recusa o Implante Coclear. E agora? 👂🛑\n\nNo quadro de hoje, o cenário é comum, mas desafiador: paciente com perda auditiva severa a profunda, sem benefício com o AASI, mas que se recusa terminantemente a falar sobre o Implante Coclear.\n\nMuitas vezes, essa recusa não é uma escolha consciente, mas fruto da desinformação. ⚠️\n\nO que eu mais vejo no consultório são pacientes reféns de mitos de internet ou \"fake news\" de grupos de família: \"dá raio na cabeça\", \"a voz fica esquisita\", \"não funciona\" ou o clássico \"não tenho mais idade para isso\".\n\nA chave aqui é o seu papel como Fono Premium: saber orientar é o ponto principal para uma comunicação de sucesso. Se o paciente está desinformado, é sua responsabilidade técnica desmistificar esses pontos. Implante Coclear não tem limitação de idade — enquanto houver condições cirúrgicas, há possibilidade de ganho de qualidade de vida.\n\nEntenda o \"porquê\" por trás do \"não\". Muitas vezes, o que separa o seu paciente de uma audição funcional é apenas a sua capacidade de orientar com autoridade e embasamento. \n\nQuer ter segurança absoluta para conduzir casos complexos e fazer indicações precisas que transformam a vida dos seus pacientes? Ao entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes no seu Direct!", "permalink": "https://www.instagram.com/reel/DYYGXZbNmRa/", "reach": 386.0, "saved": 0.0, "shares": 0.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  21,
  2,
  386,
  0,
  0,
  0.059585,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18088690463613840", "tipo_postagem": "VIDEO", "likes": 21.0, "comentarios": 2.0, "data_postagem": "2026-05-15 00:00:00", "hora_postagem": "22:46:26", "legenda": "Um caso, um pitaco: O paciente recusa o Implante Coclear. E agora? 👂🛑\n\nNo quadro de hoje, o cenário é comum, mas desafiador: paciente com perda auditiva severa a profunda, sem benefício com o AASI, mas que se recusa terminantemente a falar sobre o Implante Coclear.\n\nMuitas vezes, essa recusa não é uma escolha consciente, mas fruto da desinformação. ⚠️\n\nO que eu mais vejo no consultório são pacientes reféns de mitos de internet ou \"fake news\" de grupos de família: \"dá raio na cabeça\", \"a voz fica esquisita\", \"não funciona\" ou o clássico \"não tenho mais idade para isso\".\n\nA chave aqui é o seu papel como Fono Premium: saber orientar é o ponto principal para uma comunicação de sucesso. Se o paciente está desinformado, é sua responsabilidade técnica desmistificar esses pontos. Implante Coclear não tem limitação de idade — enquanto houver condições cirúrgicas, há possibilidade de ganho de qualidade de vida.\n\nEntenda o \"porquê\" por trás do \"não\". Muitas vezes, o que separa o seu paciente de uma audição funcional é apenas a sua capacidade de orientar com autoridade e embasamento. \n\nQuer ter segurança absoluta para conduzir casos complexos e fazer indicações precisas que transformam a vida dos seus pacientes? Ao entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes no seu Direct!", "permalink": "https://www.instagram.com/reel/DYYGXZbNmRa/", "reach": 386.0, "saved": 0.0, "shares": 0.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17963510073083383',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-14'::date,
    '23:36:48'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    '"Minha voz está estranha, com eco, oca." 🛑

Quando o paciente chega com essa queixa, o que você faz? Corre para diminuir os graves no software? Troca a oliva? Mexe em toda a programação?Calma. Antes de sair "apertando botões", você precisa de raciocínio clínico. 

Essa sensação pode não ter nada a ver com a regulagem, mas sim com o efeito de oclusão. As vibrações da própria voz ficam presas no conduto e, se o paciente tem graves preservados, o desconforto é imediato.

O teste de ouro: Peça para o paciente falar com o aparelho desligado.
✅ Se a voz continuar estranha, o problema é físico (ventilação/oclusão).
❌ Se o problema sumir, aí sim olhamos para a amplificação.

Ajuste fino de elite não é tentativa e erro. É um processo:
1️⃣ Aprofunde a queixa.
2️⃣ Crie uma hipótese.
3️⃣ Teste a hipótese.
4️⃣ Só então, ajuste.

Já salva esse vídeo para consultar no seu próximo atendimento! 🚀',
    'https://www.instagram.com/reel/DYVnT0rtSq8/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17963510073083383", "tipo_postagem": "VIDEO", "likes": 23.0, "comentarios": 0.0, "data_postagem": "2026-05-14 00:00:00", "hora_postagem": "23:36:48", "legenda": "\"Minha voz está estranha, com eco, oca.\" 🛑\n\nQuando o paciente chega com essa queixa, o que você faz? Corre para diminuir os graves no software? Troca a oliva? Mexe em toda a programação?Calma. Antes de sair \"apertando botões\", você precisa de raciocínio clínico. \n\nEssa sensação pode não ter nada a ver com a regulagem, mas sim com o efeito de oclusão. As vibrações da própria voz ficam presas no conduto e, se o paciente tem graves preservados, o desconforto é imediato.\n\nO teste de ouro: Peça para o paciente falar com o aparelho desligado.\n✅ Se a voz continuar estranha, o problema é físico (ventilação/oclusão).\n❌ Se o problema sumir, aí sim olhamos para a amplificação.\n\nAjuste fino de elite não é tentativa e erro. É um processo:\n1️⃣ Aprofunde a queixa.\n2️⃣ Crie uma hipótese.\n3️⃣ Teste a hipótese.\n4️⃣ Só então, ajuste.\n\nJá salva esse vídeo para consultar no seu próximo atendimento! 🚀", "permalink": "https://www.instagram.com/reel/DYVnT0rtSq8/", "reach": 431.0, "saved": 3.0, "shares": 15.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  23,
  0,
  431,
  3,
  15,
  0.060325,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17963510073083383", "tipo_postagem": "VIDEO", "likes": 23.0, "comentarios": 0.0, "data_postagem": "2026-05-14 00:00:00", "hora_postagem": "23:36:48", "legenda": "\"Minha voz está estranha, com eco, oca.\" 🛑\n\nQuando o paciente chega com essa queixa, o que você faz? Corre para diminuir os graves no software? Troca a oliva? Mexe em toda a programação?Calma. Antes de sair \"apertando botões\", você precisa de raciocínio clínico. \n\nEssa sensação pode não ter nada a ver com a regulagem, mas sim com o efeito de oclusão. As vibrações da própria voz ficam presas no conduto e, se o paciente tem graves preservados, o desconforto é imediato.\n\nO teste de ouro: Peça para o paciente falar com o aparelho desligado.\n✅ Se a voz continuar estranha, o problema é físico (ventilação/oclusão).\n❌ Se o problema sumir, aí sim olhamos para a amplificação.\n\nAjuste fino de elite não é tentativa e erro. É um processo:\n1️⃣ Aprofunde a queixa.\n2️⃣ Crie uma hipótese.\n3️⃣ Teste a hipótese.\n4️⃣ Só então, ajuste.\n\nJá salva esse vídeo para consultar no seu próximo atendimento! 🚀", "permalink": "https://www.instagram.com/reel/DYVnT0rtSq8/", "reach": 431.0, "saved": 3.0, "shares": 15.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18104049913822000',
    '2026-05-15 23:00:09'::timestamptz,
    '2026-05-06'::date,
    '18:04:39'::time,
    'IMAGE',
    'Estatico'::public.instagram_post_type,
    'Qual lado da tabela você ocupa hoje? 📊

A audiologia mudou e o mercado não aceita mais quem apenas "aperta botões". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑

Já a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.

O conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?

🚀 OFERTA EXCLUSIVA:
Esta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.

👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!',
    'https://www.instagram.com/p/DYAbEGNkZ7i/',
    '{"data_coleta": "2026-05-15 23:00:09", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 638.0, "saved": 7.0, "shares": 3.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  11,
  3,
  638,
  7,
  3,
  0.032915,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-15 23:00:09", "post_id": 1.8104049913822e+16, "tipo_postagem": "IMAGE", "likes": 11.0, "comentarios": 3.0, "data_postagem": "2026-05-06 00:00:00", "hora_postagem": "18:04:39", "legenda": "Qual lado da tabela você ocupa hoje? 📊\n\nA audiologia mudou e o mercado não aceita mais quem apenas \"aperta botões\". A Fono Comum vive refém do software, tem receio de casos complexos e acaba entregando sua autoridade (e seu faturamento) para a concorrência por pura insegurança técnica. 🛑\n\nJá a Fono Premium é aquela que domina o processo: ela entende a ciência por trás do ajuste, não foge da pediatria e é escolhida pelo valor que entrega, não pelo desconto que dá.\n\nO conhecimento técnico de elite é o que te tira da guerra de preços e te coloca no topo. A pergunta não é o que você faz, mas como você faz.Você está pronta para mudar de lado?\n\n🚀 OFERTA EXCLUSIVA:\nEsta semana, ao entrar para a Formação AASI, você ganha de bônus a minha Imersão em Pediatria. É o caminho definitivo para você dominar o raciocínio clínico de bebês a idosos e se tornar a referência absoluta da sua região.\n\n👉 Comenta PREMIUM aqui embaixo e eu te mando os detalhes e o link com a condição especial no seu Direct!", "permalink": "https://www.instagram.com/p/DYAbEGNkZ7i/", "reach": 638.0, "saved": 7.0, "shares": 3.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17924474844337063',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-16'::date,
    '20:32:40'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Não adianta ficar aumentando algoritmos de redução de ruído!
Ele, sozinho, não irá melhorar a queixa de compreensão. 

A queixa de entender fala no ruído é das mais comuns e tem sua origem na própria distorção que a perda auditiva sensorioneural causa nos padrões neurais. 

Por isso, precisamos garantir a maior audibilidade e melhores condições para isso, ou seja, melhorar a relação sinal/ruído e deixa a fala o mais audível possível.

Isso é uma combinação de vários fatores, mas usar uma regra prescritiva validada, conseguir verificar esse ganho e usar microfone direcional nas situações desafiadoras, já vai te deixar muito na frente!

Você já usa essas estratégias?
Se não usa mas vai começar a usar, quero saber também! 🌹❤️

Lesica, 2018
Ricketts, Beatles e Mueller, 2019',
    'https://www.instagram.com/p/DYab8_rmk5o/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17924474844337063", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 48.0, "comentarios": 0.0, "data_postagem": "2026-05-16 00:00:00", "hora_postagem": "20:32:40", "legenda": "Não adianta ficar aumentando algoritmos de redução de ruído!\nEle, sozinho, não irá melhorar a queixa de compreensão. \n\nA queixa de entender fala no ruído é das mais comuns e tem sua origem na própria distorção que a perda auditiva sensorioneural causa nos padrões neurais. \n\nPor isso, precisamos garantir a maior audibilidade e melhores condições para isso, ou seja, melhorar a relação sinal/ruído e deixa a fala o mais audível possível.\n\nIsso é uma combinação de vários fatores, mas usar uma regra prescritiva validada, conseguir verificar esse ganho e usar microfone direcional nas situações desafiadoras, já vai te deixar muito na frente!\n\nVocê já usa essas estratégias?\nSe não usa mas vai começar a usar, quero saber também! 🌹❤️\n\nLesica, 2018\nRicketts, Beatles e Mueller, 2019", "permalink": "https://www.instagram.com/p/DYab8_rmk5o/", "reach": 1073.0, "saved": 25.0, "shares": 19.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  48,
  0,
  1073,
  25,
  19,
  0.068034,
  'Bom'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17924474844337063", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 48.0, "comentarios": 0.0, "data_postagem": "2026-05-16 00:00:00", "hora_postagem": "20:32:40", "legenda": "Não adianta ficar aumentando algoritmos de redução de ruído!\nEle, sozinho, não irá melhorar a queixa de compreensão. \n\nA queixa de entender fala no ruído é das mais comuns e tem sua origem na própria distorção que a perda auditiva sensorioneural causa nos padrões neurais. \n\nPor isso, precisamos garantir a maior audibilidade e melhores condições para isso, ou seja, melhorar a relação sinal/ruído e deixa a fala o mais audível possível.\n\nIsso é uma combinação de vários fatores, mas usar uma regra prescritiva validada, conseguir verificar esse ganho e usar microfone direcional nas situações desafiadoras, já vai te deixar muito na frente!\n\nVocê já usa essas estratégias?\nSe não usa mas vai começar a usar, quero saber também! 🌹❤️\n\nLesica, 2018\nRicketts, Beatles e Mueller, 2019", "permalink": "https://www.instagram.com/p/DYab8_rmk5o/", "reach": 1073.0, "saved": 25.0, "shares": 19.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '17911954542203980',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-18'::date,
    '14:00:43'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Muitas fonos cometem o erro de abrir o software antes mesmo de garantir que o físico do aparelho está adequado. Se o acoplamento acústico falha, não existe algoritmo no mundo que salve a sua regulagem.

Antes de pensar em ganho e compressão, pergunte-se: o físico do AASI está permitindo que essa adaptação dê certo?

Dominar esses detalhes é o que separa quem "aperta botão" de quem é uma verdadeira autoridade em pediatria. 

🚀 QUER DOMINAR A PEDIATRIA?
Ao entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria. 

👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes no seu Direct!',
    'https://www.instagram.com/p/DYe4sAgjuX4/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17911954542203980", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 14.0, "comentarios": 4.0, "data_postagem": "2026-05-18 00:00:00", "hora_postagem": "14:00:43", "legenda": "Muitas fonos cometem o erro de abrir o software antes mesmo de garantir que o físico do aparelho está adequado. Se o acoplamento acústico falha, não existe algoritmo no mundo que salve a sua regulagem.\n\nAntes de pensar em ganho e compressão, pergunte-se: o físico do AASI está permitindo que essa adaptação dê certo?\n\nDominar esses detalhes é o que separa quem \"aperta botão\" de quem é uma verdadeira autoridade em pediatria. \n\n🚀 QUER DOMINAR A PEDIATRIA?\nAo entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria. \n\n👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes no seu Direct!", "permalink": "https://www.instagram.com/p/DYe4sAgjuX4/", "reach": 533.0, "saved": 1.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  14,
  4,
  533,
  1,
  1,
  0.035647,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "17911954542203980", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 14.0, "comentarios": 4.0, "data_postagem": "2026-05-18 00:00:00", "hora_postagem": "14:00:43", "legenda": "Muitas fonos cometem o erro de abrir o software antes mesmo de garantir que o físico do aparelho está adequado. Se o acoplamento acústico falha, não existe algoritmo no mundo que salve a sua regulagem.\n\nAntes de pensar em ganho e compressão, pergunte-se: o físico do AASI está permitindo que essa adaptação dê certo?\n\nDominar esses detalhes é o que separa quem \"aperta botão\" de quem é uma verdadeira autoridade em pediatria. \n\n🚀 QUER DOMINAR A PEDIATRIA?\nAo entrar para a Formação AASI neste mês, você ganha de bônus a minha Imersão em Pediatria. \n\n👉 Comenta CRIANÇA aqui embaixo e eu te mando os detalhes no seu Direct!", "permalink": "https://www.instagram.com/p/DYe4sAgjuX4/", "reach": 533.0, "saved": 1.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18558318520064311',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-19'::date,
    '13:27:42'::time,
    'CAROUSEL_ALBUM',
    'Carrossel'::public.instagram_post_type,
    'Na perda auditiva leve do adulto, ele deixa de ouvir um pouco do que já conhece.

Na criança, é diferente. Ela está formando, pela primeira vez, os registros sonoros que sustentam toda a linguagem.

Sem acesso claro aos sons fracos da fala, esses registros simplesmente **não se formam**.

Não é sobre volume. É sobre **audibilidade de detalhes acústicos** que o cérebro infantil ainda está aprendendo a reconhecer.

Perda leve na infância exige conduta clínica

👉 Comenta CRIANÇA aqui embaixo para garantir sua vaga na Formação AASI com bônus exclusivo de Pediatria!',
    'https://www.instagram.com/p/DYhZtDJEUp6/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18558318520064311", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 70.0, "comentarios": 7.0, "data_postagem": "2026-05-19 00:00:00", "hora_postagem": "13:27:42", "legenda": "Na perda auditiva leve do adulto, ele deixa de ouvir um pouco do que já conhece.\n\nNa criança, é diferente. Ela está formando, pela primeira vez, os registros sonoros que sustentam toda a linguagem.\n\nSem acesso claro aos sons fracos da fala, esses registros simplesmente **não se formam**.\n\nNão é sobre volume. É sobre **audibilidade de detalhes acústicos** que o cérebro infantil ainda está aprendendo a reconhecer.\n\nPerda leve na infância exige conduta clínica\n\n👉 Comenta CRIANÇA aqui embaixo para garantir sua vaga na Formação AASI com bônus exclusivo de Pediatria!", "permalink": "https://www.instagram.com/p/DYhZtDJEUp6/", "reach": 2170.0, "saved": 15.0, "shares": 34.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  70,
  7,
  2170,
  15,
  34,
  0.042396,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18558318520064311", "tipo_postagem": "CAROUSEL_ALBUM", "likes": 70.0, "comentarios": 7.0, "data_postagem": "2026-05-19 00:00:00", "hora_postagem": "13:27:42", "legenda": "Na perda auditiva leve do adulto, ele deixa de ouvir um pouco do que já conhece.\n\nNa criança, é diferente. Ela está formando, pela primeira vez, os registros sonoros que sustentam toda a linguagem.\n\nSem acesso claro aos sons fracos da fala, esses registros simplesmente **não se formam**.\n\nNão é sobre volume. É sobre **audibilidade de detalhes acústicos** que o cérebro infantil ainda está aprendendo a reconhecer.\n\nPerda leve na infância exige conduta clínica\n\n👉 Comenta CRIANÇA aqui embaixo para garantir sua vaga na Formação AASI com bônus exclusivo de Pediatria!", "permalink": "https://www.instagram.com/p/DYhZtDJEUp6/", "reach": 2170.0, "saved": 15.0, "shares": 34.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;

with tenant as (
  select id from public.tenants where nome = 'Juliana Coutinho' limit 1
), account as (
  select ia.id, ia.tenant_id
  from public.instagram_accounts ia
  join tenant t on t.id = ia.tenant_id
  where ia.username = 'fga.jucoutinho'
  limit 1
), post_upsert as (
  insert into public.instagram_posts (
    tenant_id, account_id, post_id, data_coleta, data_postagem, hora_postagem,
    tipo_original, tipo, legenda, permalink, raw_payload
  )
  select
    account.tenant_id,
    account.id,
    '18087295520346529',
    '2026-05-21 23:00:07'::timestamptz,
    '2026-05-20'::date,
    '17:29:40'::time,
    'VIDEO',
    'Reels'::public.instagram_post_type,
    'O kit físico das primeiras alunas que entraram no Combo da Fono Premium no mês passado 😍💖
 É sempre motivo de grande alegria para mim ver alunas novas chegando e ganhando confiança, segurança, deixando os pacientes mais felizes e ganhando seu espaço como PREMIUM. 
Sejam muito bem vindas 🫶🏼',
    'https://www.instagram.com/reel/DYkZ_RBtO_M/',
    '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18087295520346529", "tipo_postagem": "VIDEO", "likes": 11.0, "comentarios": 4.0, "data_postagem": "2026-05-20 00:00:00", "hora_postagem": "17:29:40", "legenda": "O kit físico das primeiras alunas que entraram no Combo da Fono Premium no mês passado 😍💖\n É sempre motivo de grande alegria para mim ver alunas novas chegando e ganhando confiança, segurança, deixando os pacientes mais felizes e ganhando seu espaço como PREMIUM. \nSejam muito bem vindas 🫶🏼", "permalink": "https://www.instagram.com/reel/DYkZ_RBtO_M/", "reach": 368.0, "saved": 0.0, "shares": 1.0}'::jsonb
  from account
  on conflict (tenant_id, post_id) do update set
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload
  returning id, tenant_id, account_id
)
insert into public.instagram_metrics (
  tenant_id, account_id, post_id, likes, comentarios, alcance, salvos,
  compartilhamentos, engajamento_score, engajamento_classificacao, origem, raw_payload
)
select
  tenant_id,
  account_id,
  id,
  11,
  4,
  368,
  0,
  1,
  0.040761,
  'Medio'::public.instagram_engagement_classification,
  'xlsx_import',
  '{"data_coleta": "2026-05-21 23:00:07", "post_id": "18087295520346529", "tipo_postagem": "VIDEO", "likes": 11.0, "comentarios": 4.0, "data_postagem": "2026-05-20 00:00:00", "hora_postagem": "17:29:40", "legenda": "O kit físico das primeiras alunas que entraram no Combo da Fono Premium no mês passado 😍💖\n É sempre motivo de grande alegria para mim ver alunas novas chegando e ganhando confiança, segurança, deixando os pacientes mais felizes e ganhando seu espaço como PREMIUM. \nSejam muito bem vindas 🫶🏼", "permalink": "https://www.instagram.com/reel/DYkZ_RBtO_M/", "reach": 368.0, "saved": 0.0, "shares": 1.0}'::jsonb
from post_upsert
on conflict (tenant_id, post_id, origem) do update set
  likes = excluded.likes,
  comentarios = excluded.comentarios,
  alcance = excluded.alcance,
  salvos = excluded.salvos,
  compartilhamentos = excluded.compartilhamentos,
  engajamento_score = excluded.engajamento_score,
  engajamento_classificacao = excluded.engajamento_classificacao,
  imported_at = now(),
  raw_payload = excluded.raw_payload;



with tenant as (

  select id from public.tenants where nome = 'Juliana Coutinho' limit 1

), account as (

  select ia.id, ia.tenant_id

  from public.instagram_accounts ia

  join tenant t on t.id = ia.tenant_id

  where ia.username = 'fga.jucoutinho'

  limit 1

)

insert into public.instagram_import_runs (

  tenant_id, account_id, source, status, total_rows, inserted_rows, updated_rows, failed_rows, finished_at

)

select tenant_id, id, 'Insight.xlsx', 'completed', 115, 115, 0, 0, now() from account;



commit;
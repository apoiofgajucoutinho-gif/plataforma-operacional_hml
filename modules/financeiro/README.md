# Modulo Financeiro

Modulo financeiro da Plataforma Operacional para fluxo de caixa, DRE gerencial,
cartoes, bancos, lancamentos e visao restrita de marketing.

## Acesso de usuarios

1. O usuario precisa existir no Supabase Auth.
2. O usuario precisa estar vinculado ao tenant em `tenant_members`.
3. O usuario precisa ter acesso ao modulo `financeiro` em
   `tenant_module_permissions`, salvo perfil `ADMIN`, que acessa todos os
   modulos.
4. O usuario precisa existir em `fin_perfis_usuario` com `ativo = true`.

Perfis financeiros:

- `admin`: acesso completo ao financeiro.
- `marketing`: leitura restrita ao centro de resultado `Infoproduto`, sem
  bancos, cartoes, capex, configuracoes ou cadastros administrativos.

## Bancos e cartoes

Cadastre bancos em `Financeiro > Cadastro > Meus Bancos`. Eles aparecem no
formulario de lancamento para formas de pagamento de conta bancaria, PIX,
boleto e dinheiro.

Cadastre cartoes em `Financeiro > Cadastro > Cartoes`. Cada cartao precisa de:

- banco vinculado;
- dia de fechamento;
- dia de vencimento;
- limite opcional.

Para lancamentos em cartao de credito, o banco calcula a primeira fatura pela
regra:

- compra ate o dia de fechamento: vence no dia de vencimento do mes corrente;
- compra apos o fechamento: vence no dia de vencimento do mes seguinte.

Parcelas futuras sao geradas no banco via trigger. O mes de competencia das
parcelas permanece no mes da compra original.

## Lancamentos

Use `Financeiro > Lancar` para criar entradas ou saidas. O formulario grava em
`fin_lancamentos` e respeita as validacoes do banco:

- banco obrigatorio para conta bancaria, PIX, boleto e dinheiro;
- cartao obrigatorio para cartao de credito;
- curso obrigatorio para entrada de Infoproduto;
- valor sempre positivo;
- `data_pagamento` representa caixa;
- `mes_competencia` representa competencia gerencial.

## DRE

As telas de DRE leem as views:

- `fin_v_dre_consolidado`;
- `fin_v_dre_por_centro`;
- `fin_v_dre_por_curso`.

A estrutura segue a regra gerencial:

Receita Bruta -> Deducoes -> Receita Liquida -> Custos Diretos -> Lucro Bruto
-> Despesas Operacionais -> EBITDA -> Depreciacao -> EBIT -> Resultado
Financeiro -> IRPJ/CSLL -> Lucro Liquido.

O DRE usa `mes_competencia`. O fluxo de caixa usa `data_pagamento`.

## Cadastros administrativos

Centros, naturezas, categorias, subcategorias, cursos e configuracoes ficam nas
tabelas `fin_*`. A tela inicial de Cadastro ja permite criar bancos e cartoes;
a manutencao completa dos demais cadastros deve evoluir na proxima fatia de
frontend.

Regra de protecao prevista: itens com lancamentos vinculados devem ser
inativados, nao excluidos.

## Realtime

O dashboard assina Postgres Changes nas tabelas:

- `fin_lancamentos`;
- `fin_bancos`;
- `fin_cartoes`;
- `fin_categorias`;
- `fin_subcategorias`.

Ao detectar alteracoes, a pagina executa `router.refresh()` para atualizar
big numbers, listas, DRE e cadastros.

## Teste de RLS

Para validar manualmente:

1. Entre com usuario admin financeiro e confirme acesso a todas as abas.
2. Entre com usuario marketing e confirme que aparecem apenas `Inicio`, `DRE` e
   `Marketing`.
3. No perfil marketing, confirme que os lancamentos retornados pertencem apenas
   ao centro `Infoproduto`.
4. Confirme que bancos, cartoes, capex, configuracoes e cadastro nao aparecem
   para marketing.

## Refresh manual

Normalmente o Realtime atualiza os dados. Use refresh manual apenas se:

- o navegador ficou muito tempo suspenso;
- houve alteracao direta no banco fora da plataforma;
- a assinatura realtime do Supabase ficou indisponivel temporariamente.

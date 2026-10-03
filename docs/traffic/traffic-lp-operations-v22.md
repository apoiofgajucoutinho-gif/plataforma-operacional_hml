# Traffic & LP Operations V2.2

## Escopo

Esta versão evolui somente a leitura interna da Norwyn em HML. Meta Ads, V9,
schedule, LP pública, Pixel, checkout e eventos da LP não foram alterados.

## Histórico intradiário

`instagram_ads_daily` continua sendo o consolidado diário canônico da V9. A
tabela aditiva `instagram_ads_intraday_snapshots` preserva o estado acumulado
após cada upsert do consolidado.

- identidade: `tenant_id + data_referencia + row_key + collected_at`;
- `collected_at`: minuto de `imported_at` da execução;
- idempotência: `ON CONFLICT` atualiza o mesmo snapshot da mesma execução;
- delta: duas últimas coletas do mesmo dia e da mesma `row_key`;
- uma entidade nova na coleta atual não recebe delta até possuir estado anterior;
- o delta não usa o dia anterior e não é chamado de tendência;
- o baseline inicial representa apenas o último consolidado disponível na data
  da migration. Estados sobrescritos antes dela não são reconstruídos.

## Tráfego técnico

Eventos permanecem armazenados. As métricas de negócio excluem eventos quando
há classificação semântica: `source_type=SIMULATED`, `traffic_type` técnico,
`utm_medium` de QA/teste, campanha explícita de validação, parâmetro técnico,
marcador explícito de smoke/teste, chave técnica conhecida ou host de preview.
Texto como `Codex`, isoladamente, não classifica tráfego técnico.

ADMIN pode consultar a distribuição dos eventos excluídos na aba Eventos.

## Direto e origem desconhecida

- **Direto**: não há UTM, identificador pago, `source_sck` nem referência externa.
- **Origem não identificada**: existe contexto de aquisição (`fbclid`, Meta IDs,
  `source_sck` ou referência externa), mas a origem não foi resolvida.

Nenhuma sessão ou venda é redistribuída retrospectivamente por horário, nome ou
proximidade.

## Vendas e níveis de atribuição

A fonte comercial é `comercial_vendas` com `sale_confirmed=true`. A origem só é
creditada quando a cadeia `source_sck → hotmart_attribution_bridge_v →
growth_tracking_keys` pertence à LP selecionada.

As telas distinguem:

1. Hotmart confirmada com origem determinada;
2. Hotmart confirmada com campanha determinada;
3. Hotmart confirmada sem origem determinada;
4. Meta Purchase, que permanece um sinal reportado pela Meta.

Cobertura de origem = vendas Hotmart com origem determinística / vendas Hotmart
confirmadas no mesmo período. Taxa sessão → venda só é exibida para origens
determinísticas e períodos equivalentes.

## Destino e saúde

`Destino reportado pela Meta` vem de `instagram_ads_daily.destination_url`.
`LP canônica` vem de `norwyn_landing_registry.url`. Se os domínios divergirem,
a Norwyn mostra os dois e gera alerta; nenhum anúncio é alterado.

Saúde operacional reutiliza `digital_assets` e `presence_checks`. Saúde da
mensuração continua usando Tracking Health. Journey Health combina as duas
camadas e frescor das fontes, sem usar conversão baixa como falha operacional.
Quando LP ou checkout estão críticos, o motor limita a confiança, recomenda
investigar a jornada e não sugere alteração de criativo, público ou orçamento.

## Limitações atuais

- o primeiro delta real exige duas coletas após a existência do snapshot;
- venda por anúncio continua indisponível enquanto a venda não carregar vínculo
  determinístico até `ad_id`;
- Meta Purchase não é reconciliada como venda Hotmart;
- períodos históricos anteriores ao Attribution Hardening preservam sua menor
  cobertura e não são reatribuídos.

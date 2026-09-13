"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Bot, CheckCircle2, CircleDollarSign, Clock3, ExternalLink, Package, Search, Sparkles, Target, UsersRound } from "lucide-react";
import { ActionCard, DataFreshness, EmptyState, IconPill, InsightCard, MetricCard, PageHeader, SectionHeader, StatusBadge, Surface, TaskCard } from "@/components/ui/norwyn-design-system";
import { CustomerStudent360 } from "@/modules/norwyn/components/CustomerStudent360";
import { AdsDashboard } from "@/modules/ads/components/AdsDashboard";
import { InstagramDashboard } from "@/modules/instagram/components/InstagramDashboard";
import type { AdsContext } from "@/modules/ads/types";
import type { InstagramContext } from "@/modules/instagram/types";
import { canAccessMissionFeature, functionalRoleFor } from "@/lib/auth/roles";
import type { NorwynModuleContext } from "@/modules/norwyn/services/norwyn-module-server";

type SearchLike = Record<string, string | string[] | undefined>;

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function percent(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function dateTime(value: string | null | undefined) {
  if (!value) return "Sem atualização registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualização registrada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function dateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
}

function stale(value: string | null | undefined, hours = 48) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000;
}

function saleDate(row: any) {
  const value = row.data_aprovacao ?? row.data_compra ?? row.last_event_at ?? row.imported_at ?? row.created_at;
  if (!value) return null;
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isBrl(row: any) {
  return String(row.moeda ?? "BRL").trim().toUpperCase() === "BRL";
}

function isConfirmed(row: any) {
  if (row.sale_confirmed !== null && row.sale_confirmed !== undefined) return row.sale_confirmed === true;
  const value = String(row.grupo_comercial ?? row.status_normalizado ?? row.status_original ?? "").toUpperCase();
  return ["CONFIRMED", "APPROVED", "COMPLETE", "COMPLETED", "PURCHASE_APPROVED", "PURCHASE_COMPLETE", "PURCHASE_COMPLETED"].includes(value);
}

function isRevenueEligible(row: any) {
  if (row.revenue_eligible !== null && row.revenue_eligible !== undefined) return row.revenue_eligible === true;
  return isConfirmed(row) && isBrl(row);
}

function isRefund(row: any) {
  const value = String(row.grupo_comercial ?? row.status_normalizado ?? row.status_original ?? "").toUpperCase();
  return ["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK", "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"].includes(value);
}

function recentThisMonth(rows: any[]) {
  const start = startOfMonth();
  return rows.filter((row) => {
    const date = saleDate(row);
    return date ? date >= start : false;
  });
}

function getParam(searchParams: SearchLike | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function Freshness({ context, label = "Atualizado" }: { context: NorwynModuleContext; label?: string }) {
  return <DataFreshness label={`${label} em ${dateTime(context.updatedAt)}`} stale={stale(context.updatedAt)} />;
}

export function NorwynModulePage({ context, searchParams, adsContext, instagramContext }: { context: NorwynModuleContext; searchParams?: SearchLike; adsContext?: AdsContext | null; instagramContext?: InstagramContext | null }) {
  if (context.diagnostic) {
    return <AccessState context={context} />;
  }

  if (context.module === "missoes") return <MissionsModule context={context} />;
  if (context.module === "marketing") return <MarketingModule context={context} searchParams={searchParams} adsContext={adsContext} instagramContext={instagramContext} />;
  if (context.module === "resultados") return <ResultsModule context={context} />;
  if (context.module === "produtos-alunos") return <ProductsStudentsModule context={context} searchParams={searchParams} />;
  return <AutomationsModule context={context} />;
}

function AccessState({ context }: { context: NorwynModuleContext }) {
  const deniedMission = context.module === "missoes" && !canAccessMissionFeature(context.role);
  const deniedAutomation = false;
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <PageHeader
        eyebrow={deniedMission || deniedAutomation ? "Acesso negado" : "Norwyn"}
        title={deniedMission ? "Missões não estão disponíveis para este perfil" : deniedAutomation ? "Automações não estão disponíveis para este perfil" : "Módulo indisponível"}
        description={context.diagnostic ?? "Não foi possível carregar este módulo."}
        aside={<StatusBadge tone={deniedMission || deniedAutomation ? "warning" : "neutral"}>{deniedMission || deniedAutomation ? "DENIED" : "Sem dados"}</StatusBadge>}
      />
      {deniedMission ? <InsightCard title="Proteção por perfil" tone="warning">Ryan/Operacional não recebe Missões no menu e a rota direta entrega uma tela negada, sem conteúdo da missão.</InsightCard> : null}
      {deniedAutomation ? <InsightCard title="Proteção por perfil" tone="warning">Automações são disponíveis para ADMIN, ESPECIALISTA e OPERACIONAL, com detalhes variando por perfil.</InsightCard> : null}
    </div>
  );
}

function MissionsModule({ context }: { context: NorwynModuleContext }) {
  const activeCampaigns = context.campaigns.filter((item) => !["archived", "arquivado", "encerrada"].includes(String(item.status ?? "").toLowerCase()));
  const pendingApprovals = context.campaignApprovals.filter((item) => ["pending", "pendente", "aguardando"].includes(String(item.status ?? "").toLowerCase()));
  const openTasks = context.atividades.filter((item) => !["concluido", "concluida", "done", "cancelado"].includes(String(item.status ?? "").toLowerCase()));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader eyebrow="Missões" title="O que estamos tentando mover agora" description="Cada missão mostra objetivo, progresso possível, próximo passo e o que precisa de decisão humana." aside={<Freshness context={context} />} />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Missões/campanhas ativas" value={number(activeCampaigns.length)} period="Base real de campanhas" status="Foco" tone="primary" />
        <MetricCard label="Decisões pendentes" value={number(pendingApprovals.length)} period="Aprovações abertas" status={pendingApprovals.length ? "Atenção" : "OK"} tone={pendingApprovals.length ? "warning" : "success"} />
        <MetricCard label="Atividades vinculadas" value={number(openTasks.length)} period="Próximos passos operacionais" />
      </section>
      <section className="space-y-4">
        <SectionHeader title="Missões em andamento" description="Primeira camada sem termos técnicos; detalhes ficam dentro de cada card." />
        <div className="grid gap-4 lg:grid-cols-2">
          {activeCampaigns.slice(0, 8).map((mission) => {
            const tasks = openTasks.filter((task) => task.campaign_id === mission.id).slice(0, 2);
            const approvals = pendingApprovals.filter((approval) => approval.campaign_id === mission.id);
            return (
              <Surface key={mission.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase text-[color:var(--ds-accent)]">{mission.type ?? "Missão"}</p>
                    <h2 className="mt-1 break-words text-2xl font-semibold text-[color:var(--ds-text)]">{mission.name ?? "Missão sem nome"}</h2>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{mission.plan_json?.objective ?? mission.plan_json?.objetivo ?? "Objetivo ainda não descrito."}</p>
                  </div>
                  <IconPill icon={Target} tone={approvals.length ? "warning" : "primary"} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Status" value={String(mission.status ?? "Sem status")} />
                  <MetricCard label="Meta de vendas" value={mission.target_sales ? number(Number(mission.target_sales)) : "Sem meta"} />
                  <MetricCard label="Receita alvo" value={mission.target_revenue ? money(Number(mission.target_revenue)) : "Sem meta"} />
                </div>
                <div className="mt-4 space-y-2">
                  {approvals.length ? <ActionCard title="Precisa de decisão" meta="Especialista" tone="warning" description={`${approvals.length} aprovação(ões) aguardando retorno.`} /> : <ActionCard title="Próximo passo" meta="Operação" description={tasks[0]?.titulo ?? "Nenhuma pendência operacional explícita encontrada."} />}
                  {tasks.map((task) => <TaskCard key={task.id} title={task.titulo} context={task.source_module ?? "Atividade vinculada"} due={dateOnly(task.prazo)} priority={task.prioridade} status={task.status} dependency={task.waiting_on ?? task.blocked_reason ?? "-"} />)}
                </div>
              </Surface>
            );
          })}
        </div>
        {!activeCampaigns.length ? <EmptyState title="Nenhuma missão ativa encontrada">A estrutura está pronta; a tela não inventa missões sem dado real.</EmptyState> : null}
      </section>
    </div>
  );
}

function MarketingModule({ context, searchParams, adsContext, instagramContext }: { context: NorwynModuleContext; searchParams?: SearchLike; adsContext?: AdsContext | null; instagramContext?: InstagramContext | null }) {
  const requestedView = getParam(searchParams, "view");
  const view = requestedView === "instagram" || requestedView === "ads" || requestedView === "content" ? requestedView : "overview";
  const followerSummary = context.followerGrowthSummary;
  const latestFollower = context.followerSnapshots.at(-1);
  const followerFreshness = followerSummary?.updated_at ?? followerSummary?.latest_date ?? latestFollower?.updated_at ?? latestFollower?.created_at ?? latestFollower?.snapshot_date ?? null;
  const followerTotal = followerSummary?.followers_current ?? latestFollower?.followers_total ?? null;
  const adsSpend = context.adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const reach = context.posts.reduce((sum, post) => sum + Number(post.alcance ?? 0), 0);
  const pendingContent = context.contentCaptures.filter((item) => !["concluido", "concluido_parcialmente"].includes(String(item.status ?? "").toLowerCase()));
  const tabs = [
    { key: "overview", label: "Visão geral", href: "/marketing?view=overview" },
    { key: "instagram", label: "Instagram", href: "/marketing?view=instagram" },
    { key: "ads", label: "Ads", href: "/marketing?view=ads&period=30d&granularity=day" },
    { key: "content", label: "Conteúdo", href: "/marketing?view=content" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader eyebrow="Marketing" title="Instagram, Ads, campanhas e conteúdo" description="A leitura começa pelo que está atualizado e pelo que precisa de atenção, sem misturar com Produtos, Financeiro ou Missões." aside={<Freshness context={context} />} />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Marketing">
        {tabs.map((tab) => <Link key={tab.key} role="tab" aria-selected={view === tab.key} href={tab.href} className={moduleTabClass(view === tab.key)}>{tab.label}</Link>)}
      </div>
      {view === "overview" ? <MarketingOverview context={context} followerTotal={followerTotal} followerFreshness={followerFreshness} adsSpend={adsSpend} reach={reach} pendingContent={pendingContent} /> : null}
      {view === "instagram" ? (instagramContext ? <InstagramDashboard context={instagramContext} initialTab="insights" editorialAuthorized={instagramContext.role === "ADMIN" || instagramContext.role === "SUPORTE"} /> : <MarketingInstagramPanel context={context} followerTotal={followerTotal} followerFreshness={followerFreshness} />) : null}
      {view === "ads" ? (adsContext ? <AdsDashboard context={adsContext} basePath="/marketing" searchParams={searchParams} /> : <EmptyState title="Ads indisponível">Não foi possível carregar Ads dentro de Marketing.</EmptyState>) : null}
      {view === "content" ? <MarketingContentPanel context={context} pendingContent={pendingContent} /> : null}
      {stale(followerFreshness, 48) ? <InsightCard title="Seguidores podem estar defasados" tone="warning">A tela evidencia a data do último snapshot. O número depende da próxima coleta/importação do Instagram.</InsightCard> : null}
    </div>
  );
}

function MarketingOverview({ context, followerTotal, followerFreshness, adsSpend, reach, pendingContent }: { context: NorwynModuleContext; followerTotal: number | null | undefined; followerFreshness: string | null; adsSpend: number; reach: number; pendingContent: any[] }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Seguidores" value={followerTotal != null ? number(Number(followerTotal)) : "Sem dado"} period={followerFreshness ? "Dados até " + dateTime(followerFreshness) : "Histórico não disponível"} status={stale(followerFreshness, 48) ? "Desatualizado" : "Atualizado"} tone={stale(followerFreshness, 48) ? "warning" : "success"} />
        <MetricCard label="Alcance recente" value={number(reach)} period={`${number(context.posts.length)} posts carregados`} />
        <MetricCard label="Investimento em Ads" value={money(adsSpend)} period={`${number(context.adsRows.length)} linhas de mídia`} />
        <MetricCard label="Conteúdos pendentes" value={number(pendingContent.length)} period="Captação/produção" status={pendingContent.length ? "Ação" : "OK"} tone={pendingContent.length ? "warning" : "success"} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionHeader title="Instagram continua como referência" description="Resumo executivo com acesso direto ao drill-down." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/marketing?view=instagram">Abrir Instagram</Link>} />
          <div className="mt-4 grid gap-3">
            {context.posts.slice(0, 5).map((post) => <ActionCard key={post.id} title={post.legenda || post.tipo || "Post"} meta={dateOnly(post.data_postagem)} description={`Alcance ${number(post.alcance)} · curtidas ${number(post.likes)} · comentários ${number(post.comentarios)}`} />)}
            {!context.posts.length ? <EmptyState title="Sem posts carregados" /> : null}
          </div>
        </Surface>
        <Surface>
          <SectionHeader title="Ads e campanhas" description="Gasto, alcance e campanhas; métricas avançadas ficam no drill-down." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/marketing?view=ads&period=30d&granularity=day">Abrir Ads</Link>} />
          <div className="mt-4 grid gap-3">
            {context.campaigns.slice(0, 5).map((campaign) => <ActionCard key={campaign.id} title={campaign.name ?? "Campanha"} meta={campaign.status ?? "Sem status"} description={`${dateOnly(campaign.starts_at)} até ${dateOnly(campaign.ends_at)}.`} />)}
            {!context.campaigns.length ? <EmptyState title="Sem campanhas cadastradas" /> : null}
          </div>
        </Surface>
      </div>
    </>
  );
}

function MarketingInstagramPanel({ context, followerTotal, followerFreshness }: { context: NorwynModuleContext; followerTotal: number | null | undefined; followerFreshness: string | null }) {
  return (
    <Surface>
      <SectionHeader title="Instagram" description="Conteúdos e sinais recentes do Instagram em um clique dentro de Marketing." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/instagram">Abrir dashboard completo</Link>} />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Seguidores atuais" value={followerTotal != null ? number(Number(followerTotal)) : "Sem dado"} period={followerFreshness ? "Atualizado em " + dateTime(followerFreshness) : "Sem atualização"} tone={stale(followerFreshness, 48) ? "warning" : "success"} />
        <MetricCard label="Posts carregados" value={number(context.posts.length)} period="Fonte Instagram" />
        <MetricCard label="Interações" value={number(context.interactions.length)} period="Histórico recente" />
      </div>
      <div className="mt-5 grid gap-3">
        {context.posts.slice(0, 8).map((post) => <ActionCard key={post.id} title={post.legenda || post.tipo || "Post"} meta={dateOnly(post.data_postagem)} description={`Alcance ${number(post.alcance)} · salvos ${number(post.salvos)} · comentários ${number(post.comentarios)}`} />)}
        {!context.posts.length ? <EmptyState title="Sem posts carregados" /> : null}
      </div>
    </Surface>
  );
}

function MarketingContentPanel({ context, pendingContent }: { context: NorwynModuleContext; pendingContent: any[] }) {
  return (
    <Surface>
      <SectionHeader title="Conteúdo" description="Demandas e capturas de conteúdo já existentes, sem criar um studio novo nesta etapa." />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Capturas" value={number(context.contentCaptures.length)} period="Base real" />
        <MetricCard label="Pendentes" value={number(pendingContent.length)} period="Aguardando ação" tone={pendingContent.length ? "warning" : "success"} />
        <MetricCard label="Campanhas" value={number(context.campaigns.length)} period="Relacionadas a Marketing" />
      </div>
      <div className="mt-5 grid gap-3">
        {context.contentCaptures.slice(0, 10).map((item: any) => <ActionCard key={item.id} title={item.title ?? item.titulo ?? "Conteúdo"} meta={item.status ?? "Sem status"} description={item.description ?? item.descricao ?? item.contexto ?? "Sem descrição adicional."} />)}
        {!context.contentCaptures.length ? <EmptyState title="Sem conteúdos carregados" /> : null}
      </div>
    </Surface>
  );
}
function ResultsModule({ context }: { context: NorwynModuleContext }) {
  const monthSales = recentThisMonth(context.commercialSales).filter(isBrl);
  const confirmed = monthSales.filter(isConfirmed);
  const refunds = monthSales.filter(isRefund);
  const revenue = monthSales.filter(isRevenueEligible).reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);
  const refundValue = refunds.reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);
  const adSpend = context.adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const postsReach = context.posts.reduce((sum, post) => sum + Number(post.alcance ?? 0), 0);
  const nonBrl = context.commercialSales.filter((sale) => !isBrl(sale)).length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader eyebrow="Resultados" title="Leitura consolidada do negócio" description="KPIs de primeira camada para entender direção, com fontes separadas e sem somar moeda estrangeira como BRL." aside={<Freshness context={context} />} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Receita comercial BRL" value={money(revenue)} period="Este mês · vendas confirmadas" status="BRL" tone="success" />
        <MetricCard label="Vendas" value={number(confirmed.length)} period="Este mês" />
        <MetricCard label="Reembolsos/chargeback" value={money(refundValue)} period={`${number(refunds.length)} ocorrência(s)`} tone={refunds.length ? "warning" : "neutral"} />
        <MetricCard label="Ads" value={money(adSpend)} period="Investimento carregado" />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="Marketing" tone="info">{number(context.posts.length)} posts no recorte carregado, {number(postsReach)} de alcance agregado e {number(context.interactions.length)} interações recentes.</InsightCard>
        <InsightCard title="Comercial" tone="success">{number(confirmed.length)} vendas BRL confirmadas neste mês. Use Comercial para ver produto, origem, status e cliente.</InsightCard>
        <InsightCard title="Confiabilidade" tone={nonBrl ? "warning" : "success"}>{nonBrl ? `${number(nonBrl)} venda(s) em moeda não-BRL ficaram fora da soma em reais.` : "Não há moeda estrangeira no recorte carregado."}</InsightCard>
      </section>
      <Surface>
        <SectionHeader title="Próximos detalhes" description="Cada área abre sua própria experiência, sem abas duplicadas globais." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionCard title="Comercial" meta="Vendas" description="Produtos, clientes, origem e status de compra." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/comercial">Abrir</Link>} />
          <ActionCard title="Marketing" meta="Aquisição" description="Instagram, Ads, campanhas e conteúdo." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/marketing">Abrir</Link>} />
          <ActionCard title="Financeiro" meta="Caixa" description="Entradas, saídas e resultado financeiro registrado." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/financeiro">Abrir</Link>} />
        </div>
      </Surface>
    </div>
  );
}

function ProductsStudentsModule({ context, searchParams }: { context: NorwynModuleContext; searchParams?: SearchLike }) {
  const productId = getParam(searchParams, "productId") ?? null;
  const view: "products" | "students" = productId ? "products" : getParam(searchParams, "view") === "students" ? "students" : "products";
  const brlSales = useMemo(() => context.commercialSales.filter(isBrl), [context.commercialSales]);
  const activeProducts = useMemo(() => context.products.filter((product) => product.ativo !== false), [context.products]);
  const students = useMemo(() => new Set(context.commercialSales.map((sale) => String(sale.comprador_email ?? "").toLowerCase()).filter(Boolean)), [context.commercialSales]);
  const selectedProduct = productId ? context.products.find((product) => product.id === productId) ?? null : null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader eyebrow="Produtos & Alunos" title="Produtos, turmas e relacionamento com alunas" description="Produtos e Alunos são abas independentes; filtros e ordenação usam a URL como fonte de verdade." aside={<Freshness context={context} />} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Produtos ativos" value={number(activeProducts.length)} />
        <MetricCard label="Alunas/compradoras" value={number(students.size)} period="Identidade por e-mail disponível" />
        <MetricCard label="Vendas BRL carregadas" value={number(brlSales.length)} status="BRL" tone="success" />
        <MetricCard label="Jornadas estruturadas" value={number(context.customerChannelStatuses.length)} period="Quando instrumentado" />
      </section>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Produtos e Alunos">
        <Link role="tab" aria-selected={view === "products"} href="/produtos-alunos?view=products" className={moduleTabClass(view === "products")}>Produtos</Link>
        <Link role="tab" aria-selected={view === "students"} href="/produtos-alunos?view=students" className={moduleTabClass(view === "students")}>Alunos</Link>
      </div>
      {view === "products" && selectedProduct ? <ProductDetail product={selectedProduct} sales={salesForProduct(brlSales, selectedProduct)} /> : null}
      {view === "products" && !selectedProduct ? <ProductsList products={context.products} sales={brlSales} /> : null}
      {view === "students" ? <CustomerStudent360 context={context} searchParams={searchParams} /> : null}
    </div>
  );
}
function moduleTabClass(active: boolean) {
  return "rounded-full border px-4 py-2 text-sm font-semibold transition " + (active ? "bg-[color:var(--ds-primary)] text-white" : "bg-[color:var(--ds-surface)] text-[color:var(--ds-text-secondary)] hover:bg-[color:var(--ds-primary-soft)]");
}

function normalizeProductName(value: string | null | undefined) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function salesForProduct(sales: any[], product: any) {
  const productNames = [product.nome_oficial, product.produto_base, ...(product.product_aliases ?? []).map((alias: any) => alias.alias)].map(normalizeProductName).filter(Boolean);
  return sales.filter((sale) => {
    if (sale.produto_id && sale.produto_id === product.id) return true;
    const saleName = normalizeProductName(sale.produto_nome);
    return productNames.some((name) => saleName === name || (name.length > 4 && saleName.includes(name)) || (saleName.length > 4 && name.includes(saleName)));
  });
}

function ProductsList({ products, sales }: { products: any[]; sales: any[] }) {
  return (
    <Surface>
      <SectionHeader title="Produtos" description="Lista própria de produtos com venda, faturamento, ticket médio, alunas e reembolsos quando disponíveis." />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {products.map((product) => {
          const productSales = salesForProduct(sales, product);
          const confirmed = productSales.filter(isConfirmed);
          const refunds = productSales.filter(isRefund);
          const revenue = productSales.filter(isRevenueEligible).reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);
          const buyers = new Set(productSales.map((sale) => String(sale.comprador_email ?? "").toLowerCase()).filter(Boolean));
          const ticket = confirmed.length ? revenue / confirmed.length : 0;
          return (
            <ActionCard key={product.id} title={product.nome_oficial ?? "Produto"} meta={product.status ?? product.tipo ?? "Produto"} description={number(confirmed.length) + " venda(s) · " + money(revenue) + " · " + number(buyers.size) + " aluno(s) · ticket " + money(ticket) + " · " + number(refunds.length) + " reembolso(s)"} action={<Link className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--ds-primary)]" href={`/produtos-alunos?view=products&productId=${encodeURIComponent(product.id)}`}>Ver produto <ExternalLink className="h-3.5 w-3.5" /></Link>} />
          );
        })}
        {!products.length ? <EmptyState title="Nenhum produto cadastrado">A aba Produtos está ativa, mas a fonte de produtos não retornou registros.</EmptyState> : null}
      </div>
    </Surface>
  );
}

function ProductDetail({ product, sales }: { product: any; sales: any[] }) {
  const confirmed = sales.filter(isConfirmed);
  const refunds = sales.filter(isRefund);
  const revenue = sales.filter(isRevenueEligible).reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);
  const buyers = new Set(sales.map((sale) => String(sale.comprador_email ?? "").toLowerCase()).filter(Boolean));
  const ticket = confirmed.length ? revenue / confirmed.length : 0;
  return (
    <Surface>
      <SectionHeader title={product.nome_oficial ?? "Produto"} description={product.descricao ?? "Detalhe do produto selecionado."} action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/produtos-alunos?view=products">Voltar para produtos</Link>} />
      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <MetricCard label="Receita BRL confirmada" value={money(revenue)} />
        <MetricCard label="Vendas" value={number(confirmed.length)} />
        <MetricCard label="Alunos" value={number(buyers.size)} />
        <MetricCard label="Ticket médio" value={money(ticket)} />
        <MetricCard label="Reembolsos" value={number(refunds.length)} tone={refunds.length ? "warning" : "neutral"} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm"><thead className="text-xs uppercase text-[color:var(--ds-text-muted)]"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Aluno</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Origem</th><th className="px-3 py-2 text-right">Valor</th></tr></thead><tbody>{sales.slice(0, 30).map((sale) => <tr key={sale.id} className="border-t border-[color:var(--ds-border)]"><td className="px-3 py-2">{dateOnly(sale.data_compra ?? sale.data_aprovacao)}</td><td className="px-3 py-2">{sale.comprador_nome ?? sale.comprador_email ?? "-"}</td><td className="px-3 py-2">{sale.status_original ?? sale.grupo_comercial ?? "-"}</td><td className="px-3 py-2">{sale.source_sck ?? sale.origem ?? "-"}</td><td className="px-3 py-2 text-right font-semibold">{money(sale.valor_bruto)}</td></tr>)}</tbody></table>
        {!sales.length ? <EmptyState title="Sem vendas BRL vinculadas">O produto abriu corretamente; não há compras BRL conectadas por id ou alias.</EmptyState> : null}
      </div>
    </Surface>
  );
}

function StudentsList({ sales, query, onQueryChange }: { sales: any[]; query: string; onQueryChange: (value: string) => void }) {
  const byEmail = new Map<string, any>();
  sales.forEach((sale) => {
    const key = String(sale.comprador_email ?? sale.comprador_nome ?? sale.id).toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, { name: sale.comprador_nome, email: sale.comprador_email, count: 0, value: 0, last: sale.data_compra ?? sale.data_aprovacao, products: new Set<string>(), status: sale.status_original ?? sale.grupo_comercial, origin: sale.source_sck ?? sale.origem ?? null });
    const current = byEmail.get(key);
    current.count += 1;
    if (sale.produto_nome) current.products.add(String(sale.produto_nome));
    if (isBrl(sale) && isConfirmed(sale)) current.value += Number(sale.valor_bruto ?? 0);
    if (String(sale.data_compra ?? sale.data_aprovacao ?? "") > String(current.last ?? "")) { current.last = sale.data_compra ?? sale.data_aprovacao; current.status = sale.status_original ?? sale.grupo_comercial; current.origin = sale.source_sck ?? sale.origem ?? null; }
  });
  const needle = normalizeProductName(query);
  const rows = [...byEmail.values()].map((row) => ({ ...row, products: [...row.products] })).filter((row) => !needle || normalizeProductName([row.name, row.email, row.products.join(" "), row.status, row.origin].filter(Boolean).join(" ")).includes(needle)).sort((a, b) => String(b.last ?? "").localeCompare(String(a.last ?? ""))).slice(0, 100);
  return (
    <Surface>
      <SectionHeader title="Alunos" description="Lista própria derivada das compras reais: aluno, produto adquirido, data, status, origem e histórico." />
      <label className="mt-4 flex max-w-xl items-center gap-2 rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] px-3 py-2 text-sm text-[color:var(--ds-text-secondary)]"><Search className="h-4 w-4" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar aluno, produto, status ou origem" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="text-xs uppercase text-[color:var(--ds-text-muted)]"><tr><th className="px-3 py-2">Aluno</th><th className="px-3 py-2">Contato</th><th className="px-3 py-2">Produto adquirido</th><th className="px-3 py-2">Última compra</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Origem</th><th className="px-3 py-2 text-right">Histórico</th><th className="px-3 py-2 text-right">Receita BRL</th></tr></thead><tbody>{rows.map((row) => <tr key={row.email ?? row.name} className="border-t border-[color:var(--ds-border)]"><td className="px-3 py-2 font-semibold">{row.name ?? "-"}</td><td className="px-3 py-2">{row.email ?? "-"}</td><td className="px-3 py-2">{row.products.slice(0, 2).join(", ") || "-"}</td><td className="px-3 py-2">{dateOnly(row.last)}</td><td className="px-3 py-2">{row.status ?? "-"}</td><td className="px-3 py-2">{row.origin ?? "-"}</td><td className="px-3 py-2 text-right">{number(row.count)} compra(s)</td><td className="px-3 py-2 text-right font-semibold">{money(row.value)}</td></tr>)}</tbody></table></div>
      {!rows.length ? <EmptyState title="Nenhum aluno encontrado">A aba Alunos está ativa; ajuste a busca ou valide se há compras carregadas.</EmptyState> : null}
    </Surface>
  );
}
function AutomationsModule({ context }: { context: NorwynModuleContext }) {
  const [tab, setTab] = useState<"overview" | "manychat" | "telegram">("overview");
  const manychatHealth = integrationHealthFromDate(context.manychatSummary?.collected_at);
  const telegramHealth = computeTelegramHealth(context);
  const attentionCount = Number(manychatHealth.tone !== "success") + Number(telegramHealth.tone !== "success" && telegramHealth.label !== "Sem atividade");
  const latestActivity = latestAutomationActivity(context);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader eyebrow="Automações" title="Centro de observabilidade das automações" description="O que está automatizado, está funcionando e existe algo que precisa de atenção?" aside={<Freshness context={context} />} />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Automações">
        <button type="button" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")} className={moduleTabClass(tab === "overview")}>Visão geral</button>
        <button type="button" role="tab" aria-selected={tab === "manychat"} onClick={() => setTab("manychat")} className={moduleTabClass(tab === "manychat")}>ManyChat</button>
        <button type="button" role="tab" aria-selected={tab === "telegram"} onClick={() => setTab("telegram")} className={moduleTabClass(tab === "telegram")}>Telegram</button>
      </div>
      {tab === "overview" ? <AutomationsOverview context={context} manychatHealth={manychatHealth} telegramHealth={telegramHealth} attentionCount={attentionCount} latestActivity={latestActivity} setTab={setTab} /> : null}
      {tab === "manychat" ? <ManyChatPanel context={context} health={manychatHealth} /> : null}
      {tab === "telegram" ? <TelegramPanel context={context} health={telegramHealth} /> : null}
    </div>
  );
}

function integrationHealthFromDate(value: string | null | undefined) {
  if (!value) return { label: "Sem sincronização", tone: "warning" as const, description: "Nenhum snapshot encontrado." };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Sem sincronização", tone: "warning" as const, description: "Data inválida." };
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 12) return { label: "Saudável", tone: "success" as const, description: "Última sincronização dentro de 12h." };
  if (hours <= 24) return { label: "Atenção", tone: "warning" as const, description: "Última sincronização passou de 12h." };
  return { label: "Desatualizado", tone: "warning" as const, description: "Última sincronização passou de 24h." };
}

function computeTelegramHealth(context: NorwynModuleContext) {
  const schedules = context.telegramSchedules.filter((item) => item.canal === "telegram" && item.ativo);
  const sends = context.telegramSends.filter((item) => item.canal === "telegram");
  const failures = sends.filter((item) => {
    const status = String(item.status ?? "").toLowerCase();
    return status.includes("falh") || status === "erro";
  });
  if (!schedules.length && !sends.length) return { label: "Sem atividade", tone: "neutral" as const, description: "Nenhum agendamento ou envio Telegram aplicável." };
  if (failures.length && sends[0]?.id === failures[0]?.id) return { label: "Atenção", tone: "warning" as const, description: "Falha recente registrada." };
  return { label: "Saudável", tone: "success" as const, description: "Agendamentos/envios recentes sem falha principal." };
}

function latestAutomationActivity(context: NorwynModuleContext) {
  return [context.manychatSummary?.collected_at, ...context.telegramSends.map((item) => item.sent_at ?? item.created_at), ...context.telegramSchedules.map((item) => item.updated_at)].filter(Boolean).sort().at(-1) ?? null;
}

function nextTelegramLabel(row: any) {
  return (row.horario ? String(row.horario).slice(0, 5) : "Horário não definido") + " · " + (row.frequencia ?? "frequência não definida");
}

function recipientName(context: NorwynModuleContext, id: string | null | undefined) {
  return context.telegramRecipients.find((item) => item.id === id)?.nome ?? "Destino Telegram";
}

function AutomationsOverview({ context, manychatHealth, telegramHealth, attentionCount, latestActivity, setTab }: { context: NorwynModuleContext; manychatHealth: ReturnType<typeof integrationHealthFromDate>; telegramHealth: ReturnType<typeof computeTelegramHealth>; attentionCount: number; latestActivity: string | null; setTab: (tab: "overview" | "manychat" | "telegram") => void }) {
  const changes = automationChanges(context);
  const role = functionalRoleFor(context.role);
  const activeCampaign = activeCampaignSummary(context);
  const failures = automationFailureCount(context);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={role === "OPERACIONAL" ? "Automações" : "Automações ativas"} value={number(context.manychatSummary?.growth_tools_count ?? context.manychatGrowthTools.length)} period="Growth Tools ManyChat" tone="primary" />
        <MetricCard label="Leads captados" value={number(context.customerChannelStatuses.length)} period="Contatos/jornadas registradas" tone="info" />
        <MetricCard label="Contatos sincronizados" value={number(activeCampaign.synced)} period={activeCampaign.connected ? "ActiveCampaign" : "ActiveCampaign ainda não conectado"} tone={activeCampaign.connected ? "success" : "warning"} />
        <MetricCard label="Falhas" value={number(failures)} period="Telegram + sincronizações" tone={failures ? "warning" : "success"} />
        <MetricCard label="ManyChat" value={manychatHealth.label} period={context.manychatSummary ? number(context.manychatSummary.growth_tools_count) + " Growth Tools detectados" : "Sem snapshot"} tone={manychatHealth.tone} />
        <MetricCard label="Telegram" value={telegramHealth.label} period={context.telegramSchedules.filter((item) => item.ativo && item.canal === "telegram").length + " agendamento(s) ativo(s)"} tone={telegramHealth.tone} />
        <MetricCard label="Integrações com atenção" value={number(attentionCount)} period="ManyChat + Telegram" tone={attentionCount ? "warning" : "success"} />
        <MetricCard label="Última atividade" value={latestActivity ? dateTime(latestActivity) : "Sem atividade"} period="Automação" />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <ActionCard title="ManyChat" meta={manychatHealth.label} description={context.manychatSummary ? number(context.manychatSummary.growth_tools_count) + " gatilhos/automações detectados via API, " + number(context.manychatSummary.tags_count) + " tags e " + number(context.manychatSummary.custom_fields_count) + " campos." : "Sem snapshot de inventário."} action={<button type="button" className="text-sm font-semibold text-[color:var(--ds-primary)]" onClick={() => setTab("manychat")}>Ver ManyChat</button>} />
        <ActionCard title="Telegram" meta={telegramHealth.label} description={context.telegramSends.length + " envio(s) recentes e " + context.telegramSchedules.filter((item) => item.ativo && item.canal === "telegram").length + " agendamento(s) ativo(s)."} action={<button type="button" className="text-sm font-semibold text-[color:var(--ds-primary)]" onClick={() => setTab("telegram")}>Ver Telegram</button>} />
      </section>
      <Surface>
        <SectionHeader title="Mudanças recentes" description="Comparação entre snapshot ManyChat atual e anterior, quando existe histórico suficiente." />
        <div className="mt-4 grid gap-3">
          {changes.map((item, index) => <ActionCard key={index} title={item.title} meta={item.meta} description={item.description} />)}
          {!changes.length ? <EmptyState title="Sem mudança detectada">Ainda não há snapshot anterior suficiente ou não houve alteração entre sincronizações.</EmptyState> : null}
        </div>
      </Surface>
    </div>
  );
}

function automationChanges(context: NorwynModuleContext) {
  const manychat = context.manychatChanges.map((item) => ({ title: item.change === "added" ? "Novo item detectado" : "Item não encontrado na última sincronização", meta: item.kind, description: item.label }));
  const telegramFailures = context.telegramSends.filter((item) => {
    const status = String(item.status ?? "").toLowerCase();
    return status.includes("falh") || status === "erro";
  }).slice(0, 4).map((item) => ({ title: "Falha Telegram", meta: item.tipo_resumo ?? "Relatório", description: item.erro ?? item.assunto ?? "Falha registrada sem detalhe." }));
  return [...manychat, ...telegramFailures].slice(0, 10);
}

function ManyChatPanel({ context, health }: { context: NorwynModuleContext; health: ReturnType<typeof integrationHealthFromDate> }) {
  const [query, setQuery] = useState("");
  const needle = normalizeProductName(query);
  const tags = context.manychatTags.filter((item) => !needle || normalizeProductName(item.name).includes(needle));
  const fields = context.manychatCustomFields.filter((item) => !needle || normalizeProductName([item.name, item.type, item.description].filter(Boolean).join(" ")).includes(needle));
  const tools = context.manychatGrowthTools.filter((item) => !needle || normalizeProductName([item.name, item.type].filter(Boolean).join(" ")).includes(needle));
  const role = functionalRoleFor(context.role);
  const isAdmin = role === "ADMIN";
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Growth Tools" value={number(context.manychatSummary?.growth_tools_count ?? tools.length)} period="Gatilhos/automações detectados via API" tone="primary" />
        <MetricCard label="Tags" value={number(context.manychatSummary?.tags_count ?? tags.length)} period="Configuração ManyChat" />
        <MetricCard label="Custom Fields" value={number(context.manychatSummary?.custom_fields_count ?? fields.length)} period="Estrutura, sem dados pessoais" />
        <MetricCard label="Flows via API" value={context.manychatSummary?.flows_count ? number(context.manychatSummary.flows_count) : "Indisponível"} period="Fluxos não disponíveis por esta fonte" tone="neutral" />
        <MetricCard label="Saúde" value={health.label} period={context.manychatSummary?.collected_at ? dateTime(context.manychatSummary.collected_at) : "Sem sync"} tone={health.tone} />
      </section>
      <InsightCard title="Interpretação" tone="info">A fonte persistida atual retorna principalmente Growth Tools. Por isso a tela mostra “Fluxos não disponíveis por esta fonte” quando flows=0 e não interpreta isso como ausência de automações.</InsightCard>
      <label className="flex max-w-xl items-center gap-2 rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] px-3 py-2 text-sm text-[color:var(--ds-text-secondary)]"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Growth Tool, tag ou campo" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
      <section className="grid gap-4 xl:grid-cols-3">
        <InventoryList title="Growth Tools" rows={tools} columns={isAdmin ? ["name", "type", "id"] : ["name", "type"]} empty="Nenhum Growth Tool encontrado." />
        <InventoryList title="Tags" rows={tags} columns={isAdmin ? ["name", "id"] : ["name"]} empty="Nenhuma tag encontrada." />
        <InventoryList title="Custom Fields" rows={fields} columns={isAdmin ? ["name", "type", "description", "id"] : ["name", "type", "description"]} empty="Nenhum campo personalizado encontrado." />
      </section>
      {isAdmin ? <InsightCard title="Detalhes técnicos" tone="neutral">IDs, mapeamentos e payloads permanecem restritos à visão Admin. Especialista e Operacional veem status, gatilhos e pendências sem exposição de internals.</InsightCard> : null}
    </div>
  );
}

function activeCampaignSummary(context: NorwynModuleContext) {
  const rows = context.customerChannelStatuses ?? [];
  const synced = rows.filter((item) => item.activecampaign_contact_id || String(item.activecampaign_status ?? "").includes("ACTIVE")).length;
  const errors = rows.filter((item) => String(item.sync_status ?? "").toUpperCase().includes("ERROR")).length;
  return { connected: synced > 0, synced, errors };
}

function automationFailureCount(context: NorwynModuleContext) {
  const telegramFailures = (context.telegramSends ?? []).filter((item) => String(item.status ?? "").toLowerCase().includes("falh") || String(item.status ?? "").toLowerCase() === "erro").length;
  return telegramFailures + activeCampaignSummary(context).errors;
}

function InventoryList({ title, rows, columns, empty }: { title: string; rows: any[]; columns: string[]; empty: string }) {
  return (
    <Surface>
      <SectionHeader title={title} description={number(rows.length) + " item(ns)"} />
      <div className="mt-4 space-y-2">
        {rows.slice(0, 80).map((row, index) => <ActionCard key={String(row.id ?? row.name ?? index)} title={row.name ?? row.field_name ?? "Sem nome"} meta={row.type ?? row.id ?? "ManyChat"} description={columns.map((column) => row[column]).filter((value) => value != null && value !== "").join(" · ") || "Sem detalhe adicional"} />)}
        {!rows.length ? <EmptyState title={empty} /> : null}
      </div>
    </Surface>
  );
}

function TelegramPanel({ context, health }: { context: NorwynModuleContext; health: ReturnType<typeof computeTelegramHealth> }) {
  const schedules = context.telegramSchedules.filter((item) => item.canal === "telegram" && item.ativo);
  const sends = context.telegramSends.filter((item) => item.canal === "telegram");
  const success = sends.filter((item) => String(item.status ?? "").toLowerCase() === "enviado").length;
  const failures = sends.filter((item) => String(item.status ?? "").toLowerCase().includes("falh")).length;
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Agendamentos ativos" value={number(schedules.length)} period="Telegram" tone="primary" />
        <MetricCard label="Último envio" value={sends[0]?.sent_at ? dateTime(sends[0].sent_at) : "Sem envio"} period={sends[0]?.status ?? "Histórico"} />
        <MetricCard label="Sucessos" value={number(success)} period="Histórico recente" tone="success" />
        <MetricCard label="Falhas" value={number(failures)} period="Histórico recente" tone={failures ? "warning" : "success"} />
      </section>
      <InsightCard title="Saúde Telegram" tone={health.tone}>{health.description}</InsightCard>
      <section className="grid gap-4 lg:grid-cols-2">
        <Surface><SectionHeader title="Próximos envios" description="Baseado nos agendamentos reais." /><div className="mt-4 grid gap-3">{schedules.map((item) => <ActionCard key={item.id} title={item.nome ?? item.tipo_resumo ?? "Relatório"} meta={nextTelegramLabel(item)} description={recipientName(context, item.destinatario_id)} />)}{!schedules.length ? <EmptyState title="Sem agendamento Telegram ativo" /> : null}</div></Surface>
        <Surface><SectionHeader title="Histórico Telegram" description="Últimos envios registrados." /><div className="mt-4 grid gap-3">{sends.slice(0, 12).map((item) => <ActionCard key={item.id} title={item.assunto ?? item.tipo_resumo ?? "Relatório"} meta={(item.status ?? "sem status") + " · " + dateTime(item.sent_at ?? item.created_at)} description={item.erro ?? recipientName(context, item.destinatario_id)} />)}{!sends.length ? <EmptyState title="Sem histórico de envio" /> : null}</div></Surface>
      </section>
    </div>
  );
}





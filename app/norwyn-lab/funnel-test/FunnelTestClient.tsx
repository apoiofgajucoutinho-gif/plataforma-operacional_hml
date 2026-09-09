"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, PlayCircle, RefreshCw } from "lucide-react";

type SentEvent = {
  event_type: string;
  status: "pending" | "sent" | "error";
  timestamp: string;
  detail: string;
};

type StoredEvent = {
  id: string;
  event_type: string;
  environment: string;
  occurred_at: string;
  page_url: string | null;
  campaign_key: string | null;
  audience_key: string | null;
  creative_key: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  source_sck: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  metadata: Record<string, unknown>;
};

type PlayerDebug = {
  source: string;
  currentSrc: string;
  duration: number | null;
  currentTime: number;
  progress: number | null;
  playbackRate: number;
  metadataLoaded: boolean;
  loadedMetadataAt: string | null;
  ctaThresholdSeconds: number | null;
  lastSeek: { from: number; to: number; at: string; forward: boolean } | null;
};

const baseVideoUrl = "https://samplelib.com/preview/mp4/sample-30s.mp4";
const videoId = "test_vsl_30s_20260813";
const videoUrl = `${baseVideoUrl}?norwyn_test_video=${videoId}`;
const ctaViewThreshold = 0.9;
const progressMilestones = [
  { eventType: "VSL_PROGRESS_25", threshold: 0.25, progress: 25 },
  { eventType: "VSL_PROGRESS_50", threshold: 0.5, progress: 50 },
  { eventType: "VSL_PROGRESS_75", threshold: 0.75, progress: 75 },
  { eventType: "VSL_PROGRESS_90", threshold: 0.9, progress: 90 },
];
const defaultParams = {
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "norwyn_funnel_lab",
  utm_content: "test_vsl_01",
  utm_term: "internal_test",
  campaign_key: "norwyn_funnel_lab",
  creative_key: "test_vsl_01",
  audience_key: "internal_test",
  sck: "s=meta|m=paid_social|c=norwyn_funnel_lab|co=test_vsl_01|t=internal_test",
};
const landingOptions = [
  {
    key: "mrc_lp_v1",
    label: "V1",
    campaignKey: "mrc_imersao_set26",
    url: "https://lp.fgajulianacoutinho.com.br/jul26-mrc-v1",
  },
  {
    key: "mrc_lp_v5",
    label: "V5",
    campaignKey: "mrc_imersao_set26",
    url: "https://lp.fgajulianacoutinho.com.br/jul26-mrc-v5/",
  },
];

function createSessionId() {
  return window.crypto?.randomUUID?.() ?? `lab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId(forceNewSession = false) {
  if (forceNewSession) {
    const created = createSessionId();
    window.localStorage.setItem("norwyn_funnel_lab_session_id", created);
    return created;
  }
  const existing = window.localStorage.getItem("norwyn_funnel_lab_session_id");
  if (existing) return existing;
  const created = createSessionId();
  window.localStorage.setItem("norwyn_funnel_lab_session_id", created);
  return created;
}

function paramsWithDefaults(search: URLSearchParams) {
  const merged = new URLSearchParams(search);
  for (const [key, value] of Object.entries(defaultParams)) {
    if (!merged.has(key)) merged.set(key, value);
  }
  return merged;
}

function formatSeconds(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}s`;
}

export function FunnelTestClient() {
  const [sessionId, setSessionId] = useState("");
  const [sentEvents, setSentEvents] = useState<SentEvent[]>([]);
  const [storedEvents, setStoredEvents] = useState<StoredEvent[]>([]);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [selectedLandingKey, setSelectedLandingKey] = useState(() => {
    if (typeof window === "undefined") return "mrc_lp_v1";
    const landingKey = new URLSearchParams(window.location.search).get("landing_key");
    return landingKey && landingOptions.some((landing) => landing.key === landingKey) ? landingKey : "mrc_lp_v1";
  });
  const [playerDebug, setPlayerDebug] = useState<PlayerDebug>({
    source: videoUrl,
    currentSrc: "",
    duration: null,
    currentTime: 0,
    progress: null,
    playbackRate: 1,
    metadataLoaded: false,
    loadedMetadataAt: null,
    ctaThresholdSeconds: null,
    lastSeek: null,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sentKeys = useRef(new Set<string>());
  const lastTimeRef = useRef(0);
  const seekStartRef = useRef<number | null>(null);
  const maxSeekForwardToRef = useRef(0);

  const trackingParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return paramsWithDefaults(new URLSearchParams(window.location.search));
  }, []);

  const trackingUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.search = trackingParams.toString();
    return url.toString();
  }, [trackingParams]);
  const selectedLanding = landingOptions.find((landing) => landing.key === selectedLandingKey) ?? landingOptions[0];
  const landingTestUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set("new_session", "1");
    params.set("landing_key", selectedLanding.key);
    params.set("utm_source", "meta");
    params.set("utm_medium", "paid_social");
    params.set("utm_campaign", selectedLanding.campaignKey);
    params.set("utm_content", `${selectedLanding.key}_creative_test`);
    params.set("utm_term", "internal_test");
    params.set("campaign_key", selectedLanding.campaignKey);
    params.set("creative_key", `${selectedLanding.key}_creative_test`);
    params.set("audience_key", "internal_test");
    params.set("sck", `s=meta|m=paid_social|c=${selectedLanding.campaignKey}|l=${selectedLanding.key}|co=${selectedLanding.key}_creative_test|t=internal_test`);
    url.search = params.toString();
    return url.toString();
  }, [selectedLanding]);

  async function refreshEvents(currentSessionId = sessionId) {
    if (!currentSessionId) return;
    const response = await fetch(`/api/norwyn/funnel-events?funnel_session_id=${encodeURIComponent(currentSessionId)}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    setStoredEvents(Array.isArray(data.events) ? data.events : []);
  }

  async function track(eventType: string, metadata: Record<string, unknown> = {}) {
    if (!sessionId) return;
    const key = `${sessionId}:${eventType}:${metadata.video_id ?? videoId}`;
    if (sentKeys.current.has(key)) return;
    sentKeys.current.add(key);

    const timestamp = new Date().toISOString();
    setSentEvents((current) => [
      ...current,
      { event_type: eventType, status: "pending", timestamp, detail: "Enviando para Funnel Events" },
    ]);

    const payload = {
      funnel_session_id: sessionId,
      event_type: eventType,
      environment: "test",
      page_url: window.location.href,
      destination_url: `${window.location.origin}/norwyn-lab/funnel-test/destination`,
      campaign_id: trackingParams.get("campaign_id"),
      adset_id: trackingParams.get("adset_id"),
      ad_id: trackingParams.get("ad_id"),
      creative_id: trackingParams.get("creative_id"),
      campaign_key: trackingParams.get("campaign_key"),
      audience_key: trackingParams.get("audience_key"),
      creative_key: trackingParams.get("creative_key"),
      utm_source: trackingParams.get("utm_source"),
      utm_medium: trackingParams.get("utm_medium"),
      utm_campaign: trackingParams.get("utm_campaign"),
      utm_content: trackingParams.get("utm_content"),
      utm_term: trackingParams.get("utm_term"),
      sck: trackingParams.get("sck"),
      source_sck: trackingParams.get("source_sck") ?? trackingParams.get("sck"),
      fbclid: trackingParams.get("fbclid"),
      click_id: trackingParams.get("click_id"),
      video_id: videoId,
      metadata: {
        landing_key: selectedLanding.key,
        landing_version: selectedLanding.label,
        landing_url: selectedLanding.url,
        ...metadata,
      },
    };

    try {
      const response = await fetch("/api/norwyn/funnel-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Falha ao enviar evento.");
      setSentEvents((current) =>
        current.map((item) =>
          item.event_type === eventType && item.timestamp === timestamp
            ? { ...item, status: "sent", detail: "Gravado como TEST" }
            : item,
        ),
      );
      await refreshEvents();
    } catch (error) {
      setSentEvents((current) =>
        current.map((item) =>
          item.event_type === eventType && item.timestamp === timestamp
            ? { ...item, status: "error", detail: error instanceof Error ? error.message : "Erro desconhecido" }
            : item,
        ),
      );
    }
  }

  function readPlayerDebug(video: HTMLVideoElement, loadedMetadataAt?: string | null) {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const progress = duration ? currentTime / duration : null;
    setPlayerDebug((current) => ({
      ...current,
      source: videoUrl,
      currentSrc: video.currentSrc,
      duration,
      currentTime,
      progress,
      playbackRate: video.playbackRate,
      metadataLoaded: Boolean(duration),
      loadedMetadataAt: loadedMetadataAt ?? current.loadedMetadataAt,
      ctaThresholdSeconds: duration ? duration * ctaViewThreshold : null,
    }));
    return { duration, currentTime, progress };
  }

  function milestoneMetadata(video: HTMLVideoElement, threshold: number, progress: number) {
    const duration = video.duration;
    const currentTime = video.currentTime;
    const thresholdSeconds = duration * threshold;
    const reachedViaSeek = maxSeekForwardToRef.current >= thresholdSeconds && currentTime >= thresholdSeconds;
    return {
      progress,
      progress_ratio: Number((currentTime / duration).toFixed(4)),
      current_time_seconds: Number(currentTime.toFixed(3)),
      duration_seconds: Number(duration.toFixed(3)),
      threshold_seconds: Number(thresholdSeconds.toFixed(3)),
      playback_rate: video.playbackRate,
      video_url: video.currentSrc || videoUrl,
      reached_via_seek: reachedViaSeek,
    };
  }

  function onTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const { duration, currentTime, progress } = readPlayerDebug(video);
    lastTimeRef.current = currentTime;
    if (!duration || progress === null) return;

    for (const milestone of progressMilestones) {
      const thresholdSeconds = duration * milestone.threshold;
      if (currentTime >= thresholdSeconds && progress >= milestone.threshold) {
        void track(milestone.eventType, milestoneMetadata(video, milestone.threshold, milestone.progress));
      }
    }

    if (currentTime >= duration * ctaViewThreshold && progress >= ctaViewThreshold) {
      if (!ctaVisible) {
        setCtaVisible(true);
        void track("VSL_CTA_VIEW", {
          ...milestoneMetadata(video, ctaViewThreshold, 90),
          cta_threshold: "90_percent",
          reason: "video_progress",
        });
      }
    }
  }

  function onLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    readPlayerDebug(event.currentTarget, new Date().toISOString());
  }

  function onSeeking(event: SyntheticEvent<HTMLVideoElement>) {
    seekStartRef.current = lastTimeRef.current || event.currentTarget.currentTime;
  }

  function onSeeked(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const from = seekStartRef.current ?? lastTimeRef.current;
    const to = video.currentTime;
    const forward = to > from + 1;
    if (forward) maxSeekForwardToRef.current = Math.max(maxSeekForwardToRef.current, to);
    setPlayerDebug((current) => ({
      ...current,
      lastSeek: { from, to, at: new Date().toISOString(), forward },
    }));
    readPlayerDebug(video);
    seekStartRef.current = null;
  }

  function goToDestination() {
    void track("VSL_CTA_CLICK", { clicked_at: new Date().toISOString() });
    const destination = new URL("/norwyn-lab/funnel-test/destination", window.location.origin);
    for (const [key, value] of trackingParams.entries()) destination.searchParams.set(key, value);
    destination.searchParams.set("funnel_session_id", sessionId);
    window.setTimeout(() => {
      window.location.href = destination.toString();
    }, 250);
  }

  function simulateLandingCtaView() {
    setCtaVisible(true);
    void track("CTA_VIEW", { reason: "landing_test_manual", cta_surface: "funnel_lab", checkout_blocked: true });
  }

  function simulateLandingCtaClick() {
    void track("CTA_CLICK", { reason: "landing_test_manual", cta_surface: "funnel_lab", checkout_blocked: true });
    void track("CHECKOUT_REDIRECT", { reason: "landing_test_manual", checkout_url: "READ_ONLY_NOT_OPENED", checkout_blocked: true });
  }

  function startNewSession() {
    const id = createSessionId();
    window.localStorage.setItem("norwyn_funnel_lab_session_id", id);
    sentKeys.current.clear();
    maxSeekForwardToRef.current = 0;
    seekStartRef.current = null;
    lastTimeRef.current = 0;
    setSessionId(id);
    setSentEvents([]);
    setStoredEvents([]);
    setCtaVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      readPlayerDebug(videoRef.current);
    }
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const landingKey = search.get("landing_key");
    if (landingKey && landingOptions.some((landing) => landing.key === landingKey)) setSelectedLandingKey(landingKey);
    const id = getSessionId(search.get("new_session") === "1");
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void track("LANDING_VIEW", { loaded_at: new Date().toISOString() });
    void refreshEvents(sessionId);
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#123c3f]">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border-2 border-red-300 bg-red-50 p-4 text-red-900">
          <div className="flex items-center gap-2 font-black uppercase">
            <AlertTriangle className="h-5 w-5" />
            AMBIENTE DE TESTE - NAO UTILIZAR PARA CAMPANHA OU VENDA
          </div>
          <p className="mt-2 text-sm">
            Norwyn Funnel Lab - TESTE. Esta pagina nao e uma landing oficial da Juliana, nao possui checkout real e grava apenas eventos com environment=TEST.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-[#e4d6c4] bg-white p-5">
            <p className="text-xs font-black uppercase text-[#9b5d49]">Norwyn Funnel Lab</p>
            <h1 className="mt-2 text-3xl font-semibold">Landing + VSL de teste de tracking</h1>
            <p className="mt-3 text-sm leading-6 text-[#123c3f]/75">
              Use esta pagina para validar URL rastreavel, sessao, eventos de VSL, CTA e preservacao de parametros ate uma pagina final segura.
            </p>

            <div className="mt-5 overflow-hidden rounded-md border border-[#e4d6c4] bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full"
                controls
                muted
                playsInline
                preload="metadata"
                src={videoUrl}
                onLoadedMetadata={onLoadedMetadata}
                onDurationChange={onLoadedMetadata}
                onRateChange={(event) => readPlayerDebug(event.currentTarget)}
                onSeeking={onSeeking}
                onSeeked={onSeeked}
                onPlay={(event) => {
                  readPlayerDebug(event.currentTarget);
                  void track("VSL_PLAY", {
                    player: "html5_video",
                    video_url: event.currentTarget.currentSrc || videoUrl,
                    duration_seconds: Number.isFinite(event.currentTarget.duration) ? Number(event.currentTarget.duration.toFixed(3)) : null,
                    playback_rate: event.currentTarget.playbackRate,
                    metadata_loaded: Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0,
                  });
                }}
                onTimeUpdate={onTimeUpdate}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCtaVisible(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e4d6c4] px-4 text-sm font-bold"
              >
                <PlayCircle className="h-4 w-4" />
                Exibir CTA manualmente
              </button>
              <button
                type="button"
                onClick={goToDestination}
                disabled={!ctaVisible}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#123c3f] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ExternalLink className="h-4 w-4" />
                CTA de teste
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#123c3f]/60">
              O CTA TEST fica disponivel automaticamente em 90% do video real carregado ou manualmente para teste tecnico. Ele abre somente uma pagina final de teste.
            </p>
          </section>

          <aside className="rounded-md border border-[#e4d6c4] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-[#9b5d49]">Debug seguro</p>
                <h2 className="mt-1 text-xl font-semibold">Sessao e eventos</h2>
              </div>
              <button type="button" onClick={() => void refreshEvents()} className="rounded-md border border-[#e4d6c4] p-2" title="Atualizar eventos">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-md bg-[#f7f3ec] p-3">
              <p className="text-[10px] font-black uppercase text-[#9b5d49]">Funnel session id</p>
              <p className="mt-1 break-all font-mono text-xs">{sessionId || "criando..."}</p>
              <button type="button" onClick={startNewSession} className="mt-3 rounded-md border border-[#e4d6c4] bg-white px-3 py-2 text-xs font-black uppercase">
                Nova sessao TEST
              </button>
            </div>

            <div className="mt-4 rounded-md bg-[#f7f3ec] p-3">
              <p className="text-[10px] font-black uppercase text-[#9b5d49]">Landing TEST</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {landingOptions.map((landing) => (
                  <button
                    key={landing.key}
                    type="button"
                    onClick={() => setSelectedLandingKey(landing.key)}
                    className={`rounded-md border px-3 py-2 text-xs font-black uppercase ${selectedLanding.key === landing.key ? "border-[#123c3f] bg-[#123c3f] text-white" : "border-[#e4d6c4] bg-white text-[#123c3f]"}`}
                  >
                    {landing.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[#123c3f]/70">{selectedLanding.url}</p>
              <p className="mt-2 break-all font-mono text-xs text-[#123c3f]/70">{landingTestUrl}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={simulateLandingCtaView} className="rounded-md border border-[#e4d6c4] bg-white px-3 py-2 text-xs font-black uppercase">
                  Simular CTA_VIEW
                </button>
                <button type="button" onClick={simulateLandingCtaClick} className="rounded-md border border-[#e4d6c4] bg-white px-3 py-2 text-xs font-black uppercase">
                  Simular CTA_CLICK + CHECKOUT_REDIRECT
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#123c3f]/60">
                Modo TEST/read-only: nao abre checkout real, nao altera V1/V5 e nao mistura com producao.
              </p>
            </div>

            <div className="mt-4 rounded-md bg-[#f7f3ec] p-3">
              <p className="text-[10px] font-black uppercase text-[#9b5d49]">Player</p>
              <div className="mt-2 grid gap-1 font-mono text-xs text-[#123c3f]/70">
                <p className="break-all">Source: {playerDebug.source}</p>
                <p className="break-all">currentSrc: {playerDebug.currentSrc || "aguardando metadata"}</p>
                <p>Duration: {formatSeconds(playerDebug.duration)}</p>
                <p>Current: {formatSeconds(playerDebug.currentTime)}</p>
                <p>Progress: {playerDebug.progress === null ? "N/A" : `${(playerDebug.progress * 100).toFixed(1)}%`}</p>
                <p>Playback rate: {playerDebug.playbackRate}x</p>
                <p>Metadata loaded: {playerDebug.metadataLoaded ? "sim" : "nao"}</p>
                <p>Loaded metadata at: {playerDebug.loadedMetadataAt ? new Date(playerDebug.loadedMetadataAt).toLocaleString("pt-BR") : "N/A"}</p>
                <p>CTA TEST: 90% / {formatSeconds(playerDebug.ctaThresholdSeconds)}</p>
                {playerDebug.lastSeek ? (
                  <p>
                    Last seek: {formatSeconds(playerDebug.lastSeek.from)} para {formatSeconds(playerDebug.lastSeek.to)} ({playerDebug.lastSeek.forward ? "forward" : "back/short"})
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-md bg-[#f7f3ec] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase text-[#9b5d49]">Tracking URL usada</p>
                <button type="button" onClick={() => navigator.clipboard?.writeText(trackingUrl)} className="rounded-md border border-[#e4d6c4] p-1" title="Copiar URL">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[#123c3f]/70">{trackingUrl}</p>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-[#9b5d49]">Status local de envio</p>
              <div className="mt-2 grid max-h-52 gap-2 overflow-auto">
                {sentEvents.length ? sentEvents.map((event) => (
                  <div key={`${event.event_type}-${event.timestamp}`} className="rounded-md border border-[#e4d6c4] p-2 text-xs">
                    <p className="flex items-center gap-2 font-bold">
                      {event.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : null}
                      {event.event_type} - {event.status}
                    </p>
                    <p className="mt-1 text-[#123c3f]/60">{event.timestamp}</p>
                    <p className="mt-1 text-[#123c3f]/60">{event.detail}</p>
                  </div>
                )) : <p className="text-sm text-[#123c3f]/60">Nenhum envio local ainda.</p>}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-[#9b5d49]">Eventos gravados</p>
              <div className="mt-2 grid max-h-64 gap-2 overflow-auto">
                {storedEvents.length ? storedEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-[#e4d6c4] p-2 text-xs">
                    <p className="font-bold">{event.event_type} - {event.environment.toUpperCase()}</p>
                    <p className="mt-1 text-[#123c3f]/60">{new Date(event.occurred_at).toLocaleString("pt-BR")}</p>
                    <p className="mt-1 text-[#123c3f]/60">
                      {event.utm_campaign ?? event.campaign_key ?? "sem campanha"} / {event.utm_content ?? event.creative_key ?? "sem criativo"}
                    </p>
                  </div>
                )) : <p className="text-sm text-[#123c3f]/60">Nenhum evento gravado para esta sessao.</p>}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

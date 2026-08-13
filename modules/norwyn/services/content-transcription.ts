type TranscriptSegment = {
  start_seconds: number | null;
  end_seconds: number | null;
  speaker: string | null;
  text: string;
};

type SourceChapter = {
  title: string;
  start_seconds: number | null;
  end_seconds: number | null;
};

export type TranscriptQuality = {
  status: "completed" | "partial" | "failed";
  reason: string;
  char_count: number;
  word_count: number;
  segment_count: number;
  duration_seconds: number | null;
  covered_duration_seconds: number | null;
  title_similarity: number;
  description_similarity: number;
  is_similar_to_title: boolean;
  is_similar_to_description: boolean;
  min_chars_required: number;
  min_words_required: number;
};

export type ContentTranscriptionResult = {
  success: boolean;
  language: string;
  full_text: string;
  segments: TranscriptSegment[];
  file_id: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  transcript_source: string;
  transcript_status: "completed" | "partial" | "failed" | "blocked" | "unsupported" | "missing";
  source_title: string | null;
  source_description: string | null;
  source_chapters: SourceChapter[];
  transcript_full_text: string;
  transcript_quality: TranscriptQuality | null;
  provider: "gemini";
  model: string;
  duration_ms: number;
  processing_metadata: Record<string, unknown>;
  error_message: string | null;
};

export type ContentSourceType = "google_drive" | "youtube" | "unsupported";

export type ContentSourceDetection = {
  type: ContentSourceType;
  label: "Google Drive" | "YouTube" | "Nao suportada";
  id: string | null;
  normalizedUrl: string;
  limitation: string | null;
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const FUTURE_TARGET_BYTES = 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
]);
const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "mp3", "m4a", "wav"]);
const DRIVE_ACCESS_MESSAGE =
  "Nao foi possivel acessar o video. No Google Drive, selecione Compartilhar -> Acesso geral -> Qualquer pessoa com o link -> Visualizador.";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function modelName() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function normalizeComparable(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFrom(value: unknown) {
  const normalized = normalizeComparable(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function wordCount(value: unknown) {
  return wordsFrom(value).length;
}

function jaccardSimilarity(a: unknown, b: unknown) {
  const left = new Set(wordsFrom(a));
  const right = new Set(wordsFrom(b));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((item) => {
    if (right.has(item)) intersection += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function textSimilarity(a: unknown, b: unknown) {
  const left = normalizeComparable(a);
  const right = normalizeComparable(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length >= 12 && right.length >= 12 && (left.includes(right) || right.includes(left))) return 0.92;
  return jaccardSimilarity(left, right);
}

function coveredDuration(segments: TranscriptSegment[]) {
  const starts = segments.map((segment) => segment.start_seconds).filter((value): value is number => Number.isFinite(value));
  const ends = segments.map((segment) => segment.end_seconds).filter((value): value is number => Number.isFinite(value));
  if (!starts.length || !ends.length) return null;
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  return maxEnd > minStart ? Math.round(maxEnd - minStart) : null;
}

function transcriptThresholds(durationSeconds: number | null) {
  if (!durationSeconds) return { minChars: 120, minWords: 24 };
  if (durationSeconds >= 600) return { minChars: 1000, minWords: 180 };
  if (durationSeconds >= 180) return { minChars: 450, minWords: 80 };
  if (durationSeconds >= 60) return { minChars: 200, minWords: 40 };
  return { minChars: 90, minWords: 18 };
}

function validateTranscriptQuality(input: {
  fullText: string;
  segments: TranscriptSegment[];
  durationSeconds: number | null;
  title: string | null;
  description: string | null;
}): TranscriptQuality {
  const fullText = text(input.fullText);
  const charCount = fullText.length;
  const countWords = wordCount(fullText);
  const segmentCount = input.segments.length;
  const covered = coveredDuration(input.segments);
  const titleSimilarity = textSimilarity(fullText, input.title);
  const descriptionSimilarity = textSimilarity(fullText, input.description);
  const thresholds = transcriptThresholds(input.durationSeconds);
  const chapterLike = /^\s*\d+[\).\s-]+/.test(fullText) && countWords <= 10;
  const similarToTitle = titleSimilarity >= 0.82 && countWords <= Math.max(wordCount(input.title) + 8, 14);
  const similarToDescription = descriptionSimilarity >= 0.88 && countWords <= Math.max(wordCount(input.description) + 12, 24);

  const base = {
    char_count: charCount,
    word_count: countWords,
    segment_count: segmentCount,
    duration_seconds: input.durationSeconds,
    covered_duration_seconds: covered,
    title_similarity: Number(titleSimilarity.toFixed(2)),
    description_similarity: Number(descriptionSimilarity.toFixed(2)),
    is_similar_to_title: similarToTitle,
    is_similar_to_description: similarToDescription,
    min_chars_required: thresholds.minChars,
    min_words_required: thresholds.minWords,
  };

  if (!fullText) {
    return { ...base, status: "failed", reason: "Transcricao vazia." };
  }
  if (chapterLike || similarToTitle || similarToDescription || countWords < 12 || charCount < 50) {
    return {
      ...base,
      status: "failed",
      reason: "Nao foi possivel obter a fala real do video. O texto retornado corresponde apenas ao titulo, capitulo ou metadados da midia.",
    };
  }
  if (countWords < thresholds.minWords || charCount < thresholds.minChars || segmentCount <= 1) {
    return {
      ...base,
      status: "partial",
      reason: "A transcricao recebida parece incompleta e nao representa todo o video.",
    };
  }
  if (input.durationSeconds && input.durationSeconds > 120 && covered && covered < input.durationSeconds * 0.3) {
    return {
      ...base,
      status: "partial",
      reason: "A duracao coberta pelos segmentos parece pequena em relacao ao video.",
    };
  }
  return { ...base, status: "completed", reason: "Transcricao validada como fala real suficiente para analise." };
}

function emptyTranscriptQuality(reason: string): TranscriptQuality {
  return {
    status: "failed",
    reason,
    char_count: 0,
    word_count: 0,
    segment_count: 0,
    duration_seconds: null,
    covered_duration_seconds: null,
    title_similarity: 0,
    description_similarity: 0,
    is_similar_to_title: false,
    is_similar_to_description: false,
    min_chars_required: 120,
    min_words_required: 24,
  };
}

export function extractYouTubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (!["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) return null;
    const watchId = url.searchParams.get("v");
    if (watchId) return watchId;
    const shorts = url.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts?.[1]) return shorts[1];
    const embed = url.pathname.match(/\/embed\/([^/?]+)/);
    return embed?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractGoogleDriveFileId(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.includes("drive.google.com") && !url.hostname.includes("docs.google.com")) return null;
    const idParam = url.searchParams.get("id");
    if (idParam) return idParam;
    const match = url.pathname.match(/\/(?:file\/d|open\/d)\/([^/]+)/);
    if (match?.[1]) return match[1];
    const foldersMatch = url.pathname.match(/\/d\/([^/]+)/);
    return foldersMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export function detectContentSource(value: string): ContentSourceDetection {
  const normalizedUrl = text(value);
  const youtubeId = extractYouTubeVideoId(normalizedUrl);
  if (youtubeId) {
    return {
      type: "youtube",
      label: "YouTube",
      id: youtubeId,
      normalizedUrl,
      limitation: "Nesta versao, links do YouTube precisam estar publicos. Videos privados ou nao listados nao sao suportados pela entrada direta da Gemini.",
    };
  }

  const driveId = extractGoogleDriveFileId(normalizedUrl);
  if (driveId) {
    return {
      type: "google_drive",
      label: "Google Drive",
      id: driveId,
      normalizedUrl,
      limitation: "Nesta versao HML, o processamento direto na Vercel fica limitado a 50 MB. Arquivos maiores exigem worker externo para download/upload seguro.",
    };
  }

  return {
    type: "unsupported",
    label: "Nao suportada",
    id: null,
    normalizedUrl,
    limitation: "Fonte nao suportada. Use um link publico do Google Drive ou YouTube.",
  };
}

function extensionFromName(fileName: string | null) {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function fileNameFromDisposition(value: string | null) {
  if (!value) return null;
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/"/g, ""));
  const match = value.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function validateMedia(fileName: string | null, mimeType: string | null, size: number) {
  const normalizedMime = text(mimeType).split(";")[0].toLowerCase();
  const ext = extensionFromName(fileName);
  const allowedMime = normalizedMime ? ALLOWED_MIME_TYPES.has(normalizedMime) : false;
  const allowedExt = ext ? ALLOWED_EXTENSIONS.has(ext) : false;
  if (size > MAX_FILE_BYTES) {
    throw new Error("Arquivo acima do limite operacional direto da Vercel neste MVP: use videos ou audios de ate 50 MB. Para 200 MB, 1 GB ou videos longos, sera necessario worker externo assincrono.");
  }
  if (!allowedMime && !allowedExt) {
    throw new Error("Formato nao suportado neste MVP. Use MP4, MOV, MP3, M4A ou WAV.");
  }
  return normalizedMime || (ext === "mov" ? "video/quicktime" : ext === "mp4" ? "video/mp4" : `audio/${ext}`);
}

async function downloadDriveFile(driveUrl: string) {
  const fileId = extractGoogleDriveFileId(driveUrl);
  if (!fileId) throw new Error("Link do Google Drive sem file_id reconhecivel.");

  const candidates = [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
  ];

  let lastError: Error | null = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`${DRIVE_ACCESS_MESSAGE} Codigo: ${response.status}.`);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) throw new Error(DRIVE_ACCESS_MESSAGE);
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength && contentLength > MAX_FILE_BYTES) {
        throw new Error("Arquivo acima do limite operacional direto da Vercel neste MVP: use videos ou audios de ate 50 MB. Para 200 MB, 1 GB ou videos longos, sera necessario worker externo assincrono.");
      }
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer.byteLength) throw new Error("O arquivo do Drive retornou vazio.");
      const fileName = fileNameFromDisposition(response.headers.get("content-disposition")) ?? `google-drive-${fileId}`;
      const mimeType = validateMedia(fileName, contentType, arrayBuffer.byteLength);
      return {
        fileId,
        fileName,
        mimeType,
        size: arrayBuffer.byteLength,
        bytes: arrayBuffer,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha ao acessar arquivo do Drive.");
    }
  }
  throw lastError ?? new Error(DRIVE_ACCESS_MESSAGE);
}

async function startGeminiUpload(apiKey: string, fileName: string, mimeType: string, size: number) {
  const response = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(size),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    },
    body: JSON.stringify({ file: { display_name: fileName } }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Falha ao iniciar upload no Gemini Files API. ${details.slice(0, 300)}`);
  }

  const uploadUrl = response.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini Files API nao retornou URL de upload.");
  return uploadUrl;
}

async function finalizeGeminiUpload(uploadUrl: string, bytes: ArrayBuffer, mimeType: string) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Blob([bytes], { type: mimeType }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Falha ao enviar arquivo para Gemini. ${JSON.stringify(json).slice(0, 300)}`);
  return json.file as { name: string; uri: string; mimeType?: string; mime_type?: string; state?: string };
}

async function waitForGeminiFile(apiKey: string, fileName: string) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Falha ao consultar arquivo no Gemini. ${JSON.stringify(json).slice(0, 300)}`);
    if (json.state === "ACTIVE") return json;
    if (json.state === "FAILED") throw new Error("Gemini nao conseguiu preparar o arquivo para transcricao.");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("Tempo limite aguardando o arquivo ficar disponivel no Gemini.");
}

async function deleteGeminiFile(apiKey: string, fileName: string | null) {
  if (!fileName) return;
  await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, { method: "DELETE" }).catch(() => null);
}

function parseJsonObject(raw: string) {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
  return JSON.parse(cleaned);
}

async function requestTranscription(
  apiKey: string,
  media: { uri: string; mimeType?: string; mime_type?: string },
  mimeType: string,
  sourceHint: "gemini_files_api" | "youtube_url",
) {
  const model = modelName();
  const prompt = `Transcreva integralmente este arquivo em portugues brasileiro.

Regras obrigatorias:
- Nao invente falas.
- Quando um trecho nao for compreensivel, escreva "[trecho inaudivel]".
- Nao identifique a falante como Juliana sem evidencia suficiente.
- Separe metadados da fala real. Titulo, descricao e capitulos nao sao transcricao.
- Se a midia tiver titulo, descricao ou capitulos, preencha os campos proprios.
- full_text deve conter somente a fala real transcrita.
- Retorne somente JSON valido, sem markdown.
- Use segmentos com inicio e fim em segundos quando for possivel inferir.

Formato:
{
  "language": "pt-BR",
  "source_title": "Titulo da midia, quando disponivel",
  "source_description": "Descricao da midia, quando disponivel",
  "source_chapters": [
    {"title": "Capitulo", "start_seconds": 0, "end_seconds": null}
  ],
  "duration_seconds": null,
  "full_text": "Texto integral...",
  "segments": [
    {"start_seconds": 0, "end_seconds": 12, "speaker": null, "text": "..."}
  ]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              file_data: {
                mime_type: media.mimeType ?? media.mime_type ?? mimeType,
                file_uri: media.uri,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Falha na transcricao Gemini. ${JSON.stringify(json).slice(0, 300)}`);
  const output = (json.candidates?.[0]?.content?.parts ?? []).map((part: any) => part.text ?? "").join("\n").trim();
  if (!output) throw new Error("Gemini nao retornou texto de transcricao.");
  const parsed = parseJsonObject(output);
  const segments = Array.isArray(parsed.segments)
    ? parsed.segments
        .map((item: any) => ({
          start_seconds: Number.isFinite(Number(item.start_seconds)) ? Number(item.start_seconds) : null,
          end_seconds: Number.isFinite(Number(item.end_seconds)) ? Number(item.end_seconds) : null,
          speaker: text(item.speaker) || null,
          text: text(item.text),
        }))
        .filter((item: TranscriptSegment) => item.text)
    : [];
  return {
    model,
    usage: json.usageMetadata ?? {},
    source_hint: sourceHint,
    language: text(parsed.language) || "pt-BR",
    source_title: text(parsed.source_title) || null,
    source_description: text(parsed.source_description) || null,
    source_chapters: Array.isArray(parsed.source_chapters)
      ? parsed.source_chapters
          .map((item: any) => ({
            title: text(item.title),
            start_seconds: Number.isFinite(Number(item.start_seconds)) ? Number(item.start_seconds) : null,
            end_seconds: Number.isFinite(Number(item.end_seconds)) ? Number(item.end_seconds) : null,
          }))
          .filter((item: SourceChapter) => item.title)
      : [],
    duration_seconds: Number.isFinite(Number(parsed.duration_seconds)) ? Number(parsed.duration_seconds) : null,
    full_text: text(parsed.full_text),
    segments,
  };
}

async function transcribeYouTubeMedia(youtubeUrl: string): Promise<ContentTranscriptionResult> {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = modelName();
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!apiKey) {
    return {
      success: false,
      language: "pt-BR",
      full_text: "",
      segments: [],
      file_id: videoId,
      file_name: null,
      file_type: "youtube",
      file_size: null,
      duration_seconds: null,
      transcript_source: "not_configured",
      transcript_status: "missing",
      source_title: null,
      source_description: null,
      source_chapters: [],
      transcript_full_text: "",
      transcript_quality: emptyTranscriptQuality("GEMINI_API_KEY ausente."),
      provider: "gemini",
      model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: { reason: "GEMINI_API_KEY ausente", source_type: "youtube" },
      error_message: "GEMINI_API_KEY nao configurada.",
    };
  }

  try {
    const transcription = await requestTranscription(apiKey, { uri: youtubeUrl, mimeType: "video/mp4" }, "video/mp4", "youtube_url");
    const fullText = text(transcription.full_text);
    if (!fullText) throw new Error("Transcricao retornou vazia.");
    const durationSeconds = transcription.duration_seconds;
    const quality = validateTranscriptQuality({
      fullText,
      segments: transcription.segments,
      durationSeconds,
      title: transcription.source_title,
      description: transcription.source_description,
    });
    const isComplete = quality.status === "completed";

    return {
      success: isComplete,
      language: transcription.language,
      full_text: isComplete ? fullText : "",
      segments: transcription.segments,
      file_id: videoId,
      file_name: videoId ? `youtube-${videoId}` : null,
      file_type: "youtube",
      file_size: null,
      duration_seconds: durationSeconds,
      transcript_source: "youtube_url",
      transcript_status: quality.status,
      source_title: transcription.source_title,
      source_description: transcription.source_description,
      source_chapters: transcription.source_chapters,
      transcript_full_text: fullText,
      transcript_quality: quality,
      provider: "gemini",
      model: transcription.model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: {
        source_type: "youtube",
        youtube_id: videoId,
        access: "public_url_required",
        usage: transcription.usage,
        transcript_quality: quality,
      },
      error_message: isComplete ? null : quality.reason,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao transcrever YouTube.";
    return {
      success: false,
      language: "pt-BR",
      full_text: "",
      segments: [],
      file_id: videoId,
      file_name: videoId ? `youtube-${videoId}` : null,
      file_type: "youtube",
      file_size: null,
      duration_seconds: null,
      transcript_source: "youtube_url",
      transcript_status: "failed",
      source_title: null,
      source_description: null,
      source_chapters: [],
      transcript_full_text: "",
      transcript_quality: emptyTranscriptQuality(message),
      provider: "gemini",
      model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: {
        source_type: "youtube",
        youtube_id: videoId,
        access: "public_url_required",
      },
      error_message: `${message} Verifique se o video esta publico e acessivel pela Gemini.`,
    };
  }
}

export async function transcribeDriveMedia(driveUrl: string): Promise<ContentTranscriptionResult> {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = modelName();
  if (!apiKey) {
    return {
      success: false,
      language: "pt-BR",
      full_text: "",
      segments: [],
      file_id: extractGoogleDriveFileId(driveUrl),
      file_name: null,
      file_type: null,
      file_size: null,
      duration_seconds: null,
      transcript_source: "not_configured",
      transcript_status: "missing",
      source_title: null,
      source_description: null,
      source_chapters: [],
      transcript_full_text: "",
      transcript_quality: emptyTranscriptQuality("GEMINI_API_KEY ausente."),
      provider: "gemini",
      model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: { reason: "GEMINI_API_KEY ausente" },
      error_message: "GEMINI_API_KEY nao configurada.",
    };
  }

  let uploadedFileName: string | null = null;
  try {
    const file = await downloadDriveFile(driveUrl);
    const uploadUrl = await startGeminiUpload(apiKey, file.fileName, file.mimeType, file.size);
    const uploaded = await finalizeGeminiUpload(uploadUrl, file.bytes, file.mimeType);
    uploadedFileName = uploaded.name;
    const activeFile = await waitForGeminiFile(apiKey, uploaded.name);
    const transcription = await requestTranscription(
      apiKey,
      { ...uploaded, ...activeFile },
      file.mimeType,
      "gemini_files_api",
    );
    const fullText = text(transcription.full_text);
    if (!fullText) throw new Error("Transcricao retornou vazia.");
    const durationSeconds = transcription.duration_seconds;
    const quality = validateTranscriptQuality({
      fullText,
      segments: transcription.segments,
      durationSeconds,
      title: transcription.source_title || file.fileName,
      description: transcription.source_description,
    });
    const isComplete = quality.status === "completed";

    return {
      success: isComplete,
      language: transcription.language,
      full_text: isComplete ? fullText : "",
      segments: transcription.segments,
      file_id: file.fileId,
      file_name: file.fileName,
      file_type: file.mimeType,
      file_size: file.size,
      duration_seconds: durationSeconds,
      transcript_source: "gemini_files_api",
      transcript_status: quality.status,
      source_title: transcription.source_title || file.fileName,
      source_description: transcription.source_description,
      source_chapters: transcription.source_chapters,
      transcript_full_text: fullText,
      transcript_quality: quality,
      provider: "gemini",
      model: transcription.model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: {
        max_file_mb: 50,
        future_target_mb: Math.round(FUTURE_TARGET_BYTES / 1024 / 1024),
        recommended_max_minutes: 5,
        usage: transcription.usage,
        drive_access: "public_link",
        source_type: "google_drive",
        transcript_quality: quality,
      },
      error_message: isComplete ? null : quality.reason,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao transcrever arquivo.";
    const isAccess = message.includes("Google Drive") || message.includes("Acesso") || message.includes("acessar");
    return {
      success: false,
      language: "pt-BR",
      full_text: "",
      segments: [],
      file_id: extractGoogleDriveFileId(driveUrl),
      file_name: null,
      file_type: null,
      file_size: null,
      duration_seconds: null,
      transcript_source: "gemini_files_api",
      transcript_status: isAccess ? "blocked" : "failed",
      source_title: null,
      source_description: null,
      source_chapters: [],
      transcript_full_text: "",
      transcript_quality: emptyTranscriptQuality(message),
      provider: "gemini",
      model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: { max_file_mb: 50, future_target_mb: Math.round(FUTURE_TARGET_BYTES / 1024 / 1024), recommended_max_minutes: 5, source_type: "google_drive" },
      error_message: message,
    };
  } finally {
    await deleteGeminiFile(apiKey, uploadedFileName);
  }
}

export async function transcribeMediaFromUrl(sourceUrl: string): Promise<ContentTranscriptionResult> {
  const source = detectContentSource(sourceUrl);
  if (source.type === "youtube") return transcribeYouTubeMedia(source.normalizedUrl);
  if (source.type === "google_drive") return transcribeDriveMedia(source.normalizedUrl);
  return {
    success: false,
    language: "pt-BR",
    full_text: "",
    segments: [],
    file_id: null,
    file_name: null,
    file_type: null,
    file_size: null,
    duration_seconds: null,
    transcript_source: "unsupported",
    transcript_status: "unsupported",
    source_title: null,
    source_description: null,
    source_chapters: [],
    transcript_full_text: "",
    transcript_quality: emptyTranscriptQuality(source.limitation ?? "Fonte nao suportada."),
    provider: "gemini",
    model: modelName(),
    duration_ms: 0,
    processing_metadata: { source_type: "unsupported" },
    error_message: source.limitation ?? "Fonte nao suportada.",
  };
}

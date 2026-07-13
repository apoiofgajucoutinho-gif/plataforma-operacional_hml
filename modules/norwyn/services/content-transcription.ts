type TranscriptSegment = {
  start_seconds: number | null;
  end_seconds: number | null;
  speaker: string | null;
  text: string;
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
  transcript_status: "completed" | "failed" | "blocked" | "unsupported" | "missing";
  provider: "gemini";
  model: string;
  duration_ms: number;
  processing_metadata: Record<string, unknown>;
  error_message: string | null;
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
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
    throw new Error("Arquivo acima do limite do MVP: envie videos ou audios de ate 50 MB e, idealmente, ate 5 minutos.");
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
        throw new Error("Arquivo acima do limite do MVP: envie videos ou audios de ate 50 MB e, idealmente, ate 5 minutos.");
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

async function requestTranscription(apiKey: string, geminiFile: { uri: string; mimeType?: string; mime_type?: string }, mimeType: string) {
  const model = modelName();
  const prompt = `Transcreva integralmente este arquivo em portugues brasileiro.

Regras obrigatorias:
- Nao invente falas.
- Quando um trecho nao for compreensivel, escreva "[trecho inaudivel]".
- Nao identifique a falante como Juliana sem evidencia suficiente.
- Retorne somente JSON valido, sem markdown.
- Use segmentos com inicio e fim em segundos quando for possivel inferir.

Formato:
{
  "language": "pt-BR",
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
                mime_type: geminiFile.mimeType ?? geminiFile.mime_type ?? mimeType,
                file_uri: geminiFile.uri,
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
    language: text(parsed.language) || "pt-BR",
    full_text: text(parsed.full_text),
    segments,
  };
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
    const transcription = await requestTranscription(apiKey, { ...uploaded, ...activeFile }, file.mimeType);
    const fullText = text(transcription.full_text);
    if (!fullText) throw new Error("Transcricao retornou vazia.");

    return {
      success: true,
      language: transcription.language,
      full_text: fullText,
      segments: transcription.segments,
      file_id: file.fileId,
      file_name: file.fileName,
      file_type: file.mimeType,
      file_size: file.size,
      duration_seconds: null,
      transcript_source: "gemini_files_api",
      transcript_status: "completed",
      provider: "gemini",
      model: transcription.model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: {
        max_file_mb: 50,
        recommended_max_minutes: 5,
        usage: transcription.usage,
        drive_access: "public_link",
      },
      error_message: null,
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
      provider: "gemini",
      model,
      duration_ms: Date.now() - startedAt,
      processing_metadata: { max_file_mb: 50, recommended_max_minutes: 5 },
      error_message: message,
    };
  } finally {
    await deleteGeminiFile(apiKey, uploadedFileName);
  }
}

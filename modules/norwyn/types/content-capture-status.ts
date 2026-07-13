export const CONTENT_CAPTURE_STATUS = {
  WAITING: "aguardando",
  ACCESSING_FILE: "acessando_arquivo",
  TRANSCRIBING: "transcrevendo",
  ANALYZING: "analisando",
  COMPLETED: "concluido",
  PARTIAL: "concluido_parcialmente",
  ERROR: "erro",
  LEGACY_PROCESSING: "processando",
} as const;

export type ContentCaptureStatus =
  (typeof CONTENT_CAPTURE_STATUS)[keyof typeof CONTENT_CAPTURE_STATUS];

export const CONTENT_CAPTURE_PROCESSING_STATUSES: ContentCaptureStatus[] = [
  CONTENT_CAPTURE_STATUS.ACCESSING_FILE,
  CONTENT_CAPTURE_STATUS.TRANSCRIBING,
  CONTENT_CAPTURE_STATUS.ANALYZING,
  CONTENT_CAPTURE_STATUS.LEGACY_PROCESSING,
];

export function isContentCaptureProcessingStatus(value: unknown) {
  return CONTENT_CAPTURE_PROCESSING_STATUSES.includes(value as ContentCaptureStatus);
}


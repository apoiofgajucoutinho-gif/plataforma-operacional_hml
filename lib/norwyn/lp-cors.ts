const exactOrigins = new Set([
  "https://v0-zumbidoju.vercel.app",
  "https://lp-ju.vercel.app",
  "https://imersaozumbido.fgajulianacoutinho.com.br",
  "https://plataf-op-hml.vercel.app",
]);

// Vercel preview generated for the authorized LP project under the owning team.
const authorizedPreviewOrigin = /^https:\/\/lp-[a-z0-9]{6,32}-apoio-fga-ju-coutinho-s-projects\.vercel\.app$/;

export function isAllowedNorwynLpOrigin(origin: string | null) {
  if (!origin) return false;
  return exactOrigins.has(origin) || authorizedPreviewOrigin.test(origin);
}

export function hasDisallowedNorwynLpOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && !isAllowedNorwynLpOrigin(origin));
}

export function norwynLpCorsHeaders(request: Request, methods: readonly string[]): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!isAllowedNorwynLpOrigin(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

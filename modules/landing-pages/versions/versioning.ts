export function incrementLandingVersion(current: string) {
  const match = current.match(/^v(\d+)\.(\d+)$/i);
  if (!match) return "v0.1";
  return "v" + Number(match[1]) + "." + (Number(match[2]) + 1);
}

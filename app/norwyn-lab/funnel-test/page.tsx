import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FunnelTestClient } from "./FunnelTestClient";

function isAllowedHost(host: string) {
  return (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("plataf-op-hml.vercel.app") ||
    process.env.VERCEL_ENV !== "production"
  );
}

export default async function NorwynFunnelLabPage() {
  const host = (await headers()).get("host") ?? "";
  if (!isAllowedHost(host)) notFound();

  return <FunnelTestClient />;
}

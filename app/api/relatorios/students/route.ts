import { NextResponse } from "next/server";
import { assertRelatoriosWriteAccess } from "@/modules/relatorios/services/relatorios-server";

export async function GET(request: Request) {
  try {
    const auth = await assertRelatoriosWriteAccess();
    const url = new URL(request.url);
    const ids = url.searchParams.getAll("id").filter(Boolean).slice(0, 20);
    const queryText = (url.searchParams.get("q") ?? "").replace(/[,%().]/g, " ").trim().slice(0, 120);
    let query = auth.dataClient
      .from("norwyn_customer_student_360")
      .select("customer_id,display_name,email")
      .eq("tenant_id", auth.tenantId)
      .limit(20);
    if (ids.length) query = query.in("customer_id", ids);
    else if (queryText.length >= 2) query = query.or(`display_name.ilike.%${queryText}%,email.ilike.%${queryText}%`);
    else return NextResponse.json({ data: [] });
    const { data, error } = await query.order("display_name", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data: (data ?? []).map((student) => ({ customer_id: student.customer_id, name: student.display_name, email: student.email })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel buscar alunos." }, { status: 400 });
  }
}

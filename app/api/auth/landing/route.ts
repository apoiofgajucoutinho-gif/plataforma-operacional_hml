import { NextResponse } from "next/server";
import { getLandingPathForUser } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ path: "/login" });
  }

  return NextResponse.json({ path: await getLandingPathForUser(user.id) });
}

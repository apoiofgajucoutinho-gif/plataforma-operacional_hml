import { redirect } from "next/navigation";
import { getLandingPathForUser } from "@/lib/auth/access";
import { isLocalAuthBypassEnabled } from "@/lib/auth/local-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isLocalAuthBypassEnabled()) {
      redirect("/norwyn");
    }

    redirect("/login");
  }

  redirect(await getLandingPathForUser(user.id));
}

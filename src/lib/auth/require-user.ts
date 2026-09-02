import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireEventManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return user;
}

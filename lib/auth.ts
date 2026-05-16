import { createClient } from "./supabase/server";

/**
 * Returns the currently authenticated user's id, or throws if not authenticated.
 * Use in server components and API routes after middleware has run.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

import { supabase } from "./supabase.js";

export async function requireAuth(redirectTo = "/mitglieder/login") {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = redirectTo;
    return null;
  }

  return session;
}

export async function requireAdmin(redirectTo = "/mitglieder/dashboard") {
  const session = await requireAuth();
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profile?.role !== "admin") {
    window.location.href = redirectTo;
    return null;
  }

  return { session, role: profile.role };
}

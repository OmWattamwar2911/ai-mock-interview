import { auth } from "@/auth";
import { jsonError } from "@/lib/http";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: jsonError(401, "UNAUTHORIZED", "Sign in to continue"), user: null };
  }
  return { error: null, user: session.user };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user?.role !== "ADMIN") {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required"), user: null };
  }
  return result;
}

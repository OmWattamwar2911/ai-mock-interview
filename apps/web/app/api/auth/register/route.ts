import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@rehearse/shared";
import { jsonError, jsonOk } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req.headers, "auth"), 8, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Too many registration attempts");
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Name, a valid email, and an 8+ character password are required");
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return jsonError(409, "CONFLICT", "An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });
  await writeAudit(user.id, "auth.register", { email });
  return jsonOk({ user });
}

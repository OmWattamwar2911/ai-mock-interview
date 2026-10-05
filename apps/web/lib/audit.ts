import { prisma } from "@/lib/prisma";

export async function writeAudit(userId: string | null, action: string, meta?: unknown) {
  await prisma.auditLog.create({
    data: { userId, action, meta: meta === undefined ? undefined : (meta as object) },
  });
}

import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const { error, user } = await requireUser();
  if (error || !user) return error!;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: any = { userId: user.id };
    if (type) {
      where.type = type.toUpperCase();
    }

    const items = await prisma.analyzerResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({ items });
  } catch (err: any) {
    console.error("[analyzer/history] Error:", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to load analysis history");
  }
}

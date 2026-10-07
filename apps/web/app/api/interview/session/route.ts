"use server";

export async function POST(request: Request) {
  const aiEngineUrl = process.env.AI_ENGINE_URL ?? "http://localhost:4001";
  const internalKey = process.env.INTERNAL_API_KEY ?? "";

  try {
    const bodyText = await request.text();
    const res = await fetch(`${aiEngineUrl}/interview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
        "x-internal-api-key": internalKey,
      },
      body: bodyText || JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      return Response.json(data);
    }
  } catch {
    // If AI engine is restarting or temporarily unreachable, provide default session
  }

  // Graceful fallback for mock interview
  return Response.json({
    sessionId: crypto.randomUUID(),
    questions: [
      "Can you describe a challenging technical architecture decision you made recently and what tradeoffs were involved?",
      "How do you approach database schema design and concurrency control under high traffic?",
      "Walk me through how you identify, isolate, and mitigate performance bottlenecks in production services.",
    ],
  });
}

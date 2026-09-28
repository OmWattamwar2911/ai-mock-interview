import Fastify from "fastify";
import { healthResponseSchema, apiError } from "@rehearse/shared";

const PORT = Number(process.env.PORT ?? 4002);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") {
    return;
  }
  const key = request.headers["x-internal-key"];
  if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
    return reply.status(401).send(apiError("UNAUTHORIZED", "Invalid internal key"));
  }
});

app.get("/health", async () => {
  return healthResponseSchema.parse({ status: "ok", service: "compiler" });
});

await app.listen({ port: PORT, host: "0.0.0.0" });

import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { prisma } from "./prisma";

async function runRouteTests() {
  console.log("Running /api/skill-gap Route integration tests...");

  // Setup: Use demo candidate user
  const user = await prisma.user.findUnique({
    where: { email: "demo@rehearse.local" },
    include: {
      resumes: true,
      jobDescs: true,
    },
  });

  if (!user || user.resumes.length === 0 || user.jobDescs.length === 0) {
    throw new Error("Test setup failed: demo user must have resume and JD seeded");
  }

  const resume = user.resumes[0];
  const jd = user.jobDescs[0];

  // Generate valid NextAuth JWT session cookie
  const secret = process.env.AUTH_SECRET || "replace-with-32-plus-char-secret";
  const sessionToken = await encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    salt: "authjs.session-token",
  });
  const authCookie = `authjs.session-token=${sessionToken}`;

  // 1. Unauthenticated access: POST with no cookie -> redirected (302/307) or 401
  {
    const res = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resumeId: resume.id, jdId: jd.id }),
      redirect: "manual",
    });
    assert.ok(
      [302, 307, 401].includes(res.status),
      `Expected redirect (302/307) or 401 for unauthenticated request, got ${res.status}`,
    );
    console.log(`  ✓ Unauthenticated access rejected with HTTP ${res.status}.`);
  }

  // 2. Authenticated: Invalid payload (empty resumeId) -> 400
  {
    const badReqRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({ resumeId: "" }),
      redirect: "manual",
    });
    assert.equal(badReqRes.status, 400, `Expected 400 on empty resumeId, got ${badReqRes.status}`);
    const badData = (await badReqRes.json()) as any;
    assert.ok(badData.error?.message, "Expected validation error message on 400");
    console.log("  ✓ Invalid payload returns 400 with clear validation message.");
  }

  // 3. Authenticated: Nonexistent resume -> 404
  {
    const notFoundRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({ resumeId: "cmv_nonexistent_12345", jdId: jd.id }),
      redirect: "manual",
    });
    assert.equal(notFoundRes.status, 404, "Expected 404 on nonexistent resume");
    console.log("  ✓ Nonexistent resume/JD returns 404.");
  }

  // 4. Authenticated: Valid request returns 200 with both skillGap property and root properties
  {
    const validRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({ resumeId: resume.id, jdId: jd.id, recalculate: true }),
      redirect: "manual",
    });
    assert.equal(validRes.status, 200, "Expected 200 on valid request");
    const data = (await validRes.json()) as any;
    assert.ok(data.skillGap, "Response must include skillGap property");
    assert.ok(Array.isArray(data.matched), "Response must include matched array");
    assert.ok(Array.isArray(data.missing), "Response must include missing array");
    assert.ok(typeof data.matchScore === "number", "Response must include matchScore");
    assert.ok(typeof data.narrative === "string", "Response must include narrative");
    assert.ok(Array.isArray(data.extraSkills), "Response must include extraSkills array");
    console.log(
      `  ✓ Valid request returns 200 (matchScore: ${data.matchScore}%, matched: ${data.matched.length}, missing: ${data.missing.length}).`,
    );
  }

  // 5. Cache idempotency: second call returns fast from cache
  {
    const startCached = Date.now();
    const cachedRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({ resumeId: resume.id, jdId: jd.id, recalculate: false }),
      redirect: "manual",
    });
    const cachedElapsed = Date.now() - startCached;
    assert.equal(cachedRes.status, 200);
    assert.ok(cachedElapsed < 500, `Cached call should return fast (<500ms), took ${cachedElapsed}ms`);
    console.log(`  ✓ Idempotent cache returns result in ${cachedElapsed}ms.`);
  }

  // 6. Custom overridden skills with recalculate flag
  {
    const overrideRes = await fetch("http://localhost:3000/api/skill-gap", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        resumeId: resume.id,
        jdId: jd.id,
        recalculate: true,
        resumeSkills: ["Rust", "Solidity"],
        requiredSkills: ["Rust"],
        preferredSkills: [],
      }),
      redirect: "manual",
    });
    assert.equal(overrideRes.status, 200);
    const overrideData = (await overrideRes.json()) as any;
    assert.deepEqual(overrideData.matched, ["Rust"]);
    assert.equal(overrideData.matchScore, 100);
    console.log("  ✓ Custom overridden skills with recalculate flag are respected.");
  }

  console.log("\nAll /api/skill-gap route integration tests passed successfully!\n");
}

runRouteTests()
  .catch((err) => {
    console.error("Route tests failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

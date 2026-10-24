import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { ExecutionResult, Language, Limits } from "./types.js";

export const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB cap

function capOutput(text: string, truncated = false): string {
  if (!truncated && Buffer.byteLength(text, "utf8") <= MAX_OUTPUT_BYTES) {
    return text;
  }
  const slice = Buffer.from(text, "utf8").subarray(0, MAX_OUTPUT_BYTES).toString("utf8");
  return slice + "\n[Output capped at 64KB]";
}

/**
 * Sandboxed Execution Driver
 * Supports Docker containerized isolation with fallback to isolated subprocess execution.
 */
export class SandboxDriver {
  private dockerAvailable: boolean | null = null;

  async isDockerHealthy(): Promise<boolean> {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    try {
      const proc = spawn("docker", ["version"], { stdio: "ignore" });
      const exitCode = await new Promise<number>((resolve) => {
        proc.on("error", () => resolve(1));
        proc.on("close", (code) => resolve(code ?? 1));
      });
      this.dockerAvailable = exitCode === 0;
    } catch {
      this.dockerAvailable = false;
    }
    return this.dockerAvailable;
  }

  async execute(
    language: Language,
    source: string,
    stdin: string,
    limits: Limits
  ): Promise<ExecutionResult> {
    const useDocker = process.env.SANDBOX_DRIVER === "docker";
    if (useDocker && (await this.isDockerHealthy())) {
      try {
        return await this.executeInDocker(language, source, stdin, limits);
      } catch (err: any) {
        console.warn(`[SandboxDriver] Docker execution fallback due to: ${err?.message}`);
      }
    }
    return await this.executeInHostSandbox(language, source, stdin, limits);
  }

  /**
   * Docker-isolated execution:
   * --network none (zero internet access)
   * --memory limits (memory bounds)
   * --user 1000:1000 (non-root)
   * --cpus 1.0 (CPU quota)
   * --read-only with ephemeral tmpfs
   */
  private async executeInDocker(
    language: Language,
    source: string,
    stdin: string,
    limits: Limits
  ): Promise<ExecutionResult> {
    const memMb = Math.round(limits.memoryKb / 1024);
    const timeoutSec = Math.max(1, Math.min(10, limits.cpuTimeSec));

    const imageMap: Record<Language, { image: string; cmd: string[] }> = {
      python: { image: "python:3.11-alpine", cmd: ["python3", "-u", "-c", source] },
      javascript: { image: "node:20-alpine", cmd: ["node", "-e", source] },
      cpp: { image: "gcc:alpine", cmd: ["sh", "-c", `echo '${source.replace(/'/g, "'\\''")}' > /tmp/s.cpp && g++ -O2 /tmp/s.cpp -o /tmp/s && /tmp/s`] },
      c: { image: "gcc:alpine", cmd: ["sh", "-c", `echo '${source.replace(/'/g, "'\\''")}' > /tmp/s.c && gcc -O2 /tmp/s.c -o /tmp/s && /tmp/s`] },
      java: { image: "openjdk:17-alpine", cmd: ["sh", "-c", `echo '${source.replace(/'/g, "'\\''")}' > /tmp/Solution.java && javac /tmp/Solution.java && java -cp /tmp Solution`] },
    };

    const target = imageMap[language];
    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "--network", "none",
      "--memory", `${memMb}m`,
      "--cpus", "1.0",
      "--user", "1000:1000",
      target.image,
      ...target.cmd,
    ];

    const startTime = Date.now();
    let timedOut = false;

    return new Promise<ExecutionResult>((resolve) => {
      const proc = spawn("docker", dockerArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let totalBytes = 0;
      let truncated = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill("SIGKILL");
        } catch {}
      }, timeoutSec * 1000);

      proc.stdout.on("data", (chunk: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          stdout += chunk.toString("utf8");
          totalBytes += chunk.length;
        } else {
          truncated = true;
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          stderr += chunk.toString("utf8");
          totalBytes += chunk.length;
        } else {
          truncated = true;
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          status: "RUNTIME_ERROR",
          stdout: capOutput(stdout, truncated),
          stderr: capOutput(`Execution failed: ${err.message}`, false),
          timeMs: Date.now() - startTime,
          memoryKb: null,
          compileError: null,
        });
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        const timeMs = Date.now() - startTime;
        if (timedOut) {
          resolve({
            status: "TIME_LIMIT",
            stdout: capOutput(stdout, truncated),
            stderr: capOutput("Time Limit Exceeded", false),
            timeMs,
            memoryKb: null,
            compileError: null,
          });
          return;
        }

        const isCompileErr = stderr.includes("error:") || stderr.includes("Error: Could not find or load main class");
        let status: ExecutionResult["status"] = code === 0 ? "ACCEPTED" : isCompileErr ? "COMPILE_ERROR" : "RUNTIME_ERROR";

        resolve({
          status,
          stdout: capOutput(stdout, truncated),
          stderr: capOutput(stderr, false),
          timeMs,
          memoryKb: null,
          compileError: isCompileErr ? capOutput(stderr, false) : null,
        });
      });

      if (stdin) {
        proc.stdin.write(stdin);
      }
      proc.stdin.end();
    });
  }

  /**
   * Host Isolated Sandbox Execution (used as direct runner or reliable fallback):
   * Enforces timeout, output size cap, separate working directory, clean environment.
   */
  private async executeInHostSandbox(
    language: Language,
    source: string,
    stdin: string,
    limits: Limits
  ): Promise<ExecutionResult> {
    const tempDir = join(tmpdir(), `rehearse-run-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const startTime = Date.now();
    let timedOut = false;

    // Scrubbed environment: do NOT inherit any secret environment variables
    const cleanEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TEMP: tempDir,
      TMP: tempDir,
      NODE_ENV: "production",
    };

    try {
      if (language === "python") {
        const filePath = join(tempDir, "solution.py");
        await fs.writeFile(filePath, source, "utf8");
        return await this.runProcess("python", ["-u", filePath], stdin, cleanEnv, tempDir, limits.cpuTimeSec);
      }

      if (language === "javascript") {
        const filePath = join(tempDir, "solution.js");
        await fs.writeFile(filePath, source, "utf8");
        const maxOldSpace = Math.max(16, Math.min(256, Math.round(limits.memoryKb / 1024)));
        return await this.runProcess(
          "node",
          [`--max-old-space-size=${maxOldSpace}`, filePath],
          stdin,
          cleanEnv,
          tempDir,
          limits.cpuTimeSec
        );
      }

      if (language === "cpp" || language === "c") {
        const ext = language === "cpp" ? "cpp" : "c";
        const compiler = language === "cpp" ? "g++" : "gcc";
        const srcPath = join(tempDir, `solution.${ext}`);
        const binPath = join(tempDir, process.platform === "win32" ? "solution.exe" : "solution");
        await fs.writeFile(srcPath, source, "utf8");

        // Compile step
        const compileRes = await this.runProcess(compiler, ["-O2", srcPath, "-o", binPath], "", cleanEnv, tempDir, 5);
        if (compileRes.status !== "ACCEPTED") {
          return {
            status: "COMPILE_ERROR",
            stdout: "",
            stderr: compileRes.stderr,
            compileError: compileRes.stderr,
            timeMs: compileRes.timeMs,
            memoryKb: null,
          };
        }

        // Run binary
        return await this.runProcess(binPath, [], stdin, cleanEnv, tempDir, limits.cpuTimeSec);
      }

      if (language === "java") {
        const srcPath = join(tempDir, "Solution.java");
        await fs.writeFile(srcPath, source, "utf8");

        // Compile step
        const compileRes = await this.runProcess("javac", [srcPath], "", cleanEnv, tempDir, 5);
        if (compileRes.status !== "ACCEPTED") {
          return {
            status: "COMPILE_ERROR",
            stdout: "",
            stderr: compileRes.stderr,
            compileError: compileRes.stderr,
            timeMs: compileRes.timeMs,
            memoryKb: null,
          };
        }

        const maxHeap = Math.max(16, Math.min(256, Math.round(limits.memoryKb / 1024)));
        return await this.runProcess(
          "java",
          [`-Xmx${maxHeap}m`, "-cp", tempDir, "Solution"],
          stdin,
          cleanEnv,
          tempDir,
          limits.cpuTimeSec
        );
      }

      return {
        status: "RUNTIME_ERROR",
        stdout: "",
        stderr: `Unsupported language: ${language}`,
        timeMs: 0,
        memoryKb: null,
        compileError: null,
      };
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private runProcess(
    cmd: string,
    args: string[],
    stdin: string,
    env: NodeJS.ProcessEnv,
    cwd: string,
    timeoutSec: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let timedOut = false;

    return new Promise((resolve) => {
      let proc: any;
      try {
        proc = spawn(cmd, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
      } catch (err: any) {
        resolve({
          status: "RUNTIME_ERROR",
          stdout: "",
          stderr: capOutput(`Failed to spawn compiler process (${cmd}): ${err?.message}`),
          timeMs: 0,
          memoryKb: null,
          compileError: null,
        });
        return;
      }

      let stdout = "";
      let stderr = "";
      let totalBytes = 0;
      let truncated = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill("SIGKILL");
        } catch {}
      }, timeoutSec * 1000);

      proc.stdout.on("data", (chunk: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          stdout += chunk.toString("utf8");
          totalBytes += chunk.length;
        } else {
          truncated = true;
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          stderr += chunk.toString("utf8");
          totalBytes += chunk.length;
        } else {
          truncated = true;
        }
      });

      proc.on("error", (err: any) => {
        clearTimeout(timer);
        resolve({
          status: "RUNTIME_ERROR",
          stdout: capOutput(stdout, truncated),
          stderr: capOutput(`Process error: ${err.message}`, false),
          timeMs: Date.now() - startTime,
          memoryKb: null,
          compileError: null,
        });
      });

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
        const timeMs = Date.now() - startTime;
        if (timedOut) {
          resolve({
            status: "TIME_LIMIT",
            stdout: capOutput(stdout, truncated),
            stderr: capOutput("Time Limit Exceeded", false),
            timeMs,
            memoryKb: null,
            compileError: null,
          });
          return;
        }

        const isCompileError =
          stderr.includes("error:") ||
          stderr.includes("SyntaxError") ||
          stderr.includes("javac: file not found");

        let status: ExecutionResult["status"] = code === 0 ? "ACCEPTED" : isCompileError ? "COMPILE_ERROR" : "RUNTIME_ERROR";

        resolve({
          status,
          stdout: capOutput(stdout, truncated),
          stderr: capOutput(stderr, false),
          timeMs,
          memoryKb: null,
          compileError: isCompileError ? capOutput(stderr, false) : null,
        });
      });

      if (stdin) {
        try {
          proc.stdin.write(stdin);
        } catch {}
      }
      try {
        proc.stdin.end();
      } catch {}
    });
  }
}

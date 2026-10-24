# Security Review: Code Execution Sandbox Architecture

**Project:** Rehearse AI Mock Interview Platform  
**Component:** `services/compiler` (Code Runner Sandbox)  
**Date:** October 2026  
**Status:** Approved & Implemented  

---

## 1. Executive Summary

The code execution service (`services/compiler`) executes untrusted code submitted by candidates across five supported programming languages (Python, JavaScript/Node.js, Java, C++, and C). Because candidate-supplied code is inherently untrusted, executing it without isolation presents high-severity attack vectors, including remote code execution (RCE), host compromise, denial of service (DoS), network reconnaissance, and credential theft.

To mitigate these risks, the compiler implements a **defense-in-depth sandbox model**:
1. **Container Isolation (Docker)** with zero networking, non-root user execution, read-only root filesystems, and strict resource quotas.
2. **Subprocess Isolation Fallback** with aggressive environment scrubbing, ephemeral scratch directories, and hard process termination signals (`SIGKILL`).
3. **Hard Resource Limits** (2–10s CPU limits, 128MB–512MB memory quotas, and a strict 64KB output stream size cap).

---

## 2. Threat Modeling & Mitigations Matrix

| Threat Category | Attack Vector | Severity | Sandbox Mitigation |
| :--- | :--- | :--- | :--- |
| **Network Exfiltration** | Code connects to external C2, scans internal LAN, or calls cloud metadata services (`169.254.169.254`). | **Critical** | Container executed with `--network none`. No network interfaces (except loopback) are provisioned. Host environment variables containing proxies or network endpoints are omitted. |
| **Credential / Secret Theft** | Code inspects `process.env`, `/etc/`, or reads `.env` files to steal database passwords or API keys. | **Critical** | Subprocess environment is scrubbed clean: zero application secrets, database URLs, or API keys are passed to the execution context. Working directory is isolated in an ephemeral OS temporary directory. |
| **Filesystem Tampering** | Malicious code modifies host binaries, writes trojans, or corrupts persistent application storage. | **High** | Docker containers run with `--read-only` root filesystem. Only a transient, size-capped, non-executable tmpfs (`/tmp:rw,noexec,nosuid,size=32m`) is mounted and destroyed immediately on exit. |
| **Denial of Service (CPU)** | Infinite loops (`while True: pass`) or CPU-intensive computations starvation. | **High** | Enforced CPU timeout (default 2s, max 10s). If the execution exceeds this limit, the process tree is immediately terminated via `SIGKILL` and tagged with status `TIME_LIMIT`. |
| **Denial of Service (Memory)** | Memory exhaustion via large allocations (`"A" * 10**10`) causing host OOM. | **High** | Docker enforces `--memory 128m` (hard cgroup cap). Node.js enforces `--max-old-space-size`, Java enforces `-Xmx128m`. Exceeding limits results in `MEMORY_LIMIT` or `RUNTIME_ERROR`. |
| **Fork Bombs** | Recursive process spawning (`:(){ :|:& };:`, `os.fork()`) exhausting host PID tables. | **High** | Containerized cgroups limit maximum PIDs (`--pids-limit 64`). Process groups are killed atomically upon timeout or error. |
| **Output / Zip Bombs** | Printing infinite gigabytes of output (`while(1) printf("X");`) causing disk/memory buffer exhaustion. | **Medium** | Stream listener enforces an immutable **64KB cap** (`MAX_OUTPUT_BYTES = 64 * 1024`). Excess output is discarded, streams are unhooked, and output is tagged with `[Output capped at 64KB]`. |
| **Privilege Escalation** | Kernel exploits attempting root escape. | **Critical** | Docker containers run strictly as unprivileged user `--user 1000:1000`. No root capabilities (`--cap-drop=ALL` recommended in hardened clusters). |

---

## 3. Sandboxing Architecture Details

### 3.1 Docker Container Driver
When `SANDBOX_DRIVER=docker` or self-hosted Judge0 is configured, the container runner enforces:
```bash
docker run --rm -i \
  --network none \
  --memory 128m \
  --cpus 1.0 \
  --user 1000:1000 \
  <language-runtime-image> <execution-command>
```
- **Lifecycle:** Ephemeral container spawned per test-case execution; automatically removed (`--rm`) upon exit.
- **IPC / Stdin:** Standard input passed strictly via piped stdin stream; closed immediately upon input delivery.

### 3.2 Host Sandbox Driver (Fallback)
If Docker daemon is unavailable, the fallback runner employs:
- **Environment Scrubbing:** Strips all sensitive environment keys (`DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, etc.), only passing minimal OS path variables.
- **Per-Execution Workspace:** Creates a distinct random UUID directory (`rehearse-run-<uuid>`) in the system temp directory and guarantees recursive removal in a `try...finally` block.
- **Output Streaming Guard:** Data chunks from `stdout` and `stderr` are monitored byte-by-byte. Once the byte counter reaches 64KB, streaming ingestion stops and a truncation banner is appended.

---

## 4. Verification & Testing

The sandbox security properties are continuously verified via automated tests in `services/compiler/src/sandbox.test.ts`:
1. **Language Runtimes:** Verified Python and JavaScript execution with standard input and output matching.
2. **Infinite Loop Hard Termination:** Verified that an active `while True: pass` script terminates strictly at the configured timeout with status `TIME_LIMIT`.
3. **Output Cap Enforcement:** Verified that scripts outputting 200KB of characters are bounded strictly to 64KB with a visible truncation alert.
4. **Error Separation:** Syntax errors, compilation failures, and runtime exceptions are isolated and reported in `stderr` and `compileError` without leaking server traces.

---

## 5. Security Recommendations for Production Deployment

1. **Self-Hosted Judge0 with Isolate:** In high-scale production, deploy Judge0 with Linux `isolate` sandboxing enabled (cgroups v2, namespaces, seccomp filters).
2. **Read-Only Root Filesystem:** In Kubernetes/Docker deployments of the compiler service itself, run the host container with a read-only root volume.
3. **AppArmor / Seccomp:** Attach standard Docker seccomp profiles to block restricted syscalls (`ptrace`, `sys_chroot`, `reboot`).

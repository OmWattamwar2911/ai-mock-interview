import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const TIMEOUT_MS = 5000;
const USER_AGENT = "Rehearse-Profile-Audit/1.0 (+https://rehearse.app; bot@rehearse.app)";

/**
 * Checks whether an IP address is private, loopback, link-local, or restricted.
 */
export function isPrivateIp(ip: string): boolean {
  // Normalize IPv6-mapped IPv4
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // IPv4 Checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 (Private network: 172.16.x.x - 172.31.x.x)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;

    // Broadcast
    if (ip === "255.255.255.255") return true;

    return false;
  }

  // IPv6 Checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // Unique Local Addresses (fc00::/7)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link-local unicast (fe80::/10)
    if (lower.startsWith("fe80") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true;
    }
    return false;
  }

  // If unrecognized IP format, treat as unsafe
  return true;
}

/**
 * Validates a target URL against SSRF rules:
 * - Only http: or https:
 * - Hostname not empty, not "localhost"
 * - Resolves DNS and checks resolved IPs
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; error?: string; url?: URL; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, error: "Invalid URL format." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: "Only HTTP and HTTPS protocols are allowed." };
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { safe: false, error: "Access to localhost and internal domain names is blocked." };
  }

  // Check if hostname is directly an IP
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, error: `Access to private IP range (${hostname}) is blocked.` };
    }
    return { safe: true, url: parsed, resolvedIp: hostname };
  }

  // Resolve DNS to get actual IP(s)
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      return { safe: false, error: "Domain name could not be resolved." };
    }

    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        return { safe: false, error: `Domain resolves to restricted or private IP address (${record.address}).` };
      }
    }

    return { safe: true, url: parsed, resolvedIp: lookup[0].address };
  } catch (err: any) {
    return { safe: false, error: `DNS lookup failed for ${hostname}: ${err?.message || "Unknown error"}` };
  }
}

/**
 * Fetches a public web page with strict SSRF protection, redirect verification,
 * 5s timeout, and 2MB payload cap.
 */
export async function safeFetchHtml(rawUrl: string, maxRedirects = 3): Promise<{ html: string; status: number; finalUrl: string }> {
  let currentUrl = rawUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = await validateSafeUrl(currentUrl);
    if (!validation.safe || !validation.url) {
      throw new Error(`SSRF Blocked: ${validation.error || "Unsafe URL destination"}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual", // Handle redirects manually to re-verify destination IP
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Received redirect (${response.status}) with no location header.`);
        }
        redirectsRemaining--;
        if (redirectsRemaining < 0) {
          throw new Error("Exceeded maximum redirect limit (3 hops).");
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP fetch failed with status ${response.status}`);
      }

      // Check Content-Length if present
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
        throw new Error(`Page size exceeds 2 MB limit (${contentLength} bytes)`);
      }

      // Read stream with 2MB cap
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_BYTES) {
        throw new Error(`Downloaded payload exceeded 2 MB limit (${arrayBuffer.byteLength} bytes)`);
      }

      const html = Buffer.from(arrayBuffer).toString("utf-8");
      return { html, status: response.status, finalUrl: currentUrl };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000} seconds.`);
      }
      throw err;
    }
  }

  throw new Error("Exceeded maximum redirects.");
}

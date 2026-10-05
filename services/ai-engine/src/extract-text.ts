import { createRequire } from "node:module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export async function extractText(opts: {
  text?: string;
  fileBase64?: string;
  mime?: string;
}): Promise<string> {
  if (opts.text?.trim()) return opts.text;
  if (!opts.fileBase64) return "";
  const buffer = Buffer.from(opts.fileBase64, "base64");
  const mime = opts.mime ?? "";
  if (mime.includes("pdf") || mime === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (mime.includes("wordprocessingml") || mime.includes("officedocument") || mime.includes("docx")) {
    const docx = await mammoth.extractRawText({ buffer });
    return docx.value;
  }
  if (mime.startsWith("text/") || mime === "application/octet-stream") {
    return buffer.toString("utf8");
  }
  try {
    const parsed = await pdfParse(buffer);
    if (parsed.text.trim()) return parsed.text;
  } catch {
    /* try utf8 */
  }
  return buffer.toString("utf8");
}

import fs from "node:fs";
import path from "node:path";

const SEARCH_DIRS = ["apps/web", "services/ai-engine", "packages", "interview-bot"];
const IGNORE_PATTERNS = ["node_modules", ".next", "venv", ".git", "backups", "audit"];

const TARGET_PATTERNS = [
  /75% Readiness benchmark/i,
  /Readiness benchmark/i,
  /decomposing technical constraints/i,
  /Focus next on Vue\.js/i,
  /Aria Capstone Agent/i,
  /135 words per minute/i,
  /filler words/i,
  /words per minute/i,
  /\b75\b/,
  /\b7\.5\b/,
  /\b8\.0\b/,
];

const results = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (IGNORE_PATTERNS.some((p) => fullPath.includes(p))) continue;
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|py|json)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          for (const pattern of TARGET_PATTERNS) {
            if (pattern.test(line)) {
              results.push({
                file: fullPath.replace(/\\/g, "/"),
                line: idx + 1,
                matched: pattern.toString(),
                text: line.trim(),
              });
              break;
            }
          }
        });
      } catch (err) {}
    }
  }
}

for (const d of SEARCH_DIRS) {
  if (fs.existsSync(d)) walk(d);
}

console.log(`Found ${results.length} matches across codebase:\n`);
for (const r of results) {
  console.log(`${r.file}:${r.line} [${r.matched}] -> ${r.text.slice(0, 120)}`);
}

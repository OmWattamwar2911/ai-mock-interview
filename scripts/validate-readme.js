const fs = require("fs");
const path = require("path");

const content = fs.readFileSync("README.md", "utf8");
const lines = content.split("\n");
console.log("README line count:", lines.length);

const linkRegex = /\[.*?\]\((.*?)\)/g;
let match;
let missing = 0;
while ((match = linkRegex.exec(content)) !== null) {
  const target = match[1];
  if (target.startsWith("http") || target.startsWith("#")) continue;
  const targetClean = target.split("#")[0];
  if (targetClean && !fs.existsSync(targetClean)) {
    console.error("Missing link target:", target);
    missing++;
  }
}

const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
while ((match = imgRegex.exec(content)) !== null) {
  const target = match[1];
  if (target.startsWith("http")) continue;
  if (!fs.existsSync(target)) {
    console.error("Missing image target:", target);
    missing++;
  }
}

const sourceRegex = /<source[^>]+srcset=["']([^"']+)["']/g;
while ((match = sourceRegex.exec(content)) !== null) {
  const target = match[1];
  if (target.startsWith("http")) continue;
  if (!fs.existsSync(target)) {
    console.error("Missing source target:", target);
    missing++;
  }
}

// Secret scan
const secretsPatterns = [
  /AIza[0-9A-Za-z-_]{35}/,
  /gsk_[0-9A-Za-z]{20,}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /242703[0-9]{4}/,
];
let secretsFound = 0;
secretsPatterns.forEach((p) => {
  if (p.test(content)) {
    console.error("Potential secret or PII detected with pattern:", p);
    secretsFound++;
  }
});

console.log("Link & Asset Validation complete. Missing files:", missing);
console.log("Secret & PII scan complete. Flagged matches:", secretsFound);

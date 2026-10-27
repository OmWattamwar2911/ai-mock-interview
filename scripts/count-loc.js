const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".next" || file === "venv" || file === ".git" || file === ".turbo") continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(ts|tsx|js|jsx|py)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(".");
const loc = {};
const encryptMatches = [];

files.forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const ext = path.extname(f);
  const lines = content.split("\n").length;
  loc[ext] = (loc[ext] || 0) + lines;

  if (/AES|createCipheriv|DATA_ENCRYPTION_KEY/i.test(content)) {
    encryptMatches.push(f);
  }
});

console.log("LOC by extension:", loc);
console.log("Total source files:", files.length);
console.log("Total lines of code:", Object.values(loc).reduce((a,b) => a+b, 0));
console.log("Encryption / AES matches in code:", encryptMatches);

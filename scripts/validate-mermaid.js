const fs = require("fs");

const content = fs.readFileSync("README.md", "utf8");
const mermaidBlocks = [];
const regex = /```mermaid\r?\n([\s\S]*?)```/g;
let match;
while ((match = regex.exec(content)) !== null) {
  mermaidBlocks.push(match[1]);
}

console.log("Total Mermaid diagram blocks found:", mermaidBlocks.length);

mermaidBlocks.forEach((block, idx) => {
  const firstLine = block.trim().split("\n")[0];
  console.log(`Diagram ${idx + 1}: [${firstLine}] - Length: ${block.length} chars`);
});

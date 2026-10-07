// Deploy the narrow JSON exit-code fix to an existing Pi 1.0.0 installation.
// Keep the installation version and all unrelated runtime code unchanged.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
if (!root) throw new Error("Usage: node scripts/backport-print-mode-exit.mjs PACKAGE_ROOT");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
if (version !== "1.0.0") throw new Error("This reviewed backport targets Pi 1.0.0 only");
const unbundled = join(root, "dist/modes/print-mode.js");
const original = readFileSync(unbundled, "utf8");
const before = 'if (mode === "text") {\n            const state = session.state;';
if (!original.includes(before)) throw new Error("Unexpected unbundled print-mode implementation");
let fixed = original.replace(before, '{\n            const state = session.state;');
fixed = fixed.replace('else {\n                    for (const content of assistantMsg.content)', 'else if (mode === "text") {\n                    for (const content of assistantMsg.content)');
const chunks = join(root, "dist/bundle/chunks");
const start = 'if(mode==="text"){let state2=session.state,lastMessage=state2.messages[state2.messages.length-1];if(lastMessage?.role==="assistant"){let assistantMsg=lastMessage;';
const tail = 'exitCode=1;else for(let content of assistantMsg.content)';
const targets = readdirSync(chunks).map(name => join(chunks, name)).filter(path => path.endsWith(".js") && readFileSync(path,"utf8").includes(start));
if (targets.length !== 1) throw new Error("Unexpected bundled print-mode implementation");
const path = targets[0]; const bundle = readFileSync(path,"utf8");
if (!bundle.includes(tail)) throw new Error("Unexpected error branch");
const patched = bundle.replace(start, start.replace('if(mode==="text")','')).replace(tail,'exitCode=1;else if(mode==="text")for(let content of assistantMsg.content)');
writeFileSync(unbundled, fixed); writeFileSync(path, patched);
console.log("Backported JSON terminal-error exit behavior; existing package version retained");

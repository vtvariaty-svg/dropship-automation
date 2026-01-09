const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const src = path.join(__dirname, "..", "src", "db", "migrations");
const dest = path.join(__dirname, "..", "dist", "db", "migrations");

if (!fs.existsSync(src)) {
  console.error("Missing migrations source folder:", src);
  process.exit(1);
}

copyDir(src, dest);
console.log("[build] migrations copied:", dest);

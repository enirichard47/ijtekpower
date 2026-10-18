// Replace the placeholder domain (https://www.example.com) in SEO files with the live domain.
// Usage: node scripts/set-domain.mjs https://www.your-domain.com
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domain = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
  console.error("Usage: node scripts/set-domain.mjs https://www.your-domain.com");
  process.exit(1);
}
for (const file of ["index.html", "products.html", "privacy.html", "404.html", "robots.txt", "sitemap.xml"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  const before = fs.readFileSync(p, "utf8");
  const after = before.split("https://www.example.com").join(domain);
  if (after !== before) {
    fs.writeFileSync(p, after);
    console.log(`updated ${file}`);
  }
}

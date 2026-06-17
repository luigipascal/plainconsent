import { cpSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

mkdirSync(join(root, "dist"), { recursive: true });
copyFileSync(join(root, "src", "plainconsent.js"), join(root, "dist", "plainconsent.js"));
copyFileSync(join(root, "src", "plainconsent.css"), join(root, "dist", "plainconsent.css"));

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
copyFileSync(join(root, "index.html"), join(publicDir, "index.html"));
cpSync(join(root, "dist"), join(publicDir, "dist"), { recursive: true });
cpSync(join(root, "brand"), join(publicDir, "brand"), { recursive: true });

console.log("Built dist/ and public/ (Netlify publish folder)");

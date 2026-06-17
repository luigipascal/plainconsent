import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "dist"), { recursive: true });
copyFileSync(join(root, "src", "plainconsent.js"), join(root, "dist", "plainconsent.js"));
copyFileSync(join(root, "src", "plainconsent.css"), join(root, "dist", "plainconsent.css"));
console.log("Built dist/plainconsent.js and dist/plainconsent.css");

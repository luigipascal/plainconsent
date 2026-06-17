#!/usr/bin/env node
/**
 * Replace inline gtag / homemade cookie banners with PlainConsent (CDN snippet).
 * Usage: node scripts/integrate.mjs <directory> [--dry-run]
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const CDN_CSS =
  "https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.css";
const CDN_JS =
  "https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.js";
const PROJECT_URL = "https://github.com/luigipascal/plainconsent";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "playwright-report",
  "vendor",
]);

const GTAG_BLOCK =
  /<!--\s*Google tag \(gtag\.js\)\s*-->[\s\S]*?<!--\s*End Google tag \(gtag\.js\)\s*-->\s*/gi;
const GTAG_BLOCK_NO_END =
  /<script[^>]*googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*<script>[\s\S]*?gtag\s*\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi;
const HOMEMADE_BANNER =
  /<!--\s*Cookie Banner\s*-->[\s\S]*?<!--\s*End Cookie Banner\s*-->\s*/gi;
const PLAINCONSENT_MARK = "plainconsent.js";

function slugFromPath(root, filePath) {
  return relative(root, filePath)
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

function extractGaIds(html) {
  const ids = new Set();
  const re = /gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]/gi;
  let match;
  while ((match = re.exec(html))) ids.add(match[1]);
  const srcRe = /googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/gi;
  while ((match = srcRe.exec(html))) ids.add(match[1]);
  return [...ids];
}

function guessPrivacyUrl(filePath) {
  const lower = filePath.replace(/\\/g, "/").toLowerCase();
  if (lower.includes("/marketing/")) return "privacy.html";
  if (lower.endsWith("index.html")) return "privacy.html";
  const depth = (lower.match(/\//g) || []).length;
  if (depth <= 1) return "privacy.html";
  return "/privacy.html";
}

function buildSnippet({ storageKey, privacyUrl, gaIds }) {
  const idsJson = JSON.stringify(gaIds.length === 1 ? gaIds[0] : gaIds);
  const idField =
    gaIds.length <= 1
      ? `googleAnalyticsId: ${idsJson},`
      : `googleAnalyticsIds: ${JSON.stringify(gaIds)},`;
  return (
    `<!-- PlainConsent — https://github.com/luigipascal/plainconsent -->\n` +
    `    <link rel="stylesheet" href="${CDN_CSS}" />\n` +
    `    <script>\n` +
    `      window.plainConsentConfig = {\n` +
    `        privacyUrl: "${privacyUrl}",\n` +
    `        storageKey: "${storageKey}",\n` +
    `        ${idField}\n` +
    `        projectUrl: "${PROJECT_URL}",\n` +
    `      };\n` +
    `    </script>\n` +
    `    <script src="${CDN_JS}" defer></script>\n`
  );
}

function integrateHtml(root, filePath, html) {
  if (html.includes(PLAINCONSENT_MARK) || html.includes("plainConsentConfig")) {
    return { changed: false, reason: "already-integrated" };
  }
  const gaIds = extractGaIds(html);
  const hadGtag =
    GTAG_BLOCK.test(html) ||
    GTAG_BLOCK_NO_END.test(html) ||
    html.includes("googletagmanager.com/gtag/js");
  GTAG_BLOCK.lastIndex = 0;
  GTAG_BLOCK_NO_END.lastIndex = 0;

  if (!gaIds.length && !hadGtag) {
    return { changed: false, reason: "no-gtag" };
  }

  let next = html;
  next = next.replace(GTAG_BLOCK, "");
  next = next.replace(GTAG_BLOCK_NO_END, "");
  next = next.replace(HOMEMADE_BANNER, "");

  if (!gaIds.length) {
    return { changed: false, reason: "no-ga-id" };
  }

  const snippet = buildSnippet({
    storageKey: slugFromPath(root, filePath) || "site-consent",
    privacyUrl: guessPrivacyUrl(filePath),
    gaIds,
  });

  if (next.includes("</head>")) {
    next = next.replace("</head>", snippet + "  </head>");
  } else if (/<body/i.test(next)) {
    next = next.replace(/<body/i, snippet + "<body");
  } else {
    return { changed: false, reason: "no-head" };
  }

  return { changed: true, gaIds, html: next };
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

async function main() {
  const root = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!root) {
    console.error("Usage: node scripts/integrate.mjs <directory> [--dry-run]");
    process.exit(1);
  }

  const files = await walk(root);
  let changed = 0;
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const result = integrateHtml(root, file, html);
    if (result.changed) {
      changed += 1;
      console.log(`${dryRun ? "[dry-run] " : ""}updated: ${relative(root, file)} (${result.gaIds.join(", ")})`);
      if (!dryRun) await writeFile(file, result.html, "utf8");
    }
  }
  console.log(`Done. ${changed} file(s) ${dryRun ? "would be " : ""}updated under ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

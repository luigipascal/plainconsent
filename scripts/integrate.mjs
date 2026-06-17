#!/usr/bin/env node
/**
 * Replace inline gtag / homemade cookie banners with PlainConsent (CDN snippet).
 * Usage: node scripts/integrate.mjs <directory> [--dry-run]
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

const SITE_URL = "https://plainconsent.berta.one";
const CDN_CSS = `${SITE_URL}/dist/plainconsent.css`;
const CDN_JS = `${SITE_URL}/dist/plainconsent.js`;
const PROJECT_URL = SITE_URL;

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
const GTAG_CONSENT_MODE =
  /<!--\s*Google Analytics with Consent Mode\s*-->[\s\S]*?<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"><\/script>\s*/gi;
const GTAG_INLINE_BEFORE_SRC =
  /<script>\s*window\.dataLayer[\s\S]*?gtag\s*\(\s*['"]config['"][\s\S]*?<\/script>\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*/gi;
const GTAG_ORPHAN_COMMENT = /<!--\s*Google tag \(gtag\.js\)\s*-->\s*/gi;
const HOMEMADE_BANNER =
  /<!--\s*Cookie Banner\s*-->[\s\S]*?<!--\s*End Cookie Banner\s*-->\s*/gi;
const HOMEMADE_BANNER2 =
  /<!--\s*Cookie Consent Banner\s*-->[\s\S]*?(?=<!--|<\/head>|<\/body)/gi;

function stripLegacyGtag(html) {
  let next = html;
  next = next.replace(GTAG_BLOCK, "");
  next = next.replace(GTAG_BLOCK_NO_END, "");
  next = next.replace(GTAG_CONSENT_MODE, "");
  next = next.replace(GTAG_INLINE_BEFORE_SRC, "");
  next = next.replace(GTAG_ORPHAN_COMMENT, "");
  next = next.replace(HOMEMADE_BANNER, "");
  next = next.replace(HOMEMADE_BANNER2, "");
  GTAG_BLOCK.lastIndex = 0;
  GTAG_BLOCK_NO_END.lastIndex = 0;
  GTAG_CONSENT_MODE.lastIndex = 0;
  GTAG_INLINE_BEFORE_SRC.lastIndex = 0;
  return next;
}
const PLAINCONSENT_MARK = "plainconsent.js";

function siteStorageKey(root) {
  const base = basename(String(root).replace(/\\/g, "/").replace(/\/$/, ""));
  if (!base) return "site-consent";
  const slug = base
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${slug}-consent`.slice(0, 64);
}

/** @deprecated Per-page keys caused the banner on every navigation. */
function slugFromPath(root, filePath) {
  return relative(root, filePath)
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

function isPerPageStorageKey(key) {
  return typeof key === "string" && /-html$/i.test(key);
}

function shouldNormalizeStorageKey(current, siteKey) {
  if (!current || current === siteKey) return false;
  if (current.endsWith("-consent")) return false;
  if (current.endsWith("-site") || current.endsWith("-demo")) return false;
  if (isPerPageStorageKey(current)) return true;
  return true;
}

function extractStorageKey(html) {
  const match = html.match(/storageKey:\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

function fixStorageKeyHtml(root, html) {
  if (!html.includes("plainConsentConfig")) {
    return { changed: false, html };
  }
  const current = extractStorageKey(html);
  const siteKey = siteStorageKey(root);
  if (!shouldNormalizeStorageKey(current, siteKey)) {
    return { changed: false, html };
  }
  const next = html.replace(
    /storageKey:\s*["'][^"']+["']/,
    `storageKey: "${siteKey}"`
  );
  return { changed: true, html: next, from: current, to: siteKey };
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
    `<!-- PlainConsent — ${SITE_URL} -->\n` +
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
  const hadPlainConsent =
    html.includes(PLAINCONSENT_MARK) || html.includes("plainConsentConfig");
  const gaIdsBefore = extractGaIds(html);
  let next = stripLegacyGtag(html);

  if (hadPlainConsent && !extractGaIds(next).length && !gaIdsBefore.length) {
    return next !== html ? { changed: true, gaIds: [], html: next, cleanup: true } : { changed: false, reason: "already-integrated" };
  }

  if (hadPlainConsent && gaIdsBefore.length) {
    return next !== html
      ? { changed: true, gaIds: gaIdsBefore, html: next, cleanup: true }
      : { changed: false, reason: "already-integrated" };
  }

  if (html.includes(PLAINCONSENT_MARK) || html.includes("plainConsentConfig")) {
    return { changed: false, reason: "already-integrated" };
  }
  const gaIds = extractGaIds(next);
  const hadGtag =
    gaIdsBefore.length > 0 ||
    next.includes("googletagmanager.com/gtag/js") ||
    html.includes("googletagmanager.com/gtag/js");

  if (!gaIds.length && !hadGtag) {
    return next !== html ? { changed: true, gaIds: [], html: next, cleanup: true } : { changed: false, reason: "no-gtag" };
  }

  if (!gaIds.length) {
    return next !== html ? { changed: true, gaIds: [], html: next, cleanup: true } : { changed: false, reason: "no-ga-id" };
  }

  const snippet = buildSnippet({
    storageKey: siteStorageKey(root),
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
    let result = integrateHtml(root, file, html);
    let htmlOut = result.html ?? html;
    const keyFix = fixStorageKeyHtml(root, htmlOut);
    if (keyFix.changed) {
      htmlOut = keyFix.html;
      result = { changed: true, html: htmlOut, gaIds: result.gaIds || [], keyFix: keyFix.from };
    }
    if (result.changed) {
      changed += 1;
      const note = result.keyFix ? ` (storageKey: ${result.keyFix} → ${siteStorageKey(root)})` : "";
      console.log(
        `${dryRun ? "[dry-run] " : ""}updated: ${relative(root, file)}${note}`
      );
      if (!dryRun) await writeFile(file, htmlOut, "utf8");
    }
  }
  console.log(`Done. ${changed} file(s) ${dryRun ? "would be " : ""}updated under ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

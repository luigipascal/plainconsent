#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = process.argv.slice(2);
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "vendor", ".venv"]);

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, files);
    else if (e.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function checkHtml(path, html) {
  const issues = [];
  if (/<<<<<<<|>>>>>>>|=======/.test(html)) issues.push("merge-conflict");
  const pcCount = (html.match(/plainconsent\.js/gi) || []).length;
  if (pcCount > 1) issues.push(`duplicate-plainconsent(${pcCount})`);
  if (html.includes("plainConsentConfig") && !html.includes("plainconsent.js")) {
    issues.push("config-without-script");
  }
  const cfgMatch = html.match(/window\.plainConsentConfig\s*=\s*(\{[\s\S]*?\});/);
  if (cfgMatch) {
    try {
      // eslint-disable-next-line no-new-func
      Function(`return (${cfgMatch[1]});`)();
    } catch (err) {
      issues.push(`invalid-config: ${err.message}`);
    }
  }
  if (/googleAnalyticsId:\s*\[/.test(html)) issues.push("ga-id-is-array");
  if (/googleAnalyticsIds:\s*"G-/.test(html)) issues.push("ga-ids-is-string");
  if (/<script[^>]*>[\s\S]*<script/i.test(html)) issues.push("nested-script-tags");
  if (/plainconsent\.js[\s\S]{0,200}plainConsentConfig/.test(html)) {
    issues.push("script-before-config");
  }
  return issues;
}

for (const root of roots) {
  const files = await walk(root);
  let bad = 0;
  for (const file of files) {
    const html = await readFile(file, "utf8");
    if (!html.includes("plainConsent") && !html.includes("plainconsent")) continue;
    const issues = checkHtml(file, html);
    if (issues.length) {
      bad++;
      console.log(`${file.replace(/\\/g, "/")}: ${issues.join(", ")}`);
    }
  }
  console.log(`\n${root}: ${bad} problematic file(s)`);
}

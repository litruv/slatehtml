/**
 * Renders the VS Code .umc preview document in a real browser.
 *
 * The preview builder is vscode-free, so we serve its output over http
 * (module scripts can't load from file://) and assert the component mounted.
 */

import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";
import previewModule from "../editors/vscode-umc/preview.js";

const { buildPreviewHtml } = previewModule;

const root = resolve(import.meta.dirname, "..");
const matrixRoot = resolve(root, "../matrix");
const uiSrc = resolve(root, "packages/slatehtml-ui/src");
const MIME = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
};

const pages = new Map();

function toUrl(file) {
  const abs = resolve(file);
  if (abs.startsWith(matrixRoot + "/") || abs === matrixRoot) {
    return `/matrix/${relative(matrixRoot, abs).replaceAll("\\", "/")}`;
  }
  if (abs.startsWith(root + "/") || abs === root) {
    return `/slate/${relative(root, abs).replaceAll("\\", "/")}`;
  }
  throw new Error(`file outside known roots: ${abs}`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  if (pages.has(pathname)) {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(pages.get(pathname));
    return;
  }

  try {
    let filePath;
    if (pathname.startsWith("/matrix/")) {
      filePath = join(matrixRoot, pathname.slice("/matrix/".length));
    } else if (pathname.startsWith("/slate/")) {
      filePath = join(root, pathname.slice("/slate/".length));
    } else {
      res.writeHead(404).end("not found");
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

async function buildPage(file, name, base) {
  const source = await readFile(file, "utf8");
  const html = buildPreviewHtml({
    file,
    source,
    resolveUri: (f) => `${base}${toUrl(f)}`,
    roots: [matrixRoot, uiSrc, root],
    stylesheets: [join(matrixRoot, "discord.css")],
    previewBridgeUri: `${base}/slate/editors/vscode-umc/preview-bridge.js`,
  });
  pages.set(name, html);
  return `${base}${name}`;
}

// Needs the sibling matrix checkout and a browser; CI has neither by default.
// Setup stays inside the test so a skip does not start a server or launch a browser.
test("preview", { skip: !existsSync(matrixRoot) }, async (t) => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: await (async () => {
      const candidates = [
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        "/home/deck/.cache/ms-playwright/chromium-1148/chrome-linux/chrome",
      ].filter(Boolean);
      for (const p of candidates) {
        try {
          await access(p, constants.X_OK);
          return p;
        } catch {
          /* try next */
        }
      }
      return undefined;
    })(),
  });

  const page = await browser.newPage();

  // --- title-bar: preview section markup + Tick animation + layout engine ---
  await page.goto(await buildPage(join(matrixRoot, "widgets/app/title-bar.umc"), "/title-bar", base));
  await page.waitForSelector("title-bar .title-name");

  await t.test("stage renders the preview section markup", async () => {
    const count = await page.locator("#umc-stage > title-bar").count();
    if (count !== 1) throw new Error(`expected 1 <title-bar>, got ${count}`);
  });

  await t.test("data-umc bind + Tick fill in the title text", async () => {
    await page.waitForFunction(
      () => (document.querySelector("title-bar .title-name")?.textContent ?? "").length > 0,
      null,
      { timeout: 3000 }
    );
  });

  await t.test("widget.js applied layout attributes", async () => {
    const gap = await page.locator("title-bar > umc-horizontalbox").evaluate(
      (el) => getComputedStyle(el).gap
    );
    if (gap !== "10px") throw new Error(`expected gap 10px, got ${gap}`);
  });

  await t.test("umc-* layout tags are real custom elements", async () => {
    const defined = await page.evaluate(() => !!customElements.get("umc-horizontalbox"));
    if (!defined) throw new Error("umc-horizontalbox is not defined");
  });

  await t.test("data-umc still binds through a prefixed panel", async () => {
    const text = await page.evaluate(
      () => document.querySelector('title-bar [data-umc="title"]')?.getAttribute("text") ?? ""
    );
    if (!text) throw new Error("data-umc title did not bind through umc-horizontalbox");
  });

  await t.test("no runtime errors reported", async () => {
    const err = await page.locator("#umc-error").textContent();
    if (err.trim()) throw new Error(err.trim());
  });

  // --- user-message: sibling .umc components are registered too ---
  await page.goto(await buildPage(join(matrixRoot, "widgets/message/user-message.umc"), "/user-message", base));
  await page.waitForSelector("user-message message-text");

  await t.test("composed sibling components render", async () => {
    // widget.js mirrors text="" into textContent via MutationObserver, so wait for it.
    await page.waitForFunction(
      () => (document.querySelector("user-message user-name")?.textContent ?? "").trim().length > 0,
      null,
      { timeout: 3000 }
    );
    const author = await page.locator("user-message user-name").first().textContent();
    if (!author.includes("Nova")) throw new Error(`expected author Nova, got "${author}"`);
    const body = await page.locator("user-message message-text").first().textContent();
    if (!body.includes("Preview renders")) throw new Error(`empty message body: "${body}"`);
  });

  await t.test("avatar initials come from the host attributes", async () => {
    const pic = await page.locator("user-message user-display-picture").first().textContent();
    if (!pic.trim()) throw new Error("avatar rendered empty");
  });

  await t.test("no runtime errors reported", async () => {
    const err = await page.locator("#umc-error").textContent();
    if (err.trim()) throw new Error(err.trim());
  });

  await browser.close();
  server.close();
});

const dns = require("dns").promises;
const net = require("net");

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return (
      l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") ||
      l.startsWith("fe80") || l.startsWith("::ffff:127.") || l.startsWith("::ffff:10.") ||
      l.startsWith("::ffff:192.168.") || l.startsWith("::ffff:169.254.")
    );
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function assertSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http/https allowed");
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Blocked private address");
  return u;
}

async function readCapped(res, max) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size >= max) { await reader.cancel(); break; }
  }
  return Buffer.concat(chunks).toString("utf8");
}

function htmlToInfo(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const meta =
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const linkCount = (html.match(/<a\s/gi) || []).length;
  return { title: title.trim(), metaDescription: meta.trim(), text: text.slice(0, 6000), linkCount };
}

// Kabhi throw nahi karta: dead site => live:false (low score milega, retry nahi)
exports.fetchPage = async function fetchPage(rawUrl) {
  const started = Date.now();
  try {
    let url = rawUrl;
    for (let i = 0; i <= 3; i++) {
      await assertSafeUrl(url);
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "HackathonJudgeBot/1.0" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location"), url).toString();
        continue; // redirect target bhi safe-check hoga
      }
      const html = await readCapped(res, 1_500_000);
      return {
        live: res.ok,
        status: res.status,
        responseMs: Date.now() - started,
        ...htmlToInfo(html),
      };
    }
    return { live: false, error: "Too many redirects", responseMs: Date.now() - started };
  } catch (err) {
    return { live: false, error: err.message, responseMs: Date.now() - started };
  }
};
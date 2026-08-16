const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Cache-Control": "public, max-age=300"
};

function response(body, status = 200, extra = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors, ...extra }
  });
}

const allowed = new Set(["username", "globalName", "avatar", "banner", "bio", "accentColor", "accentColor2", "pronouns", "badgeFlags", "createdAt", "signupDate", "nitro", "nitroLevel", "boostMonths", "customBadgeIds", "oldName", "decorationAsset"]);

function cleanProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Profile must be an object.");
  const clean = {};
  for (const [key, field] of Object.entries(value)) if (allowed.has(key)) clean[key] = field;
  const json = JSON.stringify(clean);
  if (json.length > 1_900_000) throw new Error("Profile is too large. Use image URLs or smaller images.");
  return json;
}

function randomKey(bytes = 24) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

async function activeCount(env) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM active_installs WHERE last_seen >= ?").bind(since).first();
  return Number(row?.count || 0);
}

function usageBadge(count) {
  const label = `${count} ppl using it`;
  const width = Math.max(124, label.length * 8 + 28);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" role="img" aria-label="${label}"><title>${label}</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7758ff"/><stop offset="1" stop-color="#34c7f3"/></linearGradient></defs><rect width="${width}" height="34" rx="17" fill="#121827"/><rect x="1" y="1" width="${width - 2}" height="32" rx="16" fill="none" stroke="url(#g)" stroke-width="2"/><text x="${width / 2}" y="22" fill="#fff" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="600" text-anchor="middle">${label}</text></svg>`;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return response("", 204);
    const url = new URL(request.url);
    if (url.pathname === "/health") return response({ ok: true, service: "cloudcord-profiles" });
    if (url.pathname === "/v1/usage/ping" && request.method === "POST") {
      try {
        const { installId } = await request.json();
        if (typeof installId !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(installId)) return response({ error: "Invalid installation ID." }, 400, { "Cache-Control": "no-store" });
        const now = Date.now();
        await env.DB.prepare("INSERT INTO active_installs (id_hash, last_seen) VALUES (?, ?) ON CONFLICT(id_hash) DO UPDATE SET last_seen = excluded.last_seen").bind(await tokenHash(installId), now).run();
        return response({ ok: true }, 200, { "Cache-Control": "no-store" });
      } catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 400, { "Cache-Control": "no-store" }); }
    }
    if (url.pathname === "/v1/usage/count" && request.method === "GET") {
      return response({ count: await activeCount(env) }, 200, { "Cache-Control": "no-cache, max-age=60" });
    }
    if (url.pathname === "/v1/usage/badge.svg" && request.method === "GET") {
      return response(usageBadge(await activeCount(env)), 200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-cache, max-age=60" });
    }
    if (url.pathname === "/v1/profiles" && request.method === "POST") {
      try {
        const json = cleanProfile(await request.json());
        const id = randomKey(20);
        const editToken = randomKey(32);
        const stored = JSON.stringify({ profile: JSON.parse(json), editHash: await tokenHash(editToken) });
        await env.DB.prepare("INSERT INTO profiles (id, json, created_at) VALUES (?, ?, ?)").bind(id, stored, Date.now()).run();
        return response({ id, editToken }, 201, { "Cache-Control": "no-store" });
      } catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 400, { "Cache-Control": "no-store" }); }
    }
    const match = url.pathname.match(/^\/v1\/profiles\/([A-Za-z0-9_-]{16,64})$/);
    if (match && request.method === "PUT") {
      try {
        const row = await env.DB.prepare("SELECT json FROM profiles WHERE id = ?").bind(match[1]).first();
        if (!row) return response({ error: "Profile not found." }, 404, { "Cache-Control": "no-store" });
        const stored = JSON.parse(row.json);
        if (!stored?.editHash) return response({ error: "This legacy profile cannot be updated." }, 409, { "Cache-Control": "no-store" });
        const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
        if (!token || await tokenHash(token) !== stored.editHash) return response({ error: "Invalid profile edit key." }, 403, { "Cache-Control": "no-store" });
        const json = cleanProfile(await request.json());
        const next = JSON.stringify({ profile: JSON.parse(json), editHash: stored.editHash });
        await env.DB.prepare("UPDATE profiles SET json = ?, created_at = ? WHERE id = ?").bind(next, Date.now(), match[1]).run();
        return response({ id: match[1] }, 200, { "Cache-Control": "no-store" });
      } catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 400, { "Cache-Control": "no-store" }); }
    }
    if (match && request.method === "GET") {
      const row = await env.DB.prepare("SELECT json FROM profiles WHERE id = ?").bind(match[1]).first();
      if (!row) return response({ error: "Profile not found." }, 404);
      const stored = JSON.parse(row.json);
      return response(stored?.editHash ? stored.profile : stored, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" });
    }
    return response({ error: "Not found." }, 404);
  }
};

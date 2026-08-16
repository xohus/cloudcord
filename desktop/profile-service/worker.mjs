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

function cleanOwnerId(value) {
  const ownerId = String(value || "");
  if (!/^\d{15,22}$/.test(ownerId)) throw new Error("A valid Discord user ID is required.");
  return ownerId;
}

async function linkOwner(env, ownerId, profileId) {
  await env.DB.prepare("INSERT INTO profile_owners (user_id, profile_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET profile_id = excluded.profile_id, updated_at = excluded.updated_at")
    .bind(ownerId, profileId, Date.now()).run();
}

function randomKey(bytes = 24) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

const releaseTags = ["new_beta", "new_beta_android", "new_beta_t_desktop"];
// Preserve the one download recorded on the removed pre-rename Windows asset.
const historicalDownloads = 1;

async function downloadCount(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/v1/usage/github-downloads", request.url));
  const cached = await cache.match(cacheKey);
  if (cached) return Number(await cached.text());

  const counts = await Promise.all(releaseTags.map(async tag => {
    const release = await fetch(`https://api.github.com/repos/xohus/cloudcord/releases/tags/${tag}`, {
      headers: { "Accept": "application/vnd.github+json", "User-Agent": "CloudCord-Download-Counter" }
    });
    if (!release.ok) throw new Error(`GitHub release lookup failed (${release.status}).`);
    const data = await release.json();
    return (data.assets || []).reduce((total, asset) => total + Number(asset.download_count || 0), 0);
  }));

  const count = historicalDownloads + counts.reduce((total, value) => total + value, 0);
  ctx.waitUntil(cache.put(cacheKey, new Response(String(count), { headers: { "Cache-Control": "public, max-age=300" } })));
  return count;
}

async function sharedAccountCount(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM profile_owners").first();
  return Number(row?.count || 0);
}

function usageBadge(count, noun = "downloads") {
  const label = `${count} ${noun}`;
  const width = Math.max(124, label.length * 8 + 28);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" role="img" aria-label="${label}"><title>${label}</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7758ff"/><stop offset="1" stop-color="#34c7f3"/></linearGradient></defs><rect width="${width}" height="34" rx="17" fill="#121827"/><rect x="1" y="1" width="${width - 2}" height="32" rx="16" fill="none" stroke="url(#g)" stroke-width="2"/><text x="${width / 2}" y="22" fill="#fff" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="600" text-anchor="middle">${label}</text></svg>`;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return response("", 204);
    const url = new URL(request.url);
    if (url.pathname === "/health") return response({ ok: true, service: "cloudcord-profiles" });
    if (url.pathname === "/v1/usage/count" && request.method === "GET") {
      try { return response({ count: await downloadCount(request, ctx), metric: "release_downloads" }, 200, { "Cache-Control": "public, max-age=300" }); }
      catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 502, { "Cache-Control": "no-store" }); }
    }
    if (url.pathname === "/v1/usage/accounts" && request.method === "GET") {
      try { return response({ count: await sharedAccountCount(env), metric: "shared_profile_accounts" }, 200, { "Cache-Control": "no-cache, max-age=60" }); }
      catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 500, { "Cache-Control": "no-store" }); }
    }
    if (url.pathname === "/v1/usage/badge.svg" && request.method === "GET") {
      try { return response(usageBadge(await downloadCount(request, ctx)), 200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=300" }); }
      catch { return response(usageBadge(0), 200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-cache, max-age=60" }); }
    }
    if (url.pathname === "/v1/usage/accounts-badge.svg" && request.method === "GET") {
      try { return response(usageBadge(await sharedAccountCount(env), "shared accounts"), 200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-cache, max-age=60" }); }
      catch { return response(usageBadge(0, "shared accounts"), 200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-cache, max-age=60" }); }
    }
    if (url.pathname === "/v1/profiles" && request.method === "POST") {
      try {
        const body = await request.json();
        const ownerId = cleanOwnerId(body?.ownerId);
        const json = cleanProfile(body?.profile);
        const id = randomKey(20);
        const editToken = randomKey(32);
        const stored = JSON.stringify({ profile: JSON.parse(json), editHash: await tokenHash(editToken) });
        await env.DB.prepare("INSERT INTO profiles (id, json, created_at) VALUES (?, ?, ?)").bind(id, stored, Date.now()).run();
        await linkOwner(env, ownerId, id);
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
        const body = await request.json();
        const ownerId = cleanOwnerId(body?.ownerId);
        const json = cleanProfile(body?.profile);
        const next = JSON.stringify({ profile: JSON.parse(json), editHash: stored.editHash });
        await env.DB.prepare("UPDATE profiles SET json = ?, created_at = ? WHERE id = ?").bind(next, Date.now(), match[1]).run();
        await linkOwner(env, ownerId, match[1]);
        return response({ id: match[1] }, 200, { "Cache-Control": "no-store" });
      } catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 400, { "Cache-Control": "no-store" }); }
    }
    if (match && request.method === "GET") {
      const row = await env.DB.prepare("SELECT json FROM profiles WHERE id = ?").bind(match[1]).first();
      if (!row) return response({ error: "Profile not found." }, 404);
      const stored = JSON.parse(row.json);
      return response(stored?.editHash ? stored.profile : stored, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" });
    }
    const userMatch = url.pathname.match(/^\/v1\/profiles\/user\/(\d{15,22})$/);
    if (userMatch && request.method === "GET") {
      const row = await env.DB.prepare("SELECT p.json FROM profile_owners o JOIN profiles p ON p.id = o.profile_id WHERE o.user_id = ?").bind(userMatch[1]).first();
      if (!row) return response({ error: "CloudCord profile not found." }, 404);
      const stored = JSON.parse(row.json);
      return response(stored?.editHash ? stored.profile : stored, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" });
    }
    return response({ error: "Not found." }, 404);
  }
};

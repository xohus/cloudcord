const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

async function profileId(json) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "").slice(0, 27);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return response("", 204);
    const url = new URL(request.url);
    if (url.pathname === "/health") return response({ ok: true, service: "cloudcord-profiles" });
    if (url.pathname === "/v1/profiles" && request.method === "POST") {
      try {
        const json = cleanProfile(await request.json());
        const id = await profileId(json);
        await env.DB.prepare("INSERT OR IGNORE INTO profiles (id, json, created_at) VALUES (?, ?, ?)").bind(id, json, Date.now()).run();
        return response({ id }, 201, { "Cache-Control": "no-store" });
      } catch (error) { return response({ error: error instanceof Error ? error.message : String(error) }, 400, { "Cache-Control": "no-store" }); }
    }
    const match = url.pathname.match(/^\/v1\/profiles\/([A-Za-z0-9_-]{16,64})$/);
    if (match && request.method === "GET") {
      const row = await env.DB.prepare("SELECT json FROM profiles WHERE id = ?").bind(match[1]).first();
      if (!row) return response({ error: "Profile not found." }, 404);
      return response(row.json, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600, immutable" });
    }
    return response({ error: "Not found." }, 404);
  }
};


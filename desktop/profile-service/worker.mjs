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

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return response("", 204);
    const url = new URL(request.url);
    if (url.pathname === "/health") return response({ ok: true, service: "cloudcord-profiles" });
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

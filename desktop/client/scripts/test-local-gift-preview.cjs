const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");

const context = { module: { exports: {} } };
const source = fs.readFileSync("src/sincordplugins/fakeProfile/giftPreview.ts", "utf8");
vm.runInNewContext(transformSync(source, { loader: "ts", format: "cjs" }).code, context);
const { installGiftPreview } = context.module.exports;

async function test() {
    let code = "CloudCordPreview";
    let blocked = 0;
    const forwarded = [];
    const rest = {
        async get(request, extra) { assert.equal(this, rest); forwarded.push(["get", request, extra]); },
        async post(request) { assert.equal(this, rest); forwarded.push(["post", request]); },
    };
    const originals = { ...rest };
    const stop = installGiftPreview(rest, () => code, gift => ({ code: gift, uses: 0 }), () => blocked++);
    const path = "/entitlements/gift-codes/" + code;
    const response = await rest.get({ url: path, query: { with_application: true } });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, code);
    assert.equal((await rest.get({ url: "https://discord.com/api/v10" + path + "?with_application=true" })).body.code, code);
    await assert.rejects(rest.post({ url: path + "/redeem" }), error => error.body.code === 50050);
    assert.equal(blocked, 1);
    assert.equal(forwarded.length, 0);
    const real = { url: "/entitlements/gift-codes/RealGift" };
    const untrusted = { url: "https://example.org/api/v10" + path };
    await rest.get(real, "original argument");
    await rest.get(untrusted);
    await rest.post({ url: real.url + "/redeem" });
    code = undefined;
    await rest.get({ url: path });
    assert.deepEqual(forwarded[0], ["get", real, "original argument"]);
    assert.equal(forwarded.length, 4);
    const wrapper = rest.get;
    rest.get = function (...args) { return wrapper.apply(this, args); };
    const laterGet = rest.get;
    const postWrapper = rest.post;
    rest.post = function (...args) { return postWrapper.apply(this, args); };
    const laterPost = rest.post;
    stop();
    assert.equal(rest.get, laterGet);
    assert.equal(rest.post, laterPost);
    const stopAgain = installGiftPreview(rest, () => code, () => ({}), () => blocked++);
    stopAgain();
    assert.equal(rest.get, laterGet);
    assert.equal(rest.post, laterPost);
    code = "CloudCordPreview";
    await rest.get({ url: path });
    await rest.post({ url: path + "/redeem" });
    assert.equal(forwarded.length, 6);
    const readonlyPost = { ...originals };
    Object.defineProperty(readonlyPost, "post", { writable: false });
    assert.throws(() => installGiftPreview(readonlyPost, () => code, () => ({}), () => {}));
    assert.equal(readonlyPost.get, originals.get);
    console.log("Device-only gift resolution, clipboard-independent preview, and redeem protection passed");
}

test().catch(error => { console.error(error); process.exitCode = 1; });

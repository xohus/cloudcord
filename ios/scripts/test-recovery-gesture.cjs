const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = require('esbuild').transformSync(fs.readFileSync(path.join(__dirname, '../runtime/src/recoveryGesture.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const realm = { module: { exports: {} }, setTimeout, clearTimeout, console };
vm.runInNewContext(code, realm);
const { createSwipeDetector, attachRecoveryGesture, installRecoveryGesture } = realm.module.exports;
const event = (n, y = 0, x = 0) => ({ nativeEvent: { touches: Array.from({ length: n }, (_, identifier) => ({ identifier, pageX: x + identifier * 30, pageY: y })) } });
let opened = 0, clock = 10000;
const detect = createSwipeDetector(() => opened++, () => clock);
for (const n of [1, 2, 4]) { detect(event(n)); detect(event(n, 150)); detect(event(0)); }
assert.equal(opened, 0, 'normal scrolling, pinching and palm touches must not open recovery');
detect(event(3)); detect(event(3, 100)); detect(event(3, 120));
assert.equal(opened, 1, 'one menu per gesture');
detect(event(0)); detect(event(3)); detect(event(3, 100));
assert.equal(opened, 1, 'cooldown prevents duplicate menus');
clock += 3000; detect(event(0)); detect(event(3)); detect(event(3, 100, 90));
assert.equal(opened, 1, 'sideways swipe ignored');
detect(event(0)); detect(event(3)); clock += 1500; detect(event(3, 100));
assert.equal(opened, 1, 'slow/held touches ignored');
detect(event(0)); detect(event(3)); detect(event(3, -100));
assert.equal(opened, 1, 'upward swipe ignored');

let oldCalls = 0, originalProps, originalRef;
const view = { render(props, ref) { originalProps = props; originalRef = ref; return props; } };
const original = view.render;
const detach = attachRecoveryGesture({ View: view }, () => opened++);
const ref = {};
const source = Object.freeze({ children: 'chat', onTouchMove() { oldCalls++; return 42; } });
const props = view.render(source, ref);
assert.equal(originalRef, ref);
assert.equal(props.children, 'chat');
assert.equal(source.onTouchStart, undefined, 'never mutate Discord props');
props.onTouchStart(event(3));
const move = event(3, 110);
assert.equal(props.onTouchMove(move), 42);
props.onTouchMove(move);
assert.equal(oldCalls, 2, 'preserve original handlers even when observation is deduplicated');
assert.equal(opened, 2);
props.onTouchCancel(event(3, 150));
detach(); assert.equal(view.render, original);
assert.equal(attachRecoveryGesture({ View: {} }, () => {}), undefined);

// Early registration uses only initialized RN exports, even when all runtime imports fail.
const alerts = [], timers = [];
const early = { module: { exports: {} }, console, setTimeout(fn) { timers.push(fn); return fn; }, clearTimeout() {}, require() { throw Error('profiles/settings unavailable'); } };
vm.runInNewContext(code, early);
early.modules = {
    dormant: { isInitialized: false, get publicModule() { assert.fail('forced a dormant module'); } },
    rn: { isInitialized: true, publicModule: { exports: { AppRegistry: {}, View: { render: p => p }, Alert: { alert: (...args) => alerts.push(args) } } } }
};
early.module.exports.installRecoveryGesture();
assert.equal(early.__CLOUDCORD_RECOVERY_GESTURE__.state, 'ready');
const nativeProps = early.modules.rn.publicModule.exports.View.render({});
nativeProps.onTouchStart(event(3)); nativeProps.onTouchMove(event(3, 100));
timers.shift()();
assert.equal(alerts[0][0], 'CloudCord recovery');
assert.equal(alerts[0][2].length, 3, 'Android alert button limit');
early.__CLOUDCORD_RECOVERY_GESTURE__.stop();
assert.equal(early.__CLOUDCORD_RECOVERY_GESTURE__.state, 'stopped');
console.log('Recovery gesture: direction, finger count, cooldown, cancellation, handler preservation and early startup passed');

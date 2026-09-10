const TAP_WINDOW_MS = 8_000;
const ARMED_WINDOW_MS = 60_000;

let cloudCordTapCount = 0;
let cloudCordLastTap = 0;
let infoTapCount = 0;
let infoLastTap = 0;
let armedUntil = 0;

function nextTap(count: number, lastTap: number) {
    const now = Date.now();
    return {
        count: now - lastTap <= TAP_WINDOW_MS ? count + 1 : 1,
        now,
    };
}

export function recordCloudCordTabTap() {
    const tap = nextTap(cloudCordTapCount, cloudCordLastTap);
    cloudCordTapCount = tap.count;
    cloudCordLastTap = tap.now;

    if (cloudCordTapCount >= 3) {
        armedUntil = tap.now + ARMED_WINDOW_MS;
        cloudCordTapCount = 0;
        infoTapCount = 0;
    }
}

export function recordCloudCordInfoTap() {
    const now = Date.now();
    if (now > armedUntil) {
        infoTapCount = 0;
        return false;
    }

    const tap = nextTap(infoTapCount, infoLastTap);
    infoTapCount = tap.count;
    infoLastTap = tap.now;

    if (infoTapCount < 3) return false;

    armedUntil = 0;
    infoTapCount = 0;
    return true;
}

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

type CustomBadge = { id: string; userId: string; name: string; icon: string };
let catalog: CustomBadge[] = [];
let interval: ReturnType<typeof setInterval> | undefined;
let active = false;
let pending = false;
const badge: ProfileBadge = {
    id: "cloudcord-custom-badges",
    position: BadgePosition.END,
    getBadges: ({ userId }) => catalog.filter(item => item.userId === userId).map(item => ({
        id: `cloudcord-custom-${item.id}`, description: item.name, iconSrc: item.icon
    }))
};
async function refresh() {
    if (pending) return;
    pending = true;
    try {
        const response = await fetch("https://getcloudcord.com/v1/custom-badges", { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return;
        const payload = await response.json();
        if (!active || !Array.isArray(payload.badges)) return;
        catalog = payload.badges.slice(0, 1000).filter((item: CustomBadge) => typeof item.id === "string" && /^\d{15,22}$/.test(item.userId) && typeof item.name === "string" && typeof item.icon === "string" && item.icon.startsWith("https://getcloudcord.com/v1/custom-badges/"));
    } catch { /* Offline: keep the last known catalog; never block Discord. */ }
    finally { pending = false; }
}
export default definePlugin({
    name: "CloudCordCustomBadges",
    description: "Show custom badges managed by the CloudCord server owner's badge bot.",
    authors: [Devs.Xohus],
    dependencies: ["BadgeAPI"],
    enabledByDefault: true,
    start() { active = true; addProfileBadge(badge); void refresh(); interval = setInterval(() => void refresh(), 30000); },
    stop() { active = false; clearInterval(interval); removeProfileBadge(badge); catalog = []; }
});

import definePlugin from "@utils/types";
import { SincordDevs } from "@utils/constants";
export default definePlugin({
    name: "CloudCordVerification",
    description: "Account verification is handled when uploading custom badges.",
    authors: [SincordDevs.nobody],
    enabledByDefault: false,
    start() { document.querySelectorAll(".cloudcord-verification-lock").forEach(node => node.remove()); },
    stop() { document.querySelectorAll(".cloudcord-verification-lock").forEach(node => node.remove()); }
});

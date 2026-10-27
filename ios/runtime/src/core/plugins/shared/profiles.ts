import { intercept } from "@lib/api/flux";

/**
 * Lets a plugin adjust profiles as Discord loads them (theme colours, badges and so on).
 * `edit` changes the raw profile in place; returns the function that stops it.
 */
export function onProfileLoad(edit: (profile: any, userId: string) => void) {
    return intercept(payload => {
        if (payload.type !== "USER_PROFILE_FETCH_SUCCESS") return undefined;
        const profile = payload.userProfile ?? payload;
        const userId = String(profile?.user?.id ?? payload.userId ?? "");
        if (!userId) return undefined;
        try { edit(profile.user_profile ?? profile, userId); } catch { /* leave the profile as Discord sent it */ }
        return undefined;
    });
}
